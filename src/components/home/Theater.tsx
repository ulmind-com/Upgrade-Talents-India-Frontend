"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ChevronDown, ChevronLeft, ChevronRight, Instagram, Mic2, Ticket,
  CalendarDays, Users, Clock, Hourglass, Trophy, ShoppingBag, GraduationCap,
} from "lucide-react";
import type { BannerItem, EventItem, FeaturedTileItem } from "@/lib/api";
import { formatEventDate, imageFor, truncate } from "@/lib/utils";

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

/* ═══════════ FEATURED SHOW ═══════════ */

export function FeaturedShow({ events = [] }: { events?: EventItem[] }) {
  const shows = events.filter((e) => e.event_status !== "completed").slice(0, 5);
  /* Guard before the inner component mounts: useScroll measures its target ref,
     so that ref must never belong to a tree that returns null. */
  if (!shows.length) return null;
  return <FeaturedShowStage shows={shows} />;
}

function FeaturedShowStage({ shows }: { shows: EventItem[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);

  const show = shows[i] ?? shows[0];

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const go = (d: number) => setI((p) => (p + d + shows.length) % shows.length);

  useEffect(() => { setI(0); }, [shows.length]);

  const start = show.time || "7:30";
  const duration = show.capacity ? `${Math.max(1, Math.round(show.capacity / 900))}:15` : "2:15";

  return (
    <section ref={ref} className="theater-bg relative isolate min-h-[70vh] overflow-hidden md:min-h-[88vh]">
      {/* Backdrop layer — parallax applies here only */}
      <motion.div style={reduce ? undefined : { y: bgY, willChange: "transform" }} className="absolute inset-0 -z-20 scale-[1.12]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={show._id}
            src={imageFor(show.image_url, i + 2)}
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
          {/* Title */}
          <div>
            <motion.p
              key={`k-${show._id}`}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="font-hero text-[11px] font-medium uppercase tracking-[0.34em] text-white/80"
            >
              {show.event_status === "live" ? "Now playing" : "Coming soon"}
            </motion.p>

            <motion.h2
              key={`t-${show._id}`}
              initial={reduce ? false : { opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: EASE }}
              className="font-serif-display mt-2 text-[clamp(2.6rem,8vw,6rem)] font-normal leading-[0.96] text-white [overflow-wrap:anywhere]"
            >
              {show.title}
            </motion.h2>
          </div>

          {/* Info card */}
          <motion.div
            key={`c-${show._id}`}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
            className="w-full max-w-md justify-self-end border border-white/12 bg-[rgba(11,6,23,0.82)] p-7 backdrop-blur-xl md:p-9"
          >
            <h3 className="font-serif-display text-[clamp(1.5rem,3vw,2rem)] font-normal leading-tight text-white">
              {show.title}
            </h3>
            {show.description && (
              <p className="mt-2 text-[13px] leading-relaxed text-white/70">{truncate(show.description, 90)}</p>
            )}

            <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-dashed border-white/15 py-7">
              {[
                { Icon: Clock, k: "Start time", v: start },
                { Icon: Hourglass, k: "Duration", v: duration },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="font-serif-display text-[clamp(1.8rem,4vw,2.6rem)] font-normal leading-none tabular-nums text-white">
                    {s.v}
                  </dd>
                  <dt className="mt-2 inline-flex items-center gap-1.5 font-hero text-[10px] uppercase tracking-[0.22em] text-white/60">
                    <s.Icon className="size-3 shrink-0" aria-hidden /> {s.k}
                  </dt>
                </div>
              ))}
            </dl>

            <p className="mt-6 font-hero text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
              {show.venue ? `${show.venue} · ` : ""}{formatEventDate(show.date)}
            </p>

            <Link
              href={`/events/${show._id}/book`}
              className="mt-7 inline-flex min-h-[52px] w-full items-center justify-center font-hero text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "var(--theater-pink)" }}
            >
              Buy tickets now
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Controls — edge arrows on desktop, a centred pair below the card on
          phones so they never sit on top of the show details. */}
      {shows.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-3 md:hidden">
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

/* ═══════════ PHOTO STRIP ═══════════ */

export function PhotoStrip({
  events = [],
  banners = [],
  handle = "upgradetalents",
}: {
  events?: EventItem[];
  banners?: BannerItem[];
  handle?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  const shots = [
    ...events.map((e) => ({ id: e._id, src: e.image_url, title: e.title, href: `/events/${e._id}` })),
    ...banners.map((b) => ({ id: b._id, src: b.image_url, title: b.title, href: "/gallery" })),
  ];
  const tiles = Array.from({ length: 9 }, (_, i) => shots[i % Math.max(shots.length, 1)] ?? {
    id: `ph-${i}`, src: null, title: "", href: "/gallery",
  });

  return (
    <section ref={ref} className="theater-bg relative overflow-hidden py-0">
      <h2 className="sr-only">Moments from our stages</h2>
      <motion.ul
        style={reduce ? undefined : { x, willChange: "transform" }}
        className="flex w-[108%] -translate-x-[4%]"
      >
        {tiles.map((s, i) => (
          <li key={`${s.id}-${i}`} className="min-w-0 flex-1">
            <Link
              href={s.href}
              aria-label={s.title ? `View ${s.title}` : "Open the gallery"}
              className="group relative block aspect-square overflow-hidden"
            >
              <img
                src={imageFor(s.src, i)}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-[rgba(11,6,23,0.45)] opacity-0 transition-opacity duration-400 group-hover:opacity-100"
              />
              <Instagram
                className="absolute bottom-2 right-2 size-3.5 text-white/70 transition-all duration-400 group-hover:bottom-1/2 group-hover:right-1/2 group-hover:size-6 group-hover:translate-x-1/2 group-hover:translate-y-1/2 group-hover:text-white"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </motion.ul>

      <p className="container-x py-6 text-center font-hero text-[11px] uppercase tracking-[0.3em] text-white/55">
        Follow @{handle}
      </p>
    </section>
  );
}
