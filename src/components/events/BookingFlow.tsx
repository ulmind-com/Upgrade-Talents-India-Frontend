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
  ArrowLeft,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, isEventExpired, isDeadlinePassed, FALLBACK_IMAGES } from "@/lib/utils";
import { activitiesApi, bookingsApi, paymentsApi, type EventItem, type TicketTier, ApiError } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { EventCard } from "@/components/home/Sections";

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

export function getSeatingZoneMeta(name: string, price?: number): SeatingZoneMeta {
  const n = (name || "").toLowerCase();
  const isFree = (price !== undefined && Number(price) === 0) || n.includes("free");

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
      rowCodes: ["A", "B", "C", "D"],
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
      rowCodes: ["E", "F", "G", "H"],
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
      rowCodes: ["L", "M"],
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
  if (isFree) {
    return {
      rank: 5,
      badge: "🎁 FREE ENTRY PASS",
      badgeLabel: "Complimentary Pass · Open Admission",
      zoneTitle: "General Free Admission",
      zoneSubtitle: "Full Arena Access · 100% Free Official Entry",
      themeColor: "#34d399",
      badgeBg: "rgba(52, 211, 153, 0.15)",
      borderClass: "border-emerald-400/60 shadow-[0_0_25px_rgba(52,211,153,0.25)]",
      glowClass: "from-emerald-500/20 via-teal-500/10 to-transparent",
      bgGrad: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))",
      badgeIcon: "🎁",
      rowCodes: ["V", "W", "X", "Y"],
      seatsPerRow: 14,
      leftCount: 2,
      centerCount: 10,
      rightCount: 2,
      perks: [
        "100% Free Official Entry Pass",
        "Digital QR Check-in at Gate",
        "Full Show & Stage View Access",
        "Instant Admission Pass",
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

/* ─────────────── DYNAMIC CAPACITY SEAT GENERATOR ─────────────── */
const MASTER_ROW_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", 
  "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "JJ", "KK",
  "LL", "MM", "NN", "PP", "QQ", "RR", "SS", "TT", "UU", "VV"
];

export interface TierGeneratedRow {
  rowCode: string;
  leftSeats: number[];
  centerSeats: number[];
  rightSeats: number[];
}

export function generateDynamicTierRows(
  tier: TicketTier,
  tierIdx: number,
  allTiers: TicketTier[]
): TierGeneratedRow[] {
  const cap = Math.max(1, Number(tier.total_quantity || tier.available || 50));

  // Determine standard layout proportions
  let seatsPerRow = 14;
  let standardLeft = 2;
  let standardCenter = 10;
  let standardRight = 2;

  if (cap <= 24) {
    seatsPerRow = 10;
    standardLeft = 2;
    standardCenter = 6;
    standardRight = 2;
  } else if (cap <= 70) {
    // 50 capacity: 4 rows (14, 14, 14, 8 = 50 seats)
    seatsPerRow = 14;
    standardLeft = 2;
    standardCenter = 10;
    standardRight = 2;
  } else if (cap <= 140) {
    seatsPerRow = 16;
    standardLeft = 3;
    standardCenter = 10;
    standardRight = 3;
  } else {
    // Large capacity (e.g. 300 seats): 15 rows of 20 seats
    seatsPerRow = 20;
    standardLeft = 4;
    standardCenter = 12;
    standardRight = 4;
  }

  // Calculate unique starting row index across previous tiers
  let startRowIdx = 0;
  for (let i = 0; i < tierIdx; i++) {
    const prevCap = Math.max(1, Number(allTiers[i]?.total_quantity || allTiers[i]?.available || 50));
    let prevSeatsPerRow = 14;
    if (prevCap <= 24) prevSeatsPerRow = 10;
    else if (prevCap <= 70) prevSeatsPerRow = 14;
    else if (prevCap <= 140) prevSeatsPerRow = 16;
    else prevSeatsPerRow = 20;
    startRowIdx += Math.ceil(prevCap / prevSeatsPerRow);
  }

  const rowCount = Math.ceil(cap / seatsPerRow);
  const rows: TierGeneratedRow[] = [];

  let seatsAssigned = 0;
  for (let r = 0; r < rowCount; r++) {
    const rowCode = MASTER_ROW_LETTERS[(startRowIdx + r) % MASTER_ROW_LETTERS.length];
    const seatsInThisRow = Math.min(seatsPerRow, cap - seatsAssigned);
    seatsAssigned += seatsInThisRow;

    let leftCount = standardLeft;
    let rightCount = standardRight;
    let centerCount = standardCenter;

    if (seatsInThisRow < seatsPerRow) {
      if (seatsInThisRow <= 4) {
        leftCount = 1;
        rightCount = 1;
        centerCount = Math.max(0, seatsInThisRow - 2);
      } else {
        leftCount = Math.min(standardLeft, Math.max(1, Math.floor(seatsInThisRow / 5)));
        rightCount = leftCount;
        centerCount = seatsInThisRow - (leftCount + rightCount);
      }
    }

    const leftSeats = Array.from({ length: leftCount }, (_, i) => i + 1);
    const centerSeats = Array.from({ length: centerCount }, (_, i) => i + 1 + leftCount);
    const rightSeats = Array.from({ length: rightCount }, (_, i) => i + 1 + leftCount + centerCount);

    rows.push({
      rowCode,
      leftSeats,
      centerSeats,
      rightSeats,
    });
  }

  return rows;
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

export default function BookingFlow({
  event: initialEvent,
  related = [],
}: {
  event: EventItem;
  related?: EventItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTierParam = searchParams.get("tier");
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem>(initialEvent);

  // Initialize tiers immediately from initialEvent.categories so that all tiers (including Free) are present on first render
  const [tiers, setTiers] = useState<TicketTier[]>(() => {
    const configured = Array.isArray(initialEvent.categories) && initialEvent.categories.length > 0 ? initialEvent.categories : [];
    if (configured.length > 0) {
      return configured.map((cat, idx) => ({
        _id: `cat-tier-${idx}-${(cat.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        event_id: initialEvent._id,
        type: cat.name,
        category: cat.name,
        price: Number(cat.price ?? 0),
        total_quantity: Number(cat.capacity || initialEvent.capacity || 50),
        available: Number(cat.capacity || initialEvent.capacity || 50),
        description: cat.description || "",
        display_order: idx,
        is_visible: true,
      }));
    }
    return [];
  });
  const [loadingTiers, setLoadingTiers] = useState(tiers.length === 0);
  const [tiersError, setTiersError] = useState<string | null>(null);

  // Wizard Step: 1 = Seat Selection, 2 = Guest Names & Payment, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Active highlighted tier (when user clicks tier header)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(() => tiers[0]?._id || null);

  // Booked seats from live backend
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [loadingBookedSeats, setLoadingBookedSeats] = useState(true);

  // Interactive Selected Seats array (BookMyShow style)
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeatInfo[]>([]);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Pre-calculate deterministic, dynamic seating rows for each tier matching its exact capacity
  const tierSeatRowsMap = useMemo(() => {
    const map = new Map<string, TierGeneratedRow[]>();
    tiers.forEach((t, idx) => {
      map.set(t._id, generateDynamicTierRows(t, idx, tiers));
    });
    return map;
  }, [tiers]);

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

  // Fetch ticket tiers and align strictly with event.categories as the primary authority
  useEffect(() => {
    let cancelled = false;

    const fetchTiers = () => {
      activitiesApi
        .tickets(event._id, { limit: 100 })
        .then((res) => {
          if (cancelled) return;
          const list = Array.isArray(res) ? res : [];
          const configuredCats = Array.isArray(event.categories) && event.categories.length > 0 ? event.categories : [];
          let visible: TicketTier[] = [];

          if (configuredCats.length > 0) {
            visible = configuredCats.map((cat, idx) => {
              const catNameClean = (cat.name || "").trim().toLowerCase();
              const matched = list.find((t) => {
                const tName = (t.category || t.type || "").trim().toLowerCase();
                return tName === catNameClean;
              }) || list[idx];

              const catCap = Number(cat.capacity != null ? cat.capacity : (event.capacity || 50));
              const catPrice = Number(cat.price != null ? cat.price : 0);
              const sold = matched ? Math.max(0, Number(matched.total_quantity || catCap) - Number(matched.available || catCap)) : 0;
              const avail = Math.max(0, catCap - sold);

              return {
                _id: matched?._id || `cat-tier-${idx}-${(cat.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                event_id: event._id,
                type: cat.name,
                category: cat.name,
                price: catPrice,
                total_quantity: catCap,
                available: avail,
                description: cat.description || matched?.description || "",
                display_order: idx,
                is_visible: true,
              };
            });
          } else if (list.length > 0) {
            visible = list.filter((t) => t.is_visible !== false);
            visible.sort((a, b) => {
              const metaA = getSeatingZoneMeta(a.category || a.type, a.price);
              const metaB = getSeatingZoneMeta(b.category || b.type, b.price);
              return metaA.rank - metaB.rank || b.price - a.price;
            });
          } else {
            visible = [{
              _id: `default-${event._id}`,
              event_id: event._id,
              type: event.category || "General Admission",
              category: event.category || "General Admission",
              price: Number(event.price || 0),
              total_quantity: Number(event.capacity || 100),
              available: Math.max(0, Number(event.capacity || 100) - Number(event.registered_count || 0)),
              description: "Standard Entry Admission",
              display_order: 0,
              is_visible: true,
            }];
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

          setSelectedTierId((prev) => {
            if (prev && visible.some((t) => t._id === prev)) return prev;
            const firstOpen = visible.find((t) => (t.available ?? 0) > 0);
            return firstOpen?._id || visible[0]?._id || null;
          });
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
  }, [event._id, event.ticket_enabled, event.categories, preselectedTierParam, event.capacity, event.price, event.registered_count, event.category]);

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
      setError(`This event concluded on ${formatEventDate(event.date)}. Ticket booking is closed.`);
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
      if (!keyId) throw new ApiError("Payment gateway is not configured yet. Please contact support.", 0);

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
      {/* ═══════════ CINEMATIC HERO BACKDROP & HEADING (From Admin Panel) ═══════════ */}
      <div className="relative w-full h-[280px] sm:h-[340px] md:h-[380px] overflow-hidden select-none border-b border-white/10">
        <img
          src={backdropUrl}
          alt={event.title}
          className="size-full object-cover object-center filter brightness-[0.6] contrast-110"
        />
        {/* Subtle Dark Vignette & Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080a]/80 via-transparent to-[#07080a]/80" />

        {/* Mortal Engines Style Hero Heading */}
        <div className="container-x absolute inset-0 flex flex-col justify-end pb-8 sm:pb-12 pl-4 sm:pl-8 lg:pl-[340px]">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-red-500 font-bold mb-2 flex items-center gap-2">
            <Sparkles className="size-3.5 animate-pulse" /> Official Arena Booking
          </span>
          <h1 className="font-street text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold uppercase leading-[0.85] tracking-tight text-white drop-shadow-2xl">
            {event.title}
          </h1>
        </div>
      </div>

      {/* ═══════════ WIZARD PROGRESS BAR (Exact match to reference) ═══════════ */}
      <div className="border-b border-white/10 bg-[#07080a]/90 backdrop-blur-md sticky top-16 z-20">
        <div className="container-x flex items-center justify-center gap-6 sm:gap-14 py-3 text-xs font-mono uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setStep(1)}
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
            <span>PAYMENT</span>
          </button>
          <div
            className={cn(
              "flex items-center gap-2 pb-1 transition-all",
              step === 3 ? "text-red-500 font-bold border-b-2 border-red-500" : "text-white/40"
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px]">3</span>
            <span>TICKET</span>
          </div>
        </div>
      </div>

      {/* Global Status Error */}
      {error && (
        <div className="container-x mt-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-xs font-mono text-red-300">
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ═══════════ MAIN CONTENT BODY ═══════════ */}
      <div className="container-x py-8 sm:py-12">
        
        {/* ── STEP 1: 3-COLUMN BOOKMYSHOW CINEMA ARENA ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_210px] xl:grid-cols-[300px_1fr_220px] gap-8 items-start">
            
            {/* ── LEFT COLUMN: Floating Poster Card & Selected Seats Cart ── */}
            <div className="flex flex-col">
              {/* Floating Vertical Poster Card (Pulls up slightly into the hero header) */}
              <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-neutral-900 shadow-2xl aspect-[2/3] w-full max-w-[280px] mx-auto lg:-mt-24 z-10 group">
                <img
                  src={posterUrl}
                  alt={event.title}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                    Official Admission
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
                      onClick={clearAllSeats}
                      className="text-[11px] font-mono text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedSeats.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40 font-mono">
                    <Armchair className="size-8 mx-auto text-white/20 mb-2 animate-bounce" />
                    Click available seats in Platinum, Gold, or Bronze to select
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedSeats.map((seat) => (
                      <div
                        key={seat.seatId}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{seat.rowCode} row</span>
                          <span className="text-white/60">{seat.seatNum}th seat</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-400">
                            {seat.price === 0 ? "Free" : formatINR(seat.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSeat(seat.seatId)}
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
                  <span className="font-street text-2xl text-red-500 font-bold">
                    {totalAmount === 0 ? "Free" : formatINR(totalAmount)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={clearAllSeats}
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

            {/* ── CENTER COLUMN: Stage & Category-wise Seating Grid ── */}
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

              {/* Seating Categories: Platinum, Gold, Bronze (Maintained exactly as requested) */}
              <div className="w-full flex flex-col gap-6">
                {tiers.map((t) => {
                  const meta = getSeatingZoneMeta(t.category || t.type);
                  const isSelectedTier = selectedTierId === t._id;
                  const isSoldOut = (t.available ?? 0) <= 0;
                  const tierSelectedSeats = selectedSeats.filter((s) => s.tierId === t._id || s.tierName === (t.category || t.type));

                  return (
                    <div
                      key={t._id}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300",
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
                            className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl shadow-md"
                            style={{ background: meta.badgeBg, border: `1px solid ${meta.themeColor}40` }}
                          >
                            {meta.badgeIcon}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">
                                {t.category || t.type || meta.zoneTitle}
                              </h3>
                              <span
                                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: meta.badgeBg, color: meta.themeColor }}
                              >
                                {meta.badge}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-white/60 font-mono">
                              {t.description || meta.zoneSubtitle}
                            </p>
                          </div>
                        </div>

                        {/* Price & Seats Left */}
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="font-street text-xl sm:text-2xl font-bold" style={{ color: t.price === 0 ? "#34d399" : meta.themeColor }}>
                              {t.price === 0 ? "Free" : formatINR(t.price)}
                            </span>
                            <span className="block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                              {isSoldOut ? "Sold Out" : `${t.available} seats left`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => !isSoldOut && setSelectedTierId(t._id)}
                            className={cn(
                              "rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all",
                              isSelectedTier
                                ? "bg-white text-black shadow-lg"
                                : "border border-white/20 text-white/80 hover:bg-white/10"
                            )}
                          >
                            {isSelectedTier ? "Active" : "Select"}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Seat Rows for this Category */}
                      {(() => {
                        const tierRows = tierSeatRowsMap.get(t._id) || generateDynamicTierRows(t, 0, [t]);
                        return (
                          <div className="mt-4 pt-3 border-t border-white/10">
                            <div
                              className={cn(
                                "flex flex-col gap-2 overflow-x-auto pb-1",
                                tierRows.length > 4 && "max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar"
                              )}
                            >
                              {tierRows.map((row) => (
                                <div key={row.rowCode} className="flex items-center justify-between gap-3 text-xs font-mono min-w-[460px]">
                                  <span className="w-5 text-center font-bold text-white/70">{row.rowCode}</span>

                                  <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
                                    {/* Left Wing */}
                                    <div className="flex items-center gap-1.5">
                                      {row.leftSeats.map((seatNum) => {
                                        const seatId = `${row.rowCode}-${String(seatNum).padStart(2, "0")}`;
                                        const isBooked = bookedSeatSet.has(seatId);
                                        const isSelected = selectedSeatMap.has(seatId);

                                        return (
                                          <button
                                            key={seatId}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={() => handleToggleSeat(seatId, row.rowCode, seatNum, t)}
                                            title={`Row ${row.rowCode} · Seat ${seatNum} (${t.category || t.type}: ${t.price === 0 ? "Free" : formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
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
                                      {row.centerSeats.map((seatNum) => {
                                        const seatId = `${row.rowCode}-${String(seatNum).padStart(2, "0")}`;
                                        const isBooked = bookedSeatSet.has(seatId);
                                        const isSelected = selectedSeatMap.has(seatId);

                                        return (
                                          <button
                                            key={seatId}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={() => handleToggleSeat(seatId, row.rowCode, seatNum, t)}
                                            title={`Row ${row.rowCode} · Seat ${seatNum} (${t.category || t.type}: ${t.price === 0 ? "Free" : formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
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
                                      {row.rightSeats.map((seatNum) => {
                                        const seatId = `${row.rowCode}-${String(seatNum).padStart(2, "0")}`;
                                        const isBooked = bookedSeatSet.has(seatId);
                                        const isSelected = selectedSeatMap.has(seatId);

                                        return (
                                          <button
                                            key={seatId}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={() => handleToggleSeat(seatId, row.rowCode, seatNum, t)}
                                            title={`Row ${row.rowCode} · Seat ${seatNum} (${t.category || t.type}: ${t.price === 0 ? "Free" : formatINR(t.price)})${isBooked ? " - ALREADY BOOKED" : ""}`}
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

                                  <span className="w-5 text-center font-bold text-white/70">{row.rowCode}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tier Perks Bar */}
                      <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-white/60">
                        {meta.perks.slice(0, 3).map((perk) => (
                          <span key={perk} className="inline-flex items-center gap-1">
                            <Check className="size-3 text-emerald-400" />
                            <span>{perk}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* ── RIGHT COLUMN: Date, Time, Type & Seat Legend (Exact match to reference) ── */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
                
                {/* Date Box */}
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Date:</span>
                <div className="mt-1.5 rounded-xl border border-white/20 bg-neutral-900/90 p-3.5 text-center shadow-inner">
                  <span className="font-street text-3xl sm:text-4xl font-extrabold text-white block leading-none">{eventDay}</span>
                  <span className="font-mono text-xs font-bold text-red-500 uppercase tracking-widest mt-1 block">{eventMonth}</span>
                </div>

                {/* Time */}
                <div className="mt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Time:</span>
                  <span className="font-bold text-sm text-white mt-0.5 block">{event.time || "18:00 IST"}</span>
                </div>

                {/* Type / Category */}
                <div className="mt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block">Type:</span>
                  <span className="font-bold text-xs text-red-400 uppercase tracking-wider mt-0.5 block">
                    {event.category || "LIVE ARENA PASS"}
                  </span>
                </div>

                {/* Seating Legend (Exact Match to Reference Image) */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2.5 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-[#1c1f26] border border-white/30" />
                    <span className="text-white/60">Available</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-red-600 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                    <span className="text-red-400 font-bold">Selected</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-t-sm rounded-b-xs bg-neutral-800/40 border border-neutral-800 opacity-40" />
                    <span className="text-white/30">Reserved / Taken</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── STEP 2: GUEST DETAILS & PAYMENT METHOD ── */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto pb-16">
            <div className="rounded-3xl border border-white/15 bg-neutral-900/90 p-6 sm:p-9 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-white/60 hover:text-white mb-2"
                  >
                    <ArrowLeft className="size-3.5" /> Back to Seat Map
                  </button>
                  <h2 className="font-street text-2xl sm:text-3xl font-bold uppercase text-white">
                    Guest Details &amp; Payment
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-white/50 block">Amount Payable:</span>
                  <span className="font-street text-2xl font-bold text-red-500">
                    {totalAmount === 0 ? "Free Entry" : formatINR(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Selected Seats Review */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                <span className="font-mono text-xs uppercase tracking-wider text-white/60 block mb-2">
                  Reserved Seats ({selectedSeats.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat.seatId}
                      className="rounded-lg bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white"
                    >
                      {seat.seatId} ({seat.tierName} · {seat.price === 0 ? "Free" : formatINR(seat.price)})
                    </span>
                  ))}
                </div>
              </div>

              {/* Attendee Names Input */}
              <div className="mt-6">
                <label className="font-mono text-xs uppercase tracking-wider text-white/70 block mb-2">
                  Attendee Full Names:
                </label>
                <div className="space-y-2.5">
                  {selectedSeats.map((seat, i) => (
                    <div key={seat.seatId} className="flex items-center gap-3">
                      <span className="w-16 rounded-xl bg-white/10 px-2 py-2 font-mono text-xs font-bold text-center text-red-400">
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
                        placeholder={i === 0 ? user?.name || "Primary Attendee Name" : `Guest ${i + 1} Name`}
                        className="h-11 flex-1 rounded-xl border border-white/15 bg-black/50 px-4 font-mono text-xs text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="mt-8 pt-6 border-t border-white/10">
                {totalAmount === 0 ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
                    <span className="text-2xl mb-1 block">🎁</span>
                    <span className="font-mono text-sm font-bold text-emerald-400 block uppercase tracking-wide">
                      Free Entry Admission Pass
                    </span>
                    <p className="font-mono text-xs text-white/70 mt-1 max-w-md mx-auto">
                      No payment required for this reservation. Click below to issue your verified cryptographic QR Admission Passes instantly.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="font-mono text-xs uppercase tracking-wider text-white/70 block mb-3">
                      Select Payment Method:
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("ONLINE")}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer",
                          paymentMethod === "ONLINE"
                            ? "border-red-500 bg-red-500/10 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            : "border-white/10 bg-black/40 text-white/60 hover:border-white/30"
                        )}
                      >
                        <CreditCard className="size-6 mb-1.5 text-red-500" />
                        <span className="font-mono text-xs font-bold uppercase">Online Payment</span>
                        <span className="font-mono text-[10px] text-white/50 mt-0.5">UPI, Cards, NetBanking</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer",
                          paymentMethod === "CASH"
                            ? "border-amber-400 bg-amber-400/10 text-white shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                            : "border-white/10 bg-black/40 text-white/60 hover:border-white/30"
                        )}
                      >
                        <Banknote className="size-6 mb-1.5 text-amber-400" />
                        <span className="font-mono text-xs font-bold uppercase">Cash Spot Pass</span>
                        <span className="font-mono text-[10px] text-white/50 mt-0.5">Pay in Cash at Venue Gate</span>
                      </button>
                    </div>
                  </>
                )}

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handleExecuteBooking}
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Securing Your Passes...</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="size-4" />
                        <span>
                          {totalAmount === 0
                            ? "Confirm Free Registration & Issue Passes"
                            : paymentMethod === "ONLINE"
                            ? `Confirm & Pay ${formatINR(totalAmount)}`
                            : "Confirm Cash Spot Pass"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: BOOKING CONFIRMATION & TICKET ── */}
        {step === 3 && confirmedBooking && (
          <div className="max-w-2xl mx-auto pb-16">
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
                Booking Reference: <span className="font-bold text-white text-sm">#{confirmedBooking.booking_reference}</span>
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4 text-xs font-mono text-left">
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-white/50">Event</span>
                  <span className="text-white font-bold">{event.title}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                  <span className="text-white/50">Assigned Seats</span>
                  <span className="text-red-400 font-bold">{selectedSeats.map((s) => s.seatId).join(", ")}</span>
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

        {/* ═══════════ SHOW INFORMATION & DETAILS (Below Arena) ═══════════ */}
        <section className="mt-16 border-t border-white/10 pt-12">
          <div className="max-w-4xl mx-auto">
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
          <section className="mt-16 border-t border-white/10 pt-12">
            <div className="max-w-5xl mx-auto">
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
