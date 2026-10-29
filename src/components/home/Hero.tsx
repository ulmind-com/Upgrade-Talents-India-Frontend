"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Share2, ArrowRight, Pause, Play } from "lucide-react";
import StageRibbons from "./StageRibbons";
import { FALLBACK_IMAGES, imageFor } from "@/lib/utils";
import type { EventItem } from "@/lib/api";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";

const TABS = ["Training", "Collection", "Inspiration"];
const ROTATE_MS = 4500;
/** Thumbnails visible in the rail at any moment. */
const RAIL_SIZE = 3;

/* Glowing colour dots along the bottom-left edge, as in the reference. */
const BUBBLES = [
  { c: "#ff86d4", s: 20, x: 3.2, d: 0 },
  { c: "#ff8f83", s: 20, x: 7.0, d: 0.7 },
  { c: "#4fe0a6", s: 34, x: 11.2, d: 1.4 },
  { c: "#ffd45e", s: 18, x: 15.6, d: 2.1 },
  { c: "#c3b2ff", s: 38, x: 19.4, d: 0.9 },
  { c: "#6fd4ff", s: 20, x: 24.2, d: 2.6 },
];

type Shot = {
  id: string;
  src?: string | null;
  title: string;
  href: string;
  isLive?: boolean;
  isRegOpen?: boolean;
  isCompetition?: boolean;
};

