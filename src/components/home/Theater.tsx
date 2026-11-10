"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ChevronDown, ChevronLeft, ChevronRight, Instagram, Mic2, Ticket,
  CalendarDays, Users, Clock, Hourglass, Trophy, ShoppingBag, GraduationCap,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import type { BannerItem, EventItem, FeaturedTileItem, LiveEventItem, SpotlightSectionConfig } from "@/lib/api";
import {
  SiFacebook,
  SiInstagram,
  SiX,
  SiYoutube,
  SiLinkedin,
} from "@/components/common/SocialIcons";
import { formatEventDate, imageFor, istParts, isUsableImageUrl, parseIst, truncate } from "@/lib/utils";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";
import { SectionLabel } from "@/components/ui/Primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ═══════════ SCROLL CUE ═══════════ */

export function ScrollCue() {
  return (
    <div className="theater-bg relative z-20 flex h-0 items-center justify-center">
      <a
        href="#stage"
        aria-label="Skip to the main sections"
        className="cue-bob grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:scale-110"
        style={{ background: "var(--theater-pink)" }}
      >
        <ChevronDown className="size-5" aria-hidden />
      </a>
    </div>
  );
}

/* ═══════════ QUAD TILES (4 FEATURED CATEGORIES) ═══════════ */

const DEFAULT_TILES = [
  {
    title: "Competition",
    subtitle: "National Championship",
    action_text: "Learn more",
    href: "/competitions",
    image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1200&auto=format&fit=crop",
    icon_name: "Trophy",
    seed: 0,
  },
  {
    title: "Event",
    subtitle: "Live Stage Shows",
    action_text: "Learn more",
    href: "/events",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop",
    icon_name: "CalendarDays",
    seed: 1,
  },
  {
    title: "Shop",
    subtitle: "Official Streetwear & Merch",
    action_text: "Learn more",
    href: "/shop",
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
    icon_name: "ShoppingBag",
    seed: 2,
  },
  {
    title: "Course",
    subtitle: "Masterclasses & Workshops",
    action_text: "Learn more",
    href: "/courses",
    image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop",
    icon_name: "GraduationCap",
    seed: 3,
  },
];

function getTileIcon(name?: string, index = 0) {
  const n = (name || "").toLowerCase();
  if (n.includes("trophy") || n.includes("comp") || index === 0) return Trophy;
  if (n.includes("calendar") || n.includes("event") || index === 1) return CalendarDays;
  if (n.includes("shop") || n.includes("bag") || index === 2) return ShoppingBag;
  if (n.includes("course") || n.includes("grad") || n.includes("learn") || index === 3) return GraduationCap;
  return Trophy;
}

