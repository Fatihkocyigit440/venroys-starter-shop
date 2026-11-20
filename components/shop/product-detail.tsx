"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { available, linePrice, type Product } from "@/lib/products";
import { Button, Drawer, SizePicker } from "./primitives";
import { useShop } from "./shop-provider";
import { shop } from "@/shop.config";
export function ProductDetail({ product }: { product: Product }) {
  const { add, ready, live, price } = useShop();
  const soldOut = product.sizes.filter((s) => !available(product, s));
  const [size, setSize] = useState(
    product.sizes.length === 1 && !soldOut.length ? product.sizes[0] : "",
  );
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const gallery = useRef<HTMLDivElement>(null);
  const sizeSection = useRef<HTMLDivElement>(null);
  const isAvailable = available(product);
  const last = product.images.length - 1;
  const views = product.images.map((_, i) =>
    live ? String(i + 1).padStart(2, "0") : ["front", "back"][i],
  );
  const varied = new Set(product.sizes.map((s) => linePrice(product, s))).size > 1;
  function showImage(index: number) {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gallery.current?.scrollTo({
      left: index * ((gallery.current?.clientWidth ?? 0) + 16),
      behavior: reduced ? "instant" : "smooth",
    });
  }
  return (
    <main id="main" className="nt-product-page">
      <Link href="/shop" className="nt-breadcrumb">
        <ArrowLeft size={14} />
        back to the shop
      </Link>
      <div className="nt-product-detail">
        <div>
          <div
            className="nt-gallery"
            ref={gallery}
            role="region"
            aria-label={`${product.name} image gallery`}
            tabIndex={0}
            onScroll={(e) =>
              setActiveImage(
                Math.round(
                  e.currentTarget.scrollLeft /
                    (e.currentTarget.clientWidth + 16),
                ),
              )
            }
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                showImage(
                  e.key === "ArrowRight"
                    ? Math.min(last, activeImage + 1)
                    : Math.max(0, activeImage - 1),
                );
              }
            }}
          >
            {product.images.map((image, index) => (
              <figure key={image.src}>
                <div className="nt-product-image">
                  <img
                    src={image.src}
                    alt={image.alt}
                    width={600}
                    height={750}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <div className="nt-image-top nt-mono">
                    <span>n° {product.number}</span>
                    <span>{views[index]}</span>
                  </div>
                  {!live && (
                    <div className="nt-image-caption nt-mono">
                      <span>demo drawing</span>
                    </div>
                  )}
                </div>
              </figure>
            ))}
          </div>
          {last > 0 && (
          <div className="nt-gallery-controls">
            <span className="nt-mono nt-muted">
              0{activeImage + 1} / 0{last + 1}
            </span>
            <div className="nt-gallery-tabs">
              {views.map((view, index) => (
                <button
                  key={view}
                  aria-current={index === activeImage}
                  onClick={() => showImage(index)}
                >
                  {view}
                </button>
              ))}
              <button
                onClick={() =>
                  showImage(activeImage >= last ? 0 : activeImage + 1)
                }
                aria-label="next product image"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          )}
        </div>
        <div className="nt-product-copy">
          <span className="nt-label nt-muted">
            {live ? "" : "demo product"}
            {product.color ? `${live ? "" : " / "}${product.color}` : ""}
          </span>
          <h1>{product.name}</h1>
          <div className="nt-product-price nt-mono">
            {!size && varied ? "from " : ""}
            {price(size ? linePrice(product, size) : product.priceCents)}
            {!live && <small>incl. VAT</small>}
          </div>
          <p className="nt-description">{product.description}</p>
          <div ref={sizeSection}>
            <div className="nt-size-heading">
              <span className="nt-label">size{size ? ` / ${size}` : ""}</span>
              {product.measurements && (
                <button onClick={() => setGuide(true)}>size guide ↗</button>
              )}
            </div>
            <SizePicker
              sizes={product.sizes}
              value={size}
              soldOut={soldOut}
              onChange={(value) => {
                setSize(value);
                setError("");
              }}
            />
            <p className="nt-error" id="size-error" role="status">
              {error}
            </p>
          </div>
          <div className="nt-buy">
            <Button
              className="nt-full"
              disabled={!ready || !isAvailable}
              aria-describedby="size-error"
              onClick={() => {
                if (!size) {
                  setError("Choose your size first.");
                  sizeSection.current
                    ?.querySelector<HTMLButtonElement>(".nt-sizes button")
                    ?.focus();
                  return;
                }
                if (!add(product.slug, size))
                  setError(
                    "This size has just sold out.",
                  );
              }}
            >
              {isAvailable ? "add to bag" : "sold out"}
              <ArrowUpRight size={18} />
            </Button>
          </div>
          <p className="nt-bag-note">
            {live
              ? "Secure checkout by Venroys · shipping calculated at checkout"
              : "Demo product · no payment will be taken"}
          </p>
          <div className="nt-details">
            {product.fit && (
              <details>
                <summary>fit & sizing</summary>
                <p>{product.fit}</p>
              </details>
            )}
            {product.material && (
              <details>
                <summary>material & care</summary>
                <p>{product.material}</p>
              </details>
            )}
            {product.print && (
              <details>
                <summary>print method</summary>
                <p>{product.print}</p>
              </details>
            )}
            <details>
              <summary>shipping</summary>
              <p>
                Delivery options and shipping costs are shown at checkout.
                <br />
                <Link href="/shipping">read shipping details ↗</Link>
              </p>
            </details>
            <details>
              <summary>returns</summary>
              <p>
                You can cancel and return within {shop.returns.days} days.
                <br />
                <Link href="/returns">read returns details ↗</Link>
              </p>
            </details>
          </div>
        </div>
      </div>
      <Drawer
        open={guide}
        onClose={() => setGuide(false)}
        title="find your fit"
      >
        <p className="nt-description">
          {product.name} / measurements in cm, taken flat. Compare with a piece
          you already love.
        </p>
        <table className="nt-size-table nt-mono">
          <caption className="nt-sr">
            {product.name} size measurements in centimeters
          </caption>
          <thead>
            <tr>
              <th scope="col">size</th>
              <th scope="col">
                width
              </th>
              <th scope="col">length</th>
            </tr>
          </thead>
          <tbody>
            {product.measurements?.map((row) => (
              <tr key={row.size}>
                <th scope="row">{row.size}</th>
                <td>{row.width}</td>
                <td>{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nt-description">{product.fit}</p>
        <Button className="nt-full" onClick={() => setGuide(false)}>
          back to the product <ArrowRight size={18} />
        </Button>
      </Drawer>
    </main>
  );
}
