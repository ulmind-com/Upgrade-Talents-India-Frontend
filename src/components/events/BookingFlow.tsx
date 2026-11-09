"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Armchair,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Users,
  Ticket,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  QrCode,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  LogIn,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, isEventExpired, isDeadlinePassed, FALLBACK_IMAGES } from "@/lib/utils";
import { activitiesApi, bookingsApi, paymentsApi, type EventItem, type TicketTier, ApiError } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { EventCard } from "@/components/home/Sections";

/* ─────────────── SEATING ZONE METADATA HELPER ─────────────── */
export type SeatingZoneMeta = {
  rank: number;
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
      zoneTitle: "Gold Center Arena",
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
        "Express Check-In Desk",
      ],
    };
  }
  if (n.includes("silv") || n.includes("standard") || n.includes("mezz")) {
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
      rowCodes: ["H", "J", "K"],
      seatCountPerRow: 18,
      perks: [
        "Elevated Panoramic Stage View",
        "High Quality Stadium Sound",
        "Dedicated Tier Restrooms",
        "Digital Matchday Programme",
      ],
    };
  }
  return {
    rank: 4,
    badge: "🎫 GENERAL ADMISSION",
    badgeLabel: "Standard Admission · Arena",
    zoneTitle: "General Admission",
    zoneSubtitle: "High Energy Arena Atmosphere · Unbeatable Value",
    themeColor: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.15)",
    borderClass: "border-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.25)]",
    glowClass: "from-sky-500/20 via-cyan-500/10 to-transparent",
    bgGrad: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(2,132,199,0.08))",
    badgeIcon: "🎫",
    rowCodes: ["L", "M", "N"],
    seatCountPerRow: 18,
    perks: [
      "Panoramic Full Arena View",
      "Electrifying Crowd Energy & Atmosphere",
      "Budget-Friendly Official Admission",
      "Access to Concessions & Merch",
    ],
  };
}