export function QuadTiles({
  events = [],
  tiles = [],
}: {
  events?: EventItem[];
  tiles?: FeaturedTileItem[];
}) {
  const reduce = useReducedMotion();

  const items = (tiles && tiles.length >= 4)
    ? tiles.slice(0, 4).map((t, i) => ({
        title: t.title || DEFAULT_TILES[i].title,
        subtitle: t.subtitle || DEFAULT_TILES[i].subtitle,
        action_text: t.action_text || "Learn more",
        href: t.target_url || DEFAULT_TILES[i].href,
        image_url: t.image_url || DEFAULT_TILES[i].image_url,
        icon_name: t.icon_name || DEFAULT_TILES[i].icon_name,
        seed: i,
      }))
    : DEFAULT_TILES;

  return (
    <section id="stage" className="theater-bg relative grid grid-cols-2 lg:grid-cols-4">
      {items.map((t, i) => {
        const IconComponent = getTileIcon(t.icon_name, i);
        return (
          <Link
            key={`${t.title}-${i}`}
            href={t.href}
            className="group relative isolate flex h-[230px] flex-col items-center justify-center gap-3 overflow-hidden md:h-[290px]"
          >
            {/* Background layer only — parallax never touches the copy */}
            <TileBackdrop src={t.image_url || events[i]?.image_url} seed={t.seed} reduce={!!reduce} />

            <span aria-hidden className="stage-veil absolute inset-0 -z-10 transition-opacity duration-500 group-hover:opacity-75" />
            <span
              aria-hidden
              className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: "linear-gradient(180deg, transparent, color-mix(in srgb, var(--theater-pink) 38%, transparent))" }}
            />

            <IconComponent
              className="size-9 text-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:scale-110"
              strokeWidth={1.25}
              aria-hidden
            />

            <h3 className="font-serif-display text-[clamp(1.5rem,3.2vw,2.3rem)] font-normal leading-none text-white text-center px-2">
              {t.title}
            </h3>

            <span aria-hidden className="h-px w-10 bg-white/55 transition-all duration-500 group-hover:w-20 group-hover:bg-white" />

            <span className="font-hero text-[10.5px] font-medium uppercase tracking-[0.26em] text-white/75 transition-colors duration-300 group-hover:text-white">
              {t.action_text || "Learn more"}
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function TileBackdrop({ src, seed, reduce }: { src?: string | null; seed: number; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <span ref={ref} aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
      <motion.img
        src={imageFor(src, seed)}
        alt=""
        loading="lazy"
        style={reduce ? undefined : { y, willChange: "transform" }}
        className="absolute inset-0 size-full scale-[1.16] object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.26]"
      />
    </span>
  );
}

/* ═══════════ FEATURED SHOW (LIVE & UPCOMING COMPETITIONS / EVENTS) ═══════════ */

export interface FeaturedStageItem {
  id: string;
  type: "competition" | "event" | "live_stream";
  typeLabel: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  venue: string;
  dateStr: string;
  startTime: string;
  duration: string;
  href: string;
  ctaText: string;
  isLive: boolean;
  eyebrow: string;
  statusBadge: string;
  priority: number;
}

function formatShowTime(timeStr?: string | null, dateStr?: string | null, fallback = "7:00 PM"): string {
  if (timeStr && typeof timeStr === "string") {
    const trimmed = timeStr.trim();
    // 12-hour format match like "07:30 PM", "10:00 AM", "7:30pm"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])?$/i);
    if (match12) {
      let hr = parseInt(match12[1], 10);
      const min = match12[2];
      const meridiem = match12[3]?.toUpperCase();
      if (meridiem) {
        return `${hr}:${min} ${meridiem}`;
      } else {
        const period = hr >= 12 ? "PM" : "AM";
        if (hr > 12) hr -= 12;
        if (hr === 0) hr = 12;
        return `${hr}:${min} ${period}`;
      }
    }
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      let [h, m] = trimmed.split(":").map(Number);
      const period = h >= 12 ? "PM" : h >= 8 ? "AM" : "PM";
      if (h > 12) h -= 12;
      return `${h}:${m < 10 ? "0" : ""}${m} ${period}`;
    }
  }

  // Extract from ISO string (e.g. "2026-11-01T10:00:00Z")
  if (dateStr && typeof dateStr === "string" && dateStr.includes("T")) {
    try {
      // Parsed AND read as Indian time — the API sends these without a
      // timezone, and the server runs in UTC while the browser does not.
      const d = parseIst(dateStr);
      if (!isNaN(d.getTime())) {
        const { h: hours, mi: minutes } = istParts(d);
        // If hours and minutes are both 0, it's typically untimed midnight fallback
        if (hours !== 0 || minutes !== 0) {
          const period = hours >= 12 ? "PM" : "AM";
          const displayH = hours % 12 || 12;
          const displayM = minutes < 10 ? `0${minutes}` : minutes;
          return `${displayH}:${displayM} ${period}`;
        }
      }
    } catch {
      // fallback
    }
  }

  return fallback;
}

function formatShowDuration(item: {
  duration?: string | number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isCompetition?: boolean;
}): string {
  if (item.duration) {
    const s = String(item.duration).trim();
    if (s && s !== "0") {
      if (/^\d+$/.test(s)) {
        const mins = parseInt(s, 10);
        if (mins >= 60) {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return m > 0 ? `${h}h ${m}m` : `${h}:00 hrs`;
        }
        return `${mins} mins`;
      }
      return s;
    }
  }

  if (item.startDate && item.endDate) {
    const d1 = item.startDate instanceof Date ? item.startDate : parseIst(item.startDate);
    const d2 = item.endDate instanceof Date ? item.endDate : parseIst(item.endDate);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffMs = d2.getTime() - d1.getTime();
      if (diffMs > 0) {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 1) {
          return `${diffDays + 1} Days`;
        }
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffHrs > 0) {
          return diffMins > 0 ? `${diffHrs}h ${diffMins}m` : `${diffHrs}:00 hrs`;
        }
        if (diffMins > 0) return `${diffMins} mins`;
      }
    }
  }

  if (item.isCompetition) {
    return "Full Day";
  }

  return "2:30 hrs";
}

