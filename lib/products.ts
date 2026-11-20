import { shop } from "@/shop.config";

// Products come from your Venroys store (see lib/shop-catalog.ts). The demo products below
// are shown only while Venroys has no published products or the keys are missing. They
// can be put in the bag, but their checkout is a walkthrough that never takes payment.
export type Product = {
  slug: string;
  number: string;
  name: string;
  priceCents: number;
  color: string;
  sizes: readonly string[];
  images: { src: string; alt: string }[];
  description: string;
  fit?: string;
  material?: string;
  print?: string;
  measurements?: { size: string; width: number; length: number }[];
  // Live only: Venroys variants keyed by the size label shown in the picker.
  variants?: Record<string, Variant>;
  currency?: string;
};
export type Variant = { id: number; priceCents: number; soldOut: boolean };
export type Catalog = { mode: "live" | "preview"; products: Product[] };

// Flat shipping estimate shown only in the demo walkthrough. Real shipping comes from Venroys.
export const demoShippingCents = 495;

// Optional fit, material and size-guide text for your live products, by Venroys slug.
// Venroys does not store these, so they live here:
//   "my-shirt-123": { fit: "Relaxed.", material: "100% cotton.", measurements: [...] },
export const productDetails: Record<
  string,
  Pick<Product, "fit" | "material" | "print" | "measurements">
> = {};

const sizes = ["xs", "s", "m", "l", "xl"];
const images = (shape: string, name: string) =>
  ["front", "back"].map((view) => ({
    src: `/products/${shape}-${view}.svg`,
    alt: `${name}, ${view} (demo drawing)`,
  }));
const measurements = (baseWidth: number, baseLength: number) =>
  sizes.map((size, i) => ({
    size,
    width: baseWidth + i * 3,
    length: baseLength + i * 2,
  }));
export const demoProducts: Product[] = [
  {
    slug: "demo-everyday-tee",
    number: "01",
    name: "everyday tee",
    priceCents: 3500,
    color: "black",
    sizes,
    images: images("tee", "Everyday tee"),
    description: "A demo product. Publish a product in Venroys and it replaces these.",
    fit: "Regular fit. Choose your usual size.",
    material: "Demo text: describe the fabric here.",
    measurements: measurements(52, 70),
  },
  {
    slug: "demo-weekend-hoodie",
    number: "02",
    name: "weekend hoodie",
    priceCents: 7900,
    color: "charcoal",
    sizes,
    images: images("hoodie", "Weekend hoodie"),
    description: "A demo product. Publish a product in Venroys and it replaces these.",
    fit: "Relaxed fit.",
    material: "Demo text: describe the fabric here.",
    measurements: measurements(58, 68),
  },
  {
    slug: "demo-wide-trousers",
    number: "03",
    name: "wide trousers",
    priceCents: 6900,
    color: "coal",
    sizes,
    images: images("pants", "Wide trousers"),
    description: "A demo product. Publish a product in Venroys and it replaces these.",
    measurements: measurements(32, 100),
  },
  {
    slug: "demo-rib-beanie",
    number: "04",
    name: "rib beanie",
    priceCents: 2400,
    color: "black",
    sizes: ["one size"],
    images: images("beanie", "Rib beanie"),
    description: "A demo product. Publish a product in Venroys and it replaces these.",
  },
];

