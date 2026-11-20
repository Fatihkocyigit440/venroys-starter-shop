# Notes for AI coding helpers

This is a Next.js storefront for one Venroys store. Venroys holds products, prices, stock, carts, payments, orders
and shopper accounts; this app keeps no database.

## Before you change anything

- Shop-specific text, colors and settings belong in `shop.config.ts`, not in components.
- Read [docs/venroys.md](docs/venroys.md), especially "Things that surprise people", before touching checkout.
  Those rules came from real checkouts that broke.
- Only `lib/venroys.ts` calls the Venroys API. Keep it that way.

## Rules

- Never put keys in code or commit `.env*` files. Keys come from environment variables only.
- Never treat a browser redirect as proof of payment. Only a verified `order.paid` webhook is.
- Keep the hosted Venroys payment page as the fallback for embedded checkout. Nothing is charged before Pay,
  so falling back is always safe before that point.
- Every Venroys write sends an `Idempotency-Key`. Reuse the same key when retrying the same request.
- Test keys (`_test_`) and live keys (`_live_`) never mix. Test against the practice store first.

## Check your work

```sh
npm test
npm run typecheck
npm run build
npm run check   # reads only; needs keys in .env.local
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
