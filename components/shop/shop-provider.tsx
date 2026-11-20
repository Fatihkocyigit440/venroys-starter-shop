"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Minus, Plus, Menu, Sun, Moon } from "lucide-react";
import {
  available,
  demoShippingCents,
  formatPrice,
  linePrice,
  sanitizeBag,
  subtotal,
  type BagLine,
  type Catalog,
  type Product,
} from "@/lib/products";
import { shop } from "@/shop.config";
import { Drawer } from "./primitives";

type ShopContext = {
  // True when the catalog comes from Venroys and checkout takes real payments.
  live: boolean;
  theme: "dark" | "light";
  products: Product[];
  price: (cents: number) => string;
  clear: () => void;
  items: BagLine[];
  ready: boolean;
  openBag: () => void;
  add: (slug: string, size: string) => boolean;
  update: (slug: string, size: string, quantity: number) => void;
};
const Context = createContext<ShopContext | null>(null);
export function useShop() {
  const value = useContext(Context);
  if (!value) throw new Error("ShopProvider is required");
  return value;
}
export function ShopProvider({
  children,
  catalog,
}: {
  children: ReactNode;
  catalog: Catalog;
}) {
  const { products } = catalog;
  const live = catalog.mode === "live";
  const price = (cents: number) =>
    formatPrice(cents, products[0]?.currency);
  const [saved, setItems] = useState<BagLine[]>([]);
  // Only lines whose piece and size are still in the catalog: a product can be
  // unpublished, or the store can switch between preview and live, mid-visit.
  const items = saved.filter((line) =>
    products.some((p) => p.slug === line.slug && p.sizes.includes(line.size)),
  );
  const [ready, setReady] = useState(false);
  const [bag, setBag] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [storageError, setStorageError] = useState("");
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.dataset.storeTheme = theme;
    return () => {
      delete document.documentElement.dataset.storeTheme;
    };
  }, [theme]);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("shop-bag-v1");
      setItems(sanitizeBag(JSON.parse(saved || "[]"), products));
    } catch {
      setItems([]);
    }
    setReady(true);
    // No saved bag at all (Safari clears site storage after seven days, but keeps our
    // cookie): rebuild it from the Venroys cart behind the last checkout.
    if (live && saved === null)
      fetch("/api/cart")
        .then((r) => r.json())
        .then((body) => {
          const lines: BagLine[] = [];
          for (const item of body.data?.items ?? [])
            for (const p of products)
              for (const [size, v] of Object.entries(p.variants ?? {}))
                if (v.id === Number(item.variant_id))
                  lines.push({ slug: p.slug, size, quantity: item.quantity });
          if (lines.length)
            setItems((current) =>
              current.length ? current : sanitizeBag(lines, products),
            );
        })
        .catch(() => {});
    const sync = (event: StorageEvent) => {
      if (event.key === "shop-bag-v1") {
        try {
          setItems(sanitizeBag(JSON.parse(event.newValue || "[]"), products));
        } catch {
          setItems([]);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("storage", sync);
    };
  }, [products, live]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("shop-bag-v1", JSON.stringify(saved));
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser can’t save this bag. It will remain here until you refresh.",
      );
    }
  }, [saved, ready]);
  useEffect(() => {
    setBag(false);
    setMenu(false);
  }, [pathname]);
  const count = items.reduce((n, item) => n + item.quantity, 0);
  const hasUnavailable = items.some(
    (line) =>
      !available(products.find((p) => p.slug === line.slug)!, line.size),
  );
  const update = (slug: string, size: string, quantity: number) =>
    setItems((previous) =>
      sanitizeBag(
        previous.map((line) =>
          line.slug === slug && line.size === size
            ? { ...line, quantity }
            : line,
        ),
        products,
      ),
    );
  const add = (slug: string, size: string) => {
    const p = products.find((p) => p.slug === slug);
    if (
      !ready ||
      !p ||
      !p.sizes.includes(size) ||
      !available(p, size)
    )
      return false;
    setItems((previous) =>
      sanitizeBag([...previous, { slug, size, quantity: 1 }], products),
    );
    setBag(true);
    return true;
  };
  return (
    <Context.Provider
      value={{
        live,
        theme,
        products,
        price,
        clear: () => {
          setItems([]);
          fetch("/api/cart", { method: "DELETE" }).catch(() => {});
        },
        items,
        ready,
        openBag: () => setBag(true),
        add,
        update,
      }}
    >
      <div className="shop">
        <a className="nt-skip" href="#main">
          skip to content
        </a>
        <header className="nt-header">
          <Link href="/" className="nt-wordmark" aria-label={`${shop.name} home`}>
            {shop.name}
          </Link>
          <div className="nt-header-controls">
            <nav aria-label="main navigation">
              <Link
                href="/shop"
                aria-current={pathname.startsWith("/shop") ? "page" : undefined}
              >
                shop
              </Link>
              <Link
                href="/about"
                aria-current={pathname === "/about" ? "page" : undefined}
              >
                about
              </Link>
              {live && (
                <Link
                  href="/account"
                  aria-current={pathname === "/account" ? "page" : undefined}
                >
                  account
                </Link>
              )}
              <span className="nt-nav-divider" />
              <button
                onClick={() => setBag(true)}
                aria-label={`bag, ${count} items`}
              >
                bag&nbsp;{" "}
                <span className="nt-mono">
                  ({String(count).padStart(2, "0")})
                </span>
              </button>
            </nav>
            <button
              className="nt-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? (
                <Sun size={16} aria-hidden="true" />
              ) : (
                <Moon size={16} aria-hidden="true" />
              )}
              <span>{theme === "dark" ? "light" : "dark"}</span>
            </button>
            <button
              className="nt-menu-button"
              onClick={() => setMenu(true)}
              aria-expanded={menu}
            >
              menu <Menu size={17} />
            </button>
          </div>
        </header>
        {children}
        <footer className="nt-footer">
          <div className="nt-footer-top">
            <Link href="/" className="nt-wordmark">
              {shop.name}
            </Link>
            <div className="nt-footer-links">
              <Link href="/about">about</Link>
              <a href={`mailto:${shop.contact}`}>contact</a>
              <Link href="/shipping">shipping</Link>
              <Link href="/returns">returns</Link>
            </div>
          </div>
          <div className="nt-footer-bottom nt-mono">
            <span>© {new Date().getFullYear()} {shop.name}</span>
            <span>
              {live
                ? "secure checkout & payments by venroys"
                : "demo products · add your Venroys keys to sell"}
            </span>
            <span>{shop.location}</span>
          </div>
        </footer>
        <Drawer
          open={menu}
          onClose={() => setMenu(false)}
          title={shop.name}
          className="nt-menu-dialog"
        >
          <nav className="nt-menu-links" aria-label="mobile navigation">
            <Link href="/shop" onClick={() => setMenu(false)}>
              shop
            </Link>
            <Link href="/about" onClick={() => setMenu(false)}>
              about
            </Link>
            {live && (
              <Link href="/account" onClick={() => setMenu(false)}>
                account
              </Link>
            )}
            <button
              onClick={() => {
                setMenu(false);
                setBag(true);
              }}
            >
              bag <span className="nt-mono">({count})</span>
            </button>
          </nav>
          <p className="nt-menu-bottom nt-mono">{shop.tagline}</p>
        </Drawer>
        <Drawer
          open={bag}
          onClose={() => setBag(false)}
          title={`your bag (${count})`}
        >
          {items.length === 0 ? (
            <div className="nt-empty-bag">
              <h2>your bag is empty.</h2>
              <Link
                className="nt-button"
                href="/shop"
                onClick={() => setBag(false)}
              >
                shop all <ArrowUpRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <div>
                {items.map((line) => {
                  const p = products.find((p) => p.slug === line.slug)!;
                  return (
                    <div
                      className="nt-bag-line"
                      key={`${line.slug}-${line.size}`}
                    >
                      <Link
                        href={`/shop/${p.slug}`}
                        onClick={() => setBag(false)}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <img
                          src={p.images[0].src}
                          alt=""
                          width={88}
                          height={110}
                        />
                      </Link>
                      <div>
                        <div className="nt-bag-line-top">
                          <div>
                            <Link
                              href={`/shop/${p.slug}`}
                              onClick={() => setBag(false)}
                            >
                              <h3>{p.name}</h3>
                            </Link>
                            <small className="nt-mono">
                              {line.size}{p.color ? ` / ${p.color}` : ""}
                            </small>
                            {!available(p, line.size) && (
                              <small>
                                sold out
                              </small>
                            )}
                          </div>
                          <span className="nt-mono">
                            {price(linePrice(p, line.size) * line.quantity)}
                          </span>
                        </div>
                        <div className="nt-bag-line-actions">
                          <div className="nt-quantity">
                            <button
                              className="nt-icon-button"
                              aria-label={`decrease ${p.name} quantity`}
                              onClick={() =>
                                update(line.slug, line.size, line.quantity - 1)
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span className="nt-mono" aria-label="quantity">
                              {line.quantity}
                            </span>
                            <button
                              className="nt-icon-button"
                              aria-label={`increase ${p.name} quantity`}
                              disabled={
                                line.quantity >= 25 ||
                                !available(p, line.size)
                              }
                              onClick={() =>
                                update(line.slug, line.size, line.quantity + 1)
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            className="nt-remove"
                            onClick={() => update(line.slug, line.size, 0)}
                          >
                            remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="nt-bag-total">
                <div className="nt-price-row">
                  <span>subtotal{live ? "" : " · incl. VAT"}</span>
                  <span className="nt-mono">
                    {price(subtotal(items, products))}
                  </span>
                </div>
                {live ? (
                  <div className="nt-price-row nt-muted">
                    <span>shipping</span>
                    <span>calculated at checkout</span>
                  </div>
                ) : (
                  <>
                    <div className="nt-price-row nt-muted">
                      <span>estimated shipping (demo)</span>
                      <span className="nt-mono">
                        {price(demoShippingCents)}
                      </span>
                    </div>
                    <div className="nt-price-row">
                      <span>estimated total</span>
                      <span className="nt-mono">
                        {price(subtotal(items, products) + demoShippingCents)}
                      </span>
                    </div>
                  </>
                )}
                {hasUnavailable ? (
                  <p className="nt-error">
                    Some items are sold out. Remove them to continue.
                  </p>
                ) : (
                  <Link
                    className="nt-button nt-full"
                    href="/checkout"
                    onClick={() => setBag(false)}
                  >
                    checkout <ArrowUpRight size={18} />
                  </Link>
                )}
                <p className="nt-bag-note">
                  {live ? (
                    "Prices and availability are confirmed at checkout."
                  ) : (
                    "Demo products. No payment will be taken."
                  )}
                </p>
              </div>
            </>
          )}
          {storageError && (
            <p role="status" className="nt-error">
              {storageError}
            </p>
          )}
        </Drawer>
      </div>
    </Context.Provider>
  );
}
