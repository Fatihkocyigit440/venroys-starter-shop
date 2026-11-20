import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProducts, fromVenroys } from "../lib/products";
import {
  absolute,
  isTestProduct,
  jsonLdHtml,
  pageMetadata,
  productJsonLd,
} from "../lib/seo";
const live = fromVenroys(
  {
    slug: "go-go-nyc-571",
    name: "go go nyc",
    image_url: "https://files.cdn.printful.com/a.png",
    currency: "EUR",
    variants: [
      { id: 1, price: "35.00", size: "M", available: true },
      { id: 2, price: "38.50", size: "XXL", stock: 0 },
    ],
  },
  0,
)!;
test("test listings are recognised by name only", () => {
  assert.equal(isTestProduct({ ...live, name: "TEST tee 1 qwerty" }), true);
  assert.equal(isTestProduct({ ...live, name: "test" }), true);
  assert.equal(isTestProduct({ ...live, name: "testament hoodie" }), false);
  assert.equal(isTestProduct(live), false);
});
test("live products carry an aggregate offer; demo products carry none", () => {
  const offers = productJsonLd(live).offers!;
  assert.equal(offers.lowPrice, "35.00");
  assert.equal(offers.highPrice, "38.50");
  assert.equal(offers.availability, "https://schema.org/InStock");
  assert.deepEqual(productJsonLd(live).image, ["https://files.cdn.printful.com/a.png"]);
  assert.equal(productJsonLd(demoProducts[0]).offers, undefined);
  assert.equal(
    productJsonLd(demoProducts[0]).image[0],
    absolute("/products/tee-front.svg"),
  );
});
test("JSON-LD cannot close its script tag", () => {
  const html = jsonLdHtml({ name: "</script><script>alert(1)</script>" }).__html;
  assert.equal(html.includes("<"), false);
});
test("pages get a canonical URL and a raster share image", () => {
  const meta = pageMetadata({ path: "/shop/x", images: [absolute("/a.svg")] });
  assert.deepEqual(meta.alternates, { canonical: "/shop/x" });
  const [image] = meta.openGraph!.images as { url: string }[];
  assert.equal(image.url, absolute("/opengraph-image"));
});
