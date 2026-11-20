import { shop } from "@/shop.config";
import { ApiError, venroys } from "@/lib/venroys";

// "Is this shop ready to sell?" Used by `npm run check` and the /setup page.
// Every check only reads; nothing is created or changed in Venroys.
export type Check = {
  status: "ok" | "todo" | "manual";
  title: string;
  detail: string;
};

const keyMode = (key: string) =>
  key.includes("_test_") ? "test" : key.includes("_live_") ? "live" : "unknown";

function explain(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 401)
      return "Venroys does not accept this key. Copy it again from Venroys → Developers → API keys.";
    if (e.code === "missing_scope")
      return "This key is missing a permission. Create a new key with the permissions in README.md; existing keys can't gain new ones.";
    return `${e.message}${e.code ? ` (${e.code})` : ""}`;
  }
  return "Venroys could not be reached. Check your internet connection and try again.";
}

export async function runChecks(env = process.env): Promise<Check[]> {
  const checks: Check[] = [];
  const pk = env.VENROYS_PUBLISHABLE_KEY || "";
  const sk = env.VENROYS_SECRET_KEY || "";

  // 1. The two keys
  if (!pk.startsWith("vr_pk_"))
    checks.push({
      status: "todo",
      title: "Add your publishable key",
      detail: pk
        ? "VENROYS_PUBLISHABLE_KEY should start with vr_pk_."
        : "Set VENROYS_PUBLISHABLE_KEY. Find it in Venroys → Developers → API keys.",
    });
  if (!sk.startsWith("vr_sk_"))
    checks.push({
      status: "todo",
      title: "Add your secret key",
      detail: sk
        ? "VENROYS_SECRET_KEY should start with vr_sk_."
        : "Set VENROYS_SECRET_KEY. It's shown once when you create it in Venroys → Developers → API keys.",
    });
  if (pk && sk && keyMode(pk) !== keyMode(sk))
    checks.push({
      status: "todo",
      title: "Use two keys of the same kind",
      detail: "One key is a test key and the other a live key. Use two test keys to practise, two live keys to sell.",
    });
  if (checks.length) return checks;
  const mode = keyMode(pk);
  checks.push({
    status: "ok",
    title: mode === "test" ? "Test keys added" : "Live keys added",
    detail:
      mode === "test"
        ? "Test keys: payments use fake cards and no money moves. Switch to live keys to sell."
        : "Live keys: payments are real.",
  });

  // 2. The store behind the keys
  try {
    const store = (await venroys("/store", { token: pk })).data;
    checks.push({
      status: "ok",
      title: `Connected to "${store.name}"`,
      detail: `Prices are shown in ${store.currency}.`,
    });
  } catch (e) {
    checks.push({ status: "todo", title: "Connect to your store", detail: explain(e) });
    return checks;
  }

  // 3. Products customers can buy
  try {
    const result = await venroys("/products?limit=100", { token: pk });
    const products: { variants?: { available?: boolean; stock?: number }[] }[] =
      result.data || [];
    const buyable = products.filter((p) =>
      (p.variants || []).some((v) => v.available !== false && v.stock !== 0),
    );
    if (!products.length)
      checks.push({
        status: "todo",
        title: "Publish a product",
        detail: "Venroys shows no published products yet, so the shop shows demo products. Publish one in Venroys → Products.",
      });
    else
      checks.push({
        status: buyable.length ? "ok" : "todo",
        title: `${products.length}${result.pagination?.has_more ? "+" : ""} published product${products.length === 1 ? "" : "s"}`,
        detail: buyable.length
          ? `${buyable.length} can be bought right now.`
          : "All of them are sold out. Add stock or a print-on-demand supplier in Venroys.",
      });
  } catch (e) {
    checks.push({ status: "todo", title: "Read your products", detail: explain(e) });
  }

  // 4. Where orders ship from
  try {
    const locations: { active?: boolean; address?: Record<string, unknown> }[] =
      (await venroys("/admin/locations", { admin: true, token: sk })).data || [];
    const active = locations.filter((l) => l.active !== false);
    const withAddress = active.filter(
      (l) => Object.keys(l.address || {}).filter((k) => k !== "country").length > 0,
    );
    checks.push(
      !active.length
        ? {
            status: "manual",
            title: "No stock location",
            detail: "Fine if a print-on-demand supplier makes and ships your orders. If you ship them yourself, add where they ship from in Venroys → Locations.",
          }
        : withAddress.length
          ? { status: "ok", title: "Stock location set", detail: `${active.length} active location${active.length === 1 ? "" : "s"}.` }
          : {
              status: "todo",
              title: "Give your stock location a full address",
              detail: "Your location has only a country. Add the street address in Venroys → Locations.",
            },
    );
  } catch (e) {
    checks.push({
      status: "manual",
      title: "Stock location",
      detail: `Couldn't check with this key: ${explain(e)} Check Venroys → Locations yourself.`,
    });
  }

  // 5. This shop's own settings
  const settings: string[] = [];
  if (shop.name === "Starter Shop") settings.push("your shop name");
  if (shop.contact.endsWith("@example.com")) settings.push("your contact email");
  if (shop.legalName === "Your Company") settings.push("your company name and address");
  checks.push(
    settings.length
      ? {
          status: "todo",
          title: "Fill in shop.config.ts",
          detail: `Still the starter text: ${settings.join(", ")}.`,
        }
      : { status: "ok", title: "Shop settings filled in", detail: "Name, contact and seller details are set." },
  );
  if (mode === "live" && !/^https:\/\//.test(shop.url))
    checks.push({
      status: "todo",
      title: "Set your website address",
      detail: "Set NEXT_PUBLIC_SITE_URL to your https:// address so search engines and share links point to it.",
    });
  if (env.NEXT_PUBLIC_VENROYS_CHECKOUT_MODE === "embedded")
    checks.push({
      status: "manual",
      title: "Paying on your own site is on",
      detail: `Venroys must have switched it on for your store, and your publishable key must allow ${shop.url}. If either is missing, customers are sent to the Venroys payment page instead.`,
    });

  // 6. Things Venroys only shows in its dashboard
  checks.push(
    {
      status: "manual",
      title: "Delivery prices",
      detail: "Set delivery prices for every country you sell to (Venroys → Shipping). Without them, checkout can't offer delivery.",
    },
    {
      status: "manual",
      title: "Payments and payouts",
      detail: "Finish Venroys Payments onboarding and choose payment methods (Venroys → Settings → Venroys Payments).",
    },
  );
  if (!env.VENROYS_WEBHOOK_SECRETS)
    checks.push({
      status: "manual",
      title: "Instant product updates (optional)",
      detail: "Add a webhook in Venroys → Developers → Webhooks pointing to /api/webhooks/venroys, then set VENROYS_WEBHOOK_SECRETS. Without it, changes show up within 30 seconds.",
    });
  return checks;
}