declare global {
  interface Window {
    Razorpay?: any;
  }
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

export interface SelectedSeat {
  id: string; // e.g. "F-08"
  row: string; // e.g. "F" or "6"
  col: number; // e.g. 8
  price: number;
  tierName: string;
}

export interface SeatingRowConfig {
  letter: string;
  rowNumber: number;
  tierName: string;
  price: number;
  leftSeats: number[];
  centerSeats: number[];
  rightSeats: number[];
}

export default function BookingFlow({
  event: initialEvent,
  related = [],
}: {
  event: EventItem;
  related?: EventItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem>(initialEvent);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [loadingBookedSeats, setLoadingBookedSeats] = useState(true);

  // Wizard Step: 1 = Seat Selection, 2 = Guest Names & Payment, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selected seats array
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

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

  // Fetch ticket tiers
  useEffect(() => {
    let cancelled = false;
    activitiesApi
      .tickets(initialEvent._id, { limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : [];
        setTiers(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTiers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialEvent._id]);

  // Set of occupied seats
  const bookedSeatSet = useMemo(() => new Set(bookedSeats), [bookedSeats]);
  const selectedSeatMap = useMemo(() => new Map(selectedSeats.map((s) => [s.id, s])), [selectedSeats]);

  // Generate Seating Grid Rows mapped to tiers
  const arenaRows: SeatingRowConfig[] = useMemo(() => {
    const cats = Array.isArray(event.categories) && event.categories.length > 0 ? event.categories : [];
    
    // Default tier if none configured
    const defaultPrice = Number(event.price || 0);
    const tier1 = cats[0] || { name: "VIP Platinum", price: defaultPrice > 0 ? defaultPrice * 2.5 : 1500 };
    const tier2 = cats[1] || { name: "Gold Arena", price: defaultPrice > 0 ? defaultPrice * 1.5 : 800 };
    const tier3 = cats[2] || { name: "General Admission", price: defaultPrice > 0 ? defaultPrice : 400 };

    const rows: SeatingRowConfig[] = [
      // VIP Platinum Rows (Front)
      {
        letter: "A",
        rowNumber: 1,
        tierName: tier1.name,
        price: Number(tier1.price || 0),
        leftSeats: [1, 2],
        centerSeats: [3, 4, 5, 6, 7, 8, 9, 10],
        rightSeats: [11, 12],
      },
      {
        letter: "B",
        rowNumber: 2,
        tierName: tier1.name,
        price: Number(tier1.price || 0),
        leftSeats: [1, 2, 3],
        centerSeats: [4, 5, 6, 7, 8, 9, 10, 11],
        rightSeats: [12, 13, 14],
      },
      // Gold Arena Rows (Center)
      {
        letter: "C",
        rowNumber: 3,
        tierName: tier2.name,
        price: Number(tier2.price || 0),
        leftSeats: [1, 2, 3],
        centerSeats: [4, 5, 6, 7, 8, 9, 10, 11],
        rightSeats: [12, 13, 14],
      },
      {
        letter: "D",
        rowNumber: 4,
        tierName: tier2.name,
        price: Number(tier2.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12],
        rightSeats: [13, 14, 15, 16],
      },
      {
        letter: "E",
        rowNumber: 5,
        tierName: tier2.name,
        price: Number(tier2.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12],
        rightSeats: [13, 14, 15, 16],
      },
      {
        letter: "F",
        rowNumber: 6,
        tierName: tier2.name,
        price: Number(tier2.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12],
        rightSeats: [13, 14, 15, 16],
      },
      // General / Balcony Rows (Rear)
      {
        letter: "G",
        rowNumber: 7,
        tierName: tier3.name,
        price: Number(tier3.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        rightSeats: [15, 16, 17, 18],
      },
      {
        letter: "H",
        rowNumber: 8,
        tierName: tier3.name,
        price: Number(tier3.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        rightSeats: [15, 16, 17, 18],
      },
      {
        letter: "J",
        rowNumber: 9,
        tierName: tier3.name,
        price: Number(tier3.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        rightSeats: [15, 16, 17, 18],
      },
      {
        letter: "K",
        rowNumber: 10,
        tierName: tier3.name,
        price: Number(tier3.price || 0),
        leftSeats: [1, 2, 3, 4],
        centerSeats: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        rightSeats: [15, 16, 17, 18],
      },
    ];

    return rows;
  }, [event]);

  // Seat toggle handler
  const handleToggleSeat = (seatId: string, rowLetter: string, rowNum: number, colNum: number, price: number, tierName: string) => {
    setError(null);
    if (bookedSeatSet.has(seatId)) return;

    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seatId);
      if (exists) {
        return prev.filter((s) => s.id !== seatId);
      }
      if (prev.length >= 10) {
        setError("Maximum 10 seats can be reserved in a single transaction.");
        return prev;
      }
      return [
        ...prev,
        {
          id: seatId,
          row: `${rowNum} row (${rowLetter})`,
          col: colNum,
          price,
          tierName,
        },
      ];
    });
  };

  const removeSeat = (seatId: string) => {
    setSelectedSeats((prev) => prev.filter((s) => s.id !== seatId));
  };

  const clearSeats = () => {
    setSelectedSeats([]);
    setError(null);
  };

  // Synchronize guest names list with selected seats count
  useEffect(() => {
    setGuestNames((prev) => {
      const needed = selectedSeats.length;
      const next = [...prev];
      while (next.length < needed) {
        const idx = next.length;
        next.push(idx === 0 ? user?.name || "" : "");
      }
      return next.slice(0, needed);
    });
  }, [selectedSeats.length, user?.name]);

  const totalAmount = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  // Backdrop Banner and Floating Poster Card from Admin Panel
  const backdropUrl = event.banner_url || event.banner_image_url || event.image_url || FALLBACK_IMAGES[0];
  const posterUrl = event.card_image_url || event.image_url || FALLBACK_IMAGES[1];

  // Date Parsing for the Date Badge (Day + Month)
  const { eventDay, eventMonth } = useMemo(() => {
    try {
      const d = new Date(event.date);
      if (isNaN(d.getTime())) return { eventDay: "14", eventMonth: "DEC" };
      return {
        eventDay: String(d.getDate()).padStart(2, "0"),
        eventMonth: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      };
    } catch {
      return { eventDay: "14", eventMonth: "DEC" };
    }
  }, [event.date]);

  // Booking Execution
  const executeBooking = async () => {
    if (!user) {
      router.push(`/login?next=/events/${event._id}/book`);
      return;
    }
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat on the arena map.");
      return;
    }

    const isExpired = isEventExpired(event.date, event.time);
    const isDeadlineOver = isDeadlinePassed(event.registration_deadline);
    if (isExpired) {
      setError(`This event concluded on ${formatEventDate(event.date)}. Ticket booking is closed.`);
      return;
    }
    if (isDeadlineOver) {
      setError(`The registration deadline (${formatEventDate(event.registration_deadline)}) has passed. Booking is closed.`);
      return;
    }
    if (event.registration_enabled === false || event.ticket_enabled === false) {
      setError("Ticketing is currently closed for this event.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const holderNames = guestNames.map((n, i) => n.trim() || user?.name || `Guest ${i + 1}`);
      const distinctTiers = Array.from(new Set(selectedSeats.map((s) => s.tierName)));
      const primaryCategory = distinctTiers[0] || event.category || "General";
      const seatIds = selectedSeats.map((s) => s.id);
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
        setConfirmedBooking(booking);
        setStep(3);
        fetchBookedSeats();
        return;
      }

      // Online Razorpay Payment
      const info = booking.payment_info;
      const ok = await loadRazorpay();
      if (!ok) throw new ApiError("Could not reach payment gateway. Check your connection and retry.", 0);

      const keyId = info.key_id || info.checkout_data?.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) throw new ApiError("Payment gateway is not configured. Please contact support.", 0);

      const rzp = new window.Razorpay({
        key: keyId,
        amount: info.amount_paise ?? Math.round(totalAmount * 100),
        currency: info.currency || "INR",
        name: info.checkout_data?.name || "Upgrade Talents India",
        description: info.checkout_data?.description || `Seats ${seatIds.join(", ")} — ${event.title}`,
        order_id: info.order_id,
        prefill: { email: user?.email || "", name: user?.name || "", contact: user?.phone_number || "" },
        theme: { color: "#e50914" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment window closed. Your seats are held briefly — retry to confirm.");
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
            setConfirmedBooking(booking);
            setStep(3);
            fetchBookedSeats();
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
        setError("Seat conflict: One or more selected seats were just claimed by another user. Updating available seats...");
        fetchBookedSeats();
      } else {
        setError(msg || "Something went wrong while securing your seats.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0b0e] text-white">
      {/* ═══════════ CINEMATIC HERO BACKDROP (From Admin Panel) ═══════════ */}
      <div className="absolute top-0 left-0 right-0 h-[460px] sm:h-[580px] overflow-hidden pointer-events-none select-none">
        <img
          src={backdropUrl}
          alt=""
          className="w-full h-full object-cover object-center opacity-25 filter blur-xs scale-105"
        />
        {/* Cinematic Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0e] via-[#0a0b0e]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0e] via-transparent to-[#0a0b0e]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0b0e_90%)]" />
      </div>

      <div className="relative z-10">
        {/* ═══════════ PROGRESS WIZARD BREADCRUMBS ═══════════ */}
        <div className="container-x pt-8 pb-4">
          <div className="flex items-center justify-center gap-6 sm:gap-14 border-b border-white/10 pb-4 text-xs font-mono uppercase tracking-widest">
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              className={cn(
                "flex items-center gap-2 pb-1 transition-all cursor-pointer",
                step === 1 ? "text-red-500 font-bold border-b-2 border-red-500" : "text-white/40 hover:text-white/70"
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px]">1</span>
              <span>CHOOSE YOUR PLACE</span>
            </button>
            <button
              type="button"
              onClick={() => selectedSeats.length > 0 && setStep(2)}
              className={cn(
                "flex items-center gap-2 pb-1 transition-all cursor-pointer",
                step === 2 ? "text-red-500 font-bold border-b-2 border-red-500" : "text-white/40 hover:text-white/70"
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px]">2</span>
              <span>PAYMENT &amp; DETAILS</span>
            </button>
            <div
              className={cn(
                "flex items-center gap-2 pb-1 transition-all",
                step === 3 ? "text-red-500 font-bold border-b-2 border-red-500" : "text-white/40"
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px]">3</span>
              <span>DIGITAL TICKET</span>
            </div>
          </div>
        </div>

        {/* ═══════════ DISPLAY TITLE & VENUE ═══════════ */}
        <div className="container-x mt-4 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-red-500 font-bold flex items-center gap-2">
                <Sparkles className="size-3.5 animate-pulse" /> Official Booking Arena
              </span>
              <h1 className="font-street text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-white mt-1 drop-shadow-md">
                {event.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-white/60">
              <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
                <MapPin className="size-3.5 text-red-500" />
                <span>{event.venue || "Venue TBA"}</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
                <Clock className="size-3.5 text-amber-400" />
                <span>{event.time || "18:00 IST"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="container-x mb-6">
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-xs font-mono text-red-300">
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 1: INTERACTIVE SEAT SELECTION ═══════════ */}
        {step === 1 && (
          <div className="container-x grid grid-cols-1 lg:grid-cols-[280px_1fr_210px] xl:grid-cols-[300px_1fr_220px] gap-8 items-start pb-16">
            
            {/* ── LEFT COLUMN: Floating Poster Card & Selected Seats Cart ── */}
            <div className="flex flex-col">
              {/* Floating Vertical Poster Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-neutral-900 shadow-2xl aspect-[2/3] w-full max-w-[280px] mx-auto group">
                <img
                  src={posterUrl}
                  alt={event.title}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                    Official Admission Pass
                  </span>
                  <p className="font-bold text-sm text-white truncate">{event.title}</p>
                  <p className="text-[11px] text-white/60 truncate">{event.venue}</p>
                </div>
              </div>

              {/* Selected Seats Cart (Exact Match to Reference Image) */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/70">
                    Selected Seats ({selectedSeats.length})
                  </span>
                  {selectedSeats.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSeats}
                      className="text-[11px] font-mono text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedSeats.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    <Armchair className="size-8 mx-auto text-white/20 mb-2 animate-bounce" />
                    Click available seats on the arena chart to select
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSeats.map((seat) => (
                      <div
                        key={seat.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{seat.row}</span>
                          <span className="text-white/60">{seat.col}th seat</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-400">{formatINR(seat.price)}</span>
                          <button
                            type="button"
                            onClick={() => removeSeat(seat.id)}
                            className="text-white/40 hover:text-red-400 transition-colors"
                            title="Remove seat"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-dashed border-white/10 flex items-baseline justify-between">
                  <span className="text-xs text-white/60 uppercase font-mono">Total:</span>
                  <span className="font-street text-2xl text-red-500 font-bold">{formatINR(totalAmount)}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={clearSeats}
                    disabled={selectedSeats.length === 0}
                    className="h-11 rounded-xl border border-white/20 bg-transparent text-xs font-mono uppercase tracking-wider text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?next=/events/${event._id}/book`);
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={selectedSeats.length === 0}
                    className="h-11 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-40 transition-all hover:scale-102 flex items-center justify-center gap-1.5"
                  >
                    <span>NEXT</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── CENTER COLUMN: Trapezoid Screen & Interactive Seat Grid ── */}
            <div className="flex flex-col items-center">
              {/* 3D Trapezoid Stage Perspective */}
              <div className="relative mx-auto mb-8 w-full max-w-lg text-center">
                <div
                  className="relative mx-auto h-12 sm:h-14 w-full rounded-t-lg bg-gradient-to-b from-neutral-200 via-neutral-500 to-neutral-800 shadow-[0_15px_30px_rgba(255,255,255,0.12)] flex items-center justify-center overflow-hidden"
                  style={{ clipPath: "polygon(14% 0%, 86% 0%, 100% 100%, 0% 100%)" }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-white/80" />
                  <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-neutral-900 drop-shadow-sm flex items-center gap-2">
                    <Sparkles className="size-3 text-red-600" /> STAGE / SCREEN THIS WAY
                  </span>
                </div>
                <div className="mx-auto h-7 w-3/4 bg-gradient-to-b from-white/15 to-transparent blur-md pointer-events-none" />
              </div>

              {/* Seating Grid Arena */}
              <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-7 backdrop-blur-md overflow-x-auto">
                <div className="min-w-[500px] flex flex-col gap-3">
                  {arenaRows.map((row) => (
                    <div key={row.letter} className="flex items-center justify-between gap-2 sm:gap-3 py-1">
                      {/* Row Label Left */}
                      <span className="w-6 text-center font-mono text-xs font-bold text-white/50">
                        {row.letter}
                      </span>

                      {/* Seats Block with Aisles */}
                      <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
                        {/* Left Wing */}
                        <div className="flex items-center gap-1.5">
                          {row.leftSeats.map((col) => {
                            const seatId = `${row.letter}-${String(col).padStart(2, "0")}`;
                            const isBooked = bookedSeatSet.has(seatId);
                            const isSelected = selectedSeatMap.has(seatId);

                            return (
                              <button
                                key={seatId}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleToggleSeat(seatId, row.letter, row.rowNumber, col, row.price, row.tierName)}
                                title={`Row ${row.letter} · Seat ${col} (${row.tierName}: ${formatINR(row.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                className={cn(
                                  "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px]",
                                  isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                  !isBooked && !isSelected && "bg-[#1c1f26] border border-white/15 hover:border-white/60 hover:bg-[#282d37] hover:scale-110 text-white/50",
                                  isSelected && "bg-red-600 border-red-400 text-white font-bold scale-110 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                                )}
                              >
                                <span>{col}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Center Section */}
                        <div className="flex items-center gap-1.5">
                          {row.centerSeats.map((col) => {
                            const seatId = `${row.letter}-${String(col).padStart(2, "0")}`;
                            const isBooked = bookedSeatSet.has(seatId);
                            const isSelected = selectedSeatMap.has(seatId);

                            return (
                              <button
                                key={seatId}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleToggleSeat(seatId, row.letter, row.rowNumber, col, row.price, row.tierName)}
                                title={`Row ${row.letter} · Seat ${col} (${row.tierName}: ${formatINR(row.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                className={cn(
                                  "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px]",
                                  isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                  !isBooked && !isSelected && "bg-[#1c1f26] border border-white/15 hover:border-white/60 hover:bg-[#282d37] hover:scale-110 text-white/50",
                                  isSelected && "bg-red-600 border-red-400 text-white font-bold scale-110 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                                )}
                              >
                                <span>{col}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Wing */}
                        <div className="flex items-center gap-1.5">
                          {row.rightSeats.map((col) => {
                            const seatId = `${row.letter}-${String(col).padStart(2, "0")}`;
                            const isBooked = bookedSeatSet.has(seatId);
                            const isSelected = selectedSeatMap.has(seatId);

                            return (
                              <button
                                key={seatId}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleToggleSeat(seatId, row.letter, row.rowNumber, col, row.price, row.tierName)}
                                title={`Row ${row.letter} · Seat ${col} (${row.tierName}: ${formatINR(row.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
                                className={cn(
                                  "size-6 sm:size-7 rounded-t-md rounded-b-xs transition-all relative flex items-center justify-center font-mono text-[9px]",
                                  isBooked && "bg-neutral-800/40 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-35",
                                  !isBooked && !isSelected && "bg-[#1c1f26] border border-white/15 hover:border-white/60 hover:bg-[#282d37] hover:scale-110 text-white/50",
                                  isSelected && "bg-red-600 border-red-400 text-white font-bold scale-110 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
                                )}
                              >
                                <span>{col}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Row Label Right */}
                      <span className="w-6 text-center font-mono text-xs font-bold text-white/50">
                        {row.letter}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Date, Time, Type & Seat Legend ── */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Date:</span>
                <div className="mt-1 rounded-xl border border-white/10 bg-neutral-900/90 p-3 text-center shadow-inner">
                  <span className="font-street text-3xl sm:text-4xl font-extrabold text-white block leading-none">{eventDay}</span>
                  <span className="font-mono text-xs font-bold text-red-500 uppercase tracking-widest">{eventMonth}</span>
                </div>

                <div className="mt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Time:</span>
                  <span className="font-bold text-sm text-white mt-0.5 block">{event.time || "18:00 IST"}</span>
                </div>

                <div className="mt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Category:</span>
                  <span className="font-bold text-xs text-red-400 uppercase tracking-wider mt-0.5 block">
                    {event.category || "LIVE ARENA PASS"}
                  </span>
                </div>

                {/* Seating Legend (Exact Match to Reference Image) */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-[#1c1f26] border border-white/20" />
                    <span className="text-white/60">Available</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-red-600 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                    <span className="text-red-400 font-bold">Selected</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-neutral-800/40 border border-neutral-800 opacity-40" />
                    <span className="text-white/30">Booked / Taken</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ═══════════ STEP 2: GUEST DETAILS & PAYMENT METHOD ═══════════ */}
        {step === 2 && (
          <div className="container-x max-w-3xl mx-auto pb-16">
            <div className="rounded-3xl border border-white/15 bg-neutral-900/90 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-red-500 font-bold">Step 2 of 3</span>
                  <h2 className="font-street text-2xl sm:text-3xl font-bold uppercase text-white mt-1">
                    Attendee Names &amp; Payment Mode
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-white/60 hover:text-white"
                >
                  <ArrowLeft className="size-3.5" /> Back to Seats
                </button>
              </div>

              {/* Attendee Name Inputs */}
              <div className="mt-6">
                <span className="font-mono text-xs uppercase tracking-wider text-white/60 block mb-3">
                  Attendee Names (Printed on Digital Passes)
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedSeats.map((seat, idx) => (
                    <div key={seat.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                      <label className="font-mono text-[11px] text-red-400 font-bold uppercase tracking-wider block mb-1">
                        Seat {seat.id} ({seat.tierName})
                      </label>
                      <input
                        type="text"
                        value={guestNames[idx] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGuestNames((prev) => {
                            const n = [...prev];
                            n[idx] = val;
                            return n;
                          });
                        }}
                        placeholder={idx === 0 ? user?.name || "Primary Attendee Name" : `Guest ${idx + 1} Name`}
                        className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-xs font-mono text-white outline-none focus:border-red-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Mode Selector */}
              {totalAmount > 0 && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
                  <span className="font-mono text-xs uppercase tracking-wider text-white/60 block mb-3">
                    Choose Payment Option
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ONLINE")}
                      className={cn(
                        "relative flex flex-col p-4 rounded-xl border text-left transition-all",
                        paymentMethod === "ONLINE"
                          ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          : "border-white/10 bg-neutral-900 hover:border-white/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Online Payment</span>
                        {paymentMethod === "ONLINE" && <span className="size-2 rounded-full bg-red-500" />}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-white/50">
                        Instant pass confirmation via UPI, Card, NetBanking (Razorpay)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={cn(
                        "relative flex flex-col p-4 rounded-xl border text-left transition-all",
                        paymentMethod === "CASH"
                          ? "border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                          : "border-white/10 bg-neutral-900 hover:border-white/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Pay at Venue Gate</span>
                        {paymentMethod === "CASH" && <span className="size-2 rounded-full bg-amber-400" />}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-white/50">
                        Spot entry · Pay {formatINR(totalAmount)} cash upon venue arrival
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Total & Checkout Action */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-dashed border-white/10 pt-6">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-white/50 block">Total Due:</span>
                  <span className="font-street text-3xl font-extrabold text-red-500">{formatINR(totalAmount)}</span>
                  <span className="font-mono text-[11px] text-white/40 block mt-0.5">
                    {selectedSeats.length} seats reserved · {selectedSeats.map((s) => s.id).join(", ")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={executeBooking}
                  disabled={submitting}
                  className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting
                    ? "Securing Your Seats..."
                    : paymentMethod === "CASH"
                    ? "Confirm Spot Pass (Pay at Gate)"
                    : totalAmount > 0
                    ? `Pay & Confirm ${formatINR(totalAmount)}`
                    : "Confirm Free Admission Pass"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: BOOKING CONFIRMATION & TICKET ═══════════ */}
        {step === 3 && confirmedBooking && (
          <div className="container-x max-w-2xl mx-auto pb-16">
            <div className="rounded-3xl border border-emerald-500/40 bg-neutral-900/95 p-6 sm:p-9 shadow-2xl backdrop-blur-md text-center">
              <div className="grid size-14 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 mx-auto border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <Check className="size-8 stroke-[3]" />
              </div>

              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-bold block mt-4">
                Booking Confirmed
              </span>
              <h2 className="font-street text-3xl sm:text-4xl font-extrabold uppercase text-white mt-1">
                Your Seats are Reserved!
              </h2>

              <p className="mt-2 text-xs font-mono text-white/70">
                Booking Reference: <span className="font-bold text-white text-sm">{confirmedBooking.booking_reference}</span>
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4 text-xs font-mono text-left">
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-white/50">Event</span>
                  <span className="text-white font-bold">{event.title}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-white/50">Assigned Seats</span>
                  <span className="text-red-400 font-bold">{selectedSeats.map((s) => s.id).join(", ")}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-white/50">Payment Status</span>
                  <span className={paymentMethod === "CASH" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {paymentMethod === "CASH" ? "CASH PENDING AT VENUE" : "PAID & CONFIRMED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Venue</span>
                  <span className="text-white">{event.venue}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Ticket className="size-4" /> View Passes in Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeats([]);
                    setStep(1);
                  }}
                  className="h-11 px-6 rounded-xl border border-white/20 text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white w-full sm:w-auto"
                >
                  Book More Seats
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ SHOW & VENUE DETAILS SECTION (Below Arena) ═══════════ */}
        <section className="border-t border-white/10 bg-black/60 py-16">
          <div className="container-x max-w-4xl mx-auto">
            <div className="flex items-center gap-2 font-mono text-xs text-red-500 font-bold uppercase tracking-widest mb-2">
              <Info className="size-4" /> Show Information &amp; Guidelines
            </div>
            <h2 className="font-street text-3xl font-extrabold uppercase text-white mb-6">
              About {event.title}
            </h2>

            <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur-sm text-sm text-white/80 leading-relaxed">
              <FormattedDescription content={event.description} />
            </div>

            {/* Quick Fact Grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <Calendar className="size-4 text-red-500 mb-1" />
                <span className="font-mono text-[10px] text-white/50 uppercase block">Event Date</span>
                <span className="font-bold text-xs text-white mt-0.5 block">{formatEventDate(event.date)}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <Clock className="size-4 text-amber-400 mb-1" />
                <span className="font-mono text-[10px] text-white/50 uppercase block">Start Time</span>
                <span className="font-bold text-xs text-white mt-0.5 block">{event.time || "18:00 IST"}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <MapPin className="size-4 text-sky-400 mb-1" />
                <span className="font-mono text-[10px] text-white/50 uppercase block">Location</span>
                <span className="font-bold text-xs text-white mt-0.5 block truncate">{event.venue}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-4">
                <ShieldCheck className="size-4 text-emerald-400 mb-1" />
                <span className="font-mono text-[10px] text-white/50 uppercase block">Gate Entry</span>
                <span className="font-bold text-xs text-white mt-0.5 block">QR Scan Pass</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ RELATED EVENTS SECTION ═══════════ */}
        {related && related.length > 0 && (
          <section className="relative border-t border-white/10 bg-[#07080a] py-16">
            <div className="container-x max-w-5xl mx-auto">
              <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-red-500 font-bold block mb-1">
                    Discover More Shows
                  </span>
                  <h3 className="font-street text-3xl font-extrabold uppercase text-white">
                    You May Also Like
                  </h3>
                </div>
                <Link
                  href="/events"
                  className="hidden shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/60 hover:text-white sm:inline-flex"
                >
                  All Events <ChevronRight className="size-4" />
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r, i) => (
                  <EventCard key={r._id} ev={r} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
