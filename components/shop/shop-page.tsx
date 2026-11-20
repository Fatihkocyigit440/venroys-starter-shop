"use client";
import Link from "next/link";
import type { Product } from "@/lib/products";
import type { Collection } from "@/lib/shop-catalog";
import { DemoNotice } from "../storefront";
import { ProductCard } from "./primitives";
import { useShop } from "./shop-provider";
export function ShopPage({
  collections = [],
  active = null,
}: {
  collections?: Collection[];
  active?: { collection: Collection; products: Product[] } | null;
}) {
  const { live, products: all } = useShop();
  const products = active?.products ?? all;
  return (
    <main id="main">
      <section className="nt-section">
        <div className="nt-section-heading">
          <div>
            <span className="nt-label nt-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
            <h1>{active ? `${active.collection.title}.` : "shop all."}</h1>
          </div>
          {active?.collection.description && <p>{active.collection.description}</p>}
        </div>
        {!live && <DemoNotice />}
        {collections.length > 0 && (
          <nav className="nt-collections nt-mono" aria-label="collections">
            <Link href="/shop" aria-current={active ? undefined : "page"}>
              everything
            </Link>
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/shop?collection=${c.slug}`}
                aria-current={active?.collection.slug === c.slug ? "page" : undefined}
              >
                {c.title.toLowerCase()}
              </Link>
            ))}
          </nav>
        )}
        {active && !products.length && (
          <p className="nt-bag-note">Nothing in this collection right now.</p>
        )}
        <div className="nt-product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
        <div className="nt-collection-note nt-mono">
          <span>{live ? "secure checkout by venroys" : "demo products"}</span>
          <span>VAT included · shipping at checkout</span>
        </div>
      </section>
    </main>
  );
}
