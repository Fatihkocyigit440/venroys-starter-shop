import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

// Account and checkout stay crawlable so bots can read their noindex tags.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absolute("/sitemap.xml"),
  };
}
