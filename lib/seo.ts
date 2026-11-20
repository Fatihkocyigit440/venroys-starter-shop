import type { Metadata } from "next";
import type { Product } from "@/lib/products";
import { shop } from "@/shop.config";

// The canonical origin, name and description, from shop.config.ts.
export const site = {
  url: shop.url.replace(/\/$/, ""),
  name: shop.name,
  description: shop.description,
};

export const absolute = (path: string) => new URL(path, site.url).toString();

// app/opengraph-image.tsx, repeated here because a page's own `openGraph` hides it.
const shareCard = {
  url: absolute("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${shop.name}. ${shop.tagline}`,
};

// Metadata objects merge shallowly, so a page that sets `openGraph` replaces the root's
// entirely. Pages build theirs here to keep the canonical URL and share card in step.
// Social cards cannot show SVG, so demo drawings fall back to the card.
export function pageMetadata({
  title,
  description = site.description,
  path,
  images,
  robots,
}: {
  title?: string;
  description?: string;
  path: string;
  images?: string[];
  robots?: Metadata["robots"];
}): Metadata {
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: shop.locale.replace("-", "_"),
      url: path,
      title: title ? `${title} — ${site.name}` : `${site.name} — ${shop.tagline}`,
      description,
      images: images?.some((src) => !src.endsWith(".svg"))
        ? images.filter((src) => !src.endsWith(".svg"))
        : [shareCard],
    },
    ...(robots && { robots }),
  };
}

// Venroys test listings ("TEST tee 1 qwerty") stay buyable for checkout testing but are
// kept out of search results and the sitemap.
export const isTestProduct = (product: Product) =>
  /^test\b/i.test(product.name);

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  logo: absolute("/apple-icon"),
  email: shop.contact,
  description: site.description,
};

// Offers only for live Venroys pieces: concept prices are placeholders and not for sale.
export function productJsonLd(product: Product) {
  const url = absolute(`/shop/${product.slug}`);
  const variants = Object.values(product.variants || {});
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.map((image) => absolute(image.src)),
    url,
    sku: product.slug,
    color: product.color || undefined,
    brand: { "@type": "Brand", name: site.name },
    offers: variants.length
      ? {
          "@type": "AggregateOffer",
          url,
          priceCurrency: product.currency || shop.currency,
          lowPrice: (Math.min(...variants.map((v) => v.priceCents)) / 100).toFixed(2),
          highPrice: (Math.max(...variants.map((v) => v.priceCents)) / 100).toFixed(2),
          offerCount: variants.length,
          availability: variants.some((v) => !v.soldOut)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  };
}

// JSON.stringify does not escape `<`, so a product name could close the script tag.
export const jsonLdHtml = (data: object) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});
