---
name: build-venroys-store
description: Build and launch a webshop for the user's Venroys store from this starter, from copying the template to a paid test order and going live. Use when the user asks to make, set up, finish or launch a Venroys shop or store website.
---

Follow [docs/build-a-store.md](../../../docs/build-a-store.md) step by step. Keep its rules:

- Never ask for API keys in the chat. The user runs `! npm run setup` in their own terminal.
- Ask before every change in the Venroys store, and say exactly what will change.
- Work in the sandbox (`venroys-sandbox` MCP server, `vr_*_test_` keys) until a test purchase is paid.
- Confirm payments with the MCP tool `list_orders`, never from a browser redirect.
- Shop-specific changes go in `shop.config.ts`. Read `docs/venroys.md` before changing checkout code.

Use `npm run check -- --json` to see what is still missing. End by telling the user what is done, what only
they can do (keys, payments onboarding, the first real order), and their shop's address.