export default function Hero({
  events = [],
  competitions = [],
  brandTitle,
  brandTagline,
  brandBody,
}: {
  events?: EventItem[];
  competitions?: any[];
  brandTitle?: string;
  brandTagline?: string;
  brandBody?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);

  /* One gallery pool drives the rail with live & active competitions as top priority. */
  const pool: Shot[] = useMemo(() => {
    // 1. Valid competitions
    const validComps = (competitions || []).filter(
      (c) => c && (c._id || c.id) && c.is_published !== false && !c.is_deleted
    );

    // Sort competitions: Live first (score 3), then Registration Open (score 2), then others (score 1)
    const sortedComps = [...validComps].sort((a, b) => {
      const lifeA = getCompetitionLifecycle(a);
      const lifeB = getCompetitionLifecycle(b);
      const scoreA = lifeA.isLive || String(a.status || "").toUpperCase() === "LIVE" ? 3 : lifeA.isRegistrationOpen ? 2 : 1;
      const scoreB = lifeB.isLive || String(b.status || "").toUpperCase() === "LIVE" ? 3 : lifeB.isRegistrationOpen ? 2 : 1;
      return scoreB - scoreA;
    });

    const compShots: Shot[] = sortedComps.map((c, i) => {
      const id = String(c._id || c.id);
      const lifecycle = getCompetitionLifecycle(c);
      const isLive = lifecycle.isLive || String(c.status || "").toUpperCase() === "LIVE";
      const isRegOpen = lifecycle.isRegistrationOpen || lifecycle.canRegister;
      const src =
        c.card_image_url ||
        c.image_url ||
        c.banner_image_url ||
        c.banner_url ||
        FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
      const href = lifecycle.isResultsOut ? `/competitions/${id}/results` : `/competitions/${id}`;

      return {
        id: `comp-${id}`,
        src,
        title: c.title || c.name || "Competition",
        href,
        isLive,
        isRegOpen,
        isCompetition: true,
      };
    });

    // 2. Events if more items needed
    const eventShots: Shot[] = (events || []).slice(0, 8).map((e, i) => ({
      id: `event-${e._id}`,
      src: e.image_url || FALLBACK_IMAGES[(compShots.length + i) % FALLBACK_IMAGES.length],
      title: e.title,
      href: `/events/${e._id}`,
      isLive: e.event_status === "live",
      isRegOpen: e.registration_enabled !== false,
      isCompetition: false,
    }));

    const combined = [...compShots, ...eventShots];
    if (combined.length >= RAIL_SIZE + 2) return combined;

    const pad: Shot[] = FALLBACK_IMAGES.slice(0, RAIL_SIZE + 2 - combined.length).map((src, i) => ({
      id: `still-${i}`,
      src,
      title: "Competitions",
      href: "/competitions",
      isLive: false,
      isRegOpen: true,
      isCompetition: true,
    }));

    return [...combined, ...pad];
  }, [competitions, events]);

  const count = pool.length;
  const current = pool[index % count];

  /* The rail displays the top competitions starting at index, marching forward */
  const rail = useMemo(
    () => Array.from({ length: RAIL_SIZE }, (_, k) => pool[(index + k) % count]),
    [pool, index, count]
  );

  const running = !reduce && !paused && !stopped && count > 1;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [running, count]);

  /* Scroll parallax */
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const figureY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* Pointer parallax — depth on an otherwise flat composition */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const figX = useSpring(useTransform(px, [-0.5, 0.5], [-18, 18]), { stiffness: 90, damping: 22 });
  const figY2 = useSpring(useTransform(py, [-0.5, 0.5], [-12, 12]), { stiffness: 90, damping: 22 });
  const ribX = useSpring(useTransform(px, [-0.5, 0.5], [22, -22]), { stiffness: 60, damping: 24 });

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  /* Headline is brand-level — the gallery drives the imagery, not the words. */
  const rawTitle = (brandTitle || "let`s start Dance").trim();
  const parts = rawTitle.split(/\s+/);
  const lead = parts.length > 1 ? parts.slice(0, -1).join(" ") : "let`s start";
  const punch = parts.length > 1 ? parts[parts.length - 1] : rawTitle;

  const leadSize =
    lead.length <= 12 ? "clamp(2.1rem,5.4vw,4.4rem)"
    : lead.length <= 20 ? "clamp(1.8rem,4.2vw,3.4rem)"
    : "clamp(1.5rem,3.2vw,2.6rem)";
  const punchSize =
    punch.length <= 7 ? "clamp(2.9rem,8.2vw,6.6rem)"
    : punch.length <= 11 ? "clamp(2.5rem,6.2vw,5rem)"
    : "clamp(2rem,4.8vw,3.6rem)";

  const body =
    brandBody ||
    brandTagline ||
    "Dance classes are privately scheduled dance sessions offered In-Studio or Online to a small group of friends or family members.";

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="stage-bg on-media relative isolate flex min-h-dvh flex-col overflow-hidden"
    >
      {/* Ribbon lines */}
      <motion.div style={{ x: reduce ? 0 : ribX }} className="absolute inset-0 -z-20">
        <StageRibbons className="ribbon-drift absolute inset-0 size-full" />
      </motion.div>

      {/* Light bloom behind the performer */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-20 rounded-full blur-[110px]"
        style={{ background: "var(--stage-bloom)", width: "46vw", height: "46vw", top: "6%", left: "-6%" }}
      />

      {/* ── Performer gallery (left) ── */}
      <motion.figure
        style={{ y: reduce ? 0 : figureY, x: reduce ? 0 : figX, translateY: reduce ? 0 : figY2 }}
        className="absolute inset-y-0 left-0 -z-10 w-full lg:w-[56%] xl:w-[52%]"
      >
        {pool.map((shot, i) => (
          <motion.img
            key={shot.id}
            src={imageFor(shot.src, i)}
            alt=""
            aria-hidden
            className="stage-cutout absolute inset-0 size-full object-cover object-center mix-blend-luminosity lg:object-[35%_center]"
            initial={false}
            animate={{ opacity: i === index ? 0.92 : 0, scale: i === index ? 1 : 1.07 }}
            transition={{ duration: 1.25, ease }}
          />
        ))}
        <span aria-hidden className="stage-cutout stage-bg absolute inset-0 mix-blend-color" />
      </motion.figure>

      {/* Small-screen scrim — the copy sits directly on the photo below lg */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[5] lg:hidden"
        style={{ background: "linear-gradient(180deg, rgba(36,2,18,0.52) 0%, rgba(36,2,18,0.38) 38%, rgba(30,2,22,0.76) 100%)" }}
      />

      {/* ── Copy column (right) ── */}
      <motion.div
        style={{ y: reduce ? 0 : copyY, opacity: fade }}
        className="container-x relative z-10 flex flex-1 items-center justify-end pb-28 pt-28 md:pb-32 md:pt-32"
      >
        <div className="flex w-full justify-end">
          <div className="w-full max-w-[560px] lg:w-[52%]">
            <h1 className="font-hero">
              <span className="block overflow-hidden">
                <motion.span
                  key="hero-lead"
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ duration: 0.95, delay: 0.1, ease }}
                  style={{ fontSize: leadSize }}
                  className="block font-medium leading-[1.04] tracking-[-0.02em] text-white [overflow-wrap:anywhere]"
                >
                  {lead}
                </motion.span>
              </span>
              <span className="-mt-1 block overflow-hidden">
                <motion.span
                  key="hero-punch"
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ duration: 0.95, delay: 0.2, ease }}
                  style={{ fontSize: punchSize }}
                  className="block font-bold leading-[1.04] tracking-[-0.035em] text-white [overflow-wrap:anywhere]"
                >
                  {punch}
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.36, ease }}
              className="font-hero mt-4 max-w-[520px] text-[clamp(0.95rem,1.6vw,1.3rem)] font-normal leading-[1.3] text-white"
            >
              {body}
            </motion.p>

            {/* Thumbnail queue — a new still enters on the left each tick
                and the rest march to the right. */}
            <motion.ul
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.46, ease }}
              className="mt-7 flex gap-4"
              aria-label="Recent stills"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {rail.map((shot) => (
                  <motion.li
                    key={shot.id}
                    layout
                    initial={reduce ? false : { opacity: 0, x: -70, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: 70, scale: 0.88 }}
                    transition={{ duration: 0.75, ease }}
                    className="min-w-0 flex-1"
                  >
                    <Link
                      href={shot.href}
                      aria-label={shot.title ? `Open ${shot.title}` : "Browse competitions"}
                      className="group relative block aspect-square w-full overflow-hidden rounded-md ring-1 ring-white/30 transition-all duration-500 hover:scale-[1.03] hover:ring-2 hover:ring-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
                    >
                      <img
                        src={imageFor(shot.src, 1)}
                        alt={shot.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                      />

                      {/* Scrim for contrast */}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />

                      {/* Live / Status Badge */}
                      {shot.isLive ? (
                        <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-rose-600/95 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md animate-pulse">
                          <span className="size-1.5 rounded-full bg-white animate-ping" /> LIVE
                        </span>
                      ) : shot.isRegOpen ? (
                        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-black shadow-md backdrop-blur-md">
                          OPEN
                        </span>
                      ) : shot.isCompetition ? (
                        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-black/60 border border-white/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
                          COMPETE
                        </span>
                      ) : null}

                      {/* Title overlay */}
                      {shot.title && (
                        <span className="absolute inset-x-0 bottom-0 z-10 px-2 pb-1.5 pt-6 text-left font-display text-[11px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-1 transition-transform duration-300 group-hover:translate-y-[-2px]">
                          {shot.title}
                        </span>
                      )}
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>

            {/* Progress line — advances with the gallery */}
            <div className="mt-5 h-[3px] w-full bg-white/30" aria-hidden>
              <motion.span
                className="block h-full bg-white"
                initial={false}
                animate={{ width: `${((index + 1) / count) * 100}%` }}
                transition={{ duration: 0.7, ease }}
              />
            </div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.66, ease }}
              className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-3"
            >
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  aria-pressed={tab === i}
                  className={`font-hero relative cursor-pointer py-1 text-[clamp(1.05rem,1.8vw,1.5rem)] font-normal transition-colors duration-300 ${
                    tab === i ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {t}
                  <span
                    aria-hidden
                    className={`absolute -bottom-0.5 left-0 h-px bg-white transition-all duration-400 ${tab === i ? "w-full" : "w-0"}`}
                  />
                </button>
              ))}

              <Link
                href={current?.href || "/competitions"}
                className="font-hero group ml-auto inline-flex min-h-[44px] items-center gap-2.5 text-[clamp(1.05rem,1.8vw,1.45rem)] font-normal text-white"
              >
                <Share2 className="size-[22px] shrink-0" aria-hidden />
                <span className="hidden sm:inline">Explore</span>
                <ArrowRight className="size-4 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Gallery controls (bottom centre-left) ── */}
      <div className="absolute bottom-10 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 md:flex lg:left-[46%]">
        <button
          onClick={() => setStopped((s) => !s)}
          aria-label={stopped ? "Play the image gallery" : "Pause the image gallery"}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/50 text-white transition-colors hover:border-white hover:bg-white/15"
        >
          {stopped ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        </button>

        <ul className="flex items-center gap-2" role="tablist" aria-label="Gallery stills">
          {pool.map((shot, i) => (
            <li key={shot.id}>
              <button
                role="tab"
                aria-selected={i === index}
                aria-label={shot.title || `Still ${i + 1}`}
                onClick={() => setIndex(i)}
                className="grid size-6 cursor-pointer place-items-center"
              >
                <span
                  className={`block rounded-full transition-all duration-500 ${
                    i === index
                      ? "size-2.5 bg-[#ff6a2b] shadow-[0_0_10px_#ff6a2b]"
                      : "size-2.5 border-[1.5px] border-white/80 bg-transparent"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right hairline */}
      <span aria-hidden className="absolute inset-y-24 right-[62px] z-0 hidden w-px bg-white/30 lg:block" />

      {/* ── Decorative bubbles (bottom-left) ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="bubble-float absolute rounded-full"
            style={{
              background: b.c,
              boxShadow: `0 0 ${b.s / 1.6}px ${b.c}`,
              width: `clamp(11px, ${b.s / 16}vw, ${b.s}px)`,
              height: `clamp(11px, ${b.s / 16}vw, ${b.s}px)`,
              left: `${b.x}%`,
              bottom: "4.5%",
              animationDelay: `${b.d}s`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
