"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { useCart } from "@/components/shop/CartProvider";
import { measureShot, type Shot } from "@/lib/shot";
import { useTheme } from "@/components/motion/Providers";
import { formatINR } from "@/lib/utils";
import { DEMO_PRODUCTS } from "@/lib/shopDemo";

export type Product = {
  _id?: string; id?: string; name?: string; description?: string;
  category?: string; price?: number; currency?: string;
  images?: string[]; stock_quantity?: number; reserved_quantity?: number;
};

export { DEMO_PRODUCTS };

const pid = (p: Product) => p._id || p.id || "";
const img = (p: Product) => p.images?.[0] || "";
/* Backend holds stock and reservations separately; what a shopper can
   actually buy is the difference. Undefined stock means "not tracked". */
export const availableOf = (p: { stock_quantity?: number; reserved_quantity?: number } | Record<string, any>) =>
  p?.stock_quantity == null ? null : Math.max(0, p.stock_quantity - (p.reserved_quantity || 0));

/* Only things you can put on a hanger belong on the rail, and only as many
   as fit the wall without scrolling. Everything else lives in the grid. */
const WEARABLE = /(shirt|tee|t-?shirt|hoodie|sweat|jersey|crew|jacket|top)/i;
const RAIL_MAX = 6;

const LEN = [1, 0.93, 0.98, 0.89, 1, 0.95];
const TILT = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.6];
const SWAY = [5.6, 6.4, 5.1, 6.9, 6.1, 5.4];

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

function Tag({ text, tone }: { text: string; tone: "new" | "low" }) {
  return (
    <span className="pointer-events-none absolute -top-1 left-1/2 z-20 origin-top -translate-x-[150%] rotate-[-7deg] select-none" aria-hidden>
      <span className="mx-auto block h-7 w-px bg-[var(--border-strong)]" />
      <span className={`block rounded-[3px] px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] shadow-[0_6px_14px_-8px_rgba(0,0,0,0.6)] ${
        tone === "new" ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--surface)] text-[var(--fg)] ring-1 ring-[var(--border)]"
      }`}>{text}</span>
    </span>
  );
}

