"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Check, DoorOpen, Sofa, KeyRound, Users, Car, Sparkles, X, Minus, Plus, Loader2, CheckCircle2, Lock, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
import { vipApi, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";

declare global { interface Window { Razorpay?: any } }

type Cfg = {
  configuration_id?: string; _id?: string; id?: string;
  name?: string; description?: string; price?: number;
  access_areas?: string[];
  capacity?: { available_count?: number; total_capacity?: number; sold_out?: boolean };
};
type Ev = { _id?: string; id?: string; title?: string; name?: string };
export type Offering = { event: Ev; config: Cfg };

const PERK: Record<string, { Icon: typeof DoorOpen; label: string }> = {
  MAIN_GATE: { Icon: DoorOpen, label: "Main gate entry" },
  VIP_LOUNGE: { Icon: Sofa, label: "VIP lounge access" },
  BACKSTAGE: { Icon: KeyRound, label: "Backstage access" },
  MEET_GREET: { Icon: Users, label: "Meet & greet" },
  PARKING: { Icon: Car, label: "Priority parking" },
};
const perk = (a: string) => PERK[a] || { Icon: Check, label: a.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) };

const DEMO: Offering[] = [
  { event: { _id: "e1", title: "Grand Finale Night 2026" }, config: { configuration_id: "v1", name: "Platinum VIP", price: 9999, description: "The ultimate front-row experience with full backstage access.", access_areas: ["MAIN_GATE", "VIP_LOUNGE", "BACKSTAGE", "MEET_GREET"], capacity: { available_count: 12, total_capacity: 50, sold_out: false } } },
  { event: { _id: "e2", title: "Summer Dance Battle" }, config: { configuration_id: "v2", name: "Gold VIP", price: 4999, description: "Premium seating and exclusive lounge all evening.", access_areas: ["MAIN_GATE", "VIP_LOUNGE", "PARKING"], capacity: { available_count: 3, total_capacity: 40, sold_out: false } } },
  { event: { _id: "e3", title: "Street Fest 2026" }, config: { configuration_id: "v3", name: "Backstage Elite", price: 14999, description: "Go behind the scenes and meet the headliners.", access_areas: ["MAIN_GATE", "VIP_LOUNGE", "BACKSTAGE", "MEET_GREET", "PARKING"], capacity: { available_count: 0, total_capacity: 20, sold_out: true } } },
];

const cfgId = (c: Cfg) => c.configuration_id || c._id || c.id || "";
const evId = (e: Ev) => e._id || e.id || "";

