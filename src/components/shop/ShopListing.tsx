"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { useCart } from "@/components/shop/CartProvider";
import { formatINR } from "@/lib/utils";
import { DEMO_PRODUCTS } from "@/lib/shopDemo";

export type Product = {
  _id?: string; id?: string; name?: string; description?: string;
  category?: string; price?: number; currency?: string;
  images?: string[]; stock_quantity?: number; reserved_quantity?: number;
  created_at?: string;
};

export { DEMO_PRODUCTS };

const pid = (p: Product) => p._id || p.id || "";
const img = (p: Product) => p.images?.[0] || "";
/* Backend holds stock and reservations separately; what a shopper can
   actually buy is the difference. Undefined stock means "not tracked". */
export const availableOf = (p: { stock_quantity?: number; reserved_quantity?: number } | Record<string, any>) =>
  p?.stock_quantity == null ? null : Math.max(0, p.stock_quantity - (p.reserved_quantity || 0));

/* Every garment hangs a little differently, the way a real rail looks.
   Keyed off the index so a product never jumps between renders. */
const LEN = [1, 0.92, 0.97, 0.87, 1, 0.94, 0.9, 0.96];
const TILT = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.6, -1.3, 1];
const SWAY = [5.6, 6.4, 5.1, 6.9, 6.1, 5.4, 6.6, 5.9];

