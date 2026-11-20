"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import {
  clearAttempt,
  needsNewCheckout,
  nextAttempt,
  outcomeOf,
  paymentRefused,
  readAttempt,
  saveAttempt,
  type Outcome,
} from "@/lib/embedded-attempt";
import { Button } from "./primitives";
import { useShop } from "./shop-provider";

// Embedded checkout: delivery and payment on this page, through Venroys' own browser
// helper (venroys.com/venroys-checkout.mjs) and Stripe.js. Payment data goes to Stripe
// only; the browser never sets the price or marks an order paid.
//
// Off by default. Enable with NEXT_PUBLIC_VENROYS_CHECKOUT_MODE=embedded once Venroys has
// enabled embedded checkout for the store (otherwise 503 embedded_not_enabled). Needs
// NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY, whose approved origins include this site exactly
// (otherwise 403 origin_not_allowed), and HTTPS. When any of that is missing the shopper
// is sent to hosted checkout before anything is charged. Stripe shows the methods the
// store enabled (cards, Link, iDEAL, Bancontact, EPS, Klarna; no wallets). No discount
// codes (the helper does not pass them): hosted checkout stays one click away until a
// payment is attempted. Bank and pay-later methods leave the site and come back to
// /checkout?checkout_id=…, where the real status is read from Venroys (never from the
// URL). Fulfil only on the signed order.paid webhook, never here.
export const embeddedEnabled =
  process.env.NEXT_PUBLIC_VENROYS_CHECKOUT_MODE === "embedded" &&
  !!process.env.NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY;

const HELPER: string = "https://venroys.com/venroys-checkout.mjs";
type Item = { variant_id: number; quantity: number };
type Option = Record<string, any>;
type VenroysCheckout = {
  id: string;
  hostedCheckoutUrl: string;
  info: Record<string, any>;
  quote(details: unknown): Promise<{ shipping_total?: number | string; shipping_options?: Option[] }>;
  prepare(details: unknown): Promise<Record<string, any>>;
  mountPayment(
    target: HTMLElement,
    handlers: {
      onReady?: () => void;
      onChange?: (e: { complete: boolean }) => void;
      onError?: (e: Error) => void;
    },
  ): void;
  pay(): Promise<{ status: string; returnUrl?: string }>;
  destroy(): void;
};
// [name, label, autocomplete, required, full width]
const fields = [
  ["email", "email address", "email", true, true],
  ["fullName", "full name", "name", true, true],
  ["address", "street & house number", "address-line1", true, true],
  ["address2", "apartment, suite (optional)", "address-line2", false, true],
  ["postalCode", "postcode", "postal-code", true, false],
  ["city", "city", "address-level2", true, false],
  ["phone", "phone (optional)", "tel", false, false],
] as const;
const countries = [
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["DE", "Germany"],
] as const;
const countryName = (code?: string) => countries.find(([c]) => c === code)?.[1] ?? code ?? "";
// Quote options, as Venroys returns them (checked 2026-11-06): { selection_key, method,
// label, amount (major units), currency, selected }. One group per selection_key (one per
// fulfiller); the shopper picks a method in each, sent as { [selection_key]: method },
// the same shape Venroys' hosted checkout sends. Fixed-rate delivery has nothing to choose:
// no options, only shipping_total. An address Venroys can't deliver to is an error instead.
type Group = { key: string; options: Option[] };
function groupOptions(options: Option[]): Group[] {
  const groups = new Map<string, Option[]>();
  for (const o of options) {
    const key = String(o.selection_key ?? o.connection_id ?? "");
    if (key) groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups].map(([key, options]) => ({ key, options }));
}
const optionLabel = (o: Option) => String(o.label ?? o.method).trim();
const optionAmount = (o: Option) => Math.round(Number(o.amount ?? 0) * 100);
// Links Venroys hands back (policies) must be HTTPS on venroys.com.
function venroysLink(value: unknown) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" &&
      (url.hostname === "venroys.com" || url.hostname.endsWith(".venroys.com"))
      ? url.href
      : "";
  } catch {
    return "";
  }
}
// Refusals that mean embedded checkout is not available for this site at all.
const UNAVAILABLE = ["embedded_not_enabled", "origin_not_allowed", "checkout_configuration"];
export type Placed = { status: "succeeded" | "processing" | "closed" };
// The store's page colors (globals.css), sent so the payment fields match the page.
const THEMES = {
  dark: { accent: "#e8e4dc", background: "#141414" },
  light: { accent: "#141414", background: "#e8e4dc" },
} as const;
// An older Venroys refuses the font and field options with a 400 before creating anything.
function styleRefused(error: unknown) {
  const e = error as { status?: number; code?: string; message?: string };
  return (
    e.status === 400 &&
    e.code === "invalid_request" &&
    /appearance option|sans, serif/i.test(e.message ?? "")
  );
}
// Whether Stripe's fields came back light-on-dark, from the text color Venroys chose.
function darkFields(appearance: any) {
  const hex = /^#([0-9a-f]{6})$/i.exec(String(appearance?.variables?.colorText ?? ""))?.[1];
  if (!hex) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

function loadStripe() {
  if ((window as any).Stripe) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure payment fields could not load."));
    document.head.append(script);
  });
}
function markPaying(paying: boolean) {
  const saved = readAttempt();
  if (saved) saveAttempt({ ...saved, paying });
}
const signatureOf = (items: Item[]) => JSON.stringify(items);
export const openPaymentFor = (items: Item[]) => {
  const saved = readAttempt();
  return !!saved?.paying && saved.signature === signatureOf(items);
};
// Read through the helper, and only ever from Venroys: the return URL proves nothing.
async function readOutcome(checkoutId: string): Promise<Outcome> {
  const { getVenroysCheckoutStatus } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ HELPER
  );
  const { status } = await getVenroysCheckoutStatus({
    publishableKey: process.env.NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY,
    apiOrigin: process.env.NEXT_PUBLIC_VENROYS_API_ORIGIN || undefined,
    checkoutId,
  });
  return outcomeOf(status);
}
function dropReturnParam() {
  const url = new URL(location.href);
  if (!url.searchParams.has("checkout_id")) return;
  url.searchParams.delete("checkout_id");
  history.replaceState(history.state, "", url);
}
export type PaymentReturn =
  | { state: "idle"; notice?: string }
  | { state: "checking" }
  | { state: "waiting"; checkoutId: string; mine: boolean };

