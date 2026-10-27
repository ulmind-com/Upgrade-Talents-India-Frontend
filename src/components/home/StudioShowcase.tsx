"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { imageFor, splitDate, truncate } from "@/lib/utils";
import type { EventItem } from "@/lib/api";

/* ═══════════ SCROLL-DRIVEN 3D SHOWCASE ═══════════
   Pinned stage: a cylinder of event cards spins with the page scroll while a
   giant outlined headline drifts behind it. At the end a four-point sparkle
   expands out of the centre and wipes the screen into the next section. */

const TRACK_VH = 400;        // scroll runway the stage stays pinned across
const SLOTS = 8;             // cards around the cylinder
const STEP = 360 / SLOTS;

const MARQUEE_WORDS = [
  "DANCE THAT MOVES",
  "STAGES THAT INSPIRE",
  "TALENT WITHOUT LIMITS",
];

/* Four-point sparkle, 0–100 box, concave sides. */
const SPARKLE_PATH =
  "M50 0 C53.5 26 74 46.5 100 50 C74 53.5 53.5 74 50 100 C46.5 74 26 53.5 0 50 C26 46.5 46.5 26 50 0 Z";

type Slot = { id: string; src: string; title: string; venue?: string; date?: string; href: string };

function buildSlots(events: EventItem[]): Slot[] {
  const base = (events ?? []).slice(0, SLOTS);
  return Array.from({ length: SLOTS }, (_, i) => {
    const ev = base.length ? base[i % base.length] : undefined;
    return {
      id: ev ? `${ev._id}-${i}` : `slot-${i}`,
      src: imageFor(ev?.image_url, i),
      title: ev?.title ?? "Upgrade Talents",
      venue: ev?.venue,
      date: ev?.date,
      href: ev ? `/events/${ev._id}` : "/events",
    };
  });
}

