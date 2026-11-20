import { ShopProvider } from "@/components/shop/shop-provider";
import { getCatalog } from "@/lib/shop-catalog";
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getCatalog();
  return (
    <ShopProvider catalog={catalog}>
      {children}
    </ShopProvider>
  );
}
