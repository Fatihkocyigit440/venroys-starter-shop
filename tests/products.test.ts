import { test } from "node:test";
import assert from "node:assert/strict";
import {
  available,
  demoShippingCents,
  sortSizes,
  demoProducts as products,
  fromVenroys,
  sanitizeBag,
  subtotal,
} from "../lib/products";
import { trustedCheckoutUrl } from "../lib/venroys";
test("demo products can always go in the bag; live ones follow Venroys stock", () => {
  for (const p of products) assert.equal(available(p), true);
});
test("persisted bags reject unknown products, invalid sizes and quantities", () => {
  const valid = { slug: products[0].slug, size: "m", quantity: 2 };
  assert.deepEqual(sanitizeBag(null, products), []);
  assert.deepEqual(
    sanitizeBag([
      null,
      {},
      valid,
      { ...valid, slug: "unknown" },
      { ...valid, size: "invalid" },
      { ...valid, quantity: 0 },
      { ...valid, quantity: 1.5 },
      { ...valid, quantity: "2" },
    ], products),
    [valid],
  );
  assert.deepEqual(sanitizeBag([valid, { ...valid, quantity: 100 }], products), [
    { ...valid, quantity: 25 },
  ]);
});
test("bag totals stay in integer cents and keep sizes separate", () => {
  const items = sanitizeBag([
    { slug: products[0].slug, size: "m", quantity: 2 },
    { slug: products[0].slug, size: "l", quantity: 1 },
    { slug: products[3].slug, size: "one size", quantity: 1 },
  ], products);
  assert.equal(items.length, 3);
  assert.equal(subtotal(items, products), 12900);
  assert.equal(subtotal(items, products) + demoShippingCents, 13395);
});
test("Venroys products map to purchasable variants with per-size prices", () => {
  const product = fromVenroys(
    {
      slug: "absence-tee-901",
      title: "Absence Tee",
      description: "",
      image_url: "https://images.example/tee.jpg",
      currency: "EUR",
      variants: [
        { id: "11", price: "38", size: "M" },
        { id: "12", price: "42.5", size: "XL", stock: 0 },
        { id: "bad", price: "10", size: "S" },
      ],
    },
    0,
  )!;
  assert.deepEqual(product.sizes, ["m", "xl"]);
  assert.equal(product.priceCents, 3800);
  assert.equal(product.number, "01");
  assert.equal(available(product), true);
  assert.equal(available(product, "xl"), false);
  const bag = sanitizeBag(
    [
      { slug: product.slug, size: "m", quantity: 1 },
      { slug: product.slug, size: "xl", quantity: 2 },
    ],
    [product],
  );
  assert.equal(subtotal(bag, [product]), 3800 + 8500);
  assert.equal(
    fromVenroys({ slug: "empty", title: "Empty", variants: [] }, 0),
    null,
  );
  assert.equal(
    fromVenroys(
      {
        slug: "x",
        title: "X",
        image_url: "http://insecure.example/x.jpg",
        variants: [{ id: 1, price: "1" }],
      },
      0,
    )!.images[0].src,
    "/products/coming-soon.svg",
  );
});
test("checkout redirects only to Venroys over HTTPS", () => {
  assert.equal(
    trustedCheckoutUrl("https://venroys.com/checkout/abc"),
    "https://venroys.com/checkout/abc",
  );
  assert.ok(trustedCheckoutUrl("https://app.venroys.com/c/abc"));
  for (const bad of [
    "http://venroys.com/c",
    "https://venroys.com.evil.example/c",
    "https://evilvenroys.com/c",
    "https://user@venroys.com/c",
    "javascript:alert(1)",
  ])
    assert.throws(() => trustedCheckoutUrl(bad));
});

test("sizes show smallest to largest within each color", () => {
  assert.deepEqual(
    sortSizes(["stone / m", "stone / 2xl", "stone / l", "stone / xl", "stone / s"]),
    ["stone / s", "stone / m", "stone / l", "stone / xl", "stone / 2xl"],
  );
  assert.deepEqual(
    sortSizes(["black / l", "white / s", "black / xs", "white / xxl"]),
    ["black / xs", "black / l", "white / s", "white / xxl"],
  );
  assert.deepEqual(sortSizes(["42", "38", "40"]), ["38", "40", "42"]);
  assert.deepEqual(sortSizes(["one size"]), ["one size"]);
});
