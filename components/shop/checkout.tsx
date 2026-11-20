"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { available, demoShippingCents, linePrice, subtotal } from "@/lib/products";
import { useShop } from "./shop-provider";
import { Button } from "./primitives";
import {
  EmbeddedCheckout,
  embeddedEnabled,
  usePaymentReturn,
  type Placed,
} from "./embedded-checkout";
const fields = [
  {
    name: "email",
    label: "email address",
    autoComplete: "email",
    type: "email",
    wide: true,
  },
  { name: "firstName", label: "first name", autoComplete: "given-name" },
  { name: "lastName", label: "last name", autoComplete: "family-name" },
  {
    name: "address",
    label: "street & house number",
    autoComplete: "address-line1",
    wide: true,
  },
  { name: "postcode", label: "postcode", autoComplete: "postal-code" },
  { name: "city", label: "city", autoComplete: "address-level2" },
];
export function Checkout() {
  const { items, ready, live, clear } = useShop();
  // Embedded payment done: the bag is emptied, so the confirmation lives up here.
  const [placed, setPlaced] = useState<Placed | null>(null);
  const payment = usePaymentReturn(live && embeddedEnabled, (result) => {
    setPlaced(result);
    window.scrollTo(0, 0);
  });
  const { current } = payment;
  const notice = current.state === "idle" ? current.notice : undefined;
  if (placed) return <Confirmation placed={placed} />;
  if (current.state === "checking")
    return (
      <main id="main" className="nt-prose">
        <span className="nt-label nt-muted">checkout</span>
        <h1>one moment.</h1>
        <p role="status">checking your payment…</p>
      </main>
    );
  if (current.state === "waiting")
    return (
      <main id="main" className="nt-prose">
        <span className="nt-label nt-muted">payment not confirmed yet</span>
        <h1>still waiting.</h1>
        <p role="status">
          We don’t have a confirmation for this payment yet. If you finished paying, it can take a
          few minutes and Venroys emails you once it’s confirmed. Please don’t pay again until then.
        </p>
        <p>
          <button
            className="nt-text-link"
            type="button"
            onClick={() => payment.checkAgain(current.checkoutId)}
          >
            check again <ArrowUpRight size={18} />
          </button>
        </p>
        {current.mine && items.length > 0 ? (
          <p>
            <button className="nt-remove" type="button" onClick={payment.continuePaying}>
              I didn’t finish: go back to that payment
            </button>
          </p>
        ) : (
          <Link href="/shop" className="nt-text-link">
            back to the shop <ArrowUpRight size={18} />
          </Link>
        )}
      </main>
    );
  if (!ready)
    return (
      <main id="main" className="nt-prose">
        <p role="status">opening your bag…</p>
      </main>
    );
  if (!items.length)
    return (
      <main id="main" className="nt-prose">
        <span className="nt-label nt-muted">checkout</span>
        <h1>nothing here. yet.</h1>
        {notice && (
          <p className="nt-alert" role="alert">
            {notice}
          </p>
        )}
        <p>Add something to your bag, then come back here.</p>
        <Link href="/shop" className="nt-text-link">
          shop all <ArrowUpRight size={18} />
        </Link>
      </main>
    );
  return live ? (
    <LiveCheckout
      notice={notice}
      onPaid={(result) => {
        setPlaced(result);
        clear();
        window.scrollTo(0, 0);
      }}
    />
  ) : (
    <PreviewCheckout />
  );
}
function Confirmation({ placed }: { placed: Placed }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">order placed</span>
      <h1 ref={heading} tabIndex={-1}>
        {placed.status === "succeeded"
          ? "it’s yours."
          : placed.status === "processing"
            ? "almost yours."
            : "this order is closed."}
      </h1>
      <p role="status">
        {placed.status === "succeeded"
          ? "Your payment went through. Venroys emails your order confirmation, and again with tracking once it ships."
          : placed.status === "processing"
            ? "Your payment is still processing. Venroys emails you as soon as it is confirmed; you won’t be charged twice."
            : "This order was refunded or is under review. Get in touch if you have questions."}
      </p>
      <Link href="/shop" className="nt-text-link">
        back to the shop <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}
