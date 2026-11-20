# Venroys Starter Shop

A ready-made online shop for your Venroys store. Copy it, add your two Venroys keys, and put it online.
Customers browse your products, put them in a bag and pay through Venroys.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVenroys%2Fvenroys-starter-shop&env=VENROYS_PUBLISHABLE_KEY,VENROYS_SECRET_KEY&envDescription=Your%20two%20Venroys%20keys%20from%20Venroys%20%E2%86%92%20Developers%20%E2%86%92%20API%20keys&envLink=https%3A%2F%2Fgithub.com%2FVenroys%2Fvenroys-starter-shop%232-add-your-keys&project-name=my-shop)


## What you get

- Home page, shop page with collections, product pages with photos, sizes and a size guide.
- A bag that remembers its contents, and checkout through Venroys: the Venroys payment page, or payment on
  your own site once Venroys has switched that on for you.
- Customer accounts: sign in with an emailed code, see orders and tracking.
- About, shipping and returns pages, filled in from one settings file.
- Search-engine basics: page titles, share images, sitemap, product data for Google.
- A **ready-to-sell check** that tells you in plain words what's still missing.
- Light and dark mode, and it works on phones.

Until you add keys and publish a product, the shop shows four demo products so you can click around. Their
checkout is a walkthrough and never takes payment.

## Get your shop online in 4 steps

### 1. Copy it

Click **Deploy** above. Vercel copies this shop to your GitHub account and puts it online.
(Or on GitHub: **Use this template**, then import it in Vercel.)

### 2. Add your keys

In Venroys, go to **Developers → API keys** and create:

- a **publishable key** (starts with `vr_pk_`)
- a **secret key** (starts with `vr_sk_`), with the permissions listed in
  [docs/venroys.md](docs/venroys.md#keys-and-permissions)

Vercel asks for them when you deploy (`VENROYS_PUBLISHABLE_KEY` and `VENROYS_SECRET_KEY`). You can change them
later in Vercel → your project → **Settings → Environment Variables**, then redeploy.

**Start with test keys** (`vr_pk_test_`, `vr_sk_test_`). They use Venroys' practice store and fake cards, so no
real money moves. Switch to live keys when everything works.

### 3. Make it yours

Open `shop.config.ts` and change the name, tagline, contact email, colors and page texts. It's one file with a
comment above every setting. Also set `NEXT_PUBLIC_SITE_URL` to your web address in Vercel.

### 4. Check it's ready

Visit **`/setup`** on your shop (for example `https://my-shop.vercel.app/setup`). It lists what's done and
what's missing, like "Publish a product" or "Fill in shop.config.ts". The page disappears once your real
products are live.

Then place one real order with your own card, check it shows as **paid** in Venroys, and refund it.

## Things only you can do in Venroys

The shop can't change these for you; the setup page reminds you:

- Publish products (with stock, or a print-on-demand supplier).
- Set delivery prices for every country you sell to.
- Finish Venroys Payments onboarding and choose payment methods.
- To take payment on your own site instead of the Venroys page: ask Venroys to switch on embedded checkout,
  create a publishable key that allows your exact web address, and set `NEXT_PUBLIC_VENROYS_CHECKOUT_MODE` to
  `embedded`.

## Optional settings

| Setting | What it does |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your web address, for search engines and share links |
| `NEXT_PUBLIC_VENROYS_CHECKOUT_MODE` | `hosted` (default, Venroys payment page) or `embedded` (pay on your site) |
| `VENROYS_WEBHOOK_SECRETS` | Signing secrets for `/api/webhooks/venroys`, so product changes show up instantly instead of within 30 seconds |
| `SESSION_SECRET` | 32+ random characters; keeps shoppers' bags linked when you replace your secret key |

## For AI coding agents

Read [AGENTS.md](AGENTS.md) first, then [docs/venroys.md](docs/venroys.md) and
https://docs.venroys.com/llms.txt. Shop-specific changes go in `shop.config.ts`; checkout rules are in the
"Things that surprise people" list.

## For developers

```sh
cp .env.example .env.local   # add your keys
npm install
npm run dev                  # http://localhost:3000
npm run check                # is this shop ready to sell?
npm test && npm run typecheck && npm run build
```

- `shop.config.ts`: everything shop-specific.
- `lib/venroys.ts`: the only code that calls Venroys.
- `lib/products.ts`: maps Venroys products; demo products; extra product details.
- `lib/readiness.ts`: the checks behind `npm run check` and `/setup`.
- `components/shop/`: bag, checkout (hosted and embedded), accounts, product pages.
- [docs/venroys.md](docs/venroys.md): every endpoint used, the checkout flows, and the
  [things that surprise people](docs/venroys.md#things-that-surprise-people). Read that list before changing
  checkout code.

Built with Next.js 16, React 19 and TypeScript. Started from the new-tu shop, which sells on Venroys.

MIT licensed: use it, change it and sell with it. See [LICENSE](LICENSE).
