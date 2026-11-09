"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Minus, Plus, ChevronRight, AlertCircle, CheckCircle2, LogIn, Loader2, Banknote, CreditCard,
  Armchair, Crown, Sparkles, ShieldCheck, Zap, Layers, MapPin, Check, Info,
} from "lucide-react";
import { activitiesApi, bookingsApi, paymentsApi, type EventItem, type TicketTier, ApiError } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Reveal } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, imageFor, isEventExpired, isDeadlinePassed } from "@/lib/utils";

declare global { interface Window { Razorpay?: any } }

const MAX_QTY = 10;

const RULES: { q: string; a: string; img?: number }[] = [
  { q: "Pass validity period", a: "Every pass is valid only for the event date and gate printed on the ticket. Passes cannot be carried forward to another show, and expired passes are rejected automatically at the gate.", img: 0 },
  { q: "Registration for the event", a: "Your booking is confirmed the moment payment is verified on our server. A QR pass is issued instantly to your dashboard with your seating tier and assigned seats — no printout needed.", img: 1 },
  { q: "Cancellation and rescheduling", a: "If you are unable to attend an event you have signed up for, please cancel at least 24 hours before the start time. If you cancel later than that, or fail to attend without notice, the booking is forfeited.", img: 2 },
  { q: "Freezing a season ticket", a: "Multi-event passes can be frozen once per season for up to 30 days. Write to support with your booking reference before the freeze window starts.", img: 3 },
  { q: "Refunds", a: "Approved refunds return to the original payment method within 5–7 business days. Gateway and convenience fees are non-refundable.", img: 4 },
  { q: "Transfer of the ticket / pass", a: "Holder names are locked once passes are issued. Contact support with your booking reference to request a name change before the event date.", img: 5 },
  { q: "Schedule changes", a: "If an event is rescheduled, your pass stays valid for the new date automatically. If it is cancelled outright, you are refunded in full.", img: 1 },
];

/* ─────────────── SEATING ZONE METADATA HELPER ─────────────── */
export type SeatingZoneMeta = {
  rank: number; // 1 = Platinum/VIP, 2 = Gold, 3 = Silver, 4 = Bronze/Balcony/General
  badge: string;
  badgeLabel: string;
  zoneTitle: string;
  zoneSubtitle: string;
  themeColor: string;
  badgeBg: string;
  borderClass: string;
  glowClass: string;
  bgGrad: string;
  badgeIcon: string;
  rowCodes: string[];
  perks: string[];
  seatCountPerRow: number;
};

