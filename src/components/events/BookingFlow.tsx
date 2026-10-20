"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Minus, Plus, ChevronRight, AlertCircle, CheckCircle2, LogIn, Loader2, Banknote, CreditCard,
} from "lucide-react";
import { activitiesApi, bookingsApi, paymentsApi, type EventItem, type TicketTier, ApiError } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Reveal } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, imageFor, isEventExpired } from "@/lib/utils";

declare global { interface Window { Razorpay?: any } }

const MAX_QTY = 10;

const RULES: { q: string; a: string; img?: number }[] = [
  { q: "Pass validity period", a: "Every pass is valid only for the event date and gate printed on the ticket. Passes cannot be carried forward to another show, and expired passes are rejected automatically at the gate.", img: 0 },
  { q: "Registration for the event", a: "Your booking is confirmed the moment payment is verified on our server. A QR pass is issued instantly to your dashboard — no printout needed.", img: 1 },
  { q: "Cancellation and rescheduling", a: "If you are unable to attend an event you have signed up for, please cancel at least 24 hours before the start time. If you cancel later than that, or fail to attend without notice, the booking is forfeited.", img: 2 },
  { q: "Freezing a season ticket", a: "Multi-event passes can be frozen once per season for up to 30 days. Write to support with your booking reference before the freeze window starts.", img: 3 },
  { q: "Refunds", a: "Approved refunds return to the original payment method within 5–7 business days. Gateway and convenience fees are non-refundable.", img: 4 },
  { q: "Transfer of the season ticket", a: "Holder names are locked once passes are issued. Contact support with your booking reference to request a name change before the event date.", img: 5 },
  { q: "Schedule changes", a: "If an event is rescheduled, your pass stays valid for the new date automatically. If it is cancelled outright, you are refunded in full.", img: 1 },
];