export function FeaturedShow({
  events = [],
  competitions = [],
  liveEvents = [],
}: {
  events?: EventItem[];
  competitions?: any[];
  liveEvents?: LiveEventItem[];
}) {
  const items: FeaturedStageItem[] = [];

  // 1. Live stream broadcasts
  for (const l of liveEvents || []) {
    if (!l || (!l._id && !(l as any).id)) continue;
    const id = l._id || (l as any).id;
    items.push({
      id: `live-ev-${id}`,
      type: "live_stream",
      typeLabel: "Live Stream",
      title: l.title || "Live Stage Broadcast",
      description: l.description || "Tune in live to watch stage performances in real-time.",
      imageUrl: l.image_url,
      venue: "Online Stage Broadcast",
      dateStr: l.start_time ? formatEventDate(l.start_time) : "Streaming Today",
      startTime: formatShowTime(l.start_time, l.start_time, "8:00 PM"),
      duration: formatShowDuration({ startDate: l.start_time, endDate: l.end_time }),
      href: l.public_url || `/events/${id}`,
      ctaText: "Watch Live Stream",
      isLive: true,
      eyebrow: "Live Broadcast",
      statusBadge: "Live Now",
      priority: 1,
    });
  }

  // 2. Competitions (Live ones get priority 1, Registration Open gets 2, upcoming gets 3)
  for (const c of competitions || []) {
    if (!c || (!c._id && !c.id)) continue;
    if (c.is_published === false || c.is_deleted === true) continue;
    const id = c._id || c.id;
    const lifecycle = getCompetitionLifecycle(c);
    const isLive = lifecycle.isLive || String(c.status || "").toUpperCase() === "LIVE";
    const isRegOpen = lifecycle.isRegistrationOpen;

    const startTime = formatShowTime(c.start_time || c.time, c.start_date, "10:00 AM");
    const duration = formatShowDuration({
      duration: c.duration,
      startDate: c.start_date,
      endDate: c.end_date,
      isCompetition: true,
    });

    const dateStr = c.start_date ? formatEventDate(c.start_date) : "TBA";
    const venue = c.venue || c.location || c.city || (c.category ? `${c.category} Stage` : "National Arena");
    const imageUrl = c.banner_image_url || c.banner_url || c.card_image_url || c.image_url;

    let eyebrow = "Upcoming Competition";
    let statusBadge = "Upcoming";
    let priority = 3;

    if (isLive) {
      eyebrow = "Live Competition";
      statusBadge = "Live Now";
      priority = 1;
    } else if (isRegOpen) {
      eyebrow = "Registration Open";
      statusBadge = "Open for Entry";
      priority = 2;
    }

    const ctaText = isLive
      ? "Enter Live Contest"
      : isRegOpen
      ? "Register for Contest"
      : "View Competition";

    items.push({
      id: `comp-${id}`,
      type: "competition",
      typeLabel: c.category ? `${c.category} Contest` : "Competition",
      title: c.title || c.name || "Talent Competition",
      description: c.description || "",
      imageUrl,
      venue,
      dateStr,
      startTime,
      duration,
      href: `/competitions/${id}`,
      ctaText,
      isLive,
      eyebrow,
      statusBadge,
      priority,
    });
  }

  // 3. Events (Live ones get priority 1, upcoming gets 3)
  for (const e of events || []) {
    if (!e || !e._id) continue;
    if (e.event_status === "completed" || e.event_status === "cancelled") continue;
    const isLive = e.event_status === "live";
    const startTime = formatShowTime(e.time, e.date, "7:00 PM");
    const duration = formatShowDuration({
      duration: (e as any).duration,
      startDate: e.date,
    });
    const dateStr = formatEventDate(e.date);
    const venue = e.venue || "Grand Auditorium";

    items.push({
      id: `ev-${e._id}`,
      type: "event",
      typeLabel: "Live Stage Show",
      title: e.title,
      description: e.description,
      imageUrl: e.image_url,
      venue,
      dateStr,
      startTime,
      duration,
      href: `/events/${e._id}/book`,
      ctaText: isLive ? "Join Live Event" : "Buy tickets now",
      isLive,
      eyebrow: isLive ? "Now Playing" : "Coming Soon",
      statusBadge: isLive ? "Live Now" : "Stage Show",
      priority: isLive ? 1 : 3,
    });
  }

  // Sort by priority (Live items first, then registration open, then upcoming)
  items.sort((a, b) => a.priority - b.priority);

  const shows = items.slice(0, 8);
  if (!shows.length) return null;

  return <FeaturedShowStage shows={shows} />;
}

