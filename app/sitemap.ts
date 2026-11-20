import type { MetadataRoute } from "next";
import { getCatalog, getCollections } from "@/lib/shop-catalog";
import { absolute, isTestProduct } from "@/lib/seo";

// Built per request from the live catalog, like the shop itself.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, collections] = await Promise.all([
    getCatalog(),
    getCollections(),
  ]);
  return [
    { url: absolute("/"), changeFrequency: "weekly", priority: 1 },
    { url: absolute("/shop"), changeFrequency: "daily", priority: 0.9 },
    ...catalog.products
      .filter((p) => !isTestProduct(p))
      .map((p) => ({
        url: absolute(`/shop/${p.slug}`),
        changeFrequency: "daily" as const,
        priority: 0.8,
        images: p.images.map((image) => absolute(image.src)),
      })),
    ...collections.map((c) => ({
      url: absolute(`/shop?collection=${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: absolute("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absolute("/shipping"), changeFrequency: "monthly", priority: 0.3 },
    { url: absolute("/returns"), changeFrequency: "monthly", priority: 0.3 },
  ];
}