/* A real wooden hanger, drawn rather than photographed, so it sits on any
   product shot the shop happens to have. */
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
    <span
      className="pointer-events-none absolute -top-1 left-1/2 z-20 origin-top -translate-x-[150%] rotate-[-7deg] select-none"
      aria-hidden
    >
      <span className="block h-7 w-px bg-black/25 mx-auto" />
      <span
        className={`block rounded-[3px] px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] shadow-[0_6px_14px_-8px_rgba(0,0,0,0.6)] ${
          tone === "new" ? "bg-[#16181d] text-white" : "bg-white text-[#16181d] ring-1 ring-black/10"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

export default function ShopListing({ items }: { items: Product[] }) {
  const { add } = useCart();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [preview, setPreview] = useState(false);
  const [active, setActive] = useState(0);
  const [hoverable, setHoverable] = useState(false);
  /* The garment the shopper just clicked, mid-flight to the product page. */
  const [leaving, setLeaving] = useState<{ i: number; dx: number; dy: number; scale: number; originY: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("preview")) setPreview(true);
    setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const data = items.length ? items : preview ? DEMO_PRODUCTS : [];
  const cats = useMemo(() => ["All", ...Array.from(new Set(data.map((p) => p.category).filter(Boolean) as string[]))], [data]);
  const list = useMemo(
    () => data.filter((p) => (cat === "All" || p.category === cat) && (!q || (p.name || "").toLowerCase().includes(q.toLowerCase()))),
    [data, q, cat]
  );

  useEffect(() => { setActive(0); }, [cat, q]);

  const current = list[Math.min(active, Math.max(0, list.length - 1))];

  /* Click lifts the garment off the rail and carries it to the middle of the
     stage while the rest of the room fades away; the product page then opens
     on the same picture, so the two screens read as one move. */
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
      /* Scale around the garment's own centre so it swells in place, then
         carry that centre to the middle of the stage. */
      setLeaving({
        i,
        dx: s.left + s.width / 2 - (r.left + r.width / 2),
        dy: s.top + s.height / 2 - (r.top + r.height / 2),
        scale: Math.min(2.4, Math.max(1.25, (s.height * 0.95) / Math.max(r.height, 1))),
        originY: r.top + r.height / 2 - col.top,
      });
    },
    [hoverable, reduce, router]
  );

  return (
    <section className="relative pb-20 pt-28 md:pt-32">
      {/* The gallery wall: a lit, warm room the merch hangs in, whichever
          theme the rest of the site is wearing. */}
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[28px] bg-[#F6F4F0] text-[#16181d] shadow-[0_60px_120px_-60px_rgba(0,0,0,0.85)] ring-1 ring-black/5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(246,244,240,0) 60%), linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.055) 100%)" }}
          />

          <div className="relative px-4 pt-8 sm:px-8 md:px-12 md:pt-12">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#16181d]/70">
              <span>New Collection</span>
              <span className="h-3 w-px bg-black/20" aria-hidden />
              <span className="text-[#16181d]/45">Official Merch</span>
            </div>

            {/* Filters — quiet, so the rail stays the hero */}
            {(cats.length > 1 || data.length > 3) && (
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap justify-center gap-1.5">
                  {cats.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      aria-pressed={cat === c}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                        cat === c ? "bg-[#16181d] text-white" : "text-[#16181d]/55 hover:bg-black/5 hover:text-[#16181d]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="relative w-full max-w-[240px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[#16181d]/35" aria-hidden />
                  <label htmlFor="shop-search" className="sr-only">Search products</label>
                  <input
                    id="shop-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
                    className="w-full rounded-full border border-black/10 bg-white/70 py-2 pl-9 pr-4 text-[12.5px] text-[#16181d] outline-none placeholder:text-[#16181d]/35 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  />
                </div>
              </div>
            )}
          </div>

          {list.length === 0 ? (
            <div className="relative grid place-items-center px-6 py-24 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-black/5"><ShoppingBag className="size-7 text-[#16181d]/40" aria-hidden /></span>
              <p className="mt-5 font-display text-xl font-bold">Nothing on the rail yet</p>
              <p className="mt-1.5 max-w-sm text-[13.5px] text-[#16181d]/55">Official event merchandise lands here soon. Stay tuned.</p>
            </div>
          ) : (
            <>
              {/* ── The rail ── */}
              <div
                ref={stageRef}
                className="relative mt-6 md:mt-8"
                onMouseLeave={() => !leaving && setActive((a) => a)}
              >
                {/* the rod */}
                <div className="pointer-events-none absolute inset-x-6 top-[38px] z-0 sm:inset-x-12" aria-hidden>
                  <div className="h-[2px] w-full rounded-full" style={{ background: "linear-gradient(90deg, rgba(22,24,29,0) 0%, rgba(22,24,29,0.45) 12%, rgba(22,24,29,0.45) 88%, rgba(22,24,29,0) 100%)" }} />
                  <div className="mx-auto h-px w-[92%]" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)" }} />
                </div>

                <div
                  className={`flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden px-5 pt-8 sm:gap-6 sm:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    list.length <= 6 ? "md:justify-center" : ""
                  }`}
                  role="list"
                >
                  {list.map((p, i) => {
                    const stock = availableOf(p);
                    const sold = stock === 0;
                    const isActive = hoverable ? active === i : false;
                    const dim = hoverable && leaving === null && active !== i;
                    const flying = leaving?.i === i;
                    const href = `/shop/${pid(p)}`;
                    return (
                      <motion.div
                        key={pid(p) || i}
                        ref={(el) => { itemRefs.current[i] = el; }}
                        role="listitem"
                        className="relative flex shrink-0 snap-center flex-col items-center pb-4"
                        style={{
                          width: "clamp(116px, 15vw, 176px)",
                          zIndex: flying ? 60 : isActive ? 30 : 10,
                          /* grows downward off the rod, the way cloth does */
                          transformOrigin: flying ? `50% ${leaving!.originY}px` : "50% 34px",
                        }}
                        animate={
                          flying
                            ? { x: leaving!.dx, y: leaving!.dy, scale: leaving!.scale, opacity: 1 }
                            : leaving
                              ? { opacity: 0, y: 14, scale: 0.97 }
                              : { opacity: dim ? 0.42 : 1, scale: isActive ? 1.12 : 1, y: 0 }
                        }
                        transition={
                          flying
                            ? { duration: 0.72, ease: [0.16, 1, 0.3, 1] }
                            : leaving
                              ? { duration: 0.32, ease: "easeIn" }
                              : { type: "spring", stiffness: 260, damping: 26 }
                        }
                        onAnimationComplete={() => { if (flying) router.push(href); }}
                        onMouseEnter={() => { if (hoverable && !leaving) { setActive(i); router.prefetch(href); } }}
                      >
                        {/* hangs from the rod, sways like cloth on a rail */}
                        <motion.div
                          className="flex w-full flex-col items-center"
                          style={{ transformOrigin: "50% 6px" }}
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

                          <Hanger className="w-[clamp(54px,9vw,86px)] shrink-0 text-[#8a6a4a]" />

                          <button
                            type="button"
                            onClick={() => openProduct(i, href)}
                            onFocus={() => setActive(i)}
                            aria-label={`${p.name || "Product"}${sold ? " — sold out" : ""}, ${formatINR(p.price)}. View product`}
                            style={{ height: `calc(clamp(170px, 29vh, 290px) * ${LEN[i % LEN.length]})` }}
                            className="relative -mt-2 flex w-full cursor-pointer items-start justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <img
                              ref={(el) => { imgRefs.current[i] = el; }}
                              src={img(p)}
                              alt={p.name || ""}
                              loading={i < 4 ? "eager" : "lazy"}
                              className="h-full w-full object-contain object-top"
                              style={{ mixBlendMode: "multiply", filter: sold ? "grayscale(1) opacity(0.5)" : undefined }}
                            />
                            {sold && (
                              <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-full bg-[#16181d]/85 py-1 text-center text-[9.5px] font-bold uppercase tracking-[0.18em] text-white">
                                Sold out
                              </span>
                            )}
                          </button>
                        </motion.div>

                        {/* contact shadow on the floor */}
                        <motion.span
                          aria-hidden
                          className="pointer-events-none mt-1 block h-3 rounded-[50%] bg-black/25 blur-[6px]"
                          animate={{ width: isActive ? "62%" : "48%", opacity: isActive ? 0.3 : 0.18 }}
                          transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        />

                        {/* quick add — keeps the cart flight within reach */}
                        {!sold && (
                          <motion.button
                            type="button"
                            onClick={() =>
                              add(
                                { productId: pid(p), name: p.name || "", price: Number(p.price || 0), image: img(p) },
                                1,
                                { fly: { src: img(p), rect: imgRefs.current[i]?.getBoundingClientRect() ?? null } }
                              )
                            }
                            aria-label={`Add ${p.name || "product"} to cart`}
                            className="mt-2 grid size-9 cursor-pointer place-items-center rounded-full bg-[#16181d] text-white shadow-[0_12px_26px_-12px_rgba(0,0,0,0.9)] transition-transform hover:scale-110 active:scale-95"
                            animate={{ opacity: isActive || !hoverable ? 1 : 0, y: isActive || !hoverable ? 0 : 8 }}
                            transition={{ duration: 0.22 }}
                            tabIndex={isActive || !hoverable ? 0 : -1}
                          >
                            <Plus className="size-4" aria-hidden />
                          </motion.button>
                        )}

                        {/* phones get a label per garment, since there is no hover */}
                        {!hoverable && (
                          <Link href={href} className="mt-4 block w-full px-1 text-center">
                            <span className="line-clamp-1 text-[11.5px] font-semibold">{p.name}</span>
                            <span className="mt-0.5 block font-display text-[13px] font-bold tabular-nums">{formatINR(p.price)}</span>
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── What the rail is pointing at ── */}
              {hoverable && current && (
                <motion.div
                  className="relative px-6 pb-12 pt-2 text-center"
                  animate={{ opacity: leaving ? 0 : 1, y: leaving ? 10 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div key={pid(current)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
                    <p className="font-display text-[clamp(1.25rem,2.4vw,1.9rem)] font-bold leading-tight">{current.name}</p>
                    <p className="mt-1 text-[12.5px] text-[#16181d]/55">
                      {[current.category, formatINR(current.price)].filter(Boolean).join(" · ")}
                    </p>
                  </motion.div>
                  <Link
                    href={`/shop/${pid(current)}`}
                    onClick={(e) => { e.preventDefault(); openProduct(active, `/shop/${pid(current)}`); }}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-6 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-[#16181d] transition-colors hover:border-black/40"
                  >
                    Shop the piece <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
