"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Armchair,
  Crown,
  Sparkles,
  ShieldCheck,
  Zap,
  MapPin,
  Check,
  Info,
  AlertCircle,
  CheckCircle2,
  LogIn,
  Loader2,
  Banknote,
  CreditCard,
  X,
  ChevronRight,
  Ticket,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, isEventExpired, isDeadlinePassed } from "@/lib/utils";
import { activitiesApi, bookingsApi, paymentsApi, type EventItem, type TicketTier, ApiError } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const MAX_QTY = 10;

const RULES: { q: string; a: string }[] = [
  {
    q: "Pass validity period",
    a: "Every pass is valid only for the event date and gate printed on the ticket. Passes cannot be carried forward to another show, and expired passes are rejected automatically at the gate.",
  },
  {
    q: "Registration for the event",
    a: "Your booking is confirmed the moment payment is verified on our server. A QR pass is issued instantly to your dashboard with your seating tier and assigned seats — no printout needed.",
  },
  {
    q: "Cancellation and rescheduling",
    a: "If you are unable to attend an event you have signed up for, please cancel at least 24 hours before the start time. If you cancel later than that, or fail to attend without notice, the booking is forfeited.",
  },
  {
    q: "Freezing a season ticket",
    a: "Multi-event passes can be frozen once per season for up to 30 days. Write to support with your booking reference before the freeze window starts.",
  },
  {
    q: "Refunds",
    a: "Approved refunds return to the original payment method within 5–7 business days. Gateway and convenience fees are non-refundable.",
  },
  {
    q: "Transfer of the ticket / pass",
    a: "Holder names are locked once passes are issued. Contact support with your booking reference to request a name change before the event date.",
  },
  {
    q: "Schedule changes",
    a: "If an event is rescheduled, your pass stays valid for the new date automatically. If it is cancelled outright, you are refunded in full.",
  },
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
  seatsPerRow: number;
  leftCount: number;
  centerCount: number;
  rightCount: number;
  perks: string[];
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
      rowCodes: ["A", "B"],
      seatsPerRow: 14,
      leftCount: 2,
      centerCount: 10,
      rightCount: 2,
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
      zoneTitle: "Gold Executive Field",
      zoneSubtitle: "Center Stage Elevated Perspective · Direct Eye Level",
      themeColor: "#fbbf24",
      badgeBg: "rgba(251, 191, 36, 0.15)",
      borderClass: "border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.25)]",
      glowClass: "from-amber-500/20 via-yellow-500/10 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))",
      badgeIcon: "👑",
      rowCodes: ["D", "E"],
      seatsPerRow: 16,
      leftCount: 3,
      centerCount: 10,
      rightCount: 3,
      perks: [
        "Direct Center-Stage Eye Level",
        "Optimal Audio & Visual Sweet Spot",
        "Comfortable Arena Seating Spacing",
        "Express Check-In Desk",
      ],
    };
  }
  if (n.includes("silver") || n.includes("standard") || n.includes("mezz")) {
    return {
      rank: 3,
      badge: "⭐ SILVER / STANDARD",
      badgeLabel: "Standard Tier · Mezzanine",
      zoneTitle: "Silver Elevated Tier",
      zoneSubtitle: "Full Arena Panorama · Excellent Value",
      themeColor: "#94a3b8",
      badgeBg: "rgba(148, 163, 184, 0.15)",
      borderClass: "border-slate-400/60 shadow-[0_0_25px_rgba(148,163,184,0.25)]",
      glowClass: "from-slate-500/20 via-blue-500/10 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(100,116,139,0.18), rgba(71,85,105,0.08))",
      badgeIcon: "⭐",
      rowCodes: ["G", "H"],
      seatsPerRow: 18,
      leftCount: 4,
      centerCount: 10,
      rightCount: 4,
      perks: [
        "Elevated Panoramic Stage View",
        "High Quality Stadium Sound",
        "Dedicated Tier Restrooms",
        "Digital Matchday Programme",
      ],
    };
  }
  // Default: Bronze / Balcony / General
  return {
    rank: 4,
    badge: n.includes("bronze") ? "🥉 BRONZE / GENERAL" : "🎫 GENERAL ADMISSION",
    badgeLabel: "Standard Admission · Arena",
    zoneTitle: n.includes("bronze") ? "Bronze Arena" : "General Field",
    zoneSubtitle: "High Energy Arena Atmosphere · Unbeatable Value",
    themeColor: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.15)",
    borderClass: "border-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.25)]",
    glowClass: "from-sky-500/20 via-cyan-500/10 to-transparent",
    bgGrad: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(2,132,199,0.08))",
    badgeIcon: "🎫",
    rowCodes: ["L", "M"],
    seatsPerRow: 18,
    leftCount: 4,
    centerCount: 10,
    rightCount: 4,
    perks: [
      "Panoramic Full Arena View",
      "Electrifying Crowd Energy & Atmosphere",
      "Budget-Friendly Official Admission",
      "Access to Concessions & Merch",
    ],
  };
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio blocked or not supported
  }
}

