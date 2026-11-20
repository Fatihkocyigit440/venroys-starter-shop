"use client";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { available, type Product } from "@/lib/products";
import { useShop } from "./shop-provider";

export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`nt-button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Drawer({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const bodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      Object.assign(document.body.style, bodyStyle);
      window.scrollTo(0, scrollY);
      previous?.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`nt-dialog ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            closeRef.current();
        }
      }}
    >
      <div className="nt-dialog-inner">
        <div className="nt-dialog-header">
          <h2>{title}</h2>
          <button
            autoFocus
            className="nt-icon-button"
            onClick={onClose}
            aria-label={`close ${title}`}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function ProductImage({
  product,
  back = false,
  eager = false,
}: {
  product: Product;
  back?: boolean;
  eager?: boolean;
}) {
  const { live } = useShop();
  return (
    <div className="nt-product-image">
      <img
        className="nt-front"
        src={product.images[0].src}
        alt={product.images[0].alt}
        width={600}
        height={750}
        loading={eager ? "eager" : "lazy"}
      />
      {back && product.images[1] && (
        <img
          className="nt-back"
          src={product.images[1].src}
          alt=""
          aria-hidden="true"
          width={600}
          height={750}
          loading="lazy"
        />
      )}
      <div className="nt-image-top nt-mono">
        <span>n° {product.number}</span>
      </div>
      {!live && (
        <div className="nt-image-caption nt-mono">
          <span>demo product</span>
        </div>
      )}
    </div>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const { live, price } = useShop();
  const gone = !available(product);
  const varied =
    product.variants &&
    new Set(Object.values(product.variants).map((v) => v.priceCents)).size > 1;
  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`nt-product-card ${gone ? "nt-card-gone" : ""}`}
    >
      <ProductImage product={product} back />
      <div className="nt-card-info">
        <div>
          <h3>{product.name}</h3>
          <p>
            {product.color}
            {gone
              ? " / sold out"
              : ""}
          </p>
        </div>
        <span className="nt-mono">
          {varied ? "from " : ""}
          {price(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
export function SizePicker({
  sizes,
  value,
  onChange,
  soldOut = [],
}: {
  sizes: readonly string[];
  value: string;
  onChange: (size: string) => void;
  soldOut?: readonly string[];
}) {
  return (
    <div className="nt-sizes" role="group" aria-label="choose a size">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          aria-pressed={size === value}
          disabled={soldOut.includes(size)}
          aria-label={soldOut.includes(size) ? `${size}, sold out` : undefined}
          onClick={() => onChange(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
