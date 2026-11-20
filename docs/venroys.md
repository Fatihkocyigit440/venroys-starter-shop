# How this shop talks to Venroys

The notes a developer (or an AI helper) needs to change this shop safely. For setup, start with
[README.md](../README.md).

- [The big picture](#the-big-picture)
- [Things that surprise people](#things-that-surprise-people)
- [Keys and permissions](#keys-and-permissions)
- [Endpoint map](#endpoint-map)
- [Flows](#flows)
- [Errors, retries and idempotency](#errors-retries-and-idempotency)
- [Testing](#testing)

## The big picture

Venroys holds everything that matters: products, prices, stock, carts, payments, orders and shopper accounts.
This shop is a website in front of it and keeps no database.

```
browser ──► Next.js pages (app/(store))      ──► lib/shop-catalog.ts ──► GET /products, /collections
        ──► /api/checkout, /api/cart          ──► POST/PATCH /carts, POST /checkouts (hosted)
        ──► Venroys helper + Stripe (embedded) ──► /checkouts/:id/quote, prepare, confirm
        ──► /api/account/*                    ──► customer codes, sessions, profile, orders
Venroys ──► /api/webhooks/venroys            ──► clears the product cache
```

- `lib/venroys.ts` is the only place that calls the API. Test keys (`_test_`) go to
  `https://sandbox.venroys.com/api/v1`, live keys to `https://venroys.com/api/v1`; mixing them is refused.
- With no keys, or no published products, the shop shows the demo products from `lib/products.ts`. Their checkout is
  a walkthrough that sends nothing.
- `lib/readiness.ts` powers `npm run check` and `/setup`. It only reads.

## Things that surprise people

Each of these was found by a checkout that broke. Read them before changing checkout code.

1. **Delivery choice format.** `POST /checkouts/:id/prepare` wants `selected_shipping_options` as an object
   `{ [selection_key]: method }`, not an array. An array is refused with `400`.
2. **Fixed-rate delivery.** For a store with one fixed delivery price, `quote` returns **no shipping options**,
   only a `shipping_total`. An empty list is not "we can't deliver here" (that comes back as an error). Show the
   fixed price as one delivery line and continue (`components/shop/embedded-checkout.tsx`).
3. **Cancelled payments look pending.** A payment cancelled at the bank reads as `pending` in
   `GET /checkouts/:id` until the checkout expires after two hours.
4. **Embedded checkout must be switched on by Venroys** for your store, and the publishable key must list the
   site's exact HTTPS origin (`https://www.example.com` and `https://example.com` are different). Origins can't be
   edited later. Until both are true you get `embedded_not_enabled` or `origin_not_allowed`; this shop then falls
   back to the hosted Venroys payment page, where nothing has been charged yet.
5. **Keys never gain permissions.** To add a permission, create a new key and revoke the old one.
6. **One photo per product.** The storefront API returns one image per product. Extra photos go in
   `public/products/` and `shop.extraPhotos` in `shop.config.ts`.
7. **A return to your site proves nothing.** Only a verified `order.paid` webhook proves payment. Never fulfil
   from a browser redirect.

## Keys and permissions

| Key | Prefix | Where | Needs |
|---|---|---|---|
| Publishable key | `vr_pk_test_` / `vr_pk_live_` | server, and the browser for embedded checkout | storefront access; for embedded checkout its allowed origins must list your site |
| Secret key | `vr_sk_test_` / `vr_sk_live_` | server only | `locations:read` (setup check), `customers:read` + `customers:write` (shopper accounts), `carts:write` + `checkout:create` (signed-in checkout) |
| Shopper token | — | HttpOnly cookie `shop_customer` | none; sent as `Venroys-Customer-Token` with the secret key |

Without these permissions the shop still sells: checkout falls back to guest checkout. Only shopper
accounts stop working. The permission list comes from the new-tu shop this starter was built from;
check it against Venroys → Developers when you create the key.

## Endpoint map

Paths are relative to the API base. *Key*: **P** publishable, **S** secret, **C** shopper token (with S).

### Storefront

| Endpoint | Key | Code | Purpose |
|---|---|---|---|
| `GET /store` | P | `lib/readiness.ts` (`store`) | Store name and currency for `npm run check` and `/setup` |
| `GET /products?limit&after` | P | `lib/shop-catalog.ts` `readLive`, `app/api/catalog` | All active products (≤ 500, 30 s per-instance cache, cleared by product/stock webhooks) |
| `GET /products?collection=slug` | P | `getCollection` | Members of a published collection (`/shop?collection=slug`) |
| `GET /products/:slug` | P | `getProduct` | Fresh price and stock on the product page |
| `GET /collections` | P | `getCollections` | Collection filter on `/shop` |
| `GET /collections/:slug` | P | `getCollection` | Collection title and description |

Responses are mapped by `fromVenroys` (`lib/products.ts`): prices are decimal strings in major units, IDs are
strings, a variant is sold out when `available === false` or `stock === 0`, images must be HTTPS.

### Carts and hosted checkout

| Endpoint | Key | Code | Purpose |
|---|---|---|---|
| `POST /carts` | P | `app/api/checkout/route.ts` | New cart from the bag; id kept in signed cookie `shop_cart` (7 days) |
| `PATCH /carts/:id` | P | `app/api/checkout/route.ts` | Replace the cookie cart with the current bag (atomic) |
| `GET /carts/:id` | P | `app/api/cart/route.ts` | Rebuild the bag when browser storage was wiped but the cookie survived |
| `POST /checkouts` (`cart_id`, `mode: hosted`, `appearance`, `discount_code`) | P | `app/api/checkout/route.ts` | Guest hosted checkout; redirect only to HTTPS `*.venroys.com` |
| `POST /checkouts` (`items`, …) + `Venroys-Customer-Token` | S + C | `app/api/checkout/route.ts` | Signed-in checkout, order linked to the account |

### Embedded checkout (`NEXT_PUBLIC_VENROYS_CHECKOUT_MODE=embedded`)

Called from the browser by Venroys' helper `https://venroys.com/venroys-checkout.mjs`, loaded at runtime by
`components/shop/embedded-checkout.tsx`, with the publishable key from its approved origin.

| Endpoint | Purpose |
|---|---|
| `POST /checkouts` (`mode: embedded`, `return_url`) | Create the checkout (helper, one idempotency key per bag) |
| `GET /checkouts/:id` | Branding, policies, payment methods, payment status (`open`, `pending`, `processing`, `paid`, `failed`, `refunded`, `disputed`) |
| `POST /checkouts/:id/quote` | Shipping options for the address: `{ selection_key, method, label, amount, currency, selected }`, `amount` in euros. Grouped by `selection_key` (one group per fulfiller) |
| `POST /checkouts/:id/prepare` | Authoritative total, Stripe account; sends `terms_accepted` and `selected_shipping_options: { [selection_key]: method }` (the shape Venroys' hosted checkout sends; an array is refused with 400) |
| `POST /checkouts/:id/confirm` | Payment with a Stripe confirmation token; 3-D Secure via `handleNextAction` |

Stripe's Payment Element shows the methods the store enabled: cards, Link, iDEAL, Bancontact, EPS and Klarna (no
Apple Pay, Google Pay or PayPal). No discount codes (the helper does not send `discount_code`); hosted checkout is
offered until Pay is pressed, never after. `info.terms_url` is linked at the terms checkbox.

**After paying.** The checkout is created with `return_url` `<origin>/checkout`. A card that needs no redirect
confirms on the page. Bank and pay-later methods leave the site and return through Venroys to
`/checkout?checkout_id=…`, also after a failed payment. The page never trusts that URL: it reads
`GET /checkouts/:id` with the helper's `getVenroysCheckoutStatus`, a few times because the payment event can land
just after the redirect. There is no Venroys receipt link on this path; Venroys emails the confirmation.

| Status | What the shopper sees |
|---|---|
| `paid`, `processing` | Confirmation, bag cleared |
| `refunded`, `disputed` | "This order is closed" |
| `failed` | Bag kept, error shown, next try gets a new checkout |
| `pending` | "Still waiting", no new checkout; they can check again or go back to that payment |
| `open` | The normal checkout |

The bag is cleared only when `checkout_id` matches the one this browser started, so a shared link can't empty it.

**Retries** (`lib/embedded-attempt.ts`). `localStorage` keeps the idempotency key, the checkout id and whether Pay
was pressed, never address or payment data; `localStorage` because bank apps often return in a new tab. A key is
rotated after an hour unless a payment may be open.

- A payment left at the bank stays open, and `confirm` resumes it **whichever method is then chosen**. The page says
  so. To pay another way the shopper cancels at the bank, which comes back as `failed`.
- A `409` from `prepare` means the address changed after preparing: new checkout, unless a payment may be open.
- A `409` from `confirm` means the payment ended: new checkout, after checking it wasn't paid.
- `store_unavailable` and `payments_unavailable` never start a new checkout.
- A canceled payment also reads as `pending` in `GET /checkouts/:id`, so it shows "still waiting" until the checkout
  expires after two hours.

### Shopper accounts

All with the secret key; the token lives only in the HttpOnly cookie `shop_customer` (`lib/customer.ts`).

| Endpoint | Code | Purpose |
|---|---|---|
| `POST /customer-codes` | `app/api/account/code` | Email an 8-digit code (same answer for unknown emails) |
| `POST /customer-sessions` | `app/api/account/session` | Code → 14-day token |
| `GET /customer` | `app/api/account` GET | Profile and up to five addresses |
| `GET /customer/orders?after` | `app/api/account` GET | Order history with shipments and tracking |
| `PATCH /customer` | `app/api/account` PATCH | Name; remove saved addresses |
| `DELETE /customer-sessions/current` | `app/api/account` DELETE | Sign out (cookie cleared even if Venroys is unreachable) |

#

## Flows

### Hosted checkout (guest)
1. The checkout page sends the bag and optional discount code to `POST /api/checkout` with one
   `Idempotency-Key` per bag + code, reused for up to an hour (`components/shop/checkout.tsx`).
2. The route replaces the cookie cart (`PATCH`) or creates one (`POST`), then creates the checkout. Each
   upstream write uses `<key>:cart`, `<key>:cart-replace`, `<key>:checkout`, so a retry after a lost response
   returns the same checkout instead of a second one.
3. The shopper pays on Venroys. Venroys shows its own confirmation; custom success URLs are not supported, so
   returning shoppers see "already checked out?" with *clear bag* (which also forgets the cart cookie).
4. A browser return is not proof of payment: only a verified `order.paid` webhook is.

### Signed-in checkout
With a `shop_customer` cookie the route calls `POST /checkouts` with `items`, the secret key and the shopper
token (key suffix `:checkout-account`). `invalid_customer_token` signs the shopper out and asks them to sign in
again or continue as guest. `missing_scope` (secret key without `checkout:create`) falls back to guest checkout.

### Webhook receiver (`app/api/webhooks/venroys/route.ts`)
1. Bodies over 256 KB → 413. Unsigned `endpoint.verification` with a 64-hex challenge → 200 with
   `Venroys-Webhook-Challenge`.
2. `Venroys-Signature: t=…,v1=…` is checked with HMAC-SHA256 over `t + "." + raw body`, ±300 s, constant-time,
   against every secret in `VENROYS_WEBHOOK_SECRETS` (`lib/webhooks.ts`).
3. Product, collection and stock events clear the catalog cache. That is safe to repeat, so no database is
   needed. To act on orders, store each event id first and skip ids you have already handled: Venroys retries,
   and events can arrive late or out of order.

## Errors, retries and idempotency

- `lib/venroys.ts` turns Venroys errors into `ApiError(status, message, code, request_id, retry_after)`;
  `apiFailure` forwards them to the browser with `Retry-After` and the request id.
- Every write sends `Idempotency-Key`. Same key + same body replays the result; same key + different body is
  `409 idempotency_conflict`.
- `429`: wait for `Retry-After`. Storefront writes share 60/minute and reads 600/minute per key. The catalog is
  cached for 30 seconds per server instance to stay inside that.

## Testing

- `npm test`, `npm run typecheck`, `npm run build`.
- `npm run check` against your keys (reads only).
- **Practice store first.** In Venroys open your store card → *Test sandbox*, create `vr_pk_test_` and
  `vr_sk_test_` keys, publish a sample product, and buy it with Stripe test cards: success, decline,
  3-D Secure success and cancel, double click on Pay, and a lost response.
- **First real order.** With live keys, buy your cheapest product with your own card. Check the confirmation on
  the site, the order marked **paid** in Venroys, the confirmation email, and `order.paid` received once. Cancel
  and refund it if you don't want it shipped.
