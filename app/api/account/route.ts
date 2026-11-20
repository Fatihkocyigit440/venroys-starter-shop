import { z } from "zod";
import { customerToken, forgetCustomer } from "@/lib/customer";
import { validOrigin } from "@/lib/security";
import { ApiError, apiFailure, venroys } from "@/lib/venroys";

// The signed-in shopper, read and written with the secret key + their customer token.
//   GET     profile (GET /customer) and one page of orders (GET /customer/orders?after=)
//   PATCH   name and saved addresses (PATCH /customer); email cannot change
//   DELETE  sign out (DELETE /customer-sessions/current)
// An invalid or expired token signs the shopper out here too.
async function asShopper<T>(run: (token: string) => Promise<T>) {
  const token = await customerToken();
  if (!token) return null;
  try {
    return await run(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await forgetCustomer();
      return null;
    }
    throw e;
  }
}
const noStore = { headers: { "Cache-Control": "private, no-store" } };
export async function GET(request: Request) {
  const after = new URL(request.url).searchParams.get("after");
  try {
    const data = await asShopper(async (customerToken) => {
      const query = after ? `?after=${encodeURIComponent(after.slice(0, 128))}` : "";
      const [customer, orders] = await Promise.all([
        venroys("/customer", { admin: true, customerToken }),
        venroys(`/customer/orders${query}`, { admin: true, customerToken }),
      ]);
      return {
        customer: customer.data,
        orders: orders.data,
        pagination: orders.pagination ?? null,
      };
    });
    return Response.json({ data }, noStore);
  } catch (e) {
    return apiFailure(e);
  }
}
const update = z
  .object({
    name: z.string().max(200).optional(),
    addresses: z.array(z.record(z.string(), z.unknown())).max(5).optional(),
  })
  .strict();
export async function PATCH(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: { message: "Check your details and try again." } }, { status: 400 });
  try {
    const data = await asShopper(async (customerToken) =>
      (await venroys("/customer", { admin: true, customerToken, method: "PATCH", body: parsed.data })).data,
    );
    return data
      ? Response.json({ data }, noStore)
      : Response.json({ error: { message: "Please sign in again." } }, { status: 401 });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function DELETE(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  try {
    await asShopper((customerToken) =>
      venroys("/customer-sessions/current", { admin: true, customerToken, method: "DELETE" }),
    );
  } catch (e) {
    console.error("Sign-out at Venroys failed:", (e as Error).message);
  }
  await forgetCustomer();
  return new Response(null, { status: 204 });
}
