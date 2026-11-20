import { ImageResponse } from "next/og";
import { shop } from "@/shop.config";

// The default share card for every page without its own product image.
export const alt = `${shop.name}. ${shop.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: shop.theme.dark.background,
          color: shop.theme.dark.text,
        }}
      >
        <div style={{ display: "flex", fontSize: 64, letterSpacing: -6 }}>
          {shop.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 88, letterSpacing: -3 }}>
            {shop.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 36, color: shop.theme.dark.muted }}>
            {shop.description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