export function getSeatingZoneMeta(name: string): SeatingZoneMeta {
  const n = (name || "").toLowerCase();
  if (n.includes("plat") || n.includes("vip") || n.includes("royal") || n.includes("front") || n.includes("diamond")) {
    return {
      rank: 1,
      badge: "💎 PLATINUM / VIP",
      badgeLabel: "Top Tier · Front Stage",
      zoneTitle: "Platinum VIP Lounge",
      zoneSubtitle: "Front Row Prime Sightline · VIP Hospitality",
      themeColor: "#c084fc",
      badgeBg: "rgba(192, 132, 252, 0.15)",
      borderClass: "border-purple-400/60 shadow-[0_0_25px_rgba(192,132,252,0.25)]",
      glowClass: "from-purple-500/20 via-pink-500/10 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(236,72,153,0.08))",
      badgeIcon: "💎",
      rowCodes: ["A", "B", "C"],
      seatCountPerRow: 14,
      perks: [
        "Front-Row Prime Stage Sightline",
        "Fast-Track VIP Gate Entry",
        "Complimentary Lounge Refreshment",
        "Artist & Judge Stage Proximity",
      ],
    };
  }
  if (n.includes("gold") || n.includes("exec") || n.includes("middle") || n.includes("premier")) {
    return {
      rank: 2,
      badge: "👑 GOLD / EXECUTIVE",
      badgeLabel: "Middle Tier · Center Arena",
      zoneTitle: "Gold Executive Stalls",
      zoneSubtitle: "Center Stage Elevated Perspective · Direct Eye Level",
      themeColor: "#fbbf24",
      badgeBg: "rgba(251, 191, 36, 0.15)",
      borderClass: "border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.25)]",
      glowClass: "from-amber-500/20 via-yellow-500/10 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))",
      badgeIcon: "👑",
      rowCodes: ["D", "E", "F", "G"],
      seatCountPerRow: 16,
      perks: [
        "Direct Center-Stage Eye Level",
        "Optimal Audio & Visual Sweet Spot",
        "Comfortable Arena Seating Spacing",
        "Dedicated Refreshment Line Access",
      ],
    };
  }
  if (n.includes("silver")) {
    return {
      rank: 3,
      badge: "🥈 SILVER / PRESTIGE",
      badgeLabel: "Lower Tier · Mid Mezzanine",
      zoneTitle: "Silver Mezzanine",
      zoneSubtitle: "Elevated Mezzanine Seating · Panoramic View",
      themeColor: "#cbd5e1",
      badgeBg: "rgba(203, 213, 225, 0.15)",
      borderClass: "border-slate-300/60 shadow-[0_0_20px_rgba(203,213,225,0.2)]",
      glowClass: "from-slate-400/20 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(148,163,184,0.14), rgba(100,116,139,0.06))",
      badgeIcon: "🥈",
      rowCodes: ["H", "J", "K"],
      seatCountPerRow: 18,
      perks: [
        "Elevated Sightline to Stage Arena",
        "Clear Panoramic Stage Coverage",
        "Express Self-Check-in Gate Access",
      ],
    };
  }
  // Default: Bronze / Balcony / General
  return {
    rank: 4,
    badge: n.includes("bronze") ? "🥉 BRONZE / STANDARD" : n.includes("balcony") ? "🏛️ BALCONY / UPPER" : "🎫 GENERAL ADMISSION",
    badgeLabel: "Standard Tier · Balcony / Ground",
    zoneTitle: n.includes("balcony") ? "Upper Balcony Circle" : "Bronze / General Arena",
    zoneSubtitle: "High Energy Arena Atmosphere · Unbeatable Value",
    themeColor: "#fb923c",
    badgeBg: "rgba(251, 146, 60, 0.15)",
    borderClass: "border-orange-400/60 shadow-[0_0_20px_rgba(251,146,60,0.2)]",
    glowClass: "from-orange-500/15 to-transparent",
    bgGrad: "linear-gradient(135deg, rgba(234,88,12,0.14), rgba(180,83,9,0.06))",
    badgeIcon: "🥉",
    rowCodes: ["L", "M", "N", "P"],
    seatCountPerRow: 20,
    perks: [
      "Panoramic Full Arena View",
      "Electrifying Crowd Energy & Atmosphere",
      "Budget-Friendly Official Admission",
    ],
  };
}