// The bank redirect comes back here with ?checkout_id=…. A shopper who used the back button
// or closed the tab comes back without it, so a possibly open payment is looked up as well.
// A payment webhook can land a little after the redirect, so a return is checked a few times.
export function usePaymentReturn(enabled: boolean, onPlaced: (placed: Placed) => void) {
  const { clear } = useShop();
  const [current, setCurrent] = useState<PaymentReturn>({ state: "idle" });
  // Only the latest check may report.
  const latest = useRef(0);
  async function check(checkoutId: string, tries: number) {
    const run = ++latest.current;
    setCurrent({ state: "checking" });
    const isMine = () => readAttempt()?.id === checkoutId;
    for (let attempt = 1; ; attempt++) {
      let outcome: Outcome;
      try {
        outcome = await readOutcome(checkoutId);
        if (run !== latest.current) return;
      } catch (e) {
        if (run !== latest.current) return;
        // Unknown or expired (two hours): nothing left to resume or read.
        if ((e as { status?: number }).status === 404) {
          if (isMine()) clearAttempt();
          dropReturnParam();
          return setCurrent({ state: "idle" });
        }
        return setCurrent({ state: "waiting", checkoutId, mine: isMine() });
      }
      if (outcome === "waiting") {
        if (attempt < tries) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          if (run !== latest.current) return;
          continue;
        }
        return setCurrent({ state: "waiting", checkoutId, mine: isMine() });
      }
      if (outcome === "failed" || outcome === "open") {
        if (isMine()) clearAttempt();
        dropReturnParam();
        return setCurrent({
          state: "idle",
          notice:
            outcome === "failed"
              ? "Your payment didn’t go through and you weren’t charged. Try again, or choose another way to pay."
              : undefined,
        });
      }
      // Someone else's link can show a status, but must not empty this visitor's bag.
      if (isMine()) {
        clearAttempt();
        clear();
      }
      setCurrent({ state: "idle" });
      return onPlaced({ status: outcome });
    }
  }
  useEffect(() => {
    if (!enabled) return;
    const param = new URLSearchParams(location.search).get("checkout_id");
    const saved = readAttempt();
    const id = param || (saved?.paying ? saved.id : "");
    if (id) check(id, param ? 6 : 1);
    // Back from the bank out of the browser's page cache: this page still thinks it is paying.
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted && readAttempt()?.paying) location.reload();
    };
    window.addEventListener("pageshow", restored);
    return () => {
      latest.current++;
      window.removeEventListener("pageshow", restored);
    };
    // Once per visit to the page.
  }, [enabled]);
  return {
    current,
    checkAgain: (checkoutId: string) => check(checkoutId, 1),
    continuePaying: () => {
      dropReturnParam();
      setCurrent({ state: "idle" });
    },
  };
}

