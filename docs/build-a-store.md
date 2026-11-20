# Build a Venroys store with an AI coding agent

A step-by-step playbook for Claude Code, Codex or any coding agent that can run commands. Follow it in order.
The goal: a website for the user's Venroys store where a test purchase is **paid**, then the same store live.

The user does five things themselves. Everything else is yours.

| The user does | Why |
|---|---|
| Approves the Venroys connection in their browser | MCP sign-in is their consent |
| Creates the API keys and types them into `npm run setup` | Secret keys never go through the chat |
| Finishes Venroys Payments onboarding | Identity and bank checks are legal steps only they can do |
| Approves every change you make in their Venroys store | They own the store |
| Pays for the first real order | Proof that real money arrives |

## Rules

- **Never ask for API keys in the chat** and never write them into code, commits or logs. The user runs
  `npm run setup` in their own terminal (in Claude Code: `! npm run setup`).
- **Ask before every change in Venroys** (products, prices, delivery, publishing). Say exactly what will change.
- **Practice store first.** Use the sandbox until a test purchase is paid. Only then switch to live keys.
- **A redirect is not a payment.** Confirm "paid" with the MCP tool `list_orders` or the `order.paid` webhook.
- Read [venroys.md → Things that surprise people](venroys.md#things-that-surprise-people) before you change
  checkout code.

## No sandbox yet?

Some accounts don't have the practice store yet (no **Test sandbox** in the store menu, or it says "setup
pending"). Then:

1. Tell the user to ask Venroys to enable it (info@venroys.com). It is the only way to test payments safely.
2. Meanwhile, work with **live** keys but change nothing that costs money: run `npm run check`, run the shop
   locally and click through it up to the checkout page. **Do not submit the checkout form**: in live mode it
   creates a real order.
3. Skip step 7. In step 10 the user's own first real order is the payment test; they refund it afterwards.

## 0. Ask the user (one message)

1. The shop's name, what it sells, and the look they want (colors, mood, a site they like).
2. Do they already sell on Venroys (products, delivery and payments set up), or are they starting fresh?
3. The web address they will use, if they have one.

## 1. Copy the starter

```sh
gh repo create my-shop --template Venroys/venroys-starter-shop --private --clone
cd my-shop && npm install
```

Without the GitHub CLI: `npx degit Venroys/venroys-starter-shop my-shop`, then `cd my-shop && npm install`.

## 2. Connect the Venroys MCP server

The MCP server lets you read and change the user's store with their approval. Connect the **sandbox** first.

- **Claude Code:** this repository's `.mcp.json` already lists `venroys-sandbox` and `venroys`. Ask the user to
  approve them when Claude Code asks, or run:
  `claude mcp add --transport http venroys-sandbox https://sandbox.venroys.com/api/mcp`
- **Codex:** add to `~/.codex/config.toml`, then restart Codex:

  ```toml
  [mcp_servers.venroys-sandbox]
  url = "https://sandbox.venroys.com/api/mcp"
  ```

A browser window opens. The user signs in and approves. If the URL returns "not found", MCP isn't enabled for
their account yet: continue without it and tell the user which steps they must do in the dashboard.

Then call `get_store`. It shows the store name, currency, verification, payout status and what is still due.

## 3. Keys

Ask the user to open **Venroys → Developers → API keys** (in the sandbox first) and create:

- a **publishable key** whose allowed origins include `http://127.0.0.1:3000` (local testing, sandbox only)
  and, later, the shop's `https://` address. Origins can't be edited afterwards; a new key is fine.
- a **secret key** with `locations:read`, `customers:read`, `customers:write`, `carts:write` and
  `checkout:create`. Keys never gain permissions later.

Then the user runs `npm run setup` and types both keys. It writes `.env.local` and runs the readiness check.

## 4. Set up the store (MCP, with the user's approval)

Skip what already exists. For each change, say what you will do and wait for a yes.

| What | Tool |
|---|---|
| Products: create, add photos, size charts, then publish | `create_draft_product`, `upload_product_image`, `update_product_size_chart`, `set_product_status` |
| Where orders ship from | `list_locations` (the user adds a location in Warehouse if there is none and they ship themselves) |
| Delivery prices for each country | `list_shipping_zones`, `save_shipping_zone` |
| Collections | `create_collection`, `set_collection_products` |
| Payments | The user finishes Venroys Payments setup in the dashboard. Check with `get_store`. |

## 5. Make it theirs

Change `shop.config.ts` only: name, tagline, texts, colors, returns and shipping wording. Then:

```sh
npm run dev
```

Open http://127.0.0.1:3000 (not `localhost`: sandbox keys only accept `127.0.0.1`) and check the home page, a product page, the bag and `/setup`.
Product photos beyond the first go in `public/products/` and `shop.extraPhotos`.

## 6. Ready-to-sell check

```sh
npm run check -- --json
```

Fix every item with `"status": "todo"`. Items with `"status": "manual"` are for the user in the dashboard; tell
them which ones are left.

## 7. Test purchase in the sandbox

The user buys one product on http://127.0.0.1:3000 with the Stripe test card `4242 4242 4242 4242`, any future
date and any CVC. Then confirm with `list_orders` that its payment status is **paid**. If it isn't, read the
checkout error and [the surprises list](venroys.md#things-that-surprise-people) before changing code.

## 8. Deploy

With Vercel (the user logs in once with `npx vercel login`):

```sh
npx vercel link
npx vercel env add VENROYS_PUBLISHABLE_KEY production   # the user pastes the key in their terminal
npx vercel env add VENROYS_SECRET_KEY production        # same
npx vercel env add NEXT_PUBLIC_SITE_URL production      # https://their-domain
npx vercel --prod
```

Open the deployed `/setup` page. Make sure the publishable key allows that exact `https://` address.

## 9. Webhooks (optional, recommended)

The user adds a webhook in **Developers → Webhooks** for `https://their-domain/api/webhooks/venroys` with at
least `order.paid`, `product.updated` and `inventory.updated`, then puts the signing secret in
`VENROYS_WEBHOOK_SECRETS` (`npx vercel env add …`) and redeploys.

## 10. Go live

1. Repeat steps 2, 3 and 8 with the **live** MCP server (`venroys`) and live keys (`vr_pk_live_`,
   `vr_sk_live_`).
2. Run `npm run check` against the live keys.
3. The user places one real order with their own card. Confirm it is **paid** with `list_orders`.
4. The user refunds it in the dashboard if it shouldn't ship.

Tell the user what is done, what they still need to do, and the address of their shop.
