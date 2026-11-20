import { z } from "zod";
import { saveCustomerToken } from "@/lib/customer";
import { validOrigin } from "@/lib/security";
import { apiFailure, venroys } from "@/lib/venroys";
// Step 2 of shopper sign-in: exchange the emailed code for a 14-day customer token
// (POST /customer-sessions), kept only in an HttpOnly cookie.
const body = z
  .object({ challenge_id: z.string().min(1).max(100), code: z.string().regex(/^\d{8}$/) })
  .strict();
export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { message: "Enter the eight-digit code from your email." } }, { status: 400 });
  const key = request.headers.get("Idempotency-Key");
  if (!key || !/^[\x21-\x7E]{8,128}$/.test(key))
    return Response.json({ error: { message: "Missing operation identifier." } }, { status: 400 });
  try {
    const result = await venroys("/customer-sessions", {
      admin: true,
      method: "POST",
      key,
      body: parsed.data,
    });
    await saveCustomerToken(result.data.token, result.data.expires_at);
    return Response.json({ data: { signed_in: true } });
  } catch (e) {
    return apiFailure(e);
  }
}
