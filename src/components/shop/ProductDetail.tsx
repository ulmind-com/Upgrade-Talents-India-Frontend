"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, Check, Truck, ShieldCheck, RefreshCcw, ChevronRight, Heart } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { useCart } from "@/components/shop/CartProvider";
import { formatINR } from "@/lib/utils";
import type { Product } from "@/components/shop/ShopListing";

type Variant = { variant_id?: string; size?: string; color?: string; price_override?: number; stock_quantity?: number };
type P = Product & { variants?: Variant[]; shipping_fee?: number };

const pid = (p: P) => p._id || p.id || "";

export default function ProductDetail({ product, related }: { product: P; related: Product[] }) {
  const { add, setOpen } = useCart();
  const imgs = product.images?.length ? product.images : [""];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  const variants = product.variants || [];
  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color).filter(Boolean) as string[])), [variants]);
  const sizes = useMemo(() => {
    const fromVar = Array.from(new Set(variants.map((v) => v.size).filter(Boolean) as string[]));
    return fromVar.length ? fromVar : ["S", "M", "L", "XL", "XXL"];
  }, [variants]);

  const [color, setColor] = useState(colors[0] || "");
  const [size, setSize] = useState("");

  const variant = variants.find((v) => (!colors.length || v.color === color) && (!v.size || v.size === size));
  const price = variant?.price_override ?? product.price ?? 0;

  function addToCart() {
    if (sizes.length && !size) { setSize(sizes[0]); }
    add({
      productId: pid(product), variantId: variant?.variant_id,
      name: product.name || "", price: Number(price), image: imgs[0],
      size: size || (sizes.length ? sizes[0] : undefined), color: color || undefined,
    }, qty);
  }

  return (
    <section className="container-x relative pb-24 pt-10 md:pt-14">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-[var(--fg-subtle)]">
        <Link href="/shop" className="hover:text-[var(--fg)]">Shop</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        {product.category && <><span>{product.category}</span><ChevronRight className="size-3.5" aria-hidden /></>}
        <span className="text-[var(--fg-muted)]">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr]">
        {/* ── Gallery ── */}
        <Reveal>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {imgs.length > 1 && (
              <div className="flex gap-3 sm:flex-col">
                {imgs.map((im, i) => (
                  <button key={i} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl border bg-[var(--surface-2)] transition-colors ${active === i ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                    <img src={im} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-2)]">
              <img src={imgs[active]} alt={product.name || ""} className="aspect-[4/5] w-full object-cover" />
            </div>
          </div>
        </Reveal>

        {/* ── Details ── */}
        <Reveal>
          <div className="lg:sticky lg:top-28">
            {product.category && <span className="inline-flex rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{product.category}</span>}
            <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.02]">{product.name}</h1>
            <p className="mt-3 font-display text-[clamp(1.4rem,3vw,1.9rem)] font-bold text-gradient">{formatINR(price)}</p>
            {product.description && <p className="mt-4 max-w-prose text-[14.5px] leading-relaxed text-[var(--fg-muted)]">{product.description}</p>}

            {colors.length > 0 && (
              <div className="mt-6">
                <p className="text-[12.5px] font-semibold">Color: <span className="text-[var(--fg-muted)]">{color}</span></p>
                <div className="mt-2.5 flex gap-2.5">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={c}
                      className={`grid size-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg)] transition-all ${color === c ? "ring-[var(--accent)]" : "ring-transparent hover:ring-[var(--border-strong)]"}`}>
                      <span className="size-7 rounded-full border border-[var(--border)]" style={{ background: c.toLowerCase() }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-[12.5px] font-semibold">Size</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`min-w-[52px] rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${size === s ? "border-transparent text-[var(--on-accent)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                    style={size === s ? { background: "var(--grad-brand)" } : undefined}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex items-stretch gap-3">
              <div className="inline-flex items-center rounded-full border border-[var(--border)]">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Minus className="size-4" aria-hidden /></button>
                <span className="w-9 text-center text-[15px] font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Plus className="size-4" aria-hidden /></button>
              </div>
              <button onClick={addToCart} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-bold text-[var(--on-accent)] transition-transform active:scale-[0.99]" style={{ background: "var(--grad-brand)" }}>
                <ShoppingBag className="size-4.5" aria-hidden /> Add to cart
              </button>
              <button onClick={() => setOpen(true)} aria-label="Open cart" className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] hover:border-[var(--border-strong)]"><Heart className="size-4.5" aria-hidden /></button>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-6">
              {[["Free shipping", Truck, "On orders over ₹999"], ["Easy returns", RefreshCcw, "7-day return policy"], ["Secure checkout", ShieldCheck, "100% protected"]].map(([t, Ic, d]: any) => (
                <div key={t} className="text-center">
                  <Ic className="mx-auto size-5 text-[var(--accent)]" aria-hidden />
                  <p className="mt-1.5 text-[11.5px] font-semibold">{t}</p>
                  <p className="text-[10px] leading-tight text-[var(--fg-subtle)]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Related ── */}
      {related.length > 0 && (
        <div className="mt-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] font-bold">You may also like</h2>
            <Link href="/shop" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)] hover:underline">View all <ChevronRight className="size-4" aria-hidden /></Link>
          </div>
          <StaggerGroup className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.slice(0, 4).map((p, i) => (
              <StaggerItem key={(p._id || p.id || i) as any}>
                <Link href={`/shop/${p._id || p.id}`} className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-strong)]">
                  <div className="aspect-[4/5] overflow-hidden bg-[var(--surface-2)]">
                    <img src={p.images?.[0] || ""} alt={p.name || ""} loading="lazy" className="size-full object-cover transition-transform duration-[1.1s] group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 text-[13.5px] font-semibold">{p.name}</h3>
                    <p className="mt-1 font-display text-[15px] font-bold tabular-nums">{formatINR(p.price)}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      )}
    </section>
  );
}
