import { cookies } from "next/headers";
import { cookieOptions, sign, verify } from "@/lib/security";

// Shopper sign-in (Venroys customer accounts) is done server-side with the secret key,
// so the 14-day customer token lives only in this signed, HttpOnly cookie and is never
// visible to page scripts. Venroys accepts it only together with our secret key.
const COOKIE = "shop_customer";
export async function customerToken() {
  return verify((await cookies()).get(COOKIE)?.value, "customer");
}
export async function saveCustomerToken(token: string, expiresAt: string) {
  const seconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000);
  if (!(seconds > 0)) return;
  (await cookies()).set(COOKIE, sign(token, "customer", seconds), {
    ...cookieOptions,
    maxAge: seconds,
  });
}
export async function forgetCustomer() {
  (await cookies()).delete(COOKIE);
}