export interface SelectedSeatInfo {
  seatId: string; // e.g. "A-01"
  rowCode: string; // e.g. "A"
  seatNum: number; // e.g. 1
  tierId: string;
  tierName: string;
  price: number;
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

  // Active highlighted tier (when user clicks tier header)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  // Booked seats from live backend
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [loadingBookedSeats, setLoadingBookedSeats] = useState(true);

  // Interactive Selected Seats array (BookMyShow style)
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeatInfo[]>([]);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Client-side fresh re-fetch on mount ensures latest categories/prices without stale cache
  useEffect(() => {
    let active = true;
    activitiesApi
      .eventById(initialEvent._id)
      .then((fresh) => {
        if (active && fresh) setEvent(fresh);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialEvent._id]);

  // Load live booked seats
  const fetchBookedSeats = useCallback(async () => {
    try {
      setLoadingBookedSeats(true);
      const res = await activitiesApi.eventBookedSeats(initialEvent._id);
      if (res && Array.isArray(res.booked_seats)) {
        setBookedSeats(res.booked_seats.map((s) => String(s).toUpperCase()));
      }
    } catch {
      // Fallback empty booked seats
    } finally {
      setLoadingBookedSeats(false);
    }
  }, [initialEvent._id]);

  useEffect(() => {
    fetchBookedSeats();
  }, [fetchBookedSeats]);

  const bookedSeatSet = useMemo(() => new Set(bookedSeats), [bookedSeats]);
  const selectedSeatMap = useMemo(() => new Map(selectedSeats.map((s) => [s.seatId, s])), [selectedSeats]);

  // Fetch ticket tiers and align strictly with event.categories
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fetchTiers = () => {
      activitiesApi
        .tickets(event._id, { limit: 50 })
        .then((res) => {
          if (cancelled) return;
          const list = Array.isArray(res) ? res : [];
          let visible = list.filter((t) => t.is_visible !== false);

          if (Array.isArray(event.categories) && event.categories.length > 0) {
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

          if (preselectedTierParam) {
            const match = visible.find(
              (t) => (t.category || t.type).toLowerCase() === preselectedTierParam.toLowerCase()
            );
            if (match && (match.available ?? 0) > 0) {
              setSelectedTierId(match._id);
              return;
            }
          }

          const firstOpen = visible.find((t) => (t.available ?? 0) > 0);
          if (firstOpen) setSelectedTierId(firstOpen._id);
        })
        .catch((e) => {
          if (!cancelled) setTiersError(e?.message || "Could not load ticket types.");
        })
        .finally(() => {
          if (!cancelled) setLoadingTiers(false);
        });
    };

    fetchTiers();
    return () => {
      cancelled = true;
    };
  }, [event._id, event.ticket_enabled, event.categories, preselectedTierParam]);

  // Synchronize attendee names array length with selectedSeats.length
  useEffect(() => {
    setAttendeeNames((prev) => {
      const needed = selectedSeats.length;
      const next = [...prev];
      while (next.length < needed) {
        const idx = next.length;
        next.push(idx === 0 ? user?.name || "" : "");
      }
      return next.slice(0, needed);
    });
  }, [selectedSeats.length, user?.name]);

  // Total price calculation
  const totalAmount = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  // Handle seat click (Toggle selection)
  const handleToggleSeat = (seatId: string, rowCode: string, seatNum: number, tierItem: TicketTier) => {
    setError(null);
    if (bookedSeatSet.has(seatId)) return;

    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.seatId === seatId);
      if (exists) {
        return prev.filter((s) => s.seatId !== seatId);
      }
      if (prev.length >= MAX_QTY) {
        setError(`Maximum ${MAX_QTY} seats can be selected per booking.`);
        return prev;
      }
      // Also highlight the active tier
      setSelectedTierId(tierItem._id);

      return [
        ...prev,
        {
          seatId,
          rowCode,
          seatNum,
          tierId: tierItem._id,
          tierName: tierItem.category || tierItem.type,
          price: Number(tierItem.price || 0),
        },
      ];
    });
  };

  const removeSeat = (seatId: string) => {
    setSelectedSeats((prev) => prev.filter((s) => s.seatId !== seatId));
  };

  const clearAllSeats = () => {
    setSelectedSeats([]);
    setError(null);
  };

  /* ── Booking Submission ── */
  const handleExecuteBooking = async () => {
    setError(null);
    setSuccess(null);

    if (!user) {
      router.push(`/login?next=/events/${event._id}/book`);
      return;
    }

    if (selectedSeats.length === 0) {
      setError("Please click and select at least one available seat on the arena map.");
      return;
    }

    const isExpired = isEventExpired(event.date, event.time);
    const isDeadlineOver = isDeadlinePassed(event.registration_deadline);
    if (isExpired) {
      setError(`This event has already concluded on ${formatEventDate(event.date)}. Ticket booking is closed.`);
      return;
    }
    if (isDeadlineOver) {
      setError(`The registration deadline (${formatEventDate(event.registration_deadline)}) has passed. Ticket booking is closed.`);
      return;
    }
    if (event.registration_enabled === false || event.ticket_enabled === false) {
      setError("Ticketing is currently closed for this event.");
      return;
    }

    setSubmitting(true);
    try {
      const holderNames = attendeeNames.map((n, i) => n.trim() || user?.name || `Guest ${i + 1}`);
      const primaryCategory = selectedSeats[0]?.tierName || event.categories?.[0]?.name || "General";
      const seatIds = selectedSeats.map((s) => s.seatId);
      const chosenPaymentMode = totalAmount > 0 ? paymentMethod : "ONLINE";

      const booking = await bookingsApi.create({
        event_id: event._id,
        category: primaryCategory,
        quantity: selectedSeats.length,
        holder_names: holderNames,
        seats: seatIds,
        payment_method: chosenPaymentMode,
      });

      if (!booking?.payment_info || booking?.booking_status === "CONFIRMED" || chosenPaymentMode === "CASH") {
        playSuccessChime();
        setSuccess(
          chosenPaymentMode === "CASH"
            ? `Confirmed! Reference #${booking.booking_reference}. Cash pass for ${seatIds.join(", ")} (${primaryCategory}) is pending payment at the gate.`
            : `Confirmed! Booking reference #${booking.booking_reference}. Seats: ${seatIds.join(", ")} reserved.`
        );
        fetchBookedSeats();
        setTimeout(() => router.push("/dashboard"), 1800);
        return;
      }

      // Online Razorpay Payment
      const info = booking.payment_info;
      const ok = await loadRazorpay();
      if (!ok) throw new ApiError("Could not reach payment gateway. Check your connection and retry.", 0);

      const keyId = info.key_id || info.checkout_data?.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) throw new ApiError("Payment gateway is not configured yet. Please contact support.", 0);

      const rzp = new window.Razorpay({
        key: keyId,
        amount: info.amount_paise ?? Math.round(totalAmount * 100),
        currency: info.currency || "INR",
        name: info.checkout_data?.name || "Upgrade Talents India",
        description: info.checkout_data?.description || `Seats ${seatIds.join(", ")} — ${event.title}`,
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
            playSuccessChime();
            setSuccess(`Payment verified! Booking reference #${booking.booking_reference} confirmed for ${seatIds.join(", ")}.`);
            fetchBookedSeats();
            setTimeout(() => router.push("/dashboard"), 1800);
          } catch (e: any) {
            setError(e?.message || "Payment captured but verification failed. Contact support with your booking reference.");
          } finally {
            setSubmitting(false);
          }
        },
      });

      rzp.on("payment.failed", (r: any) => {
        setError(r?.error?.description || "Payment failed. No amount charged — please try again.");
        setSubmitting(false);
      });
      rzp.open();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("Insufficient") || msg.includes("409")) {
        setError("Seat conflict: One or more selected seats were just claimed by another user. Updating live seats...");
        fetchBookedSeats();
      } else {
        setError(msg || "Something went wrong while booking your seats.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07080a] text-white">
      {/* ═══════════ CINEMATIC HERO BACKDROP (From Admin Panel) ═══════════ */}
      <div className="absolute top-0 left-0 right-0 h-[420px] sm:h-[500px] overflow-hidden pointer-events-none select-none">
        <img
          src={event.banner_url || event.banner_image_url || event.image_url || "/images/banner-placeholder.jpg"}
          alt=""
          className="w-full h-full object-cover object-center opacity-25 filter blur-xs scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080a] via-transparent to-[#07080a]" />
      </div>

      <div className="relative z-10 container-x py-10 sm:py-16">
        {/* Header Breadcrumbs & Title */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--acid)]">
              <Armchair className="size-3.5" /> BookMyShow Arena Seating
            </span>
            <h1 className="street-heading mt-4 text-[clamp(2.2rem,6.5vw,4.5rem)] leading-[0.95]">
              Select Seating Category
            </h1>
            <p className="mt-3 text-sm md:text-base text-white/70 font-cond tracking-wide uppercase">
              Choose your view: Front-Row VIP Lounge, Center Arena Executive, or Upper Balcony &amp; General Admission.
            </p>
          </div>
        </Reveal>

        {/* Global Status Alerts */}
        <div aria-live="polite" className="mx-auto mt-6 max-w-2xl empty:hidden">
          {error && (
            <p
              role="alert"
              className="font-cond flex items-start gap-2.5 rounded-xl border border-[var(--street-red)] bg-[color-mix(in_srgb,var(--street-red)_14%,transparent)] p-4 text-[14px] uppercase tracking-wide text-white"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          {success && (
            <p
              className="font-cond flex items-start gap-2.5 rounded-xl border p-4 text-[14px] uppercase tracking-wide"
              style={{
                borderColor: "var(--acid)",
                background: "color-mix(in srgb, var(--acid) 12%, transparent)",
                color: "var(--acid)",
              }}
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {success}
            </p>
          )}
          {!authLoading && !user && !error && !success && (
            <p className="font-cond flex items-start gap-2.5 rounded-xl border border-[var(--street-line)] bg-black/40 p-4 text-[14px] uppercase tracking-wide text-white/80 backdrop-blur-sm">
              <LogIn className="mt-0.5 size-4 shrink-0" style={{ color: "var(--acid)" }} aria-hidden />
              Sign in to book — your selected seats will be reserved under your account.
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
              <div className="mx-auto h-4 w-3/4 bg-gradient-to-b from-[var(--acid)]/25 to-transparent blur-sm" />
            </div>

            {/* ARENA SEATING ZONES MAP (Separate Category Cards) */}
            <div className="flex flex-col gap-6">
              {tiers.map((t, tierIdx) => {
                const meta = getSeatingZoneMeta(t.category || t.type);
                const isSelectedTier = selectedTierId === t._id;
                const isSoldOut = (t.available ?? 0) <= 0;

                // Count how many seats in this tier are currently selected by user
                const tierSelectedSeats = selectedSeats.filter((s) => s.tierId === t._id || s.tierName === (t.category || t.type));

                return (
                  <motion.div
                    key={t._id}
                    onClick={() => !isSoldOut && setSelectedTierId(t._id)}
                    whileHover={!isSoldOut ? { scale: 1.006 } : {}}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-4 sm:p-6 transition-all duration-300",
                      isSelectedTier
                        ? `${meta.borderClass} bg-neutral-900/95 ring-2 ring-[${meta.themeColor}]`
                        : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]",
                      isSoldOut && "cursor-not-allowed opacity-40"
                    )}
                    style={{
                      background: isSelectedTier ? meta.bgGrad : undefined,
                    }}
                  >
                    {/* Active Zone Indicator Ribbon */}
                    {tierSelectedSeats.length > 0 && (
                      <div
                        className="absolute top-0 right-0 rounded-bl-xl px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-black shadow-md flex items-center gap-1"
                        style={{ background: meta.themeColor }}
                      >
                        <Check className="size-3 stroke-[3]" />
                        <span>{tierSelectedSeats.length} {tierSelectedSeats.length === 1 ? "Seat" : "Seats"} Selected</span>
                      </div>
                    )}

                    {/* Zone Header: Icon, Titles, Price, Capacity */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <span
                          className="grid size-11 sm:size-13 shrink-0 place-items-center rounded-2xl text-xl sm:text-2xl shadow-md"
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

                      {/* Price & Seats Left */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSoldOut) setSelectedTierId(t._id);
                          }}
                          className={cn(
                            "rounded-xl px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all",
                            isSelectedTier
                              ? "bg-white text-black shadow-lg"
                              : "border border-white/20 text-white/80 hover:bg-white/10"
                          )}
                        >
                          {isSelectedTier ? "Active" : "Select"}
                        </button>
                      </div>
                    </div>

                    {/* ═══════════ BOOKMYSHOW REAL INTERACTIVE SEAT GRID ═══════════ */}
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-3">
                        <span className="uppercase tracking-wider flex items-center gap-1.5">
                          <Armchair className="size-3.5 text-white/70" />
                          <span>Seating Zone: {meta.zoneTitle}</span>
                        </span>
                        <span className="text-white/40">Click any available seat to select</span>
                      </div>

                      <div className="flex flex-col gap-2.5 overflow-x-auto pb-2">
                        {meta.rowCodes.map((rowCode) => {
                          const leftSeats = Array.from({ length: meta.leftCount }, (_, i) => i + 1);
                          const centerSeats = Array.from({ length: meta.centerCount }, (_, i) => i + 1 + meta.leftCount);
                          const rightSeats = Array.from({ length: meta.rightCount }, (_, i) => i + 1 + meta.leftCount + meta.centerCount);

                          return (
                            <div key={rowCode} className="flex items-center justify-between gap-3 text-xs font-mono min-w-[480px]">
                              {/* Row Label Left */}
                              <span className="w-5 text-center font-bold text-white/70">{rowCode}</span>

                              {/* Seats Layout with Aisle Gaps */}
                              <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
                                {/* Left Wing */}
                                <div className="flex items-center gap-1.5">
                                  {leftSeats.map((seatNum) => {
                                    const seatId = `${rowCode}-${String(seatNum).padStart(2, "0")}`;
                                    const isBooked = bookedSeatSet.has(seatId);
                                    const isSelected = selectedSeatMap.has(seatId);

                                    return (
                                      <button
                                        key={seatId}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSeat(seatId, rowCode, seatNum, t);
                                        }}
                                        title={`Row ${rowCode} · Seat ${seatNum} (${t.category || t.type}: ${formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                        className={cn(
                                          "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px] cursor-pointer",
                                          isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                          !isBooked && !isSelected && "bg-[#1c1f26] border border-white/20 hover:border-white/70 hover:scale-110 text-white/70 hover:bg-[#282d37]",
                                          isSelected && "scale-110 shadow-lg font-bold text-black animate-pulse"
                                        )}
                                        style={{
                                          backgroundColor: isSelected ? meta.themeColor : undefined,
                                          borderColor: isSelected ? meta.themeColor : undefined,
                                          boxShadow: isSelected ? `0 0 12px ${meta.themeColor}` : undefined,
                                        }}
                                      >
                                        <span>{seatNum}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Center Block */}
                                <div className="flex items-center gap-1.5">
                                  {centerSeats.map((seatNum) => {
                                    const seatId = `${rowCode}-${String(seatNum).padStart(2, "0")}`;
                                    const isBooked = bookedSeatSet.has(seatId);
                                    const isSelected = selectedSeatMap.has(seatId);

                                    return (
                                      <button
                                        key={seatId}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSeat(seatId, rowCode, seatNum, t);
                                        }}
                                        title={`Row ${rowCode} · Seat ${seatNum} (${t.category || t.type}: ${formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                        className={cn(
                                          "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px] cursor-pointer",
                                          isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                          !isBooked && !isSelected && "bg-[#1c1f26] border border-white/20 hover:border-white/70 hover:scale-110 text-white/70 hover:bg-[#282d37]",
                                          isSelected && "scale-110 shadow-lg font-bold text-black animate-pulse"
                                        )}
                                        style={{
                                          backgroundColor: isSelected ? meta.themeColor : undefined,
                                          borderColor: isSelected ? meta.themeColor : undefined,
                                          boxShadow: isSelected ? `0 0 12px ${meta.themeColor}` : undefined,
                                        }}
                                      >
                                        <span>{seatNum}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Right Wing */}
                                <div className="flex items-center gap-1.5">
                                  {rightSeats.map((seatNum) => {
                                    const seatId = `${rowCode}-${String(seatNum).padStart(2, "0")}`;
                                    const isBooked = bookedSeatSet.has(seatId);
                                    const isSelected = selectedSeatMap.has(seatId);

                                    return (
                                      <button
                                        key={seatId}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSeat(seatId, rowCode, seatNum, t);
                                        }}
                                        title={`Row ${rowCode} · Seat ${seatNum} (${t.category || t.type}: ${formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                        className={cn(
                                          "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px] cursor-pointer",
                                          isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                          !isBooked && !isSelected && "bg-[#1c1f26] border border-white/20 hover:border-white/70 hover:scale-110 text-white/70 hover:bg-[#282d37]",
                                          isSelected && "scale-110 shadow-lg font-bold text-black animate-pulse"
                                        )}
                                        style={{
                                          backgroundColor: isSelected ? meta.themeColor : undefined,
                                          borderColor: isSelected ? meta.themeColor : undefined,
                                          boxShadow: isSelected ? `0 0 12px ${meta.themeColor}` : undefined,
                                        }}
                                      >
                                        <span>{seatNum}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Row Label Right */}
                              <span className="w-5 text-center font-bold text-white/70">{rowCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tier Perks Bar */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-white/60">
                      {meta.perks.slice(0, 3).map((perk) => (
                        <span key={perk} className="inline-flex items-center gap-1">
                          <Check className="size-3 text-emerald-400" />
                          <span>{perk}</span>
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* SEATING LEGEND */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-4 text-[11px] font-mono uppercase tracking-widest text-white/60">
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-t-sm rounded-b-xs bg-[#1c1f26] border border-white/30" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-t-sm rounded-b-xs bg-[var(--acid)] shadow-[0_0_8px_var(--acid)]" />
                <span className="text-[var(--acid)] font-bold">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-t-sm rounded-b-xs bg-neutral-800/40 border border-neutral-800 opacity-40" />
                <span className="text-white/30">Reserved / Taken</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Loading Skeleton */}
        {loadingTiers && (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-[200px] rounded-2xl" />
            ))}
          </div>
        )}

        {tiersError && (
          <div role="alert" className="mx-auto mt-12 max-w-xl rounded-2xl border border-[var(--street-red)] bg-red-950/20 p-8 text-center backdrop-blur-md">
            <p className="font-cond text-[15px] uppercase tracking-wide">{tiersError}</p>
            <button
              onClick={() => location.reload()}
              className="font-cond mt-5 min-h-[44px] cursor-pointer rounded-xl px-6 text-[13px] font-semibold uppercase tracking-widest text-[var(--acid-ink)]"
              style={{ background: "var(--acid)" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══════════ SELECTED SEATS CHECKOUT DRAWER & GUEST FORM ═══════════ */}
        <Reveal className="mt-10">
          <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/20 bg-neutral-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            
            {/* Header: Selected Seats Count & Total */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--acid)] font-bold flex items-center gap-2">
                  <Armchair className="size-4" /> Live Seat Reservation
                </span>
                <h3 className="font-display text-2xl font-bold uppercase text-white mt-1">
                  {selectedSeats.length === 0 ? "Select Your Seats" : `${selectedSeats.length} Seats Selected`}
                </h3>
              </div>

              <div className="flex items-baseline gap-3 text-right">
                <span className="font-mono text-xs text-white/50 uppercase">Total Amount:</span>
                <span className="font-street text-3xl font-extrabold text-[var(--acid)] leading-none">
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>

            {/* Selected Seats Pills List */}
            {selectedSeats.length > 0 ? (
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-mono text-white/60 mb-2">
                  <span>Selected Seats:</span>
                  <button
                    type="button"
                    onClick={clearAllSeats}
                    className="text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat.seatId}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-white"
                    >
                      <span className="font-bold text-[var(--acid)]">{seat.seatId}</span>
                      <span className="text-white/60">({seat.tierName})</span>
                      <span className="font-semibold">{formatINR(seat.price)}</span>
                      <button
                        type="button"
                        onClick={() => removeSeat(seat.seatId)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        title="Remove seat"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 py-6 text-center text-xs font-mono text-white/40 border border-dashed border-white/10 rounded-2xl">
                <Armchair className="size-8 mx-auto text-white/20 mb-2 animate-bounce" />
                Click on any vacant seat in the Platinum, Gold, or General sections above to select.
              </div>
            )}

            {/* Guest Attendee Form & Payment Option */}
            {selectedSeats.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Attendee Names */}
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-white/70 block mb-2">
                      Attendee Names (1 per seat):
                    </label>
                    <div className="space-y-2">
                      {selectedSeats.map((seat, i) => (
                        <div key={seat.seatId} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 rounded-lg bg-white/10 px-2 py-1.5 font-mono text-[11px] font-bold text-center text-[var(--acid)]">
                            {seat.seatId}
                          </span>
                          <input
                            type="text"
                            value={attendeeNames[i] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendeeNames((prev) => {
                                const next = [...prev];
                                next[i] = val;
                                return next;
                              });
                            }}
                            placeholder={i === 0 ? user?.name || "Full name" : `Guest ${i + 1} full name`}
                            className="h-10 flex-1 rounded-xl border border-white/15 bg-black/60 px-3 font-mono text-xs text-white placeholder-white/30 focus:border-[var(--acid)] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-white/70 block mb-2">
                      Payment Mode:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("ONLINE")}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                          paymentMethod === "ONLINE"
                            ? "border-[var(--acid)] bg-[var(--acid)]/10 text-white shadow-[0_0_15px_rgba(191,255,46,0.15)]"
                            : "border-white/10 bg-black/40 text-white/60 hover:border-white/30"
                        )}
                      >
                        <CreditCard className="size-5 mb-1 text-[var(--acid)]" />
                        <span className="font-mono text-xs font-bold uppercase">Online Payment</span>
                        <span className="font-mono text-[10px] text-white/50">UPI / Cards / NetBanking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                          paymentMethod === "CASH"
                            ? "border-amber-400 bg-amber-400/10 text-white shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                            : "border-white/10 bg-black/40 text-white/60 hover:border-white/30"
                        )}
                      >
                        <Banknote className="size-5 mb-1 text-amber-400" />
                        <span className="font-mono text-xs font-bold uppercase">Cash Spot Pass</span>
                        <span className="font-mono text-[10px] text-white/50">Pay in Cash at Gate</span>
                      </button>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleExecuteBooking}
                        disabled={submitting || selectedSeats.length === 0}
                        className="w-full h-12 rounded-xl bg-[var(--acid)] text-[var(--acid-ink)] font-mono text-sm font-bold uppercase tracking-wider shadow-lg hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Processing Reservation...</span>
                          </>
                        ) : (
                          <>
                            <Ticket className="size-4" />
                            <span>Confirm &amp; Book {selectedSeats.length} Seats ({formatINR(totalAmount)})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </Reveal>

        {/* ═══════════ FAQ & RULES ACCORDION ═══════════ */}
        <section className="mt-16 border-t border-white/10 pt-12">
          <div className="max-w-3xl mx-auto">
            <span className="font-mono text-xs uppercase tracking-widest text-white/50 block mb-2">
              Event Guidelines
            </span>
            <h3 className="font-street text-2xl font-bold uppercase text-white mb-6">
              Frequently Asked Questions
            </h3>

            <div className="divide-y divide-white/10 border-t border-b border-white/10">
              {RULES.map((rule, idx) => (
                <div key={idx} className="py-4">
                  <h4 className="font-display text-sm font-bold uppercase text-white/90">
                    {rule.q}
                  </h4>
                  <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
                    {rule.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
