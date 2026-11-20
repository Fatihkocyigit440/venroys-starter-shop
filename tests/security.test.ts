import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify, validOrigin } from "../lib/security";
process.env.SESSION_SECRET =
  "test-only-secret-at-least-thirty-two-characters-long";
test("Signed capabilities reject tampering, cross-purpose use, and expiry", () => {
  const token = sign("cart-id", "cart", 60);
  assert.equal(verify(token, "cart"), "cart-id");
  assert.equal(verify(token, "admin"), null);
  assert.equal(verify(token + "x", "cart"), null);
  assert.equal(verify(sign("owner", "admin", -1), "admin"), null);
  assert.equal(verify(undefined, "admin"), null);
});
test("Mutations require the same origin, not a subdomain or absent origin", () => {
  assert.equal(
    validOrigin(
      new Request("https://shop.example/api/cart", {
        headers: { origin: "https://shop.example" },
      }),
    ),
    true,
  );
  assert.equal(
    validOrigin(
      new Request("https://shop.example/api/cart", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    validOrigin(new Request("https://shop.example/api/cart")),
    false,
  );
});
