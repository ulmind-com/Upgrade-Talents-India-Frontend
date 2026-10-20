"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, CheckCircle2, ArrowLeft, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/motion/Providers";
import { shopApi } from "@/lib/api";
import { formatINR } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

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

/* Where a flying product image starts from: the thumbnail the shopper
   clicked next to. Passed straight from getBoundingClientRect(). */
export type FlyOrigin = { src?: string; rect: DOMRect | null };

type Flight = {
  id: number;
  src: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number };
};

type CartState = {
  items: CartItem[];
  add: (i: Omit<CartItem, "key" | "qty">, qty?: number, opts?: { fly?: FlyOrigin }) => void;
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
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightSeq = useRef(0);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setItems(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  /* Sends the product image arcing to the navbar cart icon. Returns false
     when there is nothing to fly to (no navbar, no image, reduced motion),
     so the caller can fall back to opening the drawer instead. */
  const launchFlight = useCallback((src: string, rect: DOMRect | null) => {
    if (typeof window === "undefined" || !src || !rect || !rect.width) return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    const target = document.querySelector<HTMLElement>("[data-cart-target]");
    if (!target) return false;
    const t = target.getBoundingClientRect();
    const id = ++flightSeq.current;
    setFlights((f) => [
      ...f,
      {
        id, src,
        from: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        to: { x: t.left + t.width / 2, y: t.top + t.height / 2 },
      },
    ]);
    return true;
  }, []);

  const endFlight = useCallback((id: number) => {
    setFlights((f) => f.filter((x) => x.id !== id));
    const target = document.querySelector<HTMLElement>("[data-cart-target]");
    target?.animate?.(
      [{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );
  }, []);

  const add: CartState["add"] = (i, qty = 1, opts) => {
    const key = i.productId + (i.variantId || "");
    setItems((prev) => {
      const ex = prev.find((p) => p.key === key);
      if (ex) return prev.map((p) => (p.key === key ? { ...p, qty: Math.min(20, p.qty + qty) } : p));
      return [...prev, { ...i, key, qty }];
    });
    const flew = opts?.fly ? launchFlight(opts.fly.src || i.image || "", opts.fly.rect) : false;
    if (!flew) setOpen(true);
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
      <FlightLayer flights={flights} onDone={endFlight} />
      <CartDrawer />
    </CartCtx.Provider>
  );
}

/* The image travels on its own above everything else: no card, no border,
   no background -- just the product picture shrinking into the cart icon. */
function FlightLayer({ flights, onDone }: { flights: Flight[]; onDone: (id: number) => void }) {
  if (!flights.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden" aria-hidden>
      {flights.map((f) => {
        const dx = f.to.x - (f.from.x + f.from.w / 2);
        const dy = f.to.y - (f.from.y + f.from.h / 2);
        const endScale = Math.max(0.08, Math.min(1, 34 / Math.max(f.from.w, f.from.h, 1)));
        const lift = Math.min(190, Math.abs(dy) * 0.45 + 90);
        return (
          <motion.img
            key={f.id}
            src={f.src}
            alt=""
            initial={{ x: 0, y: 0, scale: 1, opacity: 0.98, rotate: 0 }}
            animate={{
              x: [0, dx * 0.62, dx],
              y: [0, dy * 0.42 - lift, dy],
              scale: [1, 0.6, endScale],
              rotate: [0, -6, 8],
              opacity: [0.98, 1, 0.3],
            }}
            transition={{ duration: 0.8, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }}
            onAnimationComplete={() => onDone(f.id)}
            style={{
              position: "absolute",
              left: f.from.x,
              top: f.from.y,
              width: f.from.w,
              height: f.from.h,
              objectFit: "cover",
              background: "transparent",
              border: "none",
              borderRadius: 14,
              filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.45))",
              willChange: "transform, opacity",
            }}
          />
        );
      })}
    </div>
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
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Auto-fill user contact info safely converting to string
  useEffect(() => {
    if (user) {
      setAddr((prev) => ({
        ...prev,
        full_name: String(prev.full_name || user.name || ""),
        phone: String(prev.phone || user.phone_number || ""),
      }));
    }
  }, [user]);

  useEffect(() => { if (!open) { setErr(""); } }, [open]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  const loadRazorpay = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (typeof window === "undefined") return resolve(false);
        if (window.Razorpay) return resolve(true);
        const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
        if (existing) {
          if (window.Razorpay) return resolve(true);
          existing.addEventListener("load", () => resolve(true));
          existing.addEventListener("error", () => resolve(false));
          setTimeout(() => resolve(!!window.Razorpay), 1500);
          return;
        }
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.async = true;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
      }),
    []
  );

  useEffect(() => {
    if (open) {
      loadRazorpay();
    }
  }, [open, loadRazorpay]);

  async function placeOrder() {
    setErr("");
    try {
      const getVal = (k: string) => String((addr as any)[k] ?? "").trim();
      const full_name = getVal("full_name");
      const phone = getVal("phone");
      const address_line1 = getVal("address_line1");
      const address_line2 = getVal("address_line2");
      const city = getVal("city");
      const state = getVal("state");
      const postal_code = getVal("postal_code");

      if (!full_name || !phone || !address_line1 || !city || !state || !postal_code) {
        setErr("Please fill all required shipping fields.");
        return;
      }
      if (phone.length < 10) {
        setErr("Please enter a valid 10-digit mobile number.");
        return;
      }
      if (address_line1.length < 5) {
        setErr("Address line 1 must be at least 5 characters.");
        return;
      }

      setBusy(true);

      const order = await shopApi.createOrder({
        items: items.map((i) => ({
          product_id: String(i.productId),
          variant_id: i.variantId ? String(i.variantId) : undefined,
          quantity: Number(i.qty) || 1,
        })),
        shipping_address: {
          full_name,
          phone,
          address_line1,
          address_line2: address_line2 || "",
          city,
          state,
          postal_code,
          country: "India",
        },
      });

      const paymentDetails = order?.payment_details;

      // If backend reports credentials are not yet configured
      if (paymentDetails?.status === "PENDING_CONFIGURATION") {
        setPlacedOrder(order);
        clear();
        setStep("done");
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) {
        throw new Error("Could not reach Razorpay payment gateway. Please check your internet connection or disable ad-blockers and retry.");
      }

      const checkout = paymentDetails?.checkout_data;
      const keyId = checkout?.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TBRo7AUeaKIhKB";
      const rawOrderId = checkout?.order_id || paymentDetails?.provider_order_id;
      // Only pass order_id to Razorpay SDK if it is a real Razorpay order ID (starts with order_)
      const validOrderId = rawOrderId && String(rawOrderId).startsWith("order_") ? String(rawOrderId) : undefined;

      const rzpOptions: any = {
        key: keyId,
        amount: checkout?.amount || Math.round((order.total_amount || subtotal) * 100),
        currency: checkout?.currency || order.currency || "INR",
        name: checkout?.name || "Upgrade Talents India",
        description: checkout?.description || `Merchandise Order ${order.order_number}`,
        prefill: {
          email: user?.email || "",
          name: full_name || user?.name || "",
          contact: phone || user?.phone_number || "",
          ...(checkout?.prefill || {}),
        },
        theme: { color: "#ff7a00" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setErr("Payment cancelled. Your order is pending — retry to complete payment.");
          },
        },
        handler: async (resp: any) => {
          try {
            setBusy(true);
            setErr("");
            await shopApi.verifyPayment({
              order_number: order.order_number,
              razorpay_order_id: resp.razorpay_order_id || rawOrderId || "",
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature || "",
            });
            setPlacedOrder(order);
            clear();
            setStep("done");
          } catch (e: any) {
            console.error("Payment verification failed:", e);
            setErr(e?.message || `Payment captured but verification failed. Please contact support with order #${order.order_number}`);
          } finally {
            setBusy(false);
          }
        },
      };

      if (validOrderId) {
        rzpOptions.order_id = validOrderId;
      }

      const rzp = new window.Razorpay(rzpOptions);

      rzp.on("payment.failed", (r: any) => {
        console.error("Razorpay payment failed:", r);
        setErr(r?.error?.description || "Payment failed. No amount was charged — please try again.");
        setBusy(false);
      });

      rzp.open();
    } catch (e: any) {
      console.error("placeOrder exception:", e);
      setErr(e?.message || "Could not place order. Please try again.");
      setBusy(false);
    }
  }

  const close = () => { setOpen(false); setTimeout(() => { setStep("cart"); setPlacedOrder(null); }, 300); };

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
                  {placedOrder?.order_number && (
                    <p className="mt-1 font-mono text-xs font-semibold text-[var(--accent)]">
                      Order #{placedOrder.order_number}
                    </p>
                  )}
                  <p className="mt-1.5 text-[13.5px] text-[var(--fg-muted)]">Your order has been placed and payment confirmed. Track it in your dashboard.</p>
                  <div className="mt-6 flex flex-col gap-2.5">
                    {placedOrder?.order_number && (
                      <Link
                        href={`/merchandise/orders/${placedOrder.order_number}`}
                        onClick={close}
                        className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]"
                        style={{ background: "var(--grad-brand)" }}
                      >
                        Track This Order <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    )}
                    <Link
                      href="/dashboard?tab=orders"
                      onClick={close}
                      className="rounded-full border border-[var(--border)] py-2.5 text-[13px] font-semibold hover:border-[var(--border-strong)]"
                    >
                      View all orders in dashboard
                    </Link>
                    <button
                      onClick={close}
                      className="rounded-full py-2 text-[12.5px] text-[var(--fg-muted)] hover:text-white"
                    >
                      Continue shopping
                    </button>
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
                            type={type} value={String((addr as any)[k] ?? "")}
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
                  {err && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  )}
                  {step === "cart" ? (
                    <button type="button" onClick={() => (user ? setStep("address") : (window.location.href = "/login?next=/shop"))}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                      {user ? <>Checkout <ArrowRight className="size-4" aria-hidden /></> : <><Lock className="size-4" aria-hidden /> Sign in to checkout</>}
                    </button>
                  ) : (
                    <button type="button" onClick={placeOrder} disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[var(--on-accent)] disabled:opacity-60 cursor-pointer" style={{ background: "var(--grad-brand)" }}>
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden /> Processing payment...
                        </>
                      ) : (
                        <>
                          <Lock className="size-4" aria-hidden /> Pay with Razorpay · {formatINR(subtotal)}
                        </>
                      )}
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
