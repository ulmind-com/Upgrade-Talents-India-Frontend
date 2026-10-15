"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, CheckCircle2, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/components/motion/Providers";
import { shopApi } from "@/lib/api";
import { formatINR } from "@/lib/utils";

export type CartItem = {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  image?: string;
  size?: string;
  color?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (i: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartCtx = createContext<CartState>({
  items: [], add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {},
  count: 0, subtotal: 0, open: false, setOpen: () => {},
});
export const useCart = () => useContext(CartCtx);

const KEY = "uti_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setItems(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const add: CartState["add"] = (i, qty = 1) => {
    const key = i.productId + (i.variantId || "");
    setItems((prev) => {
      const ex = prev.find((p) => p.key === key);
      if (ex) return prev.map((p) => (p.key === key ? { ...p, qty: Math.min(20, p.qty + qty) } : p));
      return [...prev, { ...i, key, qty }];
    });
    setOpen(true);
  };
  const remove = (key: string) => setItems((p) => p.filter((x) => x.key !== key));
  const setQty = (key: string, qty: number) => setItems((p) => p.map((x) => (x.key === key ? { ...x, qty: Math.max(1, Math.min(20, qty)) } : x)));
  const clear = () => setItems([]);

  const count = items.reduce((a, x) => a + x.qty, 0);
  const subtotal = items.reduce((a, x) => a + x.price * x.qty, 0);

  const value = useMemo(() => ({ items, add, remove, setQty, clear, count, subtotal, open, setOpen }), [items, count, subtotal, open]);

  return (
    <CartCtx.Provider value={value}>
      {children}
      <CartDrawer />
    </CartCtx.Provider>
  );
}

const EMPTY_ADDR = { full_name: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "" };

function CartDrawer() {
  const { items, open, setOpen, remove, setQty, subtotal, count, clear } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<"cart" | "address" | "done">("cart");
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!open) { setErr(""); } }, [open]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  async function placeOrder() {
    const req = ["full_name", "phone", "address_line1", "city", "state", "postal_code"] as const;
    if (req.some((k) => !addr[k].trim())) { setErr("Please fill all required fields."); return; }
    setBusy(true); setErr("");
    try {
      await shopApi.createOrder({
        items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.qty })),
        shipping_address: { ...addr, country: "India" },
      });
      clear(); setStep("done");
    } catch (e: any) { setErr(e?.message || "Could not place order."); }
    finally { setBusy(false); }
  }

  const close = () => { setOpen(false); setTimeout(() => setStep("cart"), 300); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={close} aria-hidden />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)]"
            role="dialog" aria-label="Shopping cart"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                {step === "address" && <button onClick={() => setStep("cart")} aria-label="Back" className="grid size-7 place-items-center rounded-full hover:bg-[var(--surface-2)]"><ArrowLeft className="size-4" aria-hidden /></button>}
                <ShoppingBag className="size-5 text-[var(--accent)]" aria-hidden />
                {step === "address" ? "Shipping details" : step === "done" ? "Order placed" : `Your cart${count ? ` (${count})` : ""}`}
              </p>
              <button onClick={close} aria-label="Close cart" className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]"><X className="size-4.5" aria-hidden /></button>
            </div>

            {step === "done" ? (
              <div className="grid flex-1 place-items-center px-6 text-center">
                <div>
                  <CheckCircle2 className="mx-auto size-14 text-[var(--success)]" aria-hidden />
                  <p className="mt-4 font-display text-xl font-bold">Thank you!</p>
                  <p className="mt-1.5 text-[13.5px] text-[var(--fg-muted)]">Your order has been placed. Track it in your dashboard.</p>
                  <div className="mt-6 flex flex-col gap-2.5">
                    <Link href="/dashboard" onClick={close} className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>View my orders</Link>
                    <button onClick={close} className="rounded-full border border-[var(--border)] py-3 text-[13.5px] font-semibold hover:border-[var(--border-strong)]">Continue shopping</button>
                  </div>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--surface-2)]"><ShoppingBag className="size-7 text-[var(--fg-subtle)]" aria-hidden /></span>
                  <p className="mt-4 font-display text-lg font-bold">Your cart is empty</p>
                  <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">Find something you love in the shop.</p>
                  <Link href="/shop" onClick={close} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>Browse shop <ArrowRight className="size-4" aria-hidden /></Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {step === "cart" ? (
                    <div className="flex flex-col gap-4">
                      {items.map((it) => (
                        <div key={it.key} className="flex gap-3.5">
                          <img src={it.image || ""} alt="" className="size-20 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-cover" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-[13.5px] font-semibold leading-tight">{it.name}</p>
                              <button onClick={() => remove(it.key)} aria-label="Remove" className="shrink-0 text-[var(--fg-subtle)] hover:text-[var(--danger)]"><Trash2 className="size-4" aria-hidden /></button>
                            </div>
                            {(it.size || it.color) && <p className="mt-0.5 text-[11.5px] text-[var(--fg-subtle)]">{[it.color, it.size].filter(Boolean).join(" · ")}</p>}
                            <div className="mt-auto flex items-center justify-between pt-2">
                              <div className="inline-flex items-center rounded-full border border-[var(--border)]">
                                <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease" className="grid size-7 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Minus className="size-3.5" aria-hidden /></button>
                                <span className="w-7 text-center text-[13px] font-semibold tabular-nums">{it.qty}</span>
                                <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Increase" className="grid size-7 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Plus className="size-3.5" aria-hidden /></button>
                              </div>
                              <p className="font-display text-[14px] font-bold tabular-nums">{formatINR(it.price * it.qty)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ["full_name", "Full name", "text", 2], ["phone", "Phone", "tel", 2],
                        ["address_line1", "Address line 1", "text", 2], ["address_line2", "Address line 2 (optional)", "text", 2],
                        ["city", "City", "text", 1], ["state", "State", "text", 1],
                        ["postal_code", "Postal code", "text", 1],
                      ] as const).map(([k, label, type, span]) => (
                        <label key={k} className={`flex flex-col gap-1.5 ${span === 2 ? "col-span-2" : ""}`}>
                          <span className="text-[11.5px] font-semibold text-[var(--fg-muted)]">{label}</span>
                          <input
                            type={type} value={(addr as any)[k]}
                            onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* footer */}
                <div className="border-t border-[var(--border)] px-5 py-4">
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-[13px] text-[var(--fg-muted)]">Subtotal</span>
                    <span className="font-display text-lg font-bold tabular-nums">{formatINR(subtotal)}</span>
                  </div>
                  {err && <p className="pb-2 text-[12px] text-[var(--danger)]">{err}</p>}
                  {step === "cart" ? (
                    <button onClick={() => (user ? setStep("address") : (window.location.href = "/login"))}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                      {user ? <>Checkout <ArrowRight className="size-4" aria-hidden /></> : <><Lock className="size-4" aria-hidden /> Sign in to checkout</>}
                    </button>
                  ) : (
                    <button onClick={placeOrder} disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[var(--on-accent)] disabled:opacity-60" style={{ background: "var(--grad-brand)" }}>
                      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />} Place order · {formatINR(subtotal)}
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
