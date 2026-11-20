import { cache } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { venroys, ApiError } from "@/lib/venroys";
import {
  demoProducts,
  fromVenroys,
  type Catalog,
  type VenroysProduct,
} from "@/lib/products";

// Every storefront page reads the catalog, so keep a short per-instance copy
// to stay well inside the 600 reads/minute Venroys budget on busy days.
const TTL = 30_000;
let memo: { at: number; catalog: Catalog } | null = null;
// Called by the webhook receiver when products, collections or stock change.
export function invalidateCatalog() {
  memo = null;
}

// GET /products, following cursors (max 500 products). `collection` narrows the list
// to a published collection's members.
async function readLive(collection?: string) {
  const raw: VenroysProduct[] = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const query = new URLSearchParams({ limit: "100" });
    if (collection) query.set("collection", collection);
    if (after) query.set("after", after);
    const result = await venroys(`/products?${query}`);
    raw.push(...(result.data || []));
    after = result.pagination?.has_more ? result.pagination.next_cursor : "";
    if (!after) break;
  }
  return raw
    .map((p, i) => fromVenroys(p, i))
    .filter((p) => p !== null);
}

// Server only. Falls back to the non-purchasable concept pieces while Venroys has
// no active products or cannot be reached, so nothing unbuyable is ever sold.
export const getCatalog = cache(async (): Promise<Catalog> => {
  // Stock and publish state change at any time: always render at request time.
  await connection();
  if (memo && Date.now() - memo.at < TTL) return memo.catalog;
  // No keys yet: show the demo products without asking Venroys.
  if (!process.env.VENROYS_PUBLISHABLE_KEY)
    return { mode: "preview", products: demoProducts };
  try {
    const products = await readLive();
    const catalog: Catalog = products.length
      ? { mode: "live", products }
      : { mode: "preview", products: demoProducts };
    memo = { at: Date.now(), catalog };
    return catalog;
  } catch (e) {
    unstable_rethrow(e);
    console.error(
      "Venroys catalog unavailable:",
      e instanceof ApiError ? `${e.status} ${e.code} ${e.requestId ?? ""}` : e,
    );
    return { mode: "preview", products: demoProducts };
  }
});

export type Collection = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Published collections (GET /collections). Empty in preview mode or on failure: the
// shop simply shows no collection filter.
export const getCollections = cache(async (): Promise<Collection[]> => {
  if ((await getCatalog()).mode !== "live") return [];
  try {
    const result = await venroys("/collections?limit=100");
    return (result.data || []).filter((c: Collection) => slugPattern.test(c.slug));
  } catch (e) {
    unstable_rethrow(e);
    return [];
  }
});

// One published collection (GET /collections/:slug) and its active products
// (GET /products?collection=slug). Null when it does not exist or is unpublished.
export const getCollection = cache(async (slug: string) => {
  if (!slugPattern.test(slug) || (await getCatalog()).mode !== "live") return null;
  try {
    const result = await venroys(`/collections/${slug}`);
    return {
      collection: result.data as Collection,
      products: await readLive(slug),
    };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

// A fresh read of one product (GET /products/:slug) for the product page, so stock and
// price are current even while the catalog list is cached. Falls back to the list.
export const getProduct = cache(async (slug: string) => {
  const catalog = await getCatalog();
  const listed = catalog.products.find((p) => p.slug === slug);
  if (catalog.mode !== "live" || !/^[a-z0-9-]{1,200}$/.test(slug)) return listed;
  try {
    const result = await venroys(`/products/${slug}`);
    const index = listed ? catalog.products.indexOf(listed) : catalog.products.length;
    return fromVenroys(result.data, index) ?? undefined;
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiError && e.status === 404) return undefined;
    return listed;
  }
});
