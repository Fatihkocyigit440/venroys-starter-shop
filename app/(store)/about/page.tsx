import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { shop } from "@/shop.config";
export const metadata = pageMetadata({
  title: shop.about.heading,
  description: shop.about.paragraphs[0],
  path: "/about",
});
// The text comes from shop.config.ts (about).
export default function AboutPage() {
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">{shop.name}</span>
      <h1>{shop.about.heading}</h1>
      {shop.about.paragraphs.map((text, i) => (
        <p key={i} className={i === 0 ? "nt-lead" : undefined}>
          {text}
        </p>
      ))}
      <div className="nt-prose-links">
        <a href={`mailto:${shop.contact}`}>contact us ↗</a>
        <Link href="/shipping">shipping ↗</Link>
        <Link href="/returns">returns ↗</Link>
      </div>
    </main>
  );
}
