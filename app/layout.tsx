import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/seo";
import { shop } from "@/shop.config";
import "./globals.css";
const inter = localFont({
  src: "../public/fonts/inter.woff2",
  weight: "300 400",
  variable: "--font-inter",
  display: "swap",
});
const mono = localFont({
  src: "../public/fonts/space-mono.woff2",
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});
// Colors from shop.config.ts, written over the defaults in globals.css.
const { dark, light, accent, onAccent } = shop.theme;
const themeCss =
  `html:root{--bg:${dark.background};--surface:${dark.surface};--text:${dark.text};--muted:${dark.muted};` +
  `--accent:${accent};--on-accent:${onAccent}}` +
  `html:root[data-store-theme="light"]{--bg:${light.background};--surface:${light.surface};` +
  `--text:${light.text};--muted:${light.muted}}`;
// Indexable pages add their own canonical URL via pageMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${shop.name} — ${shop.tagline}`, template: `%s — ${shop.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: shop.locale.replace("-", "_"),
    title: `${shop.name} — ${shop.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={shop.locale.split("-")[0]}
      className={`${inter.variable} ${mono.variable}`}
    >
      <head>
        <style>{themeCss}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
