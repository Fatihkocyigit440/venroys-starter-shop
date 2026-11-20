export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "request_failed",
    public requestId?: string,
    public retryAfter?: string,
  ) {
    super(message);
  }
}
export const API_BASES = [
  "https://venroys.com/api/v1",
  "https://sandbox.venroys.com/api/v1",
];
// One call into the Venroys Commerce API (docs/venroys.md lists every endpoint used).
// The credential defaults to this store's own keys: the publishable key for storefront
// endpoints, or the secret key with `admin`. `token` + `base` override both, for a
// connected seller's OAuth token or a delegated cart session.
export async function venroys(
  path: string,
  options: {
    admin?: boolean;
    method?: string;
    body?: unknown;
    key?: string;
    token?: string;
    base?: string;
    // A signed-in shopper (Venroys-Customer-Token), sent alongside the credential.
    customerToken?: string;
  } = {},
) {
  const token =
    options.token ??
    (options.admin
      ? process.env.VENROYS_SECRET_KEY
      : process.env.VENROYS_PUBLISHABLE_KEY);
  if (!token)
    throw new ApiError(
      503,
      "The store connection has not been configured.",
      "not_configured",
    );
  // Test keys (vr_pk_test_, vr_sk_test_) go to the practice store, live keys to the real one.
  const base =
    options.base ||
    process.env.VENROYS_API_BASE ||
    (token.includes("_test_")
      ? "https://sandbox.venroys.com/api/v1"
      : "https://venroys.com/api/v1");
  if (!API_BASES.includes(base))
    throw new ApiError(503, "Invalid API environment.");
  if (
    (base.includes("sandbox") && !token.includes("_test_")) ||
    (!base.includes("sandbox") && !token.includes("_live_"))
  )
    throw new ApiError(503, "API environment and credential do not match.");
  const response = await fetch(base + path, {
    method: options.method || "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    redirect: "error",
    headers: {
      Authorization: `Bearer ${token}`,
      "Venroys-API-Version": "2026-09",
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.key ? { "Idempotency-Key": options.key } : {}),
      ...(options.customerToken
        ? { "Venroys-Customer-Token": options.customerToken }
        : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      payload?.error?.message || "Venroys is temporarily unavailable.",
      payload?.error?.code,
      payload?.error?.request_id,
      response.headers.get("Retry-After") || undefined,
    );
  return payload;
}
// Hosted checkout links must stay on Venroys.
export function trustedCheckoutUrl(value: unknown) {
  const url = new URL(String(value));
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !(url.hostname === "venroys.com" || url.hostname.endsWith(".venroys.com"))
  )
    throw new Error("Unexpected checkout destination");
  return url.href;
}
export function apiFailure(error: unknown) {
  if (error instanceof ApiError)
    return Response.json(
      {
        error: {
          message: error.message,
          code: error.code,
          request_id: error.requestId,
        },
      },
      {
        status: error.status,
        headers: {
          "Cache-Control": "private, no-store",
          ...(error.retryAfter ? { "Retry-After": error.retryAfter } : {}),
        },
      },
    );
  return Response.json(
    {
      error: {
        message:
          "The request could not be completed. Please retry the same operation.",
        code: "connection_error",
      },
    },
    { status: 502 },
  );
}
