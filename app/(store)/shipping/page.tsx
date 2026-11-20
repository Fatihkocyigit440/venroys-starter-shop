import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { shop } from "@/shop.config";
export const metadata = pageMetadata({
  title: "shipping",
  description: `How ${shop.name} ships your order, and where you see the delivery price.`,
  path: "/shipping",
});
// The text comes from shop.config.ts (shipping). Delivery prices are set in Venroys.
export default function ShippingPage() {
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">{shop.name}</span>
      <h1>shipping</h1>
      {shop.shipping.lines.map((text, i) => (
        <p key={i} className={i === 0 ? "nt-lead" : undefined}>
          {text}
        </p>
      ))}
      <h2>questions</h2>
      <p>
        Email <a href={`mailto:${shop.contact}`}>{shop.contact}</a> with your order
        email address.
      </p>
      <Link href="/shop">back to the shop ↗</Link>
    </main>
  );
}
