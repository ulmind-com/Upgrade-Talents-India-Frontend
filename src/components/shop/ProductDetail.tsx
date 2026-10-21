"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, Truck, ShieldCheck, RefreshCcw, ChevronRight, Heart, Ruler } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { useCart } from "@/components/shop/CartProvider";
import { measureShot, type Shot } from "@/lib/shot";
import { useTheme } from "@/components/motion/Providers";
import { formatINR } from "@/lib/utils";
import { availableOf, type Product } from "@/components/shop/ShopListing";

type Variant = { variant_id?: string; size?: string; color?: string; price_override?: number; stock_quantity?: number; reserved_quantity?: number };
type P = Product & { variants?: Variant[]; shipping_fee?: number };

const pid = (p: P) => p._id || p.id || "";
const VIEW_LABELS = ["Front", "Back", "Detail", "On body", "Side", "Flat"];

/* How the piece is meant to sit. The choice doesn't change the garment, it
   changes which size we point at — so the toggle moves the recommendation
   rather than silently reselecting for you. */
const FITS = [
  { id: "regular", label: "Regular", note: "True to size — tailored close to the body.", shift: 0 },
  { id: "relaxed", label: "Relaxed", note: "A touch of room through the chest and sleeve.", shift: 0 },
  { id: "oversized", label: "Oversized", note: "Cut wide on purpose. Size down for a cleaner line.", shift: -1 },
] as const;

type FitId = (typeof FITS)[number]["id"];