export default function ShopListing({ items }: { items: Product[] }) {
  const { add } = useCart();
  const { theme } = useTheme();
  /* "blue" is the daytime theme; the rail has to read on either wall. */
  const light = theme === "blue";
  const router = useRouter();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [preview, setPreview] = useState(false);
  const [active, setActive] = useState(0);
  const [hoverable, setHoverable] = useState(false);
  const [shot, setShot] = useState<Record<string, Shot>>({});
  const [leaving, setLeaving] = useState<{ i: number; dx: number; dy: number; scale: number; originY: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowW, setRowW] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const gridImgRefs = useRef<Record<string, HTMLImageElement | null>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("preview")) setPreview(true);
    setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const data = items.length ? items : preview ? DEMO_PRODUCTS : [];

  const rail = useMemo(() => {
    const wearable = data.filter((p) => WEARABLE.test(`${p.category || ""} ${p.name || ""}`) && img(p));
    return (wearable.length ? wearable : data.filter((p) => img(p))).slice(0, RAIL_MAX);
  }, [data]);

  const railIds = useMemo(() => new Set(rail.map(pid)), [rail]);
  const rest = useMemo(() => data.filter((p) => !railIds.has(pid(p))), [data, railIds]);

  /* Each shot is measured once: a piece photographed on its own hanger must
     not get a second one, and one shot with wide empty margins must not hang
     half the size of the piece beside it. */
  useEffect(() => {
    let alive = true;
    rail.forEach((p) => {
      const src = img(p);
      if (!src) return;
      measureShot(src).then((m) => {
        if (alive && m) setShot((s) => (s[src] ? s : { ...s, [src]: m }));
      });
    });
    return () => { alive = false; };
  }, [rail]);

  const cats = useMemo(() => ["All", ...Array.from(new Set(rest.map((p) => p.category).filter(Boolean) as string[]))], [rest]);
  const list = useMemo(
    () => rest.filter((p) => (cat === "All" || p.category === cat) && (!q || (p.name || "").toLowerCase().includes(q.toLowerCase()))),
    [rest, q, cat]
  );

  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setRowW(e.contentRect.width));
    ro.observe(el);   // its first callback carries the content box
    return () => ro.disconnect();
  }, [rail.length]);

  /* The rack shares one rod: the piece in play takes most of it and the rest
     squeeze up beside it, cropped by their own panel rather than shrunk. */
  const GAP = 14;
  const SPREAD = 3.4;
  const usable = Math.max(0, rowW - GAP * Math.max(rail.length - 1, 0));
  const unit = rail.length ? usable / (SPREAD + rail.length - 1) : 0;
  const wideW = Math.max(150, Math.round(unit * SPREAD));
  const idleW = Math.max(64, Math.round(unit));
  const mobileW = 150;

  const current = rail[Math.min(active, Math.max(0, rail.length - 1))];

  /* Click lifts the shirt off the rail and carries it to the middle of the
     stage while the room fades, then the product page opens on the same
     picture — the two screens read as one move. */
  const openProduct = useCallback(
    (i: number, href: string) => {
      if (reduce || !hoverable) { router.push(href); return; }
      const el = itemRefs.current[i];
      const im = imgRefs.current[i];
      const stage = stageRef.current;
      if (!el || !im || !stage) { router.push(href); return; }
      const col = el.getBoundingClientRect();
      const r = im.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      setLeaving({
        i,
        dx: s.left + s.width / 2 - (r.left + r.width / 2),
        dy: s.top + s.height / 2 - (r.top + r.height / 2),
        scale: Math.min(2.6, Math.max(1.4, (s.height * 1.05) / Math.max(r.height, 1))),
        originY: r.top + r.height / 2 - col.top,
      });
    },
    [hoverable, reduce, router]
  );

  return (
    <section className="relative pb-24 pt-28 md:pt-32">
      {/* ─────────── The rail: trending pieces, hanging ─────────── */}
      {rail.length > 0 && (
        <div className="container-x">
          <div className="relative">
            <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 text-[10.5px] font-bold uppercase tracking-[0.3em] text-[var(--fg-muted)]">
              <span>Trending now</span>
              <span className="h-3 w-px bg-[var(--border-strong)]" aria-hidden />
              <span className="text-[var(--fg-subtle)]">Official merch</span>
            </div>

            {/* ── the rod ── */}
            <div ref={stageRef} className="relative mt-7 md:mt-9">
              <div className="pointer-events-none absolute inset-x-6 top-[38px] z-0 text-[var(--fg)] sm:inset-x-12" aria-hidden>
                <div className="h-[2px] w-full rounded-full opacity-35" style={{ background: "linear-gradient(90deg, transparent 0%, currentColor 12%, currentColor 88%, transparent 100%)" }} />
                <div className="mx-auto h-px w-[92%] opacity-15" style={{ background: "linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%)" }} />
              </div>

              <div
                ref={rowRef}
                className="flex snap-x snap-mandatory items-start justify-center overflow-x-auto overflow-y-hidden px-4 pb-10 pt-8 sm:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ gap: GAP }}
                role="list"
              >
                {rail.map((p, i) => {
                  const stock = availableOf(p);
                  const sold = stock === 0;
                  const isActive = hoverable && active === i;
                  const quiet = hoverable && leaving === null && active !== i;
                  const flying = leaving?.i === i;
                  const href = `/shop/${pid(p)}`;
                  const src = img(p);
                  /* The piece in play takes the rod; the rest squeeze up beside
                     it, cropped by their panel instead of shrinking. */
                  const m = shot[src];
                  const display = m?.src || src;
                  const ownHanger = !!m?.hanger;
                  /* Zoom each shot until the garment itself fills the rod. */
                  const fit = m ? Math.min(1.9, 1 / Math.max(m.height, 0.25)) : 1;
                  const lift = m ? -m.top * fit * 100 : 0;
                  const panelW = !hoverable ? mobileW : isActive || leaving ? wideW : idleW;
                  const innerW = hoverable ? wideW : mobileW;
                  return (
                    <motion.div
                      key={pid(p) || i}
                      ref={(el) => { itemRefs.current[i] = el; }}
                      role="listitem"
                      className="relative flex shrink-0 snap-center flex-col items-center pb-5"
                      style={{
                        zIndex: flying ? 60 : isActive ? 30 : 10,
                        transformOrigin: flying ? `50% ${leaving!.originY}px` : "50% 34px",
                        overflow: flying || !hoverable ? "visible" : "hidden",
                      }}
                      animate={
                        flying
                          ? { x: leaving!.dx, y: leaving!.dy, scale: leaving!.scale, opacity: 1, width: panelW }
                          : leaving
                            ? { opacity: 0, y: 14, scale: 0.97, width: panelW }
                            : { opacity: quiet ? 0.82 : 1, scale: 1, x: 0, y: 0, width: panelW }
                      }
                      transition={
                        flying
                          ? { duration: 0.78, ease: [0.16, 1, 0.3, 1] }
                          : leaving
                            ? { duration: 0.3, ease: "easeIn" }
                            : { type: "spring", stiffness: 240, damping: 24 }
                      }
                      onAnimationComplete={() => { if (flying) router.push(href); }}
                      onMouseEnter={() => { if (hoverable && !leaving) { setActive(i); router.prefetch(href); } }}
                    >
                      <motion.div
                        className="flex shrink-0 flex-col items-center"
                        style={{
                          transformOrigin: "50% 6px",
                          width: innerW,
                          /* A squeezed panel cuts the garment off mid-sleeve;
                             feather that edge so it reads as cloth carrying on
                             behind its neighbour, not as a box around it. */
                          ...(hoverable && !isActive && !leaving
                            ? {
                                maskImage: "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)",
                                WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)",
                              }
                            : {}),
                        }}
                        animate={
                          reduce || isActive || leaving
                            ? { rotate: isActive ? 0 : TILT[i % TILT.length] * 0.4 }
                            : { rotate: [TILT[i % TILT.length] - 0.5, TILT[i % TILT.length] + 0.5, TILT[i % TILT.length] - 0.5] }
                        }
                        transition={
                          reduce || isActive || leaving
                            ? { type: "spring", stiffness: 180, damping: 20 }
                            : { duration: SWAY[i % SWAY.length], repeat: Infinity, ease: "easeInOut" }
                        }
                      >
                        {!sold && stock !== null && stock <= 5 && <Tag text={`Only ${stock} left`} tone="low" />}
                        {stock === null && i === 0 && <Tag text="New" tone="new" />}

                        {!ownHanger && <Hanger className="w-[clamp(58px,9vw,90px)] shrink-0 text-[#b08457]" />}

                        <button
                          type="button"
                          onClick={() => openProduct(i, href)}
                          onFocus={() => setActive(i)}
                          aria-label={`${p.name || "Product"}${sold ? " — sold out" : ""}, ${formatINR(p.price)}. View product`}
                          style={{ height: `calc(clamp(180px, 30vh, 300px) * ${LEN[i % LEN.length]})` }}
                          className="relative -mt-2 flex w-full cursor-pointer items-start justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          <img
                            ref={(el) => { imgRefs.current[i] = el; }}
                            src={display}
                            alt={p.name || ""}
                            loading={i < 4 ? "eager" : "lazy"}
                            className="h-full w-full object-contain object-top"
                            style={{
                              transformOrigin: "50% 0%",
                              transform: `translateY(${lift}%) scale(${fit})`,
                              filter: sold
                                ? "grayscale(1) opacity(0.5)"
                                : "drop-shadow(0 22px 26px rgba(0,0,0,0.28))",
                            }}
                          />
                          {sold && (
                            <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--fg)] py-1 text-center text-[9.5px] font-bold uppercase tracking-[0.18em] text-[var(--bg)]">Sold out</span>
                          )}
                        </button>
                      </motion.div>

                      {light && (
                        <motion.span
                          aria-hidden
                          className="pointer-events-none mt-1 block h-3 rounded-[50%] bg-black/25 blur-[6px]"
                          animate={{ width: isActive ? "62%" : "48%", opacity: isActive ? 0.3 : 0.18 }}
                          transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        />
                      )}

                      {!sold && (
                        <motion.button
                          type="button"
                          onClick={() =>
                            add(
                              { productId: pid(p), name: p.name || "", price: Number(p.price || 0), image: img(p) },
                              1,
                              { fly: { src: display, rect: imgRefs.current[i]?.getBoundingClientRect() ?? null } }
                            )
                          }
                          aria-label={`Add ${p.name || "product"} to cart`}
                          className="mt-3 grid size-9 cursor-pointer place-items-center rounded-full bg-[var(--fg)] text-[var(--bg)] shadow-[0_12px_26px_-12px_rgba(0,0,0,0.9)] transition-transform hover:scale-110 active:scale-95"
                          animate={{ opacity: isActive || !hoverable ? 1 : 0, y: isActive || !hoverable ? 0 : 8 }}
                          transition={{ duration: 0.22 }}
                          tabIndex={isActive || !hoverable ? 0 : -1}
                        >
                          <Plus className="size-4" aria-hidden />
                        </motion.button>
                      )}

                      {!hoverable && (
                        <Link href={href} className="mt-3 block w-full px-1 text-center">
                          <span className="line-clamp-1 text-[11.5px] font-semibold">{p.name}</span>
                          <span className="mt-0.5 block font-display text-[13px] font-bold tabular-nums">{formatINR(p.price)}</span>
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {hoverable && current && (
              <motion.div
                className="relative px-6 pb-12 pt-3 text-center"
                animate={{ opacity: leaving ? 0 : 1, y: leaving ? 10 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div key={pid(current)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
                  <p className="font-display text-[clamp(1.25rem,2.4vw,1.9rem)] font-bold leading-tight">{current.name}</p>
                  <p className="mt-1 text-[12.5px] text-[var(--fg-muted)]">{[current.category, formatINR(current.price)].filter(Boolean).join(" · ")}</p>
                </motion.div>
                <Link
                  href={`/shop/${pid(current)}`}
                  onClick={(e) => { e.preventDefault(); openProduct(active, `/shop/${pid(current)}`); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-[var(--fg)] transition-colors hover:border-[var(--border-strong)]"
                >
                  Shop the piece <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── Everything else, in the grid ─────────── */}
      <div className="container-x mt-20 md:mt-24">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>All merchandise</SectionLabel>
              <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold leading-[0.95]">The Shop</h2>
            </div>
            <div className="relative w-full max-w-[280px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
              <label htmlFor="shop-search" className="sr-only">Search products</label>
              <input id="shop-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
            </div>
          </div>
        </Reveal>

        {cats.length > 1 && (
          <Reveal className="mt-6">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${cat === c ? "border-transparent text-[var(--on-accent)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"}`}
                  style={cat === c ? { background: "var(--grad-brand)" } : undefined}>
                  {c}
                </button>
              ))}
            </div>
          </Reveal>
        )}

        {list.length === 0 ? (
          <Reveal>
            <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]"><ShoppingBag className="size-7 text-[var(--fg-subtle)]" aria-hidden /></span>
              <p className="mt-5 font-display text-xl font-bold">Nothing else here yet</p>
              <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--fg-muted)]">More official merchandise lands soon. Stay tuned.</p>
            </div>
          </Reveal>
        ) : (
          <StaggerGroup className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {list.map((p, i) => (
              <StaggerItem key={pid(p) || i}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-strong)]">
                  <Link href={`/shop/${pid(p)}`} className="relative block aspect-[4/5] overflow-hidden bg-[var(--surface-2)]">
                    <img
                      ref={(el) => { gridImgRefs.current[pid(p)] = el; }}
                      src={img(p)} alt={p.name || ""} loading="lazy"
                      className="size-full object-cover transition-transform duration-[1.1s] group-hover:scale-105"
                    />
                    {p.category && <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">{p.category}</span>}
                    {availableOf(p) === 0 && (
                      <span className="absolute inset-0 grid place-items-center bg-black/55 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-[2px]">Sold out</span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <Link href={`/shop/${pid(p)}`}><h3 className="line-clamp-1 text-[14px] font-semibold hover:text-[var(--accent)]">{p.name}</h3></Link>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <p className="font-display text-[1.05rem] font-bold tabular-nums">{formatINR(p.price)}</p>
                      <button
                        onClick={() =>
                          add(
                            { productId: pid(p), name: p.name || "", price: Number(p.price || 0), image: img(p) },
                            1,
                            { fly: { src: img(p), rect: gridImgRefs.current[pid(p)]?.getBoundingClientRect() ?? null } }
                          )
                        }
                        disabled={availableOf(p) === 0}
                        aria-label={availableOf(p) === 0 ? `${p.name} is sold out` : `Add ${p.name} to cart`}
                        className="grid size-9 cursor-pointer place-items-center rounded-full text-[var(--on-accent)] transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                        style={{ background: "var(--grad-brand)" }}>
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}
