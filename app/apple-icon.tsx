import { ImageResponse } from "next/og";
import { shop } from "@/shop.config";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: shop.theme.accent,
          color: shop.theme.onAccent,
          fontSize: 104,
          
        }}
      >
        {shop.name.trim().charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