export default function BookingFlow({ event: initialEvent }: { event: EventItem }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTierParam = searchParams.get("tier");
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem>(initialEvent);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [tiersError, setTiersError] = useState<string | null>(null);

  // Client-side fresh re-fetch on mount ensures latest categories/prices without stale cache
  useEffect(() => {
    let active = true;
    activitiesApi
      .eventById(initialEvent._id)
      .then((fresh) => {
        if (!active || !fresh || !fresh._id) return;
        setEvent(fresh);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialEvent._id]);

  const [selected, setSelected] = useState<string | null>(null);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>("all");
  const [qty, setQty] = useState(1);
  const [names, setNames] = useState<string[]>([""]);
  const [openRule, setOpenRule] = useState(2);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── Ticket tiers from backend ── */
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fetchTiers = () => {
      activitiesApi
        .tickets(event._id, { limit: 50 })
        .then((d) => {
          if (cancelled) return;
          let visible = (Array.isArray(d) ? d : []).filter((t) => t.is_visible !== false);

          // If event has categories defined, strictly filter out stale tickets not in event.categories
          if (Array.isArray(event.categories) && event.categories.length > 0) {
            const allowedNames = new Set(
              event.categories.map((c) => (c.name || "").trim().toLowerCase())
            );
            const matchedTickets = visible.filter((t) => {
              const typeMatch = allowedNames.has((t.type || "").trim().toLowerCase());
              const catMatch = allowedNames.has((t.category || "").trim().toLowerCase());
              return typeMatch || catMatch;
            });

            if (matchedTickets.length > 0) {
              visible = matchedTickets;
            } else {
              visible = event.categories.map((c, idx) => ({
                _id: `cat-${idx}-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
                event_id: event._id,
                type: c.name,
                category: c.name,
                price: c.price,
                total_quantity: c.capacity || event.capacity || 100,
                available: c.capacity || event.capacity || 100,
                description: c.description,
                display_order: idx,
              }));
            }

            // Merge description and latest price from event.categories
            visible = visible.map((t) => {
              const matchedCat = event.categories?.find(
                (c) => c.name.toLowerCase().trim() === (t.category || t.type).toLowerCase().trim()
              );
              return {
                ...t,
                category: t.category || t.type || matchedCat?.name,
                price: matchedCat?.price != null ? matchedCat.price : t.price,
                description: t.description || matchedCat?.description,
              };
            });

            // Sort strictly matching the order configured in event.categories
            const orderMap = new Map(
              event.categories.map((c, idx) => [(c.name || "").trim().toLowerCase(), idx])
            );
            visible.sort((a, b) => {
              const idxA = orderMap.get((a.category || a.type || "").trim().toLowerCase()) ?? 99;
              const idxB = orderMap.get((b.category || b.type || "").trim().toLowerCase()) ?? 99;
              return idxA - idxB;
            });
          } else {
            // If no categories defined, fallback to BookMyShow rank
            if (!visible.length && Array.isArray(event.categories) && event.categories.length > 0) {
              visible = event.categories.map((c, idx) => ({
                _id: `cat-${idx}-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
                event_id: event._id,
                type: c.name,
                category: c.name,
                price: c.price,
                total_quantity: c.capacity || event.capacity || 100,
                available: c.capacity || event.capacity || 100,
                description: c.description,
                display_order: idx,
              }));
            }
            visible.sort((a, b) => {
              const metaA = getSeatingZoneMeta(a.category || a.type);
              const metaB = getSeatingZoneMeta(b.category || b.type);
              return metaA.rank - metaB.rank || b.price - a.price;
            });
          }

          if (!visible.length && attempts < 2 && event.ticket_enabled !== false) {
            attempts++;
            setTimeout(fetchTiers, 1200);
            return;
          }

          setTiers(visible);

          // Check if user came with a preselected tier in URL
          if (preselectedTierParam) {
            const match = visible.find(
              (t) => (t.category || t.type).toLowerCase() === preselectedTierParam.toLowerCase()
            );
            if (match && (match.available ?? 0) > 0) {
              setSelected(match._id);
              return;
            }
          }

          const firstOpen = visible.find((t) => (t.available ?? 0) > 0);
          if (firstOpen) setSelected(firstOpen._id);
        })
        .catch((e) => { if (!cancelled) setTiersError(e?.message || "Could not load ticket types."); })
        .finally(() => { if (!cancelled) setLoadingTiers(false); });
    };

    fetchTiers();
    return () => { cancelled = true; };
  }, [event._id, event.ticket_enabled, event.categories, preselectedTierParam]);

  const tier = useMemo(() => tiers.find((t) => t._id === selected) || tiers[0] || null, [tiers, selected]);
  const tierMeta = useMemo(() => (tier ? getSeatingZoneMeta(tier.category || tier.type) : null), [tier]);
  const maxQty = Math.max(1, Math.min(MAX_QTY, tier?.available ?? MAX_QTY));
  const total = (tier?.price ?? 0) * qty;

  useEffect(() => { setQty((q) => Math.min(q, maxQty)); }, [maxQty]);
  useEffect(() => { setNames((prev) => Array.from({ length: qty }, (_, i) => prev[i] ?? "")); }, [qty]);

  // Simulated allocated seats preview (e.g. "Row D · Seats: D-08, D-09")
  const allocatedSeatsDisplay = useMemo(() => {
    if (!tierMeta) return "";
    const primaryRow = tierMeta.rowCodes[0] || "A";
    const baseSeatNum = 6 + (tier ? tier.type.length % 5 : 0);
    const seats = Array.from({ length: qty }, (_, i) => `${primaryRow}-${String(baseSeatNum + i).padStart(2, "0")}`);
    return `Row ${primaryRow} · Seats ${seats.join(", ")}`;
  }, [tierMeta, qty, tier]);

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
    const isDeadlineOver = isDeadlinePassed(event.registration_deadline);
    if (isExpired) {
      setError("This event has already taken place on " + formatEventDate(event.date) + ". Ticket booking is closed.");
      return;
    }
    if (isDeadlineOver) {
      setError("The registration deadline (" + formatEventDate(event.registration_deadline) + ") has passed. Ticket booking is closed.");
      return;
    }
    if (event.registration_enabled === false || event.ticket_enabled === false) {
      setError("Ticketing is currently closed for this event.");
      return;
    }
    if (!chosen) { setError("Select a ticket tier/category to continue."); return; }

    const amount = chosen.price * qty;
    setSubmitting(true);
    try {
      const holder_names = names.map((n, i) => n.trim() || user?.name || `Guest ${i + 1}`);
      const categoryName = chosen.category || chosen.type || (event.categories?.[0]?.name) || "General";

      const booking = await bookingsApi.create({
        event_id: event._id,
        ticket_id: chosen._id.startsWith("cat-") ? undefined : chosen._id,
        category: categoryName,
        quantity: qty,
        holder_names,
      });

      if (!booking?.payment_info || booking?.booking_status === "CONFIRMED") {
        setSuccess(`Confirmed! Booking reference ${booking.booking_reference} for ${categoryName} Tier.`);
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
        description: info.checkout_data?.description || `Tickets — ${event.title} (${categoryName} Seating)`,
        order_id: info.order_id,
        prefill: { email: user?.email || "", name: user?.name || "", contact: user?.phone_number || "" },
        theme: { color: tierMeta?.themeColor || "#bfff2e" },
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
            setSuccess(`Payment verified! Booking ${booking.booking_reference} (${categoryName}) confirmed.`);
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

  // Filter tiers if a zone filter is clicked
  const displayedTiers = useMemo(() => {
    if (activeZoneFilter === "all") return tiers;
    return tiers.filter((t) => {
      const meta = getSeatingZoneMeta(t.category || t.type);
      if (activeZoneFilter === "plat") return meta.rank === 1;
      if (activeZoneFilter === "gold") return meta.rank === 2;
      if (activeZoneFilter === "silver-bronze") return meta.rank >= 3;
      return true;
    });
  }, [tiers, activeZoneFilter]);

  return (
    <div className="street-bg text-white">
      {/* ═══════════ BOOKMYSHOW SEATING & TICKET ARENA ═══════════ */}
      <section className="relative py-14 md:py-20 overflow-hidden">
        {/* Ambient Stage Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-gradient-to-b from-purple-600/15 via-amber-500/10 to-transparent blur-3xl" />

        <div className="container-x relative">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--acid)]">
                <Armchair className="size-3.5" /> BookMyShow Arena Seating
              </span>
              <h2 className="street-heading mt-4 text-[clamp(2.2rem,6.5vw,4.5rem)] leading-[0.95]">
                Select Seating Category
              </h2>
              <p className="mt-3 text-sm md:text-base text-white/70 font-cond tracking-wide uppercase">
                Choose your view: Front-Row VIP Lounge, Center Arena Executive, or Upper Balcony &amp; General Admission.
              </p>
            </div>
          </Reveal>

          {/* Status Alerts */}
          <div aria-live="polite" className="mx-auto mt-6 max-w-2xl empty:hidden">
            {error && (
              <p role="alert" className="font-cond flex items-start gap-2.5 rounded-xl border border-[var(--street-red)] bg-[color-mix(in_srgb,var(--street-red)_14%,transparent)] p-4 text-[14px] uppercase tracking-wide text-white">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
              </p>
            )}
            {success && (
              <p className="font-cond flex items-start gap-2.5 rounded-xl border p-4 text-[14px] uppercase tracking-wide"
                 style={{ borderColor: "var(--acid)", background: "color-mix(in srgb, var(--acid) 12%, transparent)", color: "var(--acid)" }}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {success}
              </p>
            )}
            {!authLoading && !user && !error && !success && (
              <p className="font-cond flex items-start gap-2.5 rounded-xl border border-[var(--street-line)] bg-black/40 p-4 text-[14px] uppercase tracking-wide text-white/80 backdrop-blur-sm">
                <LogIn className="mt-0.5 size-4 shrink-0" style={{ color: "var(--acid)" }} aria-hidden />
                Sign in to book — your chosen category and seats will be preserved.
              </p>
            )}
          </div>

          {/* ═══════════ BOOKMYSHOW SEATING ARENA VISUALIZER ═══════════ */}
          <Reveal className="mt-10">
            <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900/90 via-neutral-950/95 to-black p-5 sm:p-8 shadow-2xl backdrop-blur-md">
              
              {/* STAGE LIGHTS & MAIN PERFORMANCE STAGE */}
              <div className="relative mx-auto mb-8 max-w-2xl text-center">
                <div className="relative mx-auto flex h-16 w-full items-center justify-center rounded-t-[100px] border-t-4 border-l border-r border-[var(--acid)] bg-gradient-to-b from-[var(--acid)]/20 via-transparent to-transparent shadow-[0_-15px_35px_rgba(191,255,46,0.25)]">
                  <div className="flex flex-col items-center">
                    <span className="font-cond flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-[var(--acid)]">
                      <Sparkles className="size-3.5 animate-pulse" />
                      STAGE · LIVE ARENA
                      <Sparkles className="size-3.5 animate-pulse" />
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/50">
                      [ Eyes this way ⬇ ]
                    </span>
                  </div>
                </div>
                {/* Stage Spotlight Projection */}
                <div className="mx-auto h-4 w-3/4 bg-gradient-to-b from-[var(--acid)]/25 to-transparent blur-sm" />
              </div>

              {/* ARENA SEATING ZONES MAP */}
              <div className="flex flex-col gap-5">
                {tiers.map((t, idx) => {
                  const meta = getSeatingZoneMeta(t.category || t.type);
                  const isSelected = selected === t._id;
                  const isSoldOut = (t.available ?? 0) <= 0;

                  return (
                    <motion.div
                      key={t._id}
                      onClick={() => !isSoldOut && setSelected(t._id)}
                      whileHover={!isSoldOut ? { scale: 1.008 } : {}}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300",
                        isSelected
                          ? `${meta.borderClass} bg-neutral-900/95 ring-2 ring-[${meta.themeColor}]`
                          : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]",
                        isSoldOut && "cursor-not-allowed opacity-40"
                      )}
                      style={{
                        background: isSelected ? meta.bgGrad : undefined,
                      }}
                    >
                      {/* Active Zone Indicator Ribbon */}
                      {isSelected && (
                        <div
                          className="absolute top-0 right-0 rounded-bl-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-black"
                          style={{ background: meta.themeColor }}
                        >
                          Selected Tier ✓
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-10 sm:size-12 shrink-0 place-items-center rounded-xl text-lg sm:text-xl shadow-md"
                            style={{ background: meta.badgeBg, border: `1px solid ${meta.themeColor}40` }}
                          >
                            {meta.badgeIcon}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-wide text-white">
                                {t.category || t.type || meta.zoneTitle}
                              </h3>
                              <span
                                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: meta.badgeBg, color: meta.themeColor }}
                              >
                                {meta.badge}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-white/60 font-cond uppercase tracking-wider">
                              {t.description || meta.zoneSubtitle}
                            </p>
                          </div>
                        </div>

                        {/* Price & Capacity */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="font-street text-xl sm:text-2xl font-bold" style={{ color: meta.themeColor }}>
                              {formatINR(t.price)}
                            </span>
                            <span className="block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                              {isSoldOut ? "Sold Out" : `${t.available} seats left`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (!isSoldOut) setSelected(t._id); }}
                            className={cn(
                              "rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                              isSelected
                                ? "bg-white text-black shadow-lg"
                                : "border border-white/20 text-white/80 hover:bg-white/10"
                            )}
                          >
                            {isSelected ? "Active" : "Select"}
                          </button>
                        </div>
                      </div>

                      {/* VISUAL SEAT ROWS GRID FOR THIS ZONE */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-2">
                          {meta.rowCodes.slice(0, 2).map((rowCode) => (
                            <div key={rowCode} className="flex items-center gap-2 text-[11px] font-mono text-white/40">
                              <span className="w-5 font-bold text-white/70">{rowCode}</span>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {Array.from({ length: meta.seatCountPerRow }).map((_, seatIdx) => {
                                  const isSeatOccupied = (seatIdx * 7 + idx * 3) % 5 === 0;
                                  const isSeatSelectedInThisTier = isSelected && !isSeatOccupied && seatIdx >= 4 && seatIdx < 4 + qty;

                                  return (
                                    <div
                                      key={seatIdx}
                                      title={isSeatOccupied ? `Row ${rowCode} Seat ${seatIdx + 1} (Booked)` : `Row ${rowCode} Seat ${seatIdx + 1} (${meta.zoneTitle})`}
                                      className={cn(
                                        "size-3 sm:size-3.5 rounded-sm transition-all duration-300",
                                        isSeatOccupied
                                          ? "bg-white/10 cursor-not-allowed"
                                          : isSeatSelectedInThisTier
                                          ? "scale-125 shadow-sm animate-pulse"
                                          : isSelected
                                          ? "bg-white/35 hover:bg-white/70"
                                          : "bg-white/15 hover:bg-white/40"
                                      )}
                                      style={{
                                        backgroundColor: isSeatSelectedInThisTier
                                          ? meta.themeColor
                                          : undefined,
                                        boxShadow: isSeatSelectedInThisTier
                                          ? `0 0 10px ${meta.themeColor}`
                                          : undefined,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Zone Perks Highlights */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/60">
                          {meta.perks.slice(0, 3).map((perk) => (
                            <span key={perk} className="inline-flex items-center gap-1">
                              <Check className="size-3 text-emerald-400" />
                              {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* SEATING LEGEND */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-4 text-[11px] font-mono uppercase tracking-widest text-white/50">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm bg-white/20" /> Available
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm bg-[var(--acid)] shadow-[0_0_8px_var(--acid)]" /> Selected
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm bg-white/10" /> Reserved / Taken
                </div>
              </div>
            </div>
          </Reveal>

          {/* Loading Skeleton */}
          {loadingTiers && (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[200px] rounded-2xl" />)}
            </div>
          )}

          {tiersError && (
            <div role="alert" className="mx-auto mt-12 max-w-xl rounded-2xl border border-[var(--street-red)] bg-red-950/20 p-8 text-center backdrop-blur-md">
              <p className="font-cond text-[15px] uppercase tracking-wide">{tiersError}</p>
              <button onClick={() => location.reload()} className="font-cond mt-5 min-h-[44px] cursor-pointer rounded-xl px-6 text-[13px] font-semibold uppercase tracking-widest text-[var(--acid-ink)]" style={{ background: "var(--acid)" }}>
                Retry
              </button>
            </div>
          )}

          {!loadingTiers && !tiersError && !tiers.length && (
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-dashed border-[var(--street-line)] px-6 py-16 text-center">
              <h3 className="font-cond text-2xl font-bold uppercase">Ticketing not ready yet</h3>
              <p className="font-cond mt-3 text-[15px] uppercase tracking-wide text-white/60">
                Passes for this event haven&apos;t been released or are currently being prepared.
              </p>
            </div>
          )}

          {/* ═══════════ DETAILED CATEGORY CARDS ═══════════ */}
          {!loadingTiers && tiers.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                    Category Tier Options
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    All prices include gate admission and GST. Instant QR pass issued on booking.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayedTiers.map((t, i) => (
                  <CategoryTierCard
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
            </div>
          )}

          {/* ═══════════ QUANTITY & ATTENDEE BOOKING FORM ═══════════ */}
          {tier && tierMeta && (
            <Reveal className="mt-12">
              <div className="rounded-3xl border border-dashed border-white/20 bg-neutral-900/90 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
                
                {/* Active Seating Summary Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-3.5">
                    <span
                      className="grid size-12 place-items-center rounded-2xl text-2xl shadow-inner"
                      style={{ background: tierMeta.badgeBg, border: `1px solid ${tierMeta.themeColor}50` }}
                    >
                      {tierMeta.badgeIcon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
                          Selected Category
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase"
                          style={{ background: tierMeta.badgeBg, color: tierMeta.themeColor }}
                        >
                          {tierMeta.badge}
                        </span>
                      </div>
                      <h4 className="font-display text-lg sm:text-xl font-bold uppercase text-white">
                        {tier.category || tier.type || tierMeta.zoneTitle}
                      </h4>
                      <p className="text-xs text-white/60">
                        {tier.description || tierMeta.zoneSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Allocated Seats Tag */}
                  <div className="rounded-2xl border border-white/15 bg-black/40 px-4 py-2.5 text-right">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-white/50">
                      Assigned Seating
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[var(--acid)]">
                      {allocatedSeatsDisplay}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <h3 className="font-cond text-xl font-bold uppercase tracking-wide">Number of Seats / Tickets</h3>
                    <p className="font-cond mt-1 text-[12px] uppercase tracking-widest text-white/50">
                      Max {maxQty} passes per order · Instant QR delivery
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                      className="grid size-12 cursor-pointer place-items-center rounded-xl border border-white/20 text-white transition-colors hover:border-[var(--acid)] hover:text-[var(--acid)] disabled:opacity-35"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span aria-live="polite" className="font-street w-14 text-center text-3xl tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty}
                      aria-label="Increase quantity"
                      className="grid size-12 cursor-pointer place-items-center rounded-xl border border-white/20 text-white transition-colors hover:border-[var(--acid)] hover:text-[var(--acid)] disabled:opacity-35"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Attendee Holder Names */}
                <fieldset className="mt-8 border-t border-dashed border-white/10 pt-7">
                  <legend className="sr-only">Ticket holder names</legend>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-cond text-xl font-bold uppercase tracking-wide">Attendee Names</h3>
                      <p className="font-cond mt-1 text-[12px] uppercase tracking-widest text-white/50">
                        Printed on each pass and verified at security gate
                      </p>
                    </div>
                    <span className="font-mono text-xs text-white/40">
                      {qty} {qty === 1 ? "Attendee" : "Attendees"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {names.map((n, i) => (
                      <div key={i}>
                        <label htmlFor={`holder-${i}`} className="font-cond mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/50">
                          Pass {String(i + 1).padStart(2, "0")} · Seat {tierMeta.rowCodes[0] || "A"}-{String(6 + i).padStart(2, "0")}
                        </label>
                        <input
                          id={`holder-${i}`}
                          type="text"
                          autoComplete="name"
                          value={n}
                          onChange={(e) => setNames((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                          placeholder={i === 0 ? (user?.name || "Primary Attendee Name") : `Guest ${i + 1} Name`}
                          className="font-cond h-12 w-full rounded-xl border border-white/20 bg-black/50 px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[var(--acid)]"
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* Total & Checkout Button */}
                <div className="mt-9 flex flex-col gap-5 border-t border-dashed border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-cond block text-[11px] uppercase tracking-[0.25em] text-white/50">
                      Total Payable ({qty} {qty === 1 ? "seat" : "seats"} in {tier.type || tier.category})
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-street text-[clamp(2rem,5vw,2.8rem)] leading-none" style={{ color: "var(--acid)" }}>
                        {formatINR(total)}
                      </span>
                      <span className="font-mono text-xs text-white/50">
                        ({formatINR(tier.price)} × {qty})
                      </span>
                    </div>
                    <span className="font-cond mt-1 block text-[12px] uppercase tracking-widest text-white/50">
                      {event.title} · {formatEventDate(event.date)}
                    </span>
                  </div>

                  <button
                    onClick={() => purchase()}
                    disabled={submitting || !!success || isEventExpired(event.date, event.time) || isDeadlinePassed(event.registration_deadline) || event.registration_enabled === false || event.ticket_enabled === false}
                    aria-busy={submitting || undefined}
                    className="font-cond inline-flex min-h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-xl px-10 text-[15px] font-semibold uppercase tracking-[0.18em] text-[var(--acid-ink)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 shadow-xl"
                    style={{
                      background: (isEventExpired(event.date, event.time) || isDeadlinePassed(event.registration_deadline) || event.registration_enabled === false || event.ticket_enabled === false) ? "#52525b" : "var(--acid)",
                      color: (isEventExpired(event.date, event.time) || isDeadlinePassed(event.registration_deadline) || event.registration_enabled === false || event.ticket_enabled === false) ? "#d4d4d8" : "var(--acid-ink)"
                    }}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {isEventExpired(event.date, event.time)
                      ? "Event Concluded"
                      : isDeadlinePassed(event.registration_deadline)
                      ? "Registration Closed"
                      : (event.registration_enabled === false || event.ticket_enabled === false)
                      ? "Booking Closed"
                      : submitting
                      ? "Securing Seats..."
                      : total > 0
                      ? `Confirm & Pay ${formatINR(total)}`
                      : "Confirm Free Admission"}
                  </button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ═══════════ METHODS OF PAYMENT ═══════════ */}
      <section className="relative py-14 md:py-20 border-t border-white/10">
        <div className="container-x">
          <Reveal>
            <h2 className="street-heading text-center text-[clamp(2rem,6.5vw,4.2rem)] leading-[0.95]">
              Accepted Payment Methods
            </h2>
          </Reveal>

          <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
            <Reveal x={-30} y={0}>
              <div className="relative mx-auto w-fit">
                <span
                  aria-hidden
                  className="font-marker absolute -left-4 top-6 z-10 -rotate-12 text-[clamp(1.8rem,5vw,3rem)] leading-none"
                  style={{ color: "var(--street-red)" }}
                >
                  Live
                </span>
                <img
                  src={imageFor(event.image_url, 5)}
                  alt=""
                  loading="lazy"
                  className="w-[clamp(200px,38vw,300px)] rotate-[-3deg] rounded-2xl border-[8px] border-white/20 object-cover shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
                  style={{ aspectRatio: "3/4" }}
                />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="font-cond text-[clamp(1.5rem,4vw,2.7rem)] font-bold uppercase leading-[1.08] tracking-tight">
                Instant confirmation with{" "}
                <span style={{ color: "var(--acid)" }}>UPI, Cards, and Netbanking</span>, or pay{" "}
                <span className="font-marker lowercase" style={{ color: "var(--acid)" }}>cash</span> at the venue box office.
              </p>

              <ul className="mt-8 flex flex-wrap gap-3">
                {[
                  { Icon: CreditCard, label: "UPI (Google Pay, PhonePe, Paytm)" },
                  { Icon: CreditCard, label: "Credit & Debit Cards · Netbanking" },
                  { Icon: Banknote, label: "Cash at Event Box Office" },
                ].map((m) => (
                  <li key={m.label} className="font-cond inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[12px] uppercase tracking-widest text-white/80">
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
      <section className="relative py-14 md:py-20 border-t border-white/10">
        <div className="container-x">
          <Reveal>
            <h2 className="street-heading text-center text-[clamp(2rem,6.5vw,4.2rem)] leading-[0.95]">
              Admission Rules &amp; Guidelines
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* Accordion list */}
            <ul className="flex flex-col gap-2">
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
                          "font-cond flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors duration-300",
                          open ? "text-[var(--acid-ink)]" : "border border-white/15 bg-white/[0.02] text-white hover:border-white/40"
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
            <div id="rule-panel" className="flex flex-col gap-5 rounded-2xl border border-white/15 bg-neutral-900/80 p-6 sm:flex-row backdrop-blur-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={openRule}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-1 flex-col"
                >
                  <p className="font-cond text-[14px] leading-[1.6] text-white/80">{RULES[openRule].a}</p>
                  <a
                    href="/contact"
                    className="font-cond mt-auto inline-flex min-h-[44px] items-center pt-6 text-[12px] font-semibold uppercase tracking-[0.2em] underline underline-offset-4"
                    style={{ color: "var(--acid)" }}
                  >
                    Contact organizer support
                  </a>
                </motion.div>
              </AnimatePresence>

              <img
                src={imageFor(null, RULES[openRule].img ?? 0)}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-[180px] w-full shrink-0 rounded-xl object-cover sm:h-auto sm:w-[130px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── CATEGORY TIER CARD ─────────────── */

function CategoryTierCard({
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
  const meta = getSeatingZoneMeta(tier.category || tier.type);
  const fillPct = tier.total_quantity > 0 ? Math.round(((tier.available ?? 0) / tier.total_quantity) * 100) : 100;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative", soldOut && "opacity-45")}
    >
      <div
        onClick={() => !soldOut && onSelect()}
        className={cn(
          "relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 cursor-pointer select-none",
          active
            ? `${meta.borderClass} bg-neutral-900/95 ring-2 ring-[${meta.themeColor}] shadow-xl`
            : "border-white/10 bg-neutral-900/50 hover:border-white/30 hover:bg-neutral-900/80",
          soldOut && "cursor-not-allowed"
        )}
        style={{
          background: active ? meta.bgGrad : undefined,
        }}
      >
        <div>
          {/* Badge & Label */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ background: meta.badgeBg, color: meta.themeColor }}
            >
              {meta.badge}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/50">
              {meta.badgeLabel}
            </span>
          </div>

          <h3 className="font-display mt-3 text-xl font-bold uppercase tracking-wide text-white">
            {tier.category || tier.type || meta.zoneTitle}
          </h3>

          <p className="mt-1 text-xs text-white/60 leading-relaxed font-cond">
            {tier.description || meta.zoneSubtitle}
          </p>

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-street text-3xl font-bold" style={{ color: meta.themeColor }}>
              {formatINR(tier.price)}
            </span>
            <span className="font-mono text-xs text-white/40">/ person</span>
          </div>

          {/* Seats left progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/50 mb-1.5">
              <span>{soldOut ? "Sold Out" : `${tier.available} of ${tier.total_quantity} seats left`}</span>
              <span>{fillPct}% Available</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fillPct}%`,
                  backgroundColor: meta.themeColor,
                }}
              />
            </div>
          </div>

          {/* Perks list */}
          <ul className="mt-5 space-y-1.5 text-xs text-white/70">
            {meta.perks.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-3 text-emerald-400 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            {active ? "Currently Selected" : "Click to Choose"}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!soldOut) onPurchase(); }}
            disabled={soldOut || busy}
            className={cn(
              "rounded-xl px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all",
              active
                ? "bg-[var(--acid)] text-[var(--acid-ink)] shadow-md hover:scale-105"
                : "border border-white/20 text-white hover:bg-white/10"
            )}
          >
            {soldOut ? "Sold Out" : active ? "Selected ✓" : "Book Tier"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
