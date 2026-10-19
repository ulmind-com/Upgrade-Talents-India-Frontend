"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Plus } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { useCart } from "@/components/shop/CartProvider";
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

export default function ShopListing({ items }: { items: Product[] }) {
  const { add } = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) setPreview(true);
  }, []);

  const data = items.length ? items : preview ? DEMO_PRODUCTS : [];
  const cats = useMemo(() => ["All", ...Array.from(new Set(data.map((p) => p.category).filter(Boolean) as string[]))], [data]);
  const list = useMemo(
    () => data.filter((p) => (cat === "All" || p.category === cat) && (!q || (p.name || "").toLowerCase().includes(q.toLowerCase()))),
    [data, q, cat]
  );

  return (
    <section className="container-x relative pb-24 pt-14 md:pt-20">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel>Official merch</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">The Shop</h2>
          </div>
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
          </div>
        </div>
      </Reveal>

      {cats.length > 1 && (
        <Reveal className="mt-6">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`rounded-full border px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${cat === c ? "border-transparent text-[var(--on-accent)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"}`}
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
            <p className="mt-5 font-display text-xl font-bold">No products yet</p>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--fg-muted)]">Official event merchandise will land here soon. Stay tuned.</p>
          </div>
        </Reveal>
      ) : (
        <StaggerGroup className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {list.map((p, i) => (
            <StaggerItem key={pid(p) || i}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-strong)]">
                <Link href={`/shop/${pid(p)}`} className="relative block aspect-[4/5] overflow-hidden bg-[var(--surface-2)]">
                  <img src={img(p)} alt={p.name || ""} loading="lazy" className="size-full object-cover transition-transform duration-[1.1s] group-hover:scale-105" />
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
                      onClick={() => add({ productId: pid(p), name: p.name || "", price: Number(p.price || 0), image: img(p) })}
                      disabled={availableOf(p) === 0}
                      aria-label={availableOf(p) === 0 ? `${p.name} is sold out` : `Add ${p.name} to cart`}
                      className="grid size-9 place-items-center rounded-full text-[var(--on-accent)] transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
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
    </section>
  );
}
