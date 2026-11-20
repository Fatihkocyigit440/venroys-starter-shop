import { test } from "node:test";
import assert from "node:assert/strict";
import {
  needsNewCheckout,
  nextAttempt,
  outcomeOf,
  paymentRefused,
  type Attempt,
} from "../lib/embedded-attempt";

const now = 10_000_000;
const newKey = () => "new-key";
const saved: Attempt = { signature: "bag", key: "old-key", at: now - 1000, id: "c1" };

test("the same bag reopens the same checkout", () => {
  assert.equal(nextAttempt(saved, "bag", now, newKey), saved);
});

test("a changed bag or an old checkout gets a new key", () => {
  assert.equal(nextAttempt(saved, "other", now, newKey).key, "new-key");
  assert.equal(nextAttempt({ ...saved, at: now - 3_600_001 }, "bag", now, newKey).key, "new-key");
  assert.equal(nextAttempt(null, "bag", now, newKey).key, "new-key");
});

test("a possibly open payment keeps its checkout, however old", () => {
  const paying = { ...saved, at: now - 9_000_000, paying: true };
  assert.equal(nextAttempt(paying, "bag", now, newKey), paying);
});

test("only Venroys' payment status decides the outcome", () => {
  assert.equal(outcomeOf("paid"), "succeeded");
  assert.equal(outcomeOf("processing"), "processing");
  assert.equal(outcomeOf("refunded"), "closed");
  assert.equal(outcomeOf("disputed"), "closed");
  assert.equal(outcomeOf("failed"), "failed");
  assert.equal(outcomeOf("open"), "open");
  assert.equal(outcomeOf("pending"), "waiting");
  assert.equal(outcomeOf("anything-new"), "waiting");
});

test("store refusals never start a new checkout", () => {
  assert.equal(needsNewCheckout({ status: 409, code: "checkout_step_failed" }), true);
  assert.equal(needsNewCheckout({ status: 409, code: "store_unavailable" }), false);
  assert.equal(needsNewCheckout({ status: 409, code: "payments_unavailable" }), false);
  assert.equal(needsNewCheckout({ status: 400 }), false);
  assert.equal(needsNewCheckout({}), false);
});

test("only a definite refusal rules out an open payment", () => {
  assert.equal(paymentRefused({ status: 400 }), true);
  assert.equal(paymentRefused({ status: 409 }), false);
  assert.equal(paymentRefused({ status: 429 }), false);
  assert.equal(paymentRefused({ status: 503 }), false);
  assert.equal(paymentRefused({}), false);
});
