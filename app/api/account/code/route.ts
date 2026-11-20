import { z } from "zod";
import { validOrigin } from "@/lib/security";
import { apiFailure, venroys } from "@/lib/venroys";
// Step 1 of shopper sign-in: Venroys emails an eight-digit code (POST /customer-codes).
// The answer is the same whether or not the email has an account.
const body = z.object({ email: z.string().email().max(254) }).strict();
export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { message: "Enter a valid email address." } }, { status: 400 });
  const key = request.headers.get("Idempotency-Key");
  if (!key || !/^[\x21-\x7E]{8,128}$/.test(key))
    return Response.json({ error: { message: "Missing operation identifier." } }, { status: 400 });
  try {
    const result = await venroys("/customer-codes", {
      admin: true,
      method: "POST",
      key,
      body: parsed.data,
    });
    return Response.json({ data: { challenge_id: result.data.challenge_id } });
  } catch (e) {
    return apiFailure(e);
  }
}