/* Same drawn hanger the shop rail uses, so the piece lands looking identical. */
function Hanger({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 38" className={className} fill="none" aria-hidden>
      <path d="M40 3.5c3.6 0 5.6 2.3 5.6 5 0 2.7-2.4 3.8-4 4.7-1.1.6-1.6 1.3-1.6 2.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 15.8 6.6 31.4c-1.5.7-1 3 .7 3h65.4c1.7 0 2.2-2.3.7-3L40 15.8Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductDetail({ product, related }: { product: P; related: Product[] }) {
  const { add, setOpen } = useCart();
  const { theme } = useTheme();
  const light = theme === "blue";
  const heroRef = useRef<HTMLImageElement>(null);
  const imgs = product.images?.length ? product.images : [""];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [shot, setShot] = useState<Shot | null>(null);
  const [fit, setFit] = useState<FitId>("regular");

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

  const activeFit = FITS.find((f) => f.id === fit) || FITS[0];
  /* middle of the run, nudged by the fit — the one we mark "your size" */
  const picked = useMemo(() => {
    const mid = Math.floor((sizes.length - 1) / 2);
    return sizes[Math.min(sizes.length - 1, Math.max(0, mid + activeFit.shift))];
  }, [sizes, activeFit]);

  /* The variant decides availability once one is picked; otherwise the
     product's own count stands in. null means stock isn't tracked. */
  const available = availableOf(variant ?? product);
  const soldOut = available === 0;
  const maxQty = Math.min(20, available ?? 20);

  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, maxQty)));
  }, [maxQty]);

  /* Shots taken on a real hanger keep theirs; ours would be a second one. */
  useEffect(() => {
    let alive = true;
    measureShot(imgs[active] || "").then((m) => { if (alive) setShot(m); });
    return () => { alive = false; };
  }, [imgs, active]);

  function addToCart() {
    const chosen = size || picked;
    if (!size) setSize(chosen);
    add({
      productId: pid(product), variantId: variant?.variant_id,
      name: product.name || "", price: Number(price), image: imgs[active] || imgs[0],
      size: sizes.length ? chosen : undefined, color: color || undefined,
    }, qty, {
      fly: { src: imgs[active] || imgs[0], rect: heroRef.current?.getBoundingClientRect() ?? null },
    });
  }

  const zoom = shot ? Math.min(1.7, 1 / Math.max(shot.height, 0.25)) : 1;

  return (
    <section className="container-x relative pb-28 pt-28 md:pt-36">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-[var(--fg-subtle)]">
        <Link href="/shop" className="hover:text-[var(--fg)]">Shop</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        {product.category && <><span>{product.category}</span><ChevronRight className="size-3.5" aria-hidden /></>}
        <span className="text-[var(--fg-muted)]">{product.name}</span>
      </nav>

      <div className="mt-7 grid gap-10 lg:grid-cols-[1.12fr_1fr] lg:gap-16">
        {/* ══ Gallery ══ */}
        <div className="flex gap-4 sm:gap-6">
          {/* view rail — the shot list, read top to bottom */}
          {imgs.length > 1 && (
            <div className="flex w-[52px] shrink-0 flex-col gap-3 sm:w-[64px]">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={VIEW_LABELS[i] || `View ${i + 1}`}
                  aria-pressed={active === i}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-[var(--radius-md)] border transition-colors ${
                    active === i ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="size-full object-cover opacity-85 transition-opacity group-hover:opacity-100" />
                  {active === i && <span aria-hidden className="absolute inset-0 ring-1 ring-inset ring-[var(--accent)]" />}
                </button>
              ))}
            </div>
          )}

          {/* stage */}
          <div
            className="relative flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)]"
            style={{ background: "radial-gradient(120% 90% at 50% 0%, var(--surface-2) 0%, var(--surface) 62%, var(--bg-elevated) 100%)" }}
          >
            {/* the rail the piece hangs from */}
            <div
              className="pointer-events-none absolute inset-x-8 top-[38px] h-[2px] rounded-full text-[var(--fg)] opacity-30"
              style={{ background: "linear-gradient(90deg, transparent 0%, currentColor 12%, currentColor 88%, transparent 100%)" }}
              aria-hidden
            />

            {/* the name, set oversized behind the shot */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-5 select-none text-center font-display text-[clamp(2.6rem,9vw,5.2rem)] font-bold uppercase leading-none tracking-[-0.045em] text-[var(--fg)] opacity-[0.055]"
            >
              {(product.name || "").split(" ")[0]}
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 1.04, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-center px-6 pb-10 pt-10"
              >
                {!shot?.hanger && <Hanger className="w-[clamp(58px,7vw,88px)] text-[#b08457]" />}
                <img
                  ref={heroRef}
                  src={shot?.src || imgs[active]}
                  alt={product.name || ""}
                  className={`h-[clamp(320px,50vh,560px)] w-full object-contain object-top ${shot?.hanger ? "mt-0" : "-mt-2"}`}
                  style={{
                    transformOrigin: "50% 0%",
                    transform: shot ? `translateY(${-shot.top * zoom * 100}%) scale(${zoom})` : undefined,
                  }}
                />
                {light && <span aria-hidden className="mt-1 block h-3 w-[46%] rounded-[50%] bg-black/25 blur-[6px]" />}
              </motion.div>
            </AnimatePresence>

            {/* shot counter */}
            {imgs.length > 1 && (
              <div className="absolute bottom-4 left-5 flex items-baseline gap-1.5 font-mono text-[10.5px] tracking-[0.28em] text-[var(--fg-subtle)]">
                <span className="text-[var(--fg)]">{String(active + 1).padStart(2, "0")}</span>
                <span>/ {String(imgs.length).padStart(2, "0")}</span>
                <span className="ml-2 tracking-[0.18em]">{VIEW_LABELS[active] || `VIEW ${active + 1}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* ══ Details ══ */}
        <Reveal>
          <div className="lg:sticky lg:top-28">
            {product.category && (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-[var(--fg-subtle)]">{product.category}</span>
            )}
            <h1 className="mt-3 font-display text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold leading-[0.98] tracking-[-0.03em]">{product.name}</h1>

            <div className="mt-4 flex items-end gap-3 border-b border-[var(--border)] pb-6">
              <p className="font-display text-[clamp(1.5rem,3vw,2.1rem)] font-bold tabular-nums text-gradient">{formatINR(price)}</p>
              <span className="pb-1 text-[11.5px] text-[var(--fg-subtle)]">incl. of all taxes</span>
            </div>

            {product.description && (
              <p className="mt-5 max-w-prose text-[14.5px] leading-relaxed text-[var(--fg-muted)]">{product.description}</p>
            )}

            {/* ── fit toggle ── */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-semibold">How it fits</p>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--fg-subtle)]">
                  <Ruler className="size-3.5" aria-hidden /> Size guide
                </span>
              </div>

              <div role="radiogroup" aria-label="Fit" className="mt-2.5 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
                {FITS.map((f) => (
                  <button
                    key={f.id}
                    role="radio"
                    aria-checked={fit === f.id}
                    onClick={() => setFit(f.id)}
                    className={`relative rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                      fit === f.id ? "text-[var(--on-accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {fit === f.id && (
                      <motion.span
                        layoutId="fit-pill"
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ background: "var(--grad-brand)" }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{f.label}</span>
                  </button>
                ))}
              </div>

              {/* keyed so it remounts and fades in on each change */}
              <motion.p
                key={fit}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]"
              >
                {activeFit.note}
              </motion.p>
            </div>

            {colors.length > 0 && (
              <div className="mt-6">
                <p className="text-[12.5px] font-semibold">Colour: <span className="text-[var(--fg-muted)]">{color}</span></p>
                <div className="mt-2.5 flex gap-2.5">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c}
                      className={`grid size-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg)] transition-all ${color === c ? "ring-[var(--accent)]" : "ring-transparent hover:ring-[var(--border-strong)]"}`}>
                      <span className="size-7 rounded-full border border-[var(--border)]" style={{ background: c.toLowerCase() }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── sizes, with the fit's pick marked ── */}
            <div className="mt-6">
              <p className="text-[12.5px] font-semibold">Size</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const chosen = size === s;
                  const suggested = !size && s === picked;
                  return (
                    <button key={s} onClick={() => setSize(s)} aria-pressed={chosen}
                      className={`relative min-w-[54px] rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                        chosen
                          ? "border-transparent text-[var(--on-accent)]"
                          : suggested
                            ? "border-[var(--accent)] text-[var(--fg)]"
                            : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                      style={chosen ? { background: "var(--grad-brand)" } : undefined}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {!size && (
                <p className="mt-2 text-[11.5px] text-[var(--fg-subtle)]">
                  {activeFit.label} fit — we&apos;d pick <span className="font-semibold text-[var(--accent)]">{picked}</span>
                </p>
              )}
            </div>

            {available !== null && (
              <p className={`mt-6 text-[12.5px] font-semibold ${soldOut ? "text-[var(--danger)]" : available <= 5 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                {soldOut ? "Sold out" : available <= 5 ? `Only ${available} left in stock` : "In stock"}
              </p>
            )}

            <div className="mt-4 flex items-stretch gap-3">
              <div className="inline-flex items-center rounded-full border border-[var(--border)]">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Minus className="size-4" aria-hidden /></button>
                <span className="w-9 text-center text-[15px] font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)] disabled:pointer-events-none disabled:opacity-35"><Plus className="size-4" aria-hidden /></button>
              </div>
              <button onClick={addToCart} disabled={soldOut} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-bold text-[var(--on-accent)] transition-transform active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45" style={{ background: "var(--grad-brand)" }}>
                <ShoppingBag className="size-4.5" aria-hidden /> {soldOut ? "Sold out" : "Add to cart"}
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

      {/* ══ Related ══ */}
      {related.length > 0 && (
        <div className="mt-24">
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
