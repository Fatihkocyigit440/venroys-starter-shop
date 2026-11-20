import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  parseEvent,
  verificationChallenge,
  verifySignature,
} from "../lib/webhooks";

const sign = (secret: string, t: number, body: string) =>
  createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

test("webhook signatures: exact raw body, five-minute window, rotation overlap", () => {
  const body = Buffer.from('{"id":"1","type":"order.paid"}');
  const now = 1_800_000_000_000;
  const t = now / 1000;
  const good = `t=${t},v1=${sign("whsec_new", t, body.toString())}`;
  assert.equal(verifySignature(body, good, ["whsec_new"], now), true);
  assert.equal(verifySignature(body, good, ["whsec_other"], now), false);
  assert.equal(verifySignature(Buffer.from(body.toString() + " "), good, ["whsec_new"], now), false);
  assert.equal(verifySignature(body, good, ["whsec_new"], now + 301_000), false);
  assert.equal(verifySignature(body, null, ["whsec_new"], now), false);
  assert.equal(verifySignature(body, good, [], now), false);
  // During an overlap rotation Venroys sends two v1 values; either secret may be ours.
  const both = `t=${t},v1=${sign("whsec_old", t, body.toString())},v1=${sign("whsec_new", t, body.toString())}`;
  assert.equal(verifySignature(body, both, ["whsec_old"], now), true);
  assert.equal(verifySignature(body, both, ["whsec_new"], now), true);
  assert.equal(verifySignature(body, `t=${t},v1=zz`, ["whsec_new"], now), false);
});

test("webhook handshake and event envelope are parsed strictly", () => {
  const challenge = "a".repeat(64);
  assert.equal(
    verificationChallenge({ type: "endpoint.verification", test: true, challenge }),
    challenge,
  );
  assert.equal(
    verificationChallenge({ type: "endpoint.verification", test: true, challenge, extra: 1 }),
    null,
  );
  assert.equal(verificationChallenge({ type: "order.paid", test: true, challenge }), null);
  const event = {
    id: "3f2a8c1e-1d2b-4c5d-8e9f-0a1b2c3d4e5f",
    type: "order.paid",
    created_at: "2026-10-30T10:00:00Z",
    api_version: "2026-09",
    test: false,
    data: { resource_id: 42 },
  };
  assert.deepEqual(parseEvent(event), event);
  assert.equal(parseEvent({ ...event, id: "1" }), null);
  assert.equal(parseEvent({ ...event, data: undefined }), null);
});
