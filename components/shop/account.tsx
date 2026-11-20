"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "./primitives";
import { useShop } from "./shop-provider";

// Shopper accounts (Venroys customer accounts): sign in with an emailed eight-digit
// code, then see profile, saved addresses and orders with tracking. Requires customer
// accounts to be switched on in Venroys (Website settings, or the studio's Accounts tab).
type Data = {
  customer: Record<string, any>;
  orders: Record<string, any>[];
  pagination: { has_more: boolean; next_cursor: string | null } | null;
};
async function call(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      result.error?.code === "customer_accounts_disabled"
        ? "Accounts aren’t open yet. You can still check out as a guest."
        : result.error?.message || "Something went wrong. Please try again.",
    );
    throw Object.assign(error, { code: result.error?.code });
  }
  return result;
}
const safeUrl = (url: unknown) => {
  try {
    return new URL(String(url)).protocol === "https:" ? String(url) : null;
  } catch {
    return null;
  }
};
export function Account() {
  const { price } = useShop();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [challenge, setChallenge] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  async function load() {
    try {
      const result = await call("/api/account");
      setData(result.data);
      setName(result.data?.customer?.name ?? "");
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (e: FormEvent<HTMLFormElement>, key: string) =>
    String(new FormData(e.currentTarget).get(key) || "").trim();
  if (data === undefined)
    return (
      <main id="main" className="nt-prose">
        <p role="status">opening your account…</p>
      </main>
    );
  if (!data)
    return (
      <main id="main" className="nt-prose">
        <span className="nt-label nt-muted">your account</span>
        <h1>sign in.</h1>
        <p>No password. We’ll email you an eight-digit code.</p>
        {!challenge ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const email = field(e, "email");
              run(async () => {
                const result = await call("/api/account/code", "POST", { email });
                setChallenge(result.data.challenge_id);
              });
            }}
          >
            <label className="nt-field nt-field-wide" htmlFor="email">
              email address
              <input id="email" name="email" type="email" autoComplete="email" required />
            </label>
            <Button type="submit" className="nt-full" disabled={busy}>
              {busy ? "sending…" : "email me a code"} <ArrowUpRight size={18} />
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = field(e, "code");
              run(async () => {
                await call("/api/account/session", "POST", { challenge_id: challenge, code });
                await load();
              });
            }}
          >
            <label className="nt-field nt-field-wide" htmlFor="code">
              eight-digit code
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{8}"
                maxLength={8}
                required
              />
            </label>
            <p className="nt-bag-note">
              If that email can have an account, a code is on its way. It works once, for ten minutes.
            </p>
            <Button type="submit" className="nt-full" disabled={busy}>
              {busy ? "checking…" : "sign in"} <ArrowUpRight size={18} />
            </Button>
            <button type="button" className="nt-remove" onClick={() => setChallenge("")}>
              use another email
            </button>
          </form>
        )}
        {error && <p className="nt-error" role="alert">{error}</p>}
      </main>
    );
  const { customer, orders, pagination } = data;
  const addresses: Record<string, any>[] = customer.addresses ?? [];
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">your account / {customer.email}</span>
      <h1>hello{customer.name ? `, ${customer.name.toLowerCase()}` : ""}.</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await call("/api/account", "PATCH", { name });
            await load();
          });
        }}
      >
        <label className="nt-field nt-field-wide" htmlFor="name">
          name
          <input id="name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <Button type="submit" disabled={busy}>save name</Button>
      </form>
      <h2>saved addresses</h2>
      {addresses.length ? (
        addresses.map((a, i) => (
          <p key={a.id ?? i}>
            {[a.name, a.line1 ?? a.address, a.postal_code ?? a.postalCode, a.city, a.country]
              .filter(Boolean)
              .join(", ")}{" "}
            <button
              className="nt-remove"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await call("/api/account", "PATCH", {
                    addresses: addresses.filter((_, j) => j !== i),
                  });
                  await load();
                })
              }
            >
              remove
            </button>
          </p>
        ))
      ) : (
        <p className="nt-muted">Addresses you use at checkout are saved here.</p>
      )}
      <h2>your orders</h2>
      {orders.length ? (
        orders.map((o) => (
          <div className="nt-bag-line" key={o.id}>
            <div>
              <h3>
                order {o.seller_order_number ? `#${o.seller_order_number}` : ""} ·{" "}
                {String(o.status ?? "").replaceAll("_", " ")}
              </h3>
              <small className="nt-mono">
                {o.created_at ? new Date(o.created_at).toLocaleDateString("en-GB") : ""}
                {o.total !== undefined ? ` · ${price(Math.round(Number(o.total) * 100))}` : ""}
              </small>
              {(o.shipments ?? []).map((s: Record<string, any>, i: number) => {
                const url = safeUrl(s.tracking_url);
                return (
                  <p key={s.id ?? i} className="nt-bag-note">
                    {s.carrier} {s.status ? `· ${String(s.status).replaceAll("_", " ")}` : ""}{" "}
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer">
                        track parcel ↗
                      </a>
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="nt-muted">
          No orders yet. <Link href="/shop">Shop all</Link>.
        </p>
      )}
      {pagination?.has_more && (
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const next = await call(
                `/api/account?after=${encodeURIComponent(pagination.next_cursor!)}`,
              );
              setData({ ...next.data, orders: [...orders, ...next.data.orders] });
            })
          }
        >
          older orders
        </Button>
      )}
      {error && <p className="nt-error" role="alert">{error}</p>}
      <p>
        <button
          className="nt-remove"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await call("/api/account", "DELETE");
              setData(null);
            })
          }
        >
          sign out
        </button>
      </p>
    </main>
  );
}
