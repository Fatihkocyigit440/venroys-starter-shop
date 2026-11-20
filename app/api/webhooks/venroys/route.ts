import { after } from "next/server";
import { invalidateCatalog } from "@/lib/shop-catalog";
import {
  parseEvent,
  verificationChallenge,
  verifySignature,
  webhookSecrets,
} from "@/lib/webhooks";

const MAX_BODY = 256 * 1024;
const empty = (status: number, headers?: HeadersInit) =>
  new Response(null, { status, headers });

// Venroys webhook receiver: https://<your-domain>/api/webhooks/venroys
// Optional. Without it the shop still works; product changes just show up within 30 seconds
// instead of right away.
// 1. Answers the unsigned opt-in handshake with the challenge header.
// 2. Verifies the HMAC signature on the raw body before parsing anything.
// 3. Clears the product cache when products, collections or stock change.
// It keeps no database, so it only does things that are safe to repeat: Venroys may send
// the same event more than once. To act on orders (emails, stock in another system),
// store each event id first and skip ids you have seen. Payloads carry ids only; read
// the current state from the API before acting on one.
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) return empty(413);
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.length > MAX_BODY) return empty(413);
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return empty(400);
  }
  const challenge = verificationChallenge(body);
  if (challenge && !request.headers.get("venroys-signature"))
    return empty(200, { "Venroys-Webhook-Challenge": challenge });
  if (
    !verifySignature(raw, request.headers.get("venroys-signature"), webhookSecrets())
  )
    return empty(401);
  const event = parseEvent(body);
  if (!event) return empty(400);
  after(() => {
    if (/^(product|collection|inventory|provider_inventory)\./.test(event.type))
      invalidateCatalog();
  });
  return empty(204);
}
