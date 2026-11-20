import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop-catalog";
import { ProductDetail } from "@/components/shop/product-detail";
import { formatPrice } from "@/lib/products";
import {
  absolute,
  isTestProduct,
  jsonLdHtml,
  pageMetadata,
  productJsonLd,
} from "@/lib/seo";
import { shop } from "@/shop.config";
async function find(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return getProduct(slug);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await find(params);
  if (!product) return { title: "product not found" };
  // Venroys descriptions are optional; an empty one would drop the tag entirely.
  const description =
    product.description ||
    `${product.name}${product.color ? ` in ${product.color}` : ""}, from ${formatPrice(product.priceCents, product.currency)}. From ${shop.name}.`;
  return pageMetadata({
    title: product.name,
    description,
    path: `/shop/${product.slug}`,
    images: product.images.slice(0, 1).map((image) => absolute(image.src)),
    robots: isTestProduct(product) ? { index: false, follow: true } : undefined,
  });
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await find(params);
  if (!product) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(productJsonLd(product))}
      />
      <ProductDetail product={product} />
    </>
  );
}
