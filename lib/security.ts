import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export function equal(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return value;
  // No SESSION_SECRET: derive one from the Venroys secret key, so the shop needs only its
  // two keys. Set SESSION_SECRET (32+ characters) to keep carts when you replace the key.
  const key = process.env.VENROYS_SECRET_KEY;
  if (key)
    return createHmac("sha256", key).update("shop-session-v1").digest("base64url");
  throw new Error(
    "Set VENROYS_SECRET_KEY (or SESSION_SECRET, 32+ characters) to sign cart cookies.",
  );
}
export function sign(value: string, purpose: string, seconds: number) {
  const data = Buffer.from(
    JSON.stringify({ value, purpose, exp: Date.now() + seconds * 1000 }),
  ).toString("base64url");
  return `${data}.${createHmac("sha256", secret()).update(data).digest("base64url")}`;
}
export function verify(
  token: string | undefined,
  purpose: string,
): string | null {
  if (!token) return null;
  try {
    const [data, signature, extra] = token.split(".");
    if (
      extra ||
      !signature ||
      !equal(
        signature,
        createHmac("sha256", secret()).update(data).digest("base64url"),
      )
    )
      return null;
    const decoded = JSON.parse(Buffer.from(data, "base64url").toString());
    return decoded.purpose === purpose &&
      decoded.exp > Date.now() &&
      typeof decoded.value === "string"
      ? decoded.value
      : null;
  } catch {
    return null;
  }
}
export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const url = new URL(request.url);
  return origin === url.origin;
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
