import { notFound } from "next/navigation";
import { ShopPage } from "@/components/shop/shop-page";
import { getCollection, getCollections } from "@/lib/shop-catalog";
import { pageMetadata } from "@/lib/seo";
import { shop } from "@/shop.config";
type Props = { searchParams: Promise<{ collection?: string | string[] }> };
async function collectionSlug(searchParams: Props["searchParams"]) {
  const { collection } = await searchParams;
  return typeof collection === "string" ? collection : undefined;
}
// Each collection is its own canonical page; any other query string folds into /shop.
export async function generateMetadata({ searchParams }: Props) {
  const slug = await collectionSlug(searchParams);
  const active = slug ? await getCollection(slug) : null;
  if (active)
    return pageMetadata({
      title: `${active.collection.title} — shop`,
      description:
        active.collection.description ||
        `Shop the ${active.collection.title} collection from ${shop.name}.`,
      path: `/shop?collection=${active.collection.slug}`,
    });
  return pageMetadata({
    title: "shop all",
    description: `Everything from ${shop.name}. ${shop.description}`,
    path: "/shop",
  });
}
// /shop lists every live product; /shop?collection=<slug> lists one published collection.
export default async function Shop({ searchParams }: Props) {
  const slug = await collectionSlug(searchParams);
  const [collections, active] = await Promise.all([
    getCollections(),
    slug ? getCollection(slug) : null,
  ]);
  if (slug && !active) notFound();
  return <ShopPage collections={collections} active={active} />;
}