// Live products: on sale while Venroys lists them as published and in stock.
// Demo products can always go in the bag (their checkout takes no payment).
export function available(product: Product, size?: string) {
  if (!product.variants) return true;
  return size
    ? !!product.variants[size] && !product.variants[size].soldOut
    : Object.values(product.variants).some((v) => !v.soldOut);
}
export const formatPrice = (cents: number, currency: string = shop.currency) =>
  new Intl.NumberFormat(shop.locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
export const linePrice = (product: Product, size: string) =>
  product.variants?.[size]?.priceCents ?? product.priceCents;
export type BagLine = { slug: string; size: string; quantity: number };
export function sanitizeBag(value: unknown, products: Product[]) {
  if (!Array.isArray(value)) return [];
  const lines: BagLine[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const p = products.find((p) => p.slug === item.slug);
    if (
      !p ||
      !p.sizes.includes(item.size) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    )
      continue;
    const existing = lines.find(
      (l) => l.slug === item.slug && l.size === item.size,
    );
    if (existing)
      existing.quantity = Math.min(25, existing.quantity + item.quantity);
    else
      lines.push({
        slug: p.slug,
        size: item.size,
        quantity: Math.min(25, item.quantity),
      });
  }
  return lines;
}
export function subtotal(lines: BagLine[], products: Product[]) {
  return lines.reduce((sum, line) => {
    const p = products.find((p) => p.slug === line.slug);
    return sum + (p ? linePrice(p, line.size) * line.quantity : 0);
  }, 0);
}
// Venroys returns prices as decimal strings in major units and IDs as strings.
type VenroysVariant = {
  id: string | number;
  price: string | number;
  size?: string | null;
  color?: string | null;
  image_url?: string | null;
  available?: boolean;
  stock?: number;
};
export type VenroysProduct = {
  slug: string;
  name?: string;
  title?: string;
  description?: string | null;
  image_url?: string | null;
  currency?: string;
  variants?: VenroysVariant[];
};
const https = (url?: string | null) => {
  try {
    return url && new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};
// Venroys returns variants in the order they were created ("m, 2xl, l, xl, s"). Show them the
// way shoppers expect: grouped by color in first-seen order, then smallest to largest. Labels
// look like "stone / m"; numeric sizes sort by number; unknown sizes keep their place.
const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"];
const SIZE_ALIASES: Record<string, string> = { xxl: "2xl", xxxl: "3xl", "one size": "m" };
export function sortSizes(labels: string[]) {
  const colorOf = (label: string) => (label.includes(" / ") ? label.slice(0, label.lastIndexOf(" / ")) : "");
  const sizeOf = (label: string) =>
    (label.includes(" / ") ? label.slice(label.lastIndexOf(" / ") + 3) : label).replace(/ \(\d+\)$/, "");
  const colors = [...new Set(labels.map(colorOf))];
  const rank = (label: string) => {
    const size = sizeOf(label);
    const named = SIZE_ORDER.indexOf(SIZE_ALIASES[size] ?? size);
    if (named >= 0) return named;
    const n = parseFloat(size);
    return Number.isFinite(n) ? 100 + n : Infinity;
  };
  return labels
    .map((label, i) => ({ label, i }))
    .sort((a, b) =>
      colors.indexOf(colorOf(a.label)) - colors.indexOf(colorOf(b.label)) ||
      (rank(a.label) === rank(b.label) ? a.i - b.i : rank(a.label) - rank(b.label)) ||
      a.i - b.i,
    )
    .map((x) => x.label);
}
export function fromVenroys(
  raw: VenroysProduct,
  index: number,
): Product | null {
  const name = (raw.name || raw.title || "").trim();
  const variants: Record<string, Variant> = {};
  const colors = new Set<string>();
  for (const v of raw.variants || []) {
    const id = Number(v.id);
    const priceCents = Math.round(Number(v.price) * 100);
    if (!Number.isSafeInteger(id) || id <= 0 || !(priceCents >= 0)) continue;
    if (v.color) colors.add(v.color.toLowerCase());
    const base =
      [v.color, v.size].filter(Boolean).join(" / ").toLowerCase() ||
      "one size";
    const label = variants[base] ? `${base} (${id})` : base;
    variants[label] = {
      id,
      priceCents,
      soldOut: v.available === false || v.stock === 0,
    };
  }
  const sizes = sortSizes(Object.keys(variants));
  if (!name || !raw.slug || !sizes.length) return null;
  const sources = [
    raw.image_url,
    ...(raw.variants || []).map((v) => v.image_url),
  ]
    .map(https)
    .filter((src): src is string => !!src);
  const unique = [
    ...new Set(sources),
    ...(shop.extraPhotos[raw.slug] || []),
  ].slice(0, 6);
  const details = productDetails[raw.slug];
  return {
    slug: raw.slug,
    number: String(index + 1).padStart(2, "0"),
    name,
    priceCents: Math.min(...sizes.map((s) => variants[s].priceCents)),
    color: [...colors].join(" / ") || "",
    sizes,
    images: unique.length
      ? unique.map((src, i) => ({ src, alt: `${name}, image ${i + 1}` }))
      : [{ src: "/products/coming-soon.svg", alt: `${name} — photo coming soon` }],
    description: raw.description?.trim() || "",
    fit: details?.fit,
    material: details?.material,
    print: details?.print,
    measurements: details?.measurements,
    variants,
    currency: raw.currency || shop.currency,
  };
}