export default function VipListing({ offerings }: { offerings: Offering[] }) {
  const { user } = useAuth();
  const [preview, setPreview] = useState(false);
  const [sel, setSel] = useState<Offering | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) setPreview(true);
  }, []);

  const data = offerings.length ? offerings : preview ? DEMO : [];
  const featured = data[0];

  return (
    <section className="container-x relative pb-24 pt-14 md:pt-20">
      <Reveal>
        <div className="max-w-2xl">
          <SectionLabel>Exclusive access</SectionLabel>
          <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">VIP &amp; Backstage Passes</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--fg-muted)]">
            Skip the queue, lounge in style and get closer to the action. Limited passes, unforgettable nights.
          </p>
        </div>
      </Reveal>

      {data.length === 0 ? (
        <Reveal>
          <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]"><Crown className="size-7 text-[var(--fg-subtle)]" aria-hidden /></span>
            <p className="mt-5 font-display text-xl font-bold">No VIP passes available</p>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--fg-muted)]">VIP and backstage passes for upcoming events will appear here.</p>
          </div>
        </Reveal>
      ) : (
        <StaggerGroup className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((o, i) => {
            const c = o.config;
            const soldOut = c.capacity?.sold_out || (c.capacity?.available_count ?? 1) <= 0;
            const left = c.capacity?.available_count ?? null;
            const hot = left != null && left > 0 && left <= 5;
            const isFeatured = featured === o;
            return (
              <StaggerItem key={cfgId(c) || i}>
                <div
                  className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border p-6 transition-transform duration-500 hover:-translate-y-1"
                  style={{
                    borderColor: isFeatured ? "var(--accent)" : "var(--border)",
                    background: isFeatured ? "var(--grad-surface), var(--surface)" : "var(--surface)",
                    boxShadow: isFeatured ? "0 0 60px -22px color-mix(in srgb, var(--accent) 55%, transparent)" : undefined,
                  }}
                >
                  <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-25 blur-2xl" style={{ background: "var(--grad-brand)" }} />
                  <div className="flex items-start justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}><Crown className="size-5" aria-hidden /></span>
                    {isFeatured && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]"><Sparkles className="size-3" aria-hidden /> Most popular</span>}
                    {!isFeatured && hot && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>Only {left} left</span>}
                  </div>

                  <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-subtle)]"><Calendar className="size-3.5" aria-hidden /> {o.event.title || o.event.name}</p>
                  <h3 className="mt-1 font-display text-[1.5rem] font-bold leading-tight">{c.name || "VIP Pass"}</h3>
                  {c.description && <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">{c.description}</p>}

                  <p className="mt-4 font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold text-gradient">{formatINR(c.price)}<span className="ml-1 text-[12px] font-medium text-[var(--fg-subtle)]">/ pass</span></p>

                  <ul className="mt-5 flex flex-col gap-2.5">
                    {(c.access_areas || []).map((a) => {
                      const p = perk(a);
                      return (
                        <li key={a} className="flex items-center gap-2.5 text-[13px]">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-2)]"><p.Icon className="size-3.5 text-[var(--accent)]" aria-hidden /></span>
                          {p.label}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto pt-6">
                    {left != null && !soldOut && (
                      <p className="mb-2.5 text-[11.5px] text-[var(--fg-subtle)]">{left} of {c.capacity?.total_capacity} passes remaining</p>
                    )}
                    <button
                      onClick={() => setSel(o)} disabled={soldOut}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "var(--grad-brand)" }}>
                      {soldOut ? "Sold out" : <>Book VIP <Crown className="size-4" aria-hidden /></>}
                    </button>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}

      <BookingModal offering={sel} user={user} onClose={() => setSel(null)} />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOOKING MODAL — Full Razorpay Payment Gateway Integration
   ═══════════════════════════════════════════════════════════════════ */

type ModalStep = "form" | "processing" | "success" | "failed";

function BookingModal({ offering, user, onClose }: { offering: Offering | null; user: any; onClose: () => void }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [step, setStep] = useState<ModalStep>("form");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => { if (offering) { setQty(1); setStep("form"); setErr(""); setBookingRef(""); } }, [offering]);
  useEffect(() => { document.body.style.overflow = offering ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [offering]);

  /* ── Load Razorpay Checkout Script ── */
  const loadRazorpay = useCallback(
    () => new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    }),
    []
  );

  if (!offering) return null;
  const c = offering.config;

  /* ── Main Purchase Flow ── */
  async function handlePurchase() {
    // If not logged in, redirect to login
    if (!user) {
      window.location.href = "/login?next=/vip";
      return;
    }

    setBusy(true);
    setErr("");
    setStep("processing");

    try {
      // 1. Create booking on backend — this also creates a Razorpay order
      const booking = await vipApi.book(
        evId(offering!.event),
        cfgId(c),
        qty,
        [user?.name || "VIP Guest"]
      );

      const bRef = booking.booking_reference || booking.booking_ref || "";
      setBookingRef(bRef);

      // 2. Check if payment_details exist (backend returns Razorpay order info)
      const paymentDetails = booking.payment_details;

      if (!paymentDetails) {
        // No payment details — booking might be in a weird state
        setStep("success");
        setBusy(false);
        return;
      }

      // 3. If status is PENDING_CONFIGURATION, gateway isn't configured — show message
      if (paymentDetails.status === "PENDING_CONFIGURATION") {
        setErr("Payment gateway is being configured. Your booking is reserved — you can complete payment from your dashboard once it's ready.");
        setStep("success");
        setBusy(false);
        return;
      }

      // 4. Load Razorpay checkout script
      const rzpLoaded = await loadRazorpay();
      if (!rzpLoaded) {
        throw new ApiError("Could not reach the payment gateway. Check your connection and retry.", 0);
      }

      // 5. Extract checkout data from backend response
      const checkout = paymentDetails.checkout_data || {};
      const keyId = checkout.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!keyId) {
        throw new ApiError("Payment gateway is not configured yet. Please contact support.", 0);
      }

      // 6. Open Razorpay Checkout Popup
      const rzp = new window.Razorpay({
        key: keyId,
        amount: checkout.amount || Math.round((c.price || 0) * qty * 100),
        currency: checkout.currency || paymentDetails.currency || "INR",
        name: checkout.name || "Upgrade Talents India",
        description: checkout.description || `VIP Pass — ${offering!.event.title || offering!.event.name}`,
        order_id: checkout.order_id || paymentDetails.provider_order_id,
        prefill: {
          email: user?.email || "",
          name: user?.name || "",
          contact: user?.phone_number || "",
          ...(checkout.prefill || {}),
        },
        theme: { color: "#bfff2e" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setStep("form");
            setErr("Payment cancelled. Your booking is held briefly — retry to confirm.");
          },
        },
        handler: async (resp: any) => {
          // 7. Payment successful — verify on backend
          try {
            setStep("processing");
            await vipApi.verifyPayment({
              booking_reference: bRef,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setStep("success");
          } catch (e: any) {
            setErr(e?.message || "Payment captured but verification failed. Contact support with your booking reference.");
            setStep("failed");
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.on("payment.failed", (r: any) => {
        setErr(r?.error?.description || "Payment failed. No amount was charged — please try again.");
        setStep("failed");
        setBusy(false);
      });

      rzp.open();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong while creating your booking.");
      setStep("failed");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {offering && (
        <motion.div className="fixed inset-0 z-[130] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={onClose} aria-hidden />
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)]"
            role="dialog" aria-label="Book VIP pass"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Crown className="size-5 text-[var(--accent)]" aria-hidden />
                {step === "success" ? "Booking confirmed!" : step === "failed" ? "Payment failed" : step === "processing" ? "Processing…" : "Book VIP pass"}
              </p>
              <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]"><X className="size-4.5" aria-hidden /></button>
            </div>

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <div className="grid place-items-center px-6 py-10 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                  <CheckCircle2 className="size-14 text-[var(--success)]" aria-hidden />
                </motion.div>
                <p className="mt-4 font-display text-xl font-bold">Payment successful!</p>
                <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
                  Your VIP pass has been confirmed. {bookingRef && <>Booking ref: <span className="font-mono font-semibold text-[var(--fg)]">{bookingRef}</span></>}
                </p>
                {err && <p className="mt-2 text-[12px] text-[var(--fg-subtle)]">{err}</p>}
                <div className="mt-6 flex w-full flex-col gap-2.5">
                  <Link href="/dashboard" onClick={onClose} className="inline-flex items-center justify-center rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>View my VIP passes</Link>
                  <button onClick={onClose} className="rounded-full border border-[var(--border)] py-3 text-[13.5px] font-semibold hover:border-[var(--border-strong)]">Close</button>
                </div>
              </div>
            )}

            {/* ── PROCESSING ── */}
            {step === "processing" && (
              <div className="grid place-items-center px-6 py-14 text-center">
                <Loader2 className="size-10 animate-spin text-[var(--accent)]" aria-hidden />
                <p className="mt-4 font-display text-lg font-bold">Processing payment…</p>
                <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">Please do not close this window.</p>
              </div>
            )}

            {/* ── FAILED ── */}
            {step === "failed" && (
              <div className="grid place-items-center px-6 py-10 text-center">
                <AlertCircle className="size-14 text-[var(--danger)]" aria-hidden />
                <p className="mt-4 font-display text-xl font-bold">Payment failed</p>
                <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">{err || "Something went wrong. No amount was charged."}</p>
                {bookingRef && <p className="mt-1 font-mono text-[11px] text-[var(--fg-subtle)]">Ref: {bookingRef}</p>}
                <div className="mt-6 flex w-full flex-col gap-2.5">
                  <button onClick={() => { setStep("form"); setErr(""); }} className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                    Try again
                  </button>
                  <button onClick={onClose} className="rounded-full border border-[var(--border)] py-3 text-[13.5px] font-semibold hover:border-[var(--border-strong)]">Close</button>
                </div>
              </div>
            )}

            {/* ── FORM ── */}
            {step === "form" && (
              <div className="p-5">
                <p className="text-[12px] text-[var(--fg-subtle)]">{offering.event.title || offering.event.name}</p>
                <p className="font-display text-xl font-bold">{c.name}</p>
                <p className="mt-1 font-display text-lg font-bold text-gradient">{formatINR(c.price)} <span className="text-[12px] font-medium text-[var(--fg-subtle)]">/ pass</span></p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Quantity</span>
                  <div className="inline-flex items-center rounded-full border border-[var(--border)]">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="grid size-9 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Minus className="size-4" aria-hidden /></button>
                    <span className="w-9 text-center text-[14px] font-bold tabular-nums">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase" className="grid size-9 place-items-center rounded-full hover:bg-[var(--surface-2)]"><Plus className="size-4" aria-hidden /></button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <span className="text-[13px] text-[var(--fg-muted)]">Total</span>
                  <span className="font-display text-xl font-bold tabular-nums">{formatINR((c.price || 0) * qty)}</span>
                </div>
                {err && <p className="mt-3 text-[12.5px] text-[var(--danger)]">{err}</p>}
                <button onClick={handlePurchase} disabled={busy}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[var(--on-accent)] disabled:opacity-60" style={{ background: "var(--grad-brand)" }}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : user ? <CreditCard className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                  {user ? "Pay & confirm pass" : "Sign in to book"}
                </button>
                <p className="mt-2.5 text-center text-[11px] text-[var(--fg-subtle)]">Secure checkout via Razorpay · UPI, Card, NetBanking</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
