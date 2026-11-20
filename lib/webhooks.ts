import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookEvent = {
  id: string;
  type: string;
  created_at: string;
  api_version: string;
  test: boolean;
  data: { resource_id: string | number };
};

const TOLERANCE_SECONDS = 300;

// Verifies `Venroys-Signature: t=UNIX_SECONDS,v1=HEX[,v1=HEX]` against the exact raw
// body bytes. Several v1 values arrive during an overlap rotation and several secrets
// may be configured (comma-separated VENROYS_WEBHOOK_SECRETS); any match is accepted.
export function verifySignature(
  raw: Buffer,
  header: string | null,
  secrets: string[],
  now = Date.now(),
) {
  if (!header || !secrets.length) return false;
  let timestamp = "";
  const signatures: Buffer[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t") timestamp = v;
    else if (k === "v1" && /^[0-9a-f]{64}$/i.test(v))
      signatures.push(Buffer.from(v, "hex"));
  }
  if (!/^\d{1,12}$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(raw)
      .digest();
    return signatures.some((s) => timingSafeEqual(s, expected));
  });
}

// The unsigned opt-in handshake sent before an endpoint is saved or its URL changes.
// It proves we asked for events; it is never a commerce event and triggers nothing.
export function verificationChallenge(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return b.type === "endpoint.verification" &&
    b.test === true &&
    typeof b.challenge === "string" &&
    /^[0-9a-f]{64}$/.test(b.challenge) &&
    Object.keys(b).every((k) => ["type", "test", "challenge"].includes(k))
    ? b.challenge
    : null;
}

export function parseEvent(body: unknown): WebhookEvent | null {
  if (!body || typeof body !== "object") return null;
  const e = body as Record<string, any>;
  return typeof e.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(e.id) &&
    typeof e.type === "string" &&
    typeof e.created_at === "string" &&
    !Number.isNaN(Date.parse(e.created_at)) &&
    typeof e.test === "boolean" &&
    e.data &&
    typeof e.data === "object"
    ? (e as WebhookEvent)
    : null;
}

export const webhookSecrets = () =>
  (process.env.VENROYS_WEBHOOK_SECRETS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