export function EmbeddedCheckout({
  items,
  onHosted,
  onPaid,
}: {
  items: Item[];
  onHosted: (unavailable?: boolean) => void;
  onPaid: (placed: Placed) => void;
}) {
  const { price, theme } = useShop();
  const checkout = useRef<VenroysCheckout | null>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  // Kept across a fresh checkout so the shopper doesn't retype the address.
  const entered = useRef<Record<string, string>>({});
  const [delivery, setDelivery] = useState<Record<string, string> | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  // Cents, when delivery is a fixed rate with no options to choose from.
  const [fixedShipping, setFixedShipping] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState(false);
  const [prepared, setPrepared] = useState<Record<string, any> | null>(null);
  const [payReady, setPayReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  // A payment started earlier is still open: paying now goes back to that same payment.
  const [resuming, setResuming] = useState(() => openPaymentFor(items));
  // Once Pay was pressed, the outcome may be unknown: retry here, never switch to hosted.
  const [attempted, setAttempted] = useState(resuming);
  const [error, setError] = useState("");
  useEffect(() => () => {
    try {
      checkout.current?.destroy();
    } catch {}
  }, []);
  // After React has rendered the container; a timer here can run too early, or not at all
  // in a background tab, and leaves an empty form with Pay switched off.
  useEffect(() => {
    if (!prepared || !paymentRef.current) return;
    try {
      checkout.current!.mountPayment(paymentRef.current, {
        onReady: () => setPayReady(true),
        onChange: (e) => setComplete(e.complete),
        onError: (e) => setError(e.message),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [prepared]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message || "Checkout is unavailable. Use secure hosted checkout.");
    } finally {
      setBusy(false);
    }
  }
  // Only once no payment can be open: the next try gets a new checkout and a new order.
  function startOver(message: string) {
    clearAttempt();
    try {
      checkout.current?.destroy();
    } catch {}
    checkout.current = null;
    setPrepared(null);
    setDelivery(null);
    setGroups([]);
    setFixedShipping(null);
    setTerms(false);
    setPayReady(false);
    setComplete(false);
    setAttempted(false);
    setResuming(false);
    setError(message);
  }
  function quote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(
      [...new FormData(event.currentTarget)].map(([k, v]) => [k, String(v).trim()]),
    );
    const details = Object.fromEntries(Object.entries(data).filter(([, v]) => v));
    entered.current = details;
    run(async () => {
      if (!checkout.current)
        try {
          await loadStripe();
          const { createVenroysCheckout } = await import(
            /* webpackIgnore: true */ /* turbopackIgnore: true */ HELPER
          );
          const attempt = nextAttempt(readAttempt(), signatureOf(items), Date.now(), () =>
            crypto.randomUUID(),
          );
          saveAttempt(attempt);
          const create = (appearance: Record<string, string>) =>
            createVenroysCheckout({
              publishableKey: process.env.NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY,
              apiOrigin: process.env.NEXT_PUBLIC_VENROYS_API_ORIGIN || undefined,
              items,
              idempotencyKey: attempt.key,
              returnUrl: `${location.origin}/checkout`,
              appearance,
            });
          // Venroys styles Stripe's fields from these: Inter, small lowercase labels and
          // fields tinted from the page, like this site's own form. A Venroys without
          // those options refuses them before creating anything; then use the basics.
          const basic = { ...THEMES[theme], font: "sans", corners: "square" };
          try {
            checkout.current = await create({ ...basic, font: "inter", fields: "minimal" });
          } catch (e) {
            if (!styleRefused(e)) throw e;
            checkout.current = await create(basic);
          }
          saveAttempt({ ...attempt, id: checkout.current!.id });
        } catch (e) {
          // Nothing can have been charged yet, so hosted checkout is the safe way on.
          const code = (e as { code?: string }).code;
          // Sandbox (vr_pk_test_) keys may also run from http://127.0.0.1 or http://[::1].
          const insecure =
            location.protocol !== "https:" &&
            !(
              process.env.NEXT_PUBLIC_VENROYS_PUBLISHABLE_KEY?.startsWith("vr_pk_test_") &&
              ["127.0.0.1", "[::1]"].includes(location.hostname)
            );
          if (UNAVAILABLE.includes(code ?? "") || insecure) {
            console.warn(`Embedded checkout unavailable (${code ?? "not HTTPS"}); using hosted.`);
            return onHosted(true);
          }
          throw e;
        }
      const result = await checkout.current!.quote({
        shipping_address: details,
        currency: "EUR",
      });
      const found = groupOptions(result.shipping_options ?? []);
      const fixed = Number(result.shipping_total);
      if (!found.length && (result.shipping_total == null || !Number.isFinite(fixed) || fixed < 0))
        throw new Error("We can’t deliver to this address yet. Check it, or try another one.");
      setDelivery(details);
      setGroups(found);
      setFixedShipping(found.length ? null : Math.round(fixed * 100));
      setSelected(
        Object.fromEntries(
          found.map((g) => [g.key, (g.options.find((o) => o.selected) ?? g.options[0]).method]),
        ),
      );
    });
  }
  function backToDetails() {
    setDelivery(null);
    setTerms(false);
    setError("");
  }
  function prepare() {
    run(async () => {
      let result: Record<string, any>;
      try {
        result = await checkout.current!.prepare({
          shipping_address: delivery,
          currency: "EUR",
          terms_accepted: true,
          selected_shipping_options: selected,
        });
      } catch (e) {
        if (!needsNewCheckout(e as { status?: number; code?: string })) throw e;
        // A prepared checkout refuses a different address. With a payment open it stays.
        if (resuming) {
          setDelivery(null);
          setTerms(false);
          throw new Error(
            "Use the same delivery details as before to get back to the payment you started.",
          );
        }
        return startOver(
          "Your delivery details changed, so we started a fresh checkout. Check them and continue.",
        );
      }
      setPrepared(result);
    });
  }
  // Venroys' docs redirect to its confirmation page here; this site keeps the shopper. Card
  // authentication opens in a Stripe dialog on this page; bank and pay-later methods leave
  // it, so this function never finishes for them and usePaymentReturn picks up the result.
  function pay() {
    setAttempted(true);
    markPaying(true);
    run(async () => {
      let result: { status: string };
      try {
        result = await checkout.current!.pay();
      } catch (e) {
        const failure = e as { status?: number; code?: string };
        if (paymentRefused(failure)) markPaying(false);
        if (!needsNewCheckout(failure)) throw e;
        // A live payment answers normally, so this one has ended, unless it was paid.
        const id = checkout.current!.id;
        const outcome: Outcome = await readOutcome(id).catch(() => "waiting");
        if (outcome === "succeeded" || outcome === "processing") {
          clearAttempt();
          return onPaid({ status: outcome });
        }
        return startOver("That payment attempt has ended. Check your details and try again.");
      }
      if (result.status === "succeeded" || result.status === "processing") {
        clearAttempt();
        onPaid({ status: result.status });
      } else {
        setError("Your payment is not complete. Check your details and try again.");
      }
    });
  }
  const termsUrl = venroysLink(checkout.current?.info?.terms_url);
  const step = prepared ? 3 : delivery ? 2 : 1;
  const chosen = groups.flatMap((g) => g.options.filter((o) => selected[g.key] === o.method));
  const total = prepared ? price(Number(prepared.amount_minor)) : "";
  // Fields that match the page sit on it directly; otherwise (Venroys not yet sending
  // dark fields, or the theme switched after they loaded) they get a frame of their own.
  const fieldsDark = prepared ? darkFields(prepared.appearance) : theme === "dark";
  const framed = fieldsDark !== (theme === "dark");
  const alert = error && (
    <p className="nt-alert" role="alert">
      {error}
    </p>
  );
  // One step per screen: take focus, and the view, to the top of each new step.
  const top = useRef<HTMLOListElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus({ preventScroll: true });
    if (top.current && top.current.getBoundingClientRect().top < 0)
      top.current.scrollIntoView({ block: "start" });
  }, [step]);
  const titles = ["details", "delivery", "payment"];
  const address = delivery && (
    <>
      {delivery.fullName}, {delivery.address}
      {delivery.address2 ? ` ${delivery.address2}` : ""}, {delivery.postalCode} {delivery.city},{" "}
      {countryName(delivery.country)}
    </>
  );
  return (
    <div className="nt-embedded">
      <ol className="nt-steps" ref={top} aria-label="checkout steps">
        {titles.map((title, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "active" : "next";
          return (
            <li key={title} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="nt-step-num" aria-hidden="true">
                {state === "done" ? <Check size={12} /> : `0${n}`}
              </span>
              {title}
              {state === "done" && <span className="nt-sr"> (done)</span>}
            </li>
          );
        })}
      </ol>
      {step > 1 && delivery && (
        <dl className="nt-recap">
          <div>
            <dt>contact</dt>
            <dd>
              {delivery.email}
              {delivery.phone ? ` · ${delivery.phone}` : ""}
            </dd>
            {step === 2 && (
              <button type="button" className="nt-step-edit" onClick={backToDetails} disabled={busy}>
                change
              </button>
            )}
          </div>
          <div>
            <dt>ship to</dt>
            <dd>{address}</dd>
            {step === 2 && (
              <button type="button" className="nt-step-edit" onClick={backToDetails} disabled={busy}>
                change
              </button>
            )}
          </div>
          {step === 3 && (
            <div>
              <dt>method</dt>
              <dd>
                {fixedShipping !== null && (
                  <span className="nt-recap-line">
                    standard delivery
                    <span className="nt-mono">{fixedShipping ? price(fixedShipping) : "free"}</span>
                  </span>
                )}
                {chosen.map((o) => (
                  <span key={o.method} className="nt-recap-line">
                    {optionLabel(o)}
                    <span className="nt-mono">
                      {optionAmount(o) ? price(optionAmount(o)) : "free"}
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
      <h2 ref={heading} tabIndex={-1} className="nt-step-title">
        <span className="nt-sr">step {step} of 3: </span>
        {["where it’s going", "how it gets there", "payment"][step - 1]}
      </h2>
      {step === 1 && (
        <form onSubmit={quote}>
          <div className="nt-fields">
            {fields.map(([name, label, autoComplete, required, wide]) => (
              <label
                key={name}
                className={`nt-field${wide ? " nt-field-wide" : ""}`}
                htmlFor={`e-${name}`}
              >
                {label}
                <input
                  id={`e-${name}`}
                  name={name}
                  type={name === "email" ? "email" : name === "phone" ? "tel" : "text"}
                  autoComplete={autoComplete}
                  required={required}
                  defaultValue={entered.current[name]}
                  aria-describedby={name === "email" ? "e-email-hint" : undefined}
                />
                {name === "email" && (
                  <span id="e-email-hint" className="nt-field-hint">
                    for your order confirmation and tracking
                  </span>
                )}
              </label>
            ))}
            <label className="nt-field" htmlFor="e-country">
              country
              <select
                id="e-country"
                name="country"
                autoComplete="country"
                defaultValue={entered.current.country ?? "NL"}
              >
                {countries.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {alert}
          <Button type="submit" className="nt-full" disabled={busy}>
            {busy ? "checking delivery…" : "continue to delivery"}
            <ArrowUpRight size={18} />
          </Button>
        </form>
      )}
      {step === 2 && (
        <>
          {fixedShipping !== null && (
            <div className="nt-options">
              <p className="nt-option nt-option-fixed">
                <span>standard delivery</span>
                <span className="nt-mono">{fixedShipping ? price(fixedShipping) : "free"}</span>
              </p>
            </div>
          )}
          {groups.map((g, i) => (
            <fieldset key={g.key} className="nt-options">
              <legend className={groups.length > 1 ? "nt-label nt-muted" : "nt-sr"}>
                {groups.length > 1 ? `shipment ${i + 1}` : "delivery method"}
              </legend>
              {g.options.map((o) => (
                <label key={o.method} className="nt-option">
                  <input
                    type="radio"
                    name={`shipping-${g.key}`}
                    checked={selected[g.key] === o.method}
                    onChange={() => setSelected({ ...selected, [g.key]: o.method })}
                  />
                  <span>{optionLabel(o)}</span>
                  <span className="nt-mono">
                    {optionAmount(o) ? price(optionAmount(o)) : "free"}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
          <label className="nt-check">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>
              I accept the{" "}
              {termsUrl ? (
                <a href={termsUrl} target="_blank" rel="noopener noreferrer">
                  terms of sale
                </a>
              ) : (
                "terms of sale"
              )}{" "}
              and the <a href="/returns">returns policy</a>.
            </span>
          </label>
          {alert}
          <Button className="nt-full" disabled={busy || !terms} onClick={prepare}>
            {busy ? "preparing…" : "continue to payment"}
            <ArrowUpRight size={18} />
          </Button>
          <button type="button" className="nt-back" onClick={backToDetails} disabled={busy}>
            ← back to details
          </button>
        </>
      )}
      {step === 3 && (
        <>
          {resuming && (
            <p className="nt-note" role="status">
              You already started a payment for this order. Paying now takes you back to it, even
              if you choose another method here. To pay another way, cancel it with your bank
              first.
            </p>
          )}
          <div
            className="nt-pay-panel"
            data-fields={fieldsDark ? "dark" : "light"}
            data-framed={framed || undefined}
          >
            <div className="nt-pay-panel-head">
              <span>
                <Lock size={12} aria-hidden="true" /> secure payment
              </span>
              <span>by Stripe</span>
            </div>
            {!payReady && (
              <div className="nt-pay-skeleton" aria-hidden="true">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <span />
                <span />
              </div>
            )}
            {!payReady && <span className="nt-sr" role="status">loading payment options…</span>}
            <div
              ref={paymentRef}
              className={`nt-payment-element${payReady ? "" : " nt-loading"}`}
            />
          </div>
          <div className="nt-pay-total">
            <span>
              total to pay
              <small>includes delivery</small>
            </span>
            <strong>{total}</strong>
          </div>
          {alert}
          <Button className="nt-full" disabled={busy || !payReady || !complete} onClick={pay}>
            {busy ? "paying…" : `pay ${total}`}
            <ArrowUpRight size={18} />
          </Button>
          <p className="nt-fine">
            Your payment details go straight to Stripe; we never see them. Bank and pay-later
            methods open your bank or app, then bring you back here.
          </p>
        </>
      )}
      {!attempted && (
        <p className="nt-alt">
          have a discount code?{" "}
          <button type="button" onClick={() => onHosted()} disabled={busy}>
            use secure hosted checkout
          </button>
        </p>
      )}
    </div>
  );
}
