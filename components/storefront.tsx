"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { shop } from "@/shop.config";
import { useShop } from "./shop/shop-provider";
import { ProductCard } from "./shop/primitives";
export default function Storefront() {
  const { live, products } = useShop();
  return (
    <main id="main">
      <section className="nt-hero" aria-labelledby="hero-heading">
        <div className="nt-hero-top nt-label">
          <span>{shop.home.eyebrow}</span>
          {!live && <span className="nt-status">demo products</span>}
        </div>
        <div className="nt-hero-center">
          <h1 id="hero-heading" className="nt-hero-title">
            {shop.home.heading}
          </h1>
          <div className="nt-hero-subrow">
            <div>
              <p className="nt-hero-copy">{shop.home.intro}</p>
              <Link href="/shop" className="nt-button">
                {shop.home.button} <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="nt-section" aria-labelledby="collection-heading">
        <div className="nt-section-heading">
          <div>
            <span className="nt-label nt-muted">{shop.name}</span>
            <h2 id="collection-heading">the collection.</h2>
          </div>
          <p>{shop.tagline}</p>
        </div>
        {!live && <DemoNotice />}
        <div className="nt-product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
        <div className="nt-collection-note nt-mono">
          <span>{live ? "secure checkout by venroys" : "demo products"}</span>
          <span>prices include VAT</span>
        </div>
      </section>
    </main>
  );
}
// Shown while there is no live catalog: tells the shop owner what to do next.
export function DemoNotice() {
  return (
    <p className="nt-bag-note" role="note">
      These are demo products. To show your own, add your Venroys keys and publish a
      product in Venroys. Run <code>npm run check</code> to see what is missing.
    </p>
  );
}