export default function BookingFlow({ event }: { event: EventItem }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [tiersError, setTiersError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [names, setNames] = useState<string[]>([""]);
  const [openRule, setOpenRule] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── Ticket tiers from the backend ── */
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fetchTiers = () => {
      activitiesApi
        .tickets(event._id, { limit: 20 })
        .then((d) => {
          if (cancelled) return;
          const visible = (Array.isArray(d) ? d : []).filter((t) => t.is_visible !== false);
          visible.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.price - b.price);

          if (!visible.length && attempts < 2 && event.ticket_enabled !== false) {
            attempts++;
            setTimeout(fetchTiers, 1200);
            return;
          }

          setTiers(visible);
          const firstOpen = visible.find((t) => (t.available ?? 0) > 0);
          if (firstOpen) setSelected(firstOpen._id);
        })
        .catch((e) => { if (!cancelled) setTiersError(e?.message || "Could not load ticket types."); })
        .finally(() => { if (!cancelled) setLoadingTiers(false); });
    };

    fetchTiers();
    return () => { cancelled = true; };
  }, [event._id, event.ticket_enabled]);

  const tier = useMemo(() => tiers.find((t) => t._id === selected) || null, [tiers, selected]);
  const maxQty = Math.max(1, Math.min(MAX_QTY, tier?.available ?? MAX_QTY));
  const total = (tier?.price ?? 0) * qty;

  useEffect(() => { setQty((q) => Math.min(q, maxQty)); }, [maxQty]);
  useEffect(() => { setNames((prev) => Array.from({ length: qty }, (_, i) => prev[i] ?? "")); }, [qty]);

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

  /* ── Purchase ── */
  const purchase = async (tierId?: string) => {
    setError(null);
    setSuccess(null);
    if (tierId) setSelected(tierId);

    const chosen = tierId ? tiers.find((t) => t._id === tierId) || tier : tier;

    if (!user) {
      router.push(`/login?next=/events/${event._id}/book`);
      return;
    }
    const isExpired = isEventExpired(event.date, event.time);
    if (isExpired) {
      setError("This event has already taken place on " + formatEventDate(event.date) + ". Ticket booking is closed.");
      return;
    }
    if (!chosen) { setError("Select a ticket type to continue."); return; }

    const amount = chosen.price * qty;
    setSubmitting(true);
    try {
      const holder_names = names.map((n, i) => n.trim() || user?.name || `Guest ${i + 1}`);
      const booking = await bookingsApi.create({
        event_id: event._id,
        ticket_id: chosen._id,
        quantity: qty,
        holder_names,
      });

      if (!booking?.payment_info || booking?.booking_status === "CONFIRMED") {
        setSuccess(`Confirmed. Booking reference ${booking.booking_reference}.`);
        setTimeout(() => router.push("/dashboard"), 1400);
        return;
      }

      const info = booking.payment_info;
      const ok = await loadRazorpay();
      if (!ok) throw new ApiError("Could not reach the payment gateway. Check your connection and retry.", 0);

      const keyId = info.key_id || info.checkout_data?.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) throw new ApiError("Payment gateway is not configured yet. Please contact support.", 0);

      const rzp = new window.Razorpay({
        key: keyId,
        amount: info.amount_paise ?? Math.round(amount * 100),
        currency: info.currency || "INR",
        name: info.checkout_data?.name || "Upgrade Talents India",
        description: info.checkout_data?.description || `Tickets — ${event.title}`,
        order_id: info.order_id,
        prefill: { email: user?.email || "", name: user?.name || "", contact: user?.phone_number || "" },
        theme: { color: "#bfff2e" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment cancelled. Your seats are held briefly — retry to confirm.");
          },
        },
        handler: async (resp: any) => {
          try {
            await paymentsApi.verifyRazorpay({
              booking_id: booking.booking_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setSuccess(`Payment verified. Booking ${booking.booking_reference} confirmed.`);
            setTimeout(() => router.push("/dashboard"), 1400);
          } catch (e: any) {
            setError(e?.message || "Payment captured but verification failed. Contact support with your booking reference.");
          } finally { setSubmitting(false); }
        },
      });

      rzp.on("payment.failed", (r: any) => {
        setError(r?.error?.description || "Payment failed. No amount was charged — please try again.");
        setSubmitting(false);
      });
      rzp.open();
      return;
    } catch (e: any) {
      setError(e?.message || "Something went wrong while creating your booking.");
      setSubmitting(false);
    }
  };

  return (
    <div className="street-bg text-white">
      {/* ═══════════ PURCHASE TICKET ═══════════ */}
      <section className="relative py-16 md:py-24">
        <div className="container-x">
          <Reveal>
            <h2 className="street-heading text-center text-[clamp(2.2rem,7vw,4.6rem)] leading-[0.95]">
              Purchase ticket
            </h2>
          </Reveal>

          {/* Status */}
          <div aria-live="polite" className="mx-auto mt-8 max-w-2xl empty:hidden">
            {error && (
              <p role="alert" className="font-cond flex items-start gap-2.5 border border-[var(--street-red)] bg-[color-mix(in_srgb,var(--street-red)_14%,transparent)] p-4 text-[14px] uppercase tracking-wide text-white">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
              </p>
            )}
            {success && (
              <p className="font-cond flex items-start gap-2.5 border p-4 text-[14px] uppercase tracking-wide"
                 style={{ borderColor: "var(--acid)", background: "color-mix(in srgb, var(--acid) 12%, transparent)", color: "var(--acid)" }}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {success}
              </p>
            )}
            {!authLoading && !user && !error && !success && (
              <p className="font-cond flex items-start gap-2.5 border border-[var(--street-line)] p-4 text-[14px] uppercase tracking-wide text-white/80">
                <LogIn className="mt-0.5 size-4 shrink-0" style={{ color: "var(--acid)" }} aria-hidden />
                Sign in to buy — you&apos;ll come straight back here.
              </p>
            )}
          </div>

          {/* Tiers */}
          {loadingTiers && (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[180px]" />)}
            </div>
          )}

          {tiersError && (
            <div role="alert" className="mx-auto mt-12 max-w-xl border border-[var(--street-red)] p-8 text-center">
              <p className="font-cond text-[15px] uppercase tracking-wide">{tiersError}</p>
              <button onClick={() => location.reload()} className="font-cond mt-5 min-h-[44px] cursor-pointer px-6 text-[13px] font-semibold uppercase tracking-widest text-[var(--acid-ink)]" style={{ background: "var(--acid)" }}>
                Retry
              </button>
            </div>
          )}

          {!loadingTiers && !tiersError && !tiers.length && (
            <div className="mx-auto mt-12 max-w-xl border border-dashed border-[var(--street-line)] px-6 py-16 text-center">
              <h3 className="font-cond text-2xl font-bold uppercase">Ticketing not ready yet</h3>
              <p className="font-cond mt-3 text-[15px] uppercase tracking-wide text-white/60">
                Passes for this event haven&apos;t been released or are currently being prepared.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoadingTiers(true);
                  activitiesApi.tickets(event._id, { limit: 20 }).then((d) => {
                    const visible = (Array.isArray(d) ? d : []).filter((t) => t.is_visible !== false);
                    visible.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.price - b.price);
                    setTiers(visible);
                    const firstOpen = visible.find((t) => (t.available ?? 0) > 0);
                    if (firstOpen) setSelected(firstOpen._id);
                  }).finally(() => setLoadingTiers(false));
                }}
                className="font-cond mt-5 inline-flex min-h-[44px] cursor-pointer items-center justify-center px-6 text-[13px] font-semibold uppercase tracking-widest text-[var(--acid-ink)] transition-transform hover:scale-105"
                style={{ background: "var(--acid)" }}
              >
                Refresh passes
              </button>
            </div>
          )}

          {isEventExpired(event.date, event.time) && (
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-500/50 bg-red-950/40 p-6 text-center backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-red-400">
                <AlertCircle className="size-3.5" /> Event Expired
              </div>
              <h3 className="mt-3 font-display text-xl font-bold uppercase text-white">Event Concluded</h3>
              <p className="mt-1 font-mono text-xs text-red-200/80">
                This event took place on {formatEventDate(event.date)}. New ticket bookings are disabled.
              </p>
            </div>
          )}

          {!loadingTiers && tiers.length > 0 && (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {tiers.map((t, i) => (
                <TicketCard
                  key={t._id}
                  tier={t}
                  active={selected === t._id}
                  index={i}
                  busy={submitting}
                  onSelect={() => setSelected(t._id)}
                  onPurchase={() => purchase(t._id)}
                />
              ))}
            </div>
          )}

          {/* Quantity + holders — required by the booking endpoint */}
          {tier && (
            <Reveal className="mt-12">
              <div className="border border-dashed border-[var(--street-line)] bg-[var(--street-card)] p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <h3 className="font-cond text-xl font-bold uppercase tracking-wide">Quantity</h3>
                    <p className="font-cond mt-1 text-[12px] uppercase tracking-widest text-white/50">
                      Max {maxQty} per booking
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                      className="grid size-12 cursor-pointer place-items-center border border-[var(--street-line)] text-white transition-colors hover:border-[var(--acid)] hover:text-[var(--acid)] disabled:opacity-35"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span aria-live="polite" className="font-street w-14 text-center text-3xl tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty}
                      aria-label="Increase quantity"
                      className="grid size-12 cursor-pointer place-items-center border border-[var(--street-line)] text-white transition-colors hover:border-[var(--acid)] hover:text-[var(--acid)] disabled:opacity-35"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <fieldset className="mt-8 border-t border-dashed border-[var(--street-line)] pt-7">
                  <legend className="sr-only">Ticket holder names</legend>
                  <h3 className="font-cond text-xl font-bold uppercase tracking-wide">Ticket holders</h3>
                  <p className="font-cond mt-1 text-[12px] uppercase tracking-widest text-white/50">
                    Printed on each pass and checked at the gate
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {names.map((n, i) => (
                      <div key={i}>
                        <label htmlFor={`holder-${i}`} className="font-cond mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/50">
                          Pass {String(i + 1).padStart(2, "0")}
                        </label>
                        <input
                          id={`holder-${i}`}
                          type="text"
                          autoComplete="name"
                          value={n}
                          onChange={(e) => setNames((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                          placeholder="Full name"
                          className="font-cond h-12 w-full border border-[var(--street-line)] bg-black/40 px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[var(--acid)]"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* Total + pay */}
                <div className="mt-8 flex flex-col gap-5 border-t border-dashed border-[var(--street-line)] pt-7 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-cond block text-[11px] uppercase tracking-[0.25em] text-white/50">Total</span>
                    <span className="font-street text-[clamp(1.8rem,5vw,2.6rem)] leading-none" style={{ color: "var(--acid)" }}>
                      {formatINR(total)}
                    </span>
                    <span className="font-cond ml-3 text-[12px] uppercase tracking-widest text-white/50">
                      {event.title} · {formatEventDate(event.date)}
                    </span>
                  </div>
                  <button
                    onClick={() => purchase()}
                    disabled={submitting || !!success || isEventExpired(event.date, event.time)}
                    aria-busy={submitting || undefined}
                    className="font-cond inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 px-9 text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--acid-ink)] transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-50"
                    style={{ background: isEventExpired(event.date, event.time) ? "#52525b" : "var(--acid)", color: isEventExpired(event.date, event.time) ? "#d4d4d8" : "var(--acid-ink)" }}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {isEventExpired(event.date, event.time) ? "Event Expired" : submitting ? "Processing" : total > 0 ? `Pay ${formatINR(total)}` : "Confirm free ticket"}
                  </button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ═══════════ METHODS OF PAYMENT ═══════════ */}
      <section className="relative py-16 md:py-24">
        <div className="container-x">
          <Reveal>
            <h2 className="street-heading text-center text-[clamp(2rem,6.5vw,4.4rem)] leading-[0.95]">
              Methods of payment
            </h2>
          </Reveal>

          <div className="mt-14 grid items-center gap-10 md:grid-cols-2">
            <Reveal x={-30} y={0}>
              <div className="relative mx-auto w-fit">
                <span
                  aria-hidden
                  className="font-marker absolute -left-4 top-6 z-10 -rotate-12 text-[clamp(1.8rem,5vw,3rem)] leading-none"
                  style={{ color: "var(--street-red)" }}
                >
                  Dance
                </span>
                <img
                  src={imageFor(event.image_url, 5)}
                  alt=""
                  loading="lazy"
                  className="w-[clamp(200px,38vw,300px)] rotate-[-3deg] border-[10px] border-white object-cover shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
                  style={{ aspectRatio: "3/4" }}
                />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="font-cond text-[clamp(1.5rem,4vw,2.9rem)] font-bold uppercase leading-[1.08] tracking-tight">
                We accept{" "}
                <span className="font-marker lowercase" style={{ color: "var(--acid)" }}>cash</span>{" "}
                payment directly at the studio or via the website with{" "}
                <span style={{ color: "var(--acid)" }}>bank cards.</span>
              </p>

              <ul className="mt-8 flex flex-wrap gap-3">
                {[
                  { Icon: CreditCard, label: "Cards · UPI · Netbanking" },
                  { Icon: Banknote, label: "Cash at the venue" },
                ].map((m) => (
                  <li key={m.label} className="font-cond inline-flex items-center gap-2.5 border border-[var(--street-line)] px-4 py-2.5 text-[12px] uppercase tracking-widest text-white/75">
                    <m.Icon className="size-4 shrink-0" style={{ color: "var(--acid)" }} aria-hidden />
                    {m.label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════ GENERAL RULES ═══════════ */}
      <section className="relative py-16 md:py-24">
        <div className="container-x">
          <Reveal>
            <h2 className="street-heading text-center text-[clamp(2rem,6.5vw,4.4rem)] leading-[0.95]">
              General rules
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* Accordion list */}
            <ul className="flex flex-col gap-1.5">
              {RULES.map((r, i) => {
                const open = openRule === i;
                return (
                  <li key={r.q}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpenRule(i)}
                        aria-expanded={open}
                        aria-controls="rule-panel"
                        className={cn(
                          "font-cond flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-4 px-5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors duration-300",
                          open ? "text-[var(--acid-ink)]" : "border border-[var(--street-line)] text-white hover:border-white"
                        )}
                        style={open ? { background: "var(--acid)" } : undefined}
                      >
                        {r.q}
                        <ChevronRight className={cn("size-4 shrink-0 transition-transform duration-300", open && "translate-x-0.5")} aria-hidden />
                      </button>
                    </h3>
                  </li>
                );
              })}
            </ul>

            {/* Detail panel */}
            <div id="rule-panel" className="flex flex-col gap-5 border border-[var(--street-line)] bg-[var(--street-card)] p-6 sm:flex-row">
              <AnimatePresence mode="wait">
                <motion.div
                  key={openRule}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-1 flex-col"
                >
                  <p className="font-cond text-[13px] leading-[1.6] text-white/80">{RULES[openRule].a}</p>
                  <a
                    href="/contact"
                    className="font-cond mt-auto inline-flex min-h-[44px] items-center pt-6 text-[12px] font-semibold uppercase tracking-[0.2em] underline underline-offset-4"
                    style={{ color: "var(--acid)" }}
                  >
                    Read more
                  </a>
                </motion.div>
              </AnimatePresence>

              <img
                src={imageFor(null, RULES[openRule].img ?? 0)}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-[180px] w-full shrink-0 object-cover sm:h-auto sm:w-[130px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── TICKET CARD ─────────────── */

function TicketCard({
  tier, active, index, busy, onSelect, onPurchase,
}: {
  tier: TicketTier;
  active: boolean;
  index: number;
  busy: boolean;
  onSelect: () => void;
  onPurchase: () => void;
}) {
  const soldOut = (tier.available ?? 0) <= 0;
  const label = (tier.type || "general").replace(/_/g, " ");

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative", soldOut && "opacity-45")}
    >
      <div
        onClick={() => !soldOut && onSelect()}
        className={cn(
          "relative flex min-h-[176px] cursor-pointer select-none transition-colors duration-300",
          active ? "acid-pop text-[var(--acid-ink)]" : "border border-dashed border-[var(--street-line)] bg-[var(--street-card)] text-white hover:border-white/55",
          soldOut && "cursor-not-allowed"
        )}
        style={active ? { background: "var(--acid)" } : undefined}
      >
        {/* Body */}
        <div className="flex flex-1 flex-col justify-between p-6">
          <h3 className="font-cond text-[clamp(1.3rem,3vw,1.9rem)] font-bold uppercase leading-none tracking-tight">
            {label}
          </h3>

          <div className="mt-6 flex flex-col items-start gap-3">
            <span
              className={cn(
                "font-cond inline-block border px-4 py-2 text-[clamp(0.95rem,2vw,1.15rem)] font-semibold",
                active ? "border-[var(--acid-ink)]" : "border-[var(--street-line)]"
              )}
            >
              {formatINR(tier.price)}
            </span>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!soldOut) onPurchase(); }}
              disabled={soldOut || busy}
              className="font-cond inline-flex min-h-[36px] cursor-pointer items-center justify-center px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              style={{ background: "var(--street-red)" }}
            >
              {soldOut ? "Sold out" : "Purchase"}
            </button>
          </div>

          <p className={cn("font-cond mt-4 text-[11px] uppercase tracking-[0.18em]", active ? "text-[var(--acid-ink)]/70" : "text-white/45")}>
            {soldOut ? "No seats left" : `${tier.available} of ${tier.total_quantity} left`}
          </p>
        </div>

        {/* Perforation + barcode stub */}
        <div
          className={cn(
            "relative flex w-[76px] shrink-0 items-center justify-center border-l border-dashed sm:w-[92px]",
            active ? "border-[var(--acid-ink)]/55" : "border-[var(--street-line)]"
          )}
        >
          <span
            aria-hidden
            className="barcode h-[72%] w-[34px] sm:w-[42px]"
            style={{ color: active ? "var(--acid-ink)" : "#ffffff" }}
          />
          {/* Ticket notches top and bottom of the perforation */}
          <span aria-hidden className="street-bg absolute -top-[9px] left-[-9px] size-[18px] rounded-full" />
          <span aria-hidden className="street-bg absolute -bottom-[9px] left-[-9px] size-[18px] rounded-full" />
        </div>
      </div>
    </motion.article>
  );
}