function FeaturedShowStage({ shows }: { shows: FeaturedStageItem[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const show = shows[i] ?? shows[0];

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const go = (d: number) => setI((p) => (p + d + shows.length) % shows.length);

  useEffect(() => { setI(0); }, [shows.length]);

  // Auto-advance every 7.5 seconds when not hovered and multiple shows exist
  useEffect(() => {
    if (shows.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setI((p) => (p + 1) % shows.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [shows.length, isPaused]);

  return (
    <section
      ref={ref}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="theater-bg relative isolate min-h-[70vh] overflow-hidden md:min-h-[88vh]"
    >
      {/* Backdrop layer — parallax applies here only */}
      <motion.div style={reduce ? undefined : { y: bgY, willChange: "transform" }} className="absolute inset-0 -z-20 scale-[1.12]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={show.id}
            src={imageFor(show.imageUrl, i + 2)}
            alt=""
            aria-hidden
            initial={reduce ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="absolute inset-0 size-full object-cover"
          />
        </AnimatePresence>
      </motion.div>

      <span aria-hidden className="stage-veil absolute inset-0 -z-10" />

      <div className="container-x relative z-10 flex min-h-[70vh] items-center pb-28 pt-20 md:min-h-[88vh] md:py-20">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Title & Live Badge */}
          <div>
            <motion.div
              key={`k-${show.id}`}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {show.isLive ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-3.5 py-1 backdrop-blur-md">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
                  </span>
                  <span className="font-hero text-[11px] font-bold uppercase tracking-[0.25em] text-rose-300">
                    Live Now • {show.typeLabel}
                  </span>
                </span>
              ) : (
                <span className="font-hero text-[11px] font-medium uppercase tracking-[0.34em] text-white/80">
                  {show.eyebrow}
                </span>
              )}
            </motion.div>

            <motion.h2
              key={`t-${show.id}`}
              initial={reduce ? false : { opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: EASE }}
              className="font-serif-display mt-3 text-[clamp(2.6rem,8vw,6rem)] font-normal leading-[0.96] text-white [overflow-wrap:anywhere]"
            >
              {show.title}
            </motion.h2>
          </div>

          {/* Info card */}
          <motion.div
            key={`c-${show.id}`}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
            className="w-full max-w-md justify-self-end border border-white/12 bg-[rgba(11,6,23,0.85)] p-7 backdrop-blur-xl md:p-9 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-hero text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                {show.typeLabel}
              </span>
              {show.isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Live Now
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">
                  {show.statusBadge}
                </span>
              )}
            </div>

            <h3 className="font-serif-display mt-3 text-[clamp(1.5rem,3vw,2rem)] font-normal leading-tight text-white">
              {show.title}
            </h3>
            {show.description && (
              <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                {truncate(show.description, 95)}
              </p>
            )}

            <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-dashed border-white/15 py-7">
              <div>
                <dd className="font-serif-display text-[clamp(1.6rem,3.5vw,2.3rem)] font-normal leading-none tabular-nums text-white">
                  {show.startTime}
                </dd>
                <dt className="mt-2 inline-flex items-center gap-1.5 font-hero text-[10px] uppercase tracking-[0.22em] text-white/60">
                  <Clock className="size-3 shrink-0" aria-hidden /> Start time
                </dt>
              </div>
              <div>
                <dd className="font-serif-display text-[clamp(1.6rem,3.5vw,2.3rem)] font-normal leading-none tabular-nums text-white">
                  {show.duration}
                </dd>
                <dt className="mt-2 inline-flex items-center gap-1.5 font-hero text-[10px] uppercase tracking-[0.22em] text-white/60">
                  <Hourglass className="size-3 shrink-0" aria-hidden /> Duration
                </dt>
              </div>
            </dl>

            <p className="mt-6 flex items-center gap-2 font-hero text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
              <CalendarDays className="size-3.5 shrink-0 text-white/60" aria-hidden />
              <span>{show.venue ? `${show.venue} · ` : ""}{show.dateStr}</span>
            </p>

            <Link
              href={show.href}
              className="mt-7 inline-flex min-h-[52px] w-full items-center justify-center font-hero text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: show.isLive
                  ? "linear-gradient(135deg, #e11d48, #be123c)"
                  : "var(--theater-pink)",
              }}
            >
              {show.ctaText}
            </Link>

            {shows.length > 1 && (
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {shows.map((s, idx) => (
                  <button
                    key={`dot-${s.id}-${idx}`}
                    onClick={() => setI(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === i ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Controls — edge arrows on desktop, a centred pair below the card on
          phones so they never sit on top of the show details. */}
      {shows.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center gap-3 md:hidden">
            {[
              { d: -1, Icon: ChevronLeft, label: "Previous show" },
              { d: 1, Icon: ChevronRight, label: "Next show" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => go(a.d)}
                aria-label={a.label}
                className="grid size-11 cursor-pointer place-items-center rounded-full text-white transition-transform duration-300 active:scale-95"
                style={{ background: "var(--theater-pink)" }}
              >
                <a.Icon className="size-5" aria-hidden />
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            {[
              { d: -1, Icon: ChevronLeft, side: "left-6", label: "Previous show" },
              { d: 1, Icon: ChevronRight, side: "right-6", label: "Next show" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => go(a.d)}
                aria-label={a.label}
                className={`absolute top-1/2 z-20 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-white transition-transform duration-300 hover:scale-110 ${a.side}`}
                style={{ background: "var(--theater-pink)" }}
              >
                <a.Icon className="size-5" aria-hidden />
              </button>
            ))}
          </div>
        </>
      )}

    </section>
  );
}

/* ═══════════ PHOTO STRIP / STAGE MOMENTS SHOWCASE ═══════════ */

const CURATED_STAGE_MOMENTS = [
  {
    id: "stage-1",
    title: "Nrityashastra Arena",
    category: "Classical & Semi-Classical",
    tag: "Season 2026",
    src: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
  {
    id: "stage-2",
    title: "Street Dance Showdown",
    category: "Hip-Hop & Krump",
    tag: "Live Battle",
    src: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
  {
    id: "stage-3",
    title: "Spotlight Solo Battle",
    category: "Freestyle All-Styles",
    tag: "Arena Spotlight",
    src: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
  {
    id: "stage-4",
    title: "Grand Championship Stage",
    category: "Live Trophy Round",
    tag: "Finals",
    src: "https://images.unsplash.com/photo-1545959570-a94084071b5d?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
  {
    id: "stage-5",
    title: "Choreography Masterclass",
    category: "Artist Workshop",
    tag: "Live Training",
    src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85",
    href: "/events",
  },
  {
    id: "stage-6",
    title: "Electrifying Stage Arena",
    category: "National Tour 2026",
    tag: "Main Stage",
    src: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=85",
    href: "/events",
  },
  {
    id: "stage-7",
    title: "Rhythm & Sync Showcase",
    category: "Crew Showdown",
    tag: "Group Dance",
    src: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
  {
    id: "stage-8",
    title: "Live Audience Spectacle",
    category: "Live Energy",
    tag: "Electric Crowd",
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
    href: "/competitions",
  },
];

function getSpotlightIcon(platform?: string, url?: string) {
  const p = (platform || "").toLowerCase();
  const u = (url || "").toLowerCase();
  if (p === "youtube" || u.includes("youtube.com") || u.includes("youtu.be")) return SiYoutube;
  if (p === "facebook" || u.includes("facebook.com") || u.includes("fb.watch")) return SiFacebook;
  if (p === "x" || p === "twitter" || u.includes("twitter.com") || u.includes("x.com")) return SiX;
  if (p === "linkedin" || u.includes("linkedin.com")) return SiLinkedin;
  return SiInstagram;
}

export function PhotoStrip({
  events = [],
  banners = [],
  handle = "upgradetalents",
  spotlightSection,
}: {
  events?: EventItem[];
  banners?: BannerItem[];
  handle?: string;
  spotlightSection?: SpotlightSectionConfig;
}) {
  const sectionLabel = spotlightSection?.label || "Live Stage Moments";
  const sectionTitle = spotlightSection?.title || "Moments in the Spotlight";
  const sectionSubtitle =
    spotlightSection?.subtitle ||
    "Raw passion, electrifying rhythm, and pure stage energy from our dancers and performers across India.";
  const effectiveHandle = spotlightSection?.handle || handle || "upgradetalents";
  const followText = spotlightSection?.follow_text || `Follow @${effectiveHandle} on Instagram`;
  const followUrl = spotlightSection?.follow_url || `https://instagram.com/${effectiveHandle}`;
  const FollowIcon = getSpotlightIcon("", followUrl);

  // Check if configured spotlight items exist
  const configuredItems = (spotlightSection?.items || [])
    .filter((item) => isUsableImageUrl(item.image_url))
    .map((item, idx) => {
      const isExternal = Boolean(item.post_url && /^https?:\/\//i.test(item.post_url));
      return {
        id: item.id || `spotlight-${idx}`,
        src: item.image_url,
        title: item.title || "Live Stage Performance",
        category: item.category || "Social Spotlight",
        tag: item.tag || "Live Stage",
        href: item.post_url || `https://instagram.com/${effectiveHandle}`,
        platform: item.platform || "instagram",
        isExternal,
      };
    });

  let list: Array<{
    id: string;
    src: string;
    title: string;
    category: string;
    tag: string;
    href: string;
    platform: string;
    isExternal: boolean;
  }>;

  if (configuredItems.length > 0) {
    list = configuredItems;
    // For smooth infinite marquee looping, we want at least 8 items
    if (list.length < 8) {
      const missingCount = 8 - list.length;
      const padding = CURATED_STAGE_MOMENTS.slice(0, missingCount).map((c, i) => ({
        id: `curated-pad-${i}`,
        src: c.src,
        title: c.title,
        category: c.category,
        tag: c.tag,
        href: c.href,
        platform: "instagram",
        isExternal: /^https?:\/\//i.test(c.href),
      }));
      list = [...list, ...padding];
    }
  } else {
    // Extract genuine event stage photos as fallback
    const eventShots = events
      .filter((e) => isUsableImageUrl(e.image_url))
      .map((e) => ({
        id: e._id,
        src: e.image_url || "",
        title: e.title || "Live Stage Performance",
        category: (e as any).category || e.venue || "Stage Event",
        tag: "Live Stage",
        href: `/events/${e._id}`,
        platform: "instagram",
        isExternal: false,
      }));

    const baseShots =
      eventShots.length >= 4
        ? eventShots
        : [
            ...eventShots,
            ...CURATED_STAGE_MOMENTS.slice(eventShots.length).map((c, i) => ({
              id: `curated-${i}`,
              src: c.src,
              title: c.title,
              category: c.category,
              tag: c.tag,
              href: c.href,
              platform: "instagram",
              isExternal: /^https?:\/\//i.test(c.href),
            })),
          ];

    list = baseShots.slice(0, 8);
  }

  return (
    <section className="relative overflow-hidden py-14 sm:py-20 md:py-24 border-t border-[var(--border)]">
      {/* Soft Ambient Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[130px]"
        style={{ background: "var(--grad-brand)" }}
        aria-hidden
      />

      {/* Section Header */}
      <div className="container-x mb-8 sm:mb-12 text-center flex flex-col items-center">
        <SectionLabel>{sectionLabel}</SectionLabel>
        <h2 className="mt-3 font-display text-[clamp(1.85rem,4.5vw,3.2rem)] font-bold uppercase tracking-tight text-[var(--fg)]">
          {sectionTitle}
        </h2>
        <p className="mt-2 max-w-xl text-[13.5px] sm:text-[15px] text-[var(--fg-muted)] leading-relaxed">
          {sectionSubtitle}
        </p>
      </div>

      {/* Infinite Seamless Card Marquee Track */}
      <div className="relative w-full overflow-hidden">
        {/* Subtle Edge Blur Gradients */}
        <div className="pointer-events-none absolute left-0 inset-y-0 w-12 sm:w-28 bg-gradient-to-r from-[var(--bg)] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 inset-y-0 w-12 sm:w-28 bg-gradient-to-l from-[var(--bg)] to-transparent z-10" />

        <div className="marquee-track marquee-track-slow flex items-center">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center gap-5 sm:gap-6 md:gap-7 pr-5 sm:pr-6 md:pr-7">
              {list.map((s, i) => {
                const CardIcon = getSpotlightIcon(s.platform, s.href);
                const cardContent = (
                  <>
                    {/* Photo with smooth zoom on hover */}
                    <img
                      src={imageFor(s.src, i)}
                      alt={s.title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
                    />

                    {/* Dark Vignette / Cinematic Scrim */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-black/15 transition-opacity duration-300"
                    />

                    {/* Top Bar Badges */}
                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between pointer-events-none z-10">
                      <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-mono font-semibold text-white/95 flex items-center gap-1.5 shadow-sm">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {s.tag || "Live Stage"}
                      </span>
                      <span className="grid size-8 place-items-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 group-hover:text-pink-400 group-hover:border-pink-500/50 group-hover:scale-110 transition-all shadow-sm">
                        <CardIcon className="size-4" />
                      </span>
                    </div>

                    {/* Bottom Caption & Details */}
                    <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-10 flex flex-col gap-1 text-left">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 truncate block">
                        {s.category}
                      </span>
                      <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight leading-snug truncate block group-hover:text-[var(--accent)] transition-colors">
                        {s.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/75 group-hover:text-white transition-colors">
                        <span>{s.isExternal ? "Open link" : "Explore stage"}</span>
                        <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  </>
                );

                const cardClasses =
                  "group relative shrink-0 w-[240px] sm:w-[280px] md:w-[310px] aspect-[4/5] rounded-[22px] sm:rounded-[26px] overflow-hidden border border-white/10 bg-[var(--surface-2)] shadow-xl transition-all duration-500 hover:border-[var(--accent)] hover:shadow-2xl hover:shadow-[var(--accent)]/15 hover:scale-[1.02] cursor-pointer block";

                return s.isExternal ? (
                  <a
                    key={`${dup}-${s.id}-${i}`}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${s.title}`}
                    className={cardClasses}
                  >
                    {cardContent}
                  </a>
                ) : (
                  <Link
                    key={`${dup}-${s.id}-${i}`}
                    href={s.href}
                    aria-label={`View ${s.title}`}
                    className={cardClasses}
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Follow Callout Button */}
      <div className="mt-8 sm:mt-12 flex justify-center container-x">
        <a
          href={followUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 rounded-full border border-pink-500/30 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:border-pink-500/60 hover:bg-gradient-to-r hover:from-purple-500/20 hover:via-pink-500/20 hover:to-amber-500/20 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <FollowIcon className="size-4 text-pink-400 group-hover:rotate-6 transition-transform" />
          <span>{followText}</span>
          <ArrowUpRight className="size-3.5 text-white/60 group-hover:text-white transition-colors" />
        </a>
      </div>
    </section>
  );
}
