import { cookies } from "next/headers";
import { z } from "zod";
import { customerToken, forgetCustomer } from "@/lib/customer";
import { cookieOptions, sign, validOrigin, verify } from "@/lib/security";
import { ApiError, apiFailure, trustedCheckoutUrl, venroys } from "@/lib/venroys";

const bodySchema = z
  .object({
    items: z
      .array(
        z.object({
          variant_id: z.number().int().positive(),
          quantity: z.number().int().min(1).max(25),
        }),
      )
      .min(1)
      .max(50),
    discount_code: z.string().trim().min(1).max(64).optional(),
  })
  .strict();
const appearance = {
  accent: "#111111",
  background: "#ffffff",
  font: "sans",
  corners: "square",
} as const;
const CART_DAYS = 7;

// Hosted checkout for the whole bag. The client keeps one Idempotency-Key per bag (and
// discount code), and every upstream write derives its own key from it, so retrying
// after a lost response replays the same steps and returns the same checkout.
//
// Signed-in shopper: POST /checkouts with the secret key + Venroys-Customer-Token, so the
// order appears in their account. Needs `checkout:create` on the secret key; without it
// the shopper checks out as a guest instead (`linked: false`).
// Guest: the publishable key's cart (id in a signed cookie) is replaced with the bag
// (PATCH /carts/:id) or created (POST /carts), then POST /checkouts with that cart_id.
export async function POST(request: Request) {
  try {
    if (!validOrigin(request))
      return Response.json(
        { error: { message: "Invalid request origin." } },
        { status: 403 },
      );
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (
      !parsed.success ||
      new Set(parsed.data.items.map((i) => i.variant_id)).size !==
        parsed.data.items.length
    )
      return Response.json(
        {
          error: {
            message: "Your bag is empty or has changed. Please review it.",
          },
        },
        { status: 400 },
      );
    const key = request.headers.get("Idempotency-Key");
    if (!key || !/^[\x21-\x7E]{8,100}$/.test(key))
      return Response.json(
        { error: { message: "A valid attempt identifier is required." } },
        { status: 400 },
      );
    const { items, discount_code } = parsed.data;
    const discount = discount_code ? { discount_code } : {};
    const done = (checkoutUrl: unknown, linked: boolean) =>
      Response.json(
        { data: { checkout_url: trustedCheckoutUrl(checkoutUrl), linked } },
        { headers: { "Cache-Control": "private, no-store" } },
      );

    const shopper = await customerToken();
    if (shopper)
      try {
        const result = await venroys("/checkouts", {
          admin: true,
          customerToken: shopper,
          method: "POST",
          key: `${key}:checkout-account`,
          body: { items, mode: "hosted", appearance, ...discount },
        });
        return done(result.data.checkout_url, true);
      } catch (e) {
        if (e instanceof ApiError && e.code === "invalid_customer_token") {
          await forgetCustomer();
          return Response.json(
            {
              error: {
                message:
                  "You’ve been signed out. Sign in again, or continue to check out as a guest.",
                code: "signed_out",
              },
            },
            { status: 401 },
          );
        }
        if (!(e instanceof ApiError && e.code === "missing_scope")) throw e;
        console.warn(
          "Secret key lacks checkout:create; signed-in shopper checks out as guest.",
        );
      }

    const jar = await cookies();
    let cartId = verify(jar.get("shop_cart")?.value, "cart");
    if (cartId)
      try {
        await venroys(`/carts/${encodeURIComponent(cartId)}`, {
          method: "PATCH",
          key: `${key}:cart-replace`,
          body: { items },
        });
      } catch (e) {
        // Expired, checked out or otherwise unusable: start a fresh cart.
        if (!(e instanceof ApiError && [401, 403, 404, 409, 410].includes(e.status)))
          throw e;
        cartId = null;
      }
    if (!cartId) {
      const cart = await venroys("/carts", {
        method: "POST",
        key: `${key}:cart`,
        body: { items },
      });
      cartId = String(cart.data.id);
      jar.set("shop_cart", sign(cartId, "cart", CART_DAYS * 86400), {
        ...cookieOptions,
        maxAge: CART_DAYS * 86400,
      });
    }
    const result = await venroys("/checkouts", {
      method: "POST",
      key: `${key}:checkout`,
      body: { cart_id: cartId, mode: "hosted", appearance, ...discount },
    });
    return done(result.data.checkout_url, false);
  } catch (e) {
    return apiFailure(e);
  }
}
