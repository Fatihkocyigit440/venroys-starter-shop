import type { NextConfig } from "next";
// The browser needs the publishable key only for embedded checkout. Reuse the server's
// VENROYS_PUBLISHABLE_KEY so the shop needs just two keys; test keys use the practice store.
const publishable =
  process.env.NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY ||
  process.env.VENROYS_PUBLISHABLE_KEY ||
  "";
const config: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY: publishable,
    NEXT_PUBLIC_VENROYS_API_ORIGIN:
      process.env.NEXT_PUBLIC_VENROYS_API_ORIGIN ||
      (publishable.includes("_test_") ? "https://sandbox.venroys.com" : ""),
    NEXT_PUBLIC_VENROYS_CHECKOUT_MODE:
      process.env.NEXT_PUBLIC_VENROYS_CHECKOUT_MODE || "hosted",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};
export default config;
