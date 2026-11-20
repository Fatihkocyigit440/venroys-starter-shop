import Storefront from "@/components/storefront";
import { jsonLdHtml, organizationJsonLd, pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ path: "/" });
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(organizationJsonLd)}
      />
      <Storefront />
    </>
  );
}
