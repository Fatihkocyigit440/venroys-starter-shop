// What this browser remembers about an embedded checkout: never address or payment data.
// In localStorage, not sessionStorage: a bank app often returns the shopper in a new tab.
export type Attempt = {
  signature: string;
  key: string;
  at: number;
  id?: string;
  // Pay was pressed and the outcome is not known yet, so a payment may be open.
  paying?: boolean;
};
export type Outcome = "succeeded" | "processing" | "closed" | "failed" | "open" | "waiting";

const STORE = "shop-embedded-v2";
// Rotated before the two-hour checkout expiry, like the hosted attempt.
const MAX_AGE = 3_600_000;

export function readAttempt(): Attempt | null {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "null");
  } catch {
    return null;
  }
}
export function saveAttempt(attempt: Attempt) {
  try {
    localStorage.setItem(STORE, JSON.stringify(attempt));
  } catch {}
}
export function clearAttempt() {
  try {
    localStorage.removeItem(STORE);
  } catch {}
}
// One key per bag, so a retry reopens the same checkout. A possibly open payment keeps its
// checkout however old it is: a new one could charge the shopper twice.
export function nextAttempt(
  saved: Attempt | null,
  signature: string,
  now: number,
  newKey: () => string,
): Attempt {
  if (saved?.signature === signature && (saved.paying || now - saved.at < MAX_AGE)) return saved;
  return { signature, key: newKey(), at: now };
}
// Payment status from GET /checkouts/:id. A canceled payment also reads as pending there.
export function outcomeOf(status: string): Outcome {
  if (status === "paid") return "succeeded";
  if (status === "processing") return "processing";
  if (status === "refunded" || status === "disputed") return "closed";
  if (status === "failed") return "failed";
  if (status === "open") return "open";
  return "waiting";
}
// Refusals Venroys says are about the store, not this checkout: a new one would not help,
// and a payment can still be open behind them.
const STORE_REFUSALS = ["store_unavailable", "payments_unavailable"];
export function needsNewCheckout(error: { status?: number; code?: string }) {
  return error.status === 409 && !STORE_REFUSALS.includes(error.code ?? "");
}
// A definite refusal means no payment was created. Anything else may have reached the bank,
// including a 409, which needs the status check first.
export function paymentRefused(error: { status?: number }) {
  return !!error.status && error.status < 500 && ![409, 429].includes(error.status);
}
