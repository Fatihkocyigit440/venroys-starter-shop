import { cookies } from "next/headers";
import { ApiError, apiFailure, venroys } from "@/lib/venroys";
import { validOrigin, verify } from "@/lib/security";

// The Venroys cart behind the bag (created by /api/checkout, id in a signed cookie).
// GET restores the bag when the browser lost its saved copy but kept the cookie, which
// Safari does after seven days. DELETE forgets the cart once the shopper clears the bag.
export async function GET() {
  const jar = await cookies();
  const id = verify(jar.get("shop_cart")?.value, "cart");
  if (!id) return Response.json({ data: null });
  try {
    const cart = await venroys(`/carts/${encodeURIComponent(id)}`);
    return Response.json(
      { data: { items: cart.data.items ?? [] } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (e instanceof ApiError && [401, 403, 404, 409, 410].includes(e.status)) {
      jar.delete("shop_cart");
      return Response.json({ data: null });
    }
    return apiFailure(e);
  }
}
export async function DELETE(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  (await cookies()).delete("shop_cart");
  return new Response(null, { status: 204 });
}