export default function StudioShowcase({ events = [] }: { events?: EventItem[] }) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [slots] = useState(() => buildSlots(events));
  const [card, setCard] = useState({ w: 280, r: 400 });
  const [spin, setSpin] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [trackVh, setTrackVh] = useState(380);

  /* Card size follows the stage width so the cylinder never self-overlaps and scales properly on mobile/tablet/desktop. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      const mobile = width < 640;
      const tablet = width >= 640 && width < 1024;
      setIsMobile(mobile);
      setTrackVh(mobile ? 260 : tablet ? 320 : 380);

      let w = 300;
      let r = 420;
      if (mobile) {
        w = Math.max(220, Math.min(Math.round(width * 0.68), 270));
        r = Math.round(w * 1.18);
      } else if (tablet) {
        w = Math.max(240, Math.min(Math.round(width * 0.36), 300));
        r = Math.round(w * 1.34);
      } else {
        w = Math.max(260, Math.min(Math.round(width * 0.23), 320));
        r = Math.round(w * 1.42);
      }
      setCard({ w, r });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.0005 });

  /* Phases across the pin. Keep cards & chrome visible through rotation to eliminate empty black voids. */
  const stageScale = useTransform(p, [0, 0.80, 0.94], [1, 1, 1.15]);
  const stageOpacity = useTransform(p, [0, 0.84, 0.94], [1, 1, 0]);
  const rotation = useTransform(p, [0, 0.80], [0, -360]);
  const marqueeX = useTransform(p, [0, 1], ["14%", "-64%"]);
  const chromeOpacity = useTransform(p, [0, 0.80, 0.90], [1, 1, 0]);

  /* Sparkle wipe */
  const wipeScale = useTransform(p, [0.82, 0.90, 0.96, 1], [0, 1.2, 4.2, 13]);
  const wipeSpin = useTransform(p, [0.82, 1], [-25, 10]);
  const wipeTextOpacity = useTransform(p, [0.88, 0.96], [0, 1]);

  useMotionValueEvent(rotation, "change", (v) => setSpin(v));

  /* Reduced motion: a plain, readable rail instead of the pinned choreography. */
  if (reduce) {
    return (
      <section className="studio-stage relative overflow-hidden border-y border-[var(--border)] py-16 sm:py-20 md:py-28">
        <StudioStyles />
        <div className="container-x">
          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-white/55">The collection</p>
          <h2 className="mt-3 sm:mt-4 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-bold uppercase leading-[0.95] text-white">
            Dance that moves
          </h2>
          <div className="mt-8 sm:mt-10 flex snap-x gap-4 sm:gap-5 overflow-x-auto pb-4 no-scrollbar">
            {slots.map((s) => (
              <Link key={s.id} href={s.href} className="w-[220px] sm:w-[240px] shrink-0 snap-start">
                <StudioCard slot={s} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={trackRef} className="relative" style={{ height: `${trackVh}vh` }} aria-label="Event collection showcase">
      <StudioStyles />
      <div
        ref={stageRef}
        className="studio-stage sticky top-0 h-dvh w-full overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "var(--studio-glow)" }} />

        {/* Giant outlined headline, drifting behind the cards */}
        <motion.div
          style={{ x: marqueeX }}
          className="pointer-events-none absolute left-0 top-1/2 z-0 flex -translate-y-1/2 items-center whitespace-nowrap will-change-transform"
          aria-hidden
        >
          {[0, 1].map((dup) =>
            MARQUEE_WORDS.map((w, i) => (
              <span key={`${dup}-${i}`} className="studio-ghost flex items-center">
                {w}
                <span className="mx-[0.35em] text-[0.3em] opacity-70">◆</span>
              </span>
            )),
          )}
        </motion.div>

        {/* Section chrome */}
        <motion.div
          style={{ opacity: chromeOpacity }}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-[clamp(3.5rem,8vh,7rem)] text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/60 md:text-[11px]">
            The collection
          </p>
          <h2 className="mt-2.5 max-w-3xl font-display text-[clamp(1.5rem,4.2vw,3rem)] font-bold uppercase leading-[0.95] text-white">
            Every stage we build
          </h2>
        </motion.div>

        {/* 3D cylinder */}
        <motion.div
          style={{ opacity: stageOpacity, scale: stageScale, perspective: isMobile ? 1050 : 1500 }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <motion.div
            style={{ rotateY: rotation, transformStyle: "preserve-3d" }}
            className="relative h-0 w-0 will-change-transform"
          >
            {slots.map((s, i) => {
              const angle = i * STEP + spin;
              const facing = Math.cos((angle * Math.PI) / 180); // 1 = front, -1 = back
              const dim = 0.34 + 0.66 * Math.max(0, (facing + 1) / 2);
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  tabIndex={facing > 0.6 ? 0 : -1}
                  aria-hidden={facing <= 0.6}
                  className="absolute block rounded-[22px] sm:rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    width: card.w,
                    height: card.w * 1.34,
                    left: -card.w / 2,
                    top: (-card.w * 1.34) / 2,
                    transform: `rotateY(${i * STEP}deg) translateZ(${card.r}px)`,
                    opacity: dim,
                    filter: `brightness(${0.45 + 0.55 * dim})`,
                    pointerEvents: facing > 0.6 ? "auto" : "none",
                  }}
                >
                  <StudioCard slot={s} />
                </Link>
              );
            })}
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          style={{ opacity: chromeOpacity }}
          className="absolute inset-x-0 bottom-[clamp(1.25rem,5vh,3.5rem)] z-20 flex justify-center px-4"
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 sm:px-7 py-3 sm:py-3.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#1a0f2e] transition-transform duration-300 hover:scale-[1.04] shadow-xl shadow-black/30"
          >
            Explore the collection
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>

        {/* Sparkle wipe into the next section */}
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-hidden" aria-hidden>
          <motion.svg
            viewBox="0 0 100 100"
            style={{ scale: wipeScale, rotate: wipeSpin }}
            className="h-[100vmax] w-[100vmax] will-change-transform"
          >
            <path d={SPARKLE_PATH} fill="var(--bg)" />
          </motion.svg>
          <motion.div
            style={{ opacity: wipeTextOpacity }}
            className="absolute flex flex-col items-center px-6 text-center"
          >
            <svg viewBox="0 0 100 100" className="size-9 text-[var(--accent)]" aria-hidden>
              <path d={SPARKLE_PATH} fill="currentColor" />
            </svg>
            <p className="mt-5 font-display text-[clamp(1.5rem,4vw,2.8rem)] font-bold uppercase leading-[0.95] text-[var(--fg)]">
              The stage is yours
            </p>
          </motion.div>
        </div>

        {/* Progress hairline */}
        <motion.div
          style={{ scaleX: p, transformOrigin: "0% 50%" }}
          className="absolute inset-x-0 bottom-0 z-20 h-[2px] origin-left"
        >
          <div className="h-full w-full" style={{ background: "var(--grad-brand)" }} />
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════ Card face ═══════════ */

function StudioCard({ slot }: { slot: Slot }) {
  const d = splitDate(slot.date);
  return (
    <article className="group relative h-full w-full overflow-hidden rounded-[22px] sm:rounded-[26px] border border-white/12 bg-black/40 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.85)] select-none">
      <img src={slot.src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" aria-hidden />

      {d.day !== "--" && (
        <span className="absolute left-3 top-3 sm:left-4 sm:top-4 flex flex-col items-center rounded-xl bg-white/95 px-2 py-1 sm:px-2.5 sm:py-1.5 leading-none text-[#1a0f2e] shadow-md">
          <span className="font-display text-sm sm:text-base font-bold">{d.day}</span>
          <span className="font-mono text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.12em]">{d.month}</span>
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
        <h3 className="font-display text-[13px] sm:text-[15px] font-bold uppercase leading-snug sm:leading-tight text-white line-clamp-2">
          {truncate(slot.title, 42)}
        </h3>
        {slot.venue && (
          <p className="mt-1 sm:mt-1.5 flex items-center gap-1.5 font-mono text-[8.5px] sm:text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-white/70">
            <MapPin className="size-2.5 sm:size-3 shrink-0" aria-hidden />
            {truncate(slot.venue, 26)}
          </p>
        )}
        {!slot.venue && (
          <p className="mt-1 sm:mt-1.5 flex items-center gap-1.5 font-mono text-[8.5px] sm:text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-white/70">
            <CalendarDays className="size-2.5 sm:size-3 shrink-0" aria-hidden />
            Upcoming
          </p>
        )}
      </div>
    </article>
  );
}

/* ═══════════ Scoped tokens ═══════════ */

function StudioStyles() {
  return (
    <style>{`
      .studio-stage {
        --studio-bg: linear-gradient(165deg, #170d2c 0%, #251345 42%, #120b24 78%, #0b0f20 100%);
        --studio-glow:
          radial-gradient(60% 45% at 50% 42%, rgba(168,85,247,0.28), transparent 70%),
          radial-gradient(45% 35% at 82% 78%, rgba(255,138,61,0.18), transparent 72%);
        background: var(--studio-bg);
      }
      .studio-stage .studio-ghost {
        font-family: var(--font-display);
        font-size: clamp(3.5rem, 12vw, 10rem);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: -0.02em;
        line-height: 1;
        color: transparent;
        -webkit-text-stroke: 1.5px rgba(255,255,255,0.34);
        padding-inline: 0.18em;
      }
    `}</style>
  );
}