function Summary() {
  const { items, products, price, live, openBag } = useShop();
  const total = subtotal(items, products) + (live ? 0 : demoShippingCents);
  return (
    <aside className="nt-order-summary" aria-label="order summary">
      <div className="nt-price-row">
        <h2>your pieces</h2>
        <button className="nt-remove" onClick={openBag}>
          edit bag
        </button>
      </div>
      {items.map((line) => {
        const p = products.find((p) => p.slug === line.slug)!;
        return (
          <div className="nt-bag-line" key={`${line.slug}-${line.size}`}>
            <img
              src={p.images[0].src}
              alt={p.images[0].alt}
              width={88}
              height={110}
            />
            <div>
              <h3>{p.name}</h3>
              <small className="nt-mono">
                {line.size} / qty {line.quantity}
              </small>
              <p className="nt-mono" style={{ marginTop: 16 }}>
                {price(linePrice(p, line.size) * line.quantity)}
              </p>
            </div>
          </div>
        );
      })}
      <div className="nt-price-row">
        <span>subtotal{live ? "" : " · incl. VAT"}</span>
        <span className="nt-mono">{price(subtotal(items, products))}</span>
      </div>
      <div className="nt-price-row nt-muted">
        <span>shipping{live ? "" : " (demo)"}</span>
        <span className={live ? "" : "nt-mono"}>
          {live ? "calculated at checkout" : price(demoShippingCents)}
        </span>
      </div>
      {!live && (
        <div className="nt-price-row nt-order-total">
          <span>total</span>
          <span className="nt-mono">{price(total)}</span>
        </div>
      )}
      {!live && (
        <p className="nt-bag-note">
          Demo estimate. Real delivery prices come from Venroys.
        </p>
      )}
    </aside>
  );
}
// One idempotency key per bag: retrying after a lost response returns the same
// Venroys checkout. Rotated before the two-hour checkout link expiry.
const ATTEMPT = "shop-checkout-v1";
type Attempt = { signature: string; key: string; at: number };
function readAttempt(): Attempt | null {
  try {
    return JSON.parse(sessionStorage.getItem(ATTEMPT) || "null");
  } catch {
    return null;
  }
}
function saveAttempt(attempt: Attempt | null) {
  try {
    if (attempt) sessionStorage.setItem(ATTEMPT, JSON.stringify(attempt));
    else sessionStorage.removeItem(ATTEMPT);
  } catch {}
}
function LiveCheckout({
  notice,
  onPaid,
}: {
  notice?: string;
  onPaid: (placed: Placed) => void;
}) {
  const { items, products, price, clear } = useShop();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [started, setStarted] = useState<Attempt | null>(null);
  const [code, setCode] = useState("");
  const [embedded, setEmbedded] = useState(embeddedEnabled);
  const payload = items.map((line) => ({
    variant_id: products.find((p) => p.slug === line.slug)!.variants![
      line.size
    ].id,
    quantity: line.quantity,
  }));
  const discount = code.trim().toUpperCase();
  const signature = JSON.stringify({ payload, discount });
  const hasUnavailable = items.some(
    (line) =>
      !available(products.find((p) => p.slug === line.slug)!, line.size),
  );
  useEffect(() => {
    const attempt = readAttempt();
    setStarted(
      attempt?.signature === signature && Date.now() - attempt.at < 7_200_000
        ? attempt
        : null,
    );
    // Only re-check when the bag changes, not on every clock tick.
  }, [signature]);
  async function go() {
    setPending(true);
    setError("");
    let attempt = readAttempt();
    if (
      !attempt ||
      attempt.signature !== signature ||
      Date.now() - attempt.at > 3_600_000
    )
      attempt = { signature, key: crypto.randomUUID(), at: Date.now() };
    saveAttempt(attempt);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.key,
        },
        body: JSON.stringify({
          items: payload,
          ...(discount ? { discount_code: discount } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A definite refusal will not change on replay, so the next try gets a new key.
        if (res.status < 500 && res.status !== 429) saveAttempt(null);
        throw new Error(
          body.error?.message ||
            "We couldn’t open checkout. Please try again in a moment.",
        );
      }
      window.location.assign(body.data.checkout_url);
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : "The connection dropped. Please try again — you won’t be charged twice.",
      );
      setPending(false);
    }
  }
  return (
    <main id="main" className="nt-checkout">
      <span className="nt-label nt-muted">one last thing / checkout</span>
      <h1>make it yours.</h1>
      <div className="nt-checkout-layout">
        <div>
          {notice && (
            <p className="nt-alert" role="alert">
              {notice}
            </p>
          )}
          {embedded && !hasUnavailable ? (
            <EmbeddedCheckout
              items={payload}
              onPaid={onPaid}
              onHosted={(off) => {
                setUnavailable(!!off);
                setEmbedded(false);
              }}
            />
          ) : (
          <>
          <h2>secure checkout</h2>
          {unavailable && (
            <p className="nt-bag-note" role="status">
              Paying on this page isn’t available right now. Nothing was
              charged — continue below to pay securely on Venroys.
            </p>
          )}
          <p className="nt-description">
            You’ll enter your delivery details and pay on Venroys’ secure
            checkout. Shipping and your final total are shown there before you
            pay.
          </p>
          <p className="nt-bag-note">
            Have an account? <Link href="/account">Sign in</Link> first and this
            order is saved to it.
          </p>
          <label className="nt-field nt-field-wide" htmlFor="discount">
            discount code (optional)
            <input
              id="discount"
              autoComplete="off"
              maxLength={64}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
            />
          </label>
          {hasUnavailable && (
            <p className="nt-alert" role="alert">
              Some pieces in your bag are sold out. Remove them to continue.
            </p>
          )}
          {error && (
            <p className="nt-alert" role="alert">
              {error}
            </p>
          )}
          <Button
            className="nt-full"
            disabled={pending || hasUnavailable}
            onClick={go}
          >
            {pending
              ? "opening checkout…"
              : `continue to payment · ${price(subtotal(items, products))}`}
            <ArrowUpRight size={18} />
          </Button>
          </>
          )}
          {started && !pending && (
            <div className="nt-success" role="status">
              <h2>already checked out?</h2>
              <p>
                You opened checkout for this bag earlier. If you finished
                paying, you can clear your bag. If not, continue to pick up
                where you left off.
              </p>
              <button
                className="nt-remove"
                onClick={() => {
                  saveAttempt(null);
                  setStarted(null);
                  clear();
                }}
              >
                clear bag
              </button>
            </div>
          )}
        </div>
        <Summary />
      </div>
    </main>
  );
}
function PreviewCheckout() {
  const { items, products, price } = useShop();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [complete, setComplete] = useState(false);
  const [payment, setPayment] = useState("card");
  const success = useRef<HTMLDivElement>(null);
  const total = subtotal(items, products) + demoShippingCents;
  const hasUnavailable = items.some(
    (line) => !available(products.find((p) => p.slug === line.slug)!),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComplete(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const next: Record<string, string> = {};
    for (const field of fields)
      if (!String(data.get(field.name) || "").trim())
        next[field.name] = `Enter your ${field.label}.`;
    const email = String(data.get("email") || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (
      items.some(
        (line) =>
          !available(products.find((p) => p.slug === line.slug)!),
      )
    )
      next.bag = "Some items are no longer available.";
    setErrors(next);
    if (Object.keys(next).length) {
      (
        form.elements.namedItem(Object.keys(next)[0]) as HTMLElement | null
      )?.focus();
      return;
    }
    setComplete(true);
    requestAnimationFrame(() => success.current?.focus());
  }
  return (
    <main id="main" className="nt-checkout">
      <span className="nt-label nt-muted">one last thing / guest checkout</span>
      <h1>make it yours.</h1>
      <p className="nt-bag-note">
        Demo checkout. Add your Venroys keys and publish a product to take real
        payments. No order will be placed and no payment will be taken.
      </p>
      <div className="nt-checkout-layout">
        <form noValidate onSubmit={submit} onChange={() => setComplete(false)}>
          <h2>where it’s going</h2>
          <div className="nt-fields">
            {fields.map((field) => (
              <label
                key={field.name}
                className={`nt-field ${field.wide ? "nt-field-wide" : ""}`}
                htmlFor={field.name}
              >
                {field.label}
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  autoComplete={field.autoComplete}
                  required
                  aria-invalid={!!errors[field.name]}
                  aria-describedby={
                    errors[field.name] ? `${field.name}-error` : undefined
                  }
                  onChange={() =>
                    setErrors((previous) => ({ ...previous, [field.name]: "" }))
                  }
                />
                {errors[field.name] && (
                  <span id={`${field.name}-error`} className="nt-error">
                    {errors[field.name]}
                  </span>
                )}
              </label>
            ))}
            <label className="nt-field nt-field-wide" htmlFor="country">
              country
              <select
                id="country"
                name="country"
                autoComplete="country"
                defaultValue="NL"
              >
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="DE">Germany</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
              </select>
            </label>
          </div>
          <fieldset className="nt-payment">
            <legend>how you’d like to pay</legend>
            {[
              ["card", "card"],
              ["ideal", "iDEAL"],
              ["klarna", "Klarna"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={payment === value}
                  onChange={() => setPayment(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="nt-bag-note">
            Demo only. Your details are not sent or stored.
          </p>
          {(hasUnavailable || errors.bag) && (
            <p className="nt-error" role="alert">
              {errors.bag || "Some items are no longer available."}
            </p>
          )}
          <Button type="submit" className="nt-full" disabled={hasUnavailable}>
            try the demo · {price(total)}
            <ArrowUpRight size={18} />
          </Button>
          <p className="nt-bag-note">
            Includes VAT and {price(demoShippingCents)} demo shipping.
          </p>
          {complete && (
            <div
              className="nt-success"
              ref={success}
              tabIndex={-1}
              role="status"
            >
              <h2>that’s the end of the demo.</h2>
              <p>
                Your details look ready. No order has been placed, no payment
                has been taken, and your bag is still here.
              </p>
              <Link className="nt-text-link" href="/shop">
                back to the shop <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </form>
        <Summary />
      </div>
    </main>
  );
}
