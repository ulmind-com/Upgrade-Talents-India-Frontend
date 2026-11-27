"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { imageFor, splitDate, truncate } from "@/lib/utils";
import type { EventItem } from "@/lib/api";

/* ═══════════ SCROLL-DRIVEN 3D SHOWCASE ═══════════
   Desktop (>=768px): Pinned stage where a cylinder of event cards spins with page
   scroll while a giant outlined headline drifts behind it, ending in a sparkle wipe.
   Mobile (<768px): Normal-flow stage (no sticky scroll-runway lock) with smooth
   finger-drag / swipe rotation + momentum inertia and clean tap-vs-drag navigation. */

const SLOTS = 8;             // cards around the cylinder
const STEP = 360 / SLOTS;
const MOBILE_BREAKPOINT_PX = 768;
const IDLE_SPIN_DEG_PER_SEC = -6;
const INERTIA_DECAY = 0.06;  // share of throw velocity kept per second
const DRAG_ACTIVATE_PX = 8;
const TAP_MAX_MOVE_PX = 8;

const MARQUEE_WORDS = [
  "DANCE THAT MOVES",
  "STAGES THAT INSPIRE",
  "TALENT WITHOUT LIMITS",
];

/* Four-point sparkle, 0–100 box, concave sides. */
const SPARKLE_PATH =
  "M50 0 C53.5 26 74 46.5 100 50 C74 53.5 53.5 74 50 100 C46.5 74 26 53.5 0 50 C26 46.5 46.5 26 50 0 Z";

/* Four-point sparkle normalized to 0–1 for objectBoundingBox CSS clip-path */
const SPARKLE_BOX_PATH =
  "M 0.5 0 C 0.535 0.26 0.74 0.465 1 0.5 C 0.74 0.535 0.535 0.74 0.5 1 C 0.465 0.74 0.26 0.535 0 0.5 C 0.26 0.465 0.465 0.26 0.5 0 Z";

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
  const [slots] = useState(() => buildSlots(events));
  // Starts false on both SSR and initial client render to guarantee zero hydration mismatch.
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  if (isMobileViewport) {
    return <MobileStudioShowcase slots={slots} />;
  }

  return <DesktopStudioShowcase slots={slots} />;
}

/* ═══════════ Mobile (<768px): normal-flow touch-drag 3D ring ═══════════ */

function MobileStudioShowcase({ slots }: { slots: Slot[] }) {
  const hostRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState({ w: 235, r: 277 });
  const cardRef = useRef(card);
  cardRef.current = card;

  const rotRef = useRef(0);
  const velRef = useRef(0);
  const inViewRef = useRef(true);
  const dragRef = useRef<{
    active: boolean;
    locked: "x" | "y" | null;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    moved: number;
  }>({
    active: false,
    locked: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    moved: 0,
  });

  /* Scale card width & cylinder radius cleanly across <768px phone/small-tablet widths. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth || window.innerWidth;
      const w = Math.max(200, Math.min(Math.round(width * 0.62), 270));
      const r = Math.round(w * 1.18);
      setCard({ w, r });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyTransforms = () => {
    const deg = rotRef.current;
    if (ringRef.current) {
      ringRef.current.style.transform = `rotateY(${deg.toFixed(3)}deg)`;
    }
    if (marqueeRef.current) {
      // Seamless 0% -> -50% loop across the duplicated MARQUEE_WORDS track.
      const pct = (((-deg * 0.22) % 50) + 50) % 50;
      marqueeRef.current.style.transform = `translate3d(${-pct.toFixed(3)}%, 0, 0)`;
    }
  };

  /* Inertia + gentle idle drift, paused when off-screen for zero idle CPU. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!inViewRef.current) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      if (!dragRef.current.active) {
        if (Math.abs(velRef.current) > 0.5) {
          rotRef.current += velRef.current * dt;
          velRef.current *= Math.pow(INERTIA_DECAY, dt);
          if (Math.abs(velRef.current) <= 0.5) velRef.current = 0;
        } else {
          rotRef.current += IDLE_SPIN_DEG_PER_SEC * dt;
        }
        applyTransforms();
      }

      raf = requestAnimationFrame(tick);
    };

    applyTransforms();

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          inViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            last = performance.now();
            applyTransforms();
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(tick);
          } else {
            cancelAnimationFrame(raf);
          }
        },
        { rootMargin: "50px" }
      );
      observer.observe(host);
    }

    raf = requestAnimationFrame(tick);

    const releaseDrag = () => {
      if (!dragRef.current.active) return;
      if (performance.now() - dragRef.current.lastT > 80) {
        velRef.current = 0;
      }
      dragRef.current.active = false;
      window.setTimeout(() => {
        if (!dragRef.current.active) {
          dragRef.current.moved = 0;
          dragRef.current.locked = null;
        }
      }, 60);
    };

    window.addEventListener("pointerup", releaseDrag, { passive: true });
    window.addEventListener("pointercancel", releaseDrag, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("pointerup", releaseDrag);
      window.removeEventListener("pointercancel", releaseDrag);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const now = performance.now();
    dragRef.current = {
      active: true,
      locked: null,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: now,
      moved: 0,
    };
    velRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;

    const dxTotal = e.clientX - d.startX;
    const dyTotal = e.clientY - d.startY;
    const dist = Math.hypot(dxTotal, dyTotal);

    if (d.locked === null) {
      if (dist < DRAG_ACTIVATE_PX) return;
      if (Math.abs(dyTotal) > Math.abs(dxTotal) * 1.1) {
        // Yield immediately to browser vertical page scroll.
        d.locked = "y";
        d.active = false;
        velRef.current = 0;
        return;
      }
      d.locked = "x";
    }

    if (d.locked === "x") {
      const now = performance.now();
      const dx = e.clientX - d.lastX;
      const dt = Math.max(1 / 240, (now - d.lastT) / 1000);
      d.lastX = e.clientX;
      d.lastT = now;
      d.moved += Math.abs(dx);

      const degPerPx = (1.15 * 180) / (Math.PI * Math.max(200, cardRef.current.r));
      const deltaDeg = dx * degPerPx;
      rotRef.current += deltaDeg;

      const instVel = Math.max(-540, Math.min(540, deltaDeg / dt));
      velRef.current = velRef.current * 0.45 + instVel * 0.55;
      applyTransforms();
    }
  };

  const onPointerEnd = () => {
    const d = dragRef.current;
    if (!d.active) return;
    if (performance.now() - d.lastT > 80) {
      velRef.current = 0;
    }
    d.active = false;
    window.setTimeout(() => {
      if (!dragRef.current.active) {
        dragRef.current.moved = 0;
        dragRef.current.locked = null;
      }
    }, 60);
  };

  return (
    <section
      ref={hostRef}
      className="studio-stage relative flex w-full flex-col justify-between overflow-hidden py-10 sm:py-12"
      aria-label="Event collection showcase"
    >
      <StudioStyles />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "var(--studio-glow)" }} />

      {/* Section chrome */}
      <div className="pointer-events-none relative z-20 flex flex-col items-center px-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/60">
          The collection
        </p>
        <h2 className="mt-2.5 max-w-3xl font-display text-[clamp(1.5rem,4.2vw,3rem)] font-bold uppercase leading-[0.95] text-white">
          Every stage we build
        </h2>
      </div>

      {/* Interactive touch-drag 3D ring stage (touch-pan-y preserves smooth vertical page scrolling) */}
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="relative z-10 flex h-[430px] min-[400px]:h-[495px] sm:h-[530px] w-full cursor-grab items-center justify-center touch-pan-y select-none active:cursor-grabbing"
      >
        {/* Giant outlined headline, drifting behind the cards */}
        <div className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2" aria-hidden>
          <div ref={marqueeRef} className="flex w-max items-center whitespace-nowrap will-change-transform">
            {[0, 1].map((dup) =>
              MARQUEE_WORDS.map((w, i) => (
                <span key={`${dup}-${i}`} className="studio-ghost flex items-center">
                  {w}
                  <span className="mx-[0.35em] text-[0.3em] opacity-70">◆</span>
                </span>
              )),
            )}
          </div>
        </div>

        {/* 3D cylinder */}
        <div
          style={{ perspective: 1050 }}
          className="relative z-10 flex size-full items-center justify-center"
        >
          <div
            ref={ringRef}
            style={{ transformStyle: "preserve-3d" }}
            className="relative h-0 w-0 will-change-transform"
          >
            {slots.map((s, i) => (
              <Link
                key={s.id}
                href={s.href}
                draggable={false}
                onClick={(e) => {
                  if (e.detail !== 0 && (dragRef.current.locked === "x" || dragRef.current.moved > TAP_MAX_MOVE_PX)) {
                    e.preventDefault();
                  }
                }}
                className="absolute block rounded-[22px] sm:rounded-[26px] outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-[var(--accent)] will-change-transform"
                style={{
                  width: card.w,
                  height: card.w * 1.34,
                  left: -card.w / 2,
                  top: (-card.w * 1.34) / 2,
                  transform: `rotateY(${i * STEP}deg) translateZ(${card.r}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <StudioCard slot={s} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-20 flex justify-center px-4 pt-2">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 sm:px-7 py-3 sm:py-3.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#1a0f2e] transition-transform duration-300 hover:scale-[1.04] shadow-xl shadow-black/30"
        >
          Explore the collection
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/* ═══════════ Desktop (>=768px): pinned scroll-driven 3D showcase ═══════════ */

function DesktopStudioShowcase({ slots }: { slots: Slot[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [card, setCard] = useState({ w: 280, r: 400 });
  const [isMobile, setIsMobile] = useState(false);
  const [trackVh, setTrackVh] = useState(380);

  /* Ensure video auto-plays reliably */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  /* Card size follows the stage width so the cylinder never self-overlaps and scales properly on tablet/desktop. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      const mobile = width < 640;
      const tablet = width >= 640 && width < 1024;
      setIsMobile(mobile);
      setTrackVh(mobile ? 160 : tablet ? 240 : 320);

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

  /* Sparkle wipe: smoothly wipes stage into next section as cards complete rotation */
  const wipeScale = useTransform(
    p,
    [0.80, 0.88, 0.94, 1],
    [0, 1.2, 4.2, 13]
  );
  const wipeOpacity = useTransform(p, [0.80, 0.84], [0, 1]);
  const wipeSpin = useTransform(p, [0.80, 1], [-25, 10]);
  const wipeTextOpacity = useTransform(p, [0.88, 0.96], [0, 1]);

  return (
    <section
      ref={trackRef}
      className="relative max-md:!h-[640px]"
      style={{ height: `${trackVh}vh` }}
      aria-label="Event collection showcase"
    >
      <StudioStyles />
      <div
        ref={stageRef}
        className="studio-stage md:sticky md:top-0 h-full md:h-dvh w-full overflow-hidden"
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
            {slots.map((s, i) => (
              <Link
                key={s.id}
                href={s.href}
                className="absolute block rounded-[22px] sm:rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] will-change-transform"
                style={{
                  width: card.w,
                  height: card.w * 1.34,
                  left: -card.w / 2,
                  top: (-card.w * 1.34) / 2,
                  transform: `rotateY(${i * STEP}deg) translateZ(${card.r}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <StudioCard slot={s} />
              </Link>
            ))}
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          style={{ opacity: chromeOpacity }}
          className="absolute inset-x-0 bottom-28 md:bottom-[clamp(1.25rem,5vh,3.5rem)] z-20 flex justify-center px-4"
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 sm:px-7 py-3 sm:py-3.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#1a0f2e] transition-transform duration-300 hover:scale-[1.04] shadow-xl shadow-black/30"
          >
            Explore the collection
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>

        {/* Hidden SVG defining objectBoundingBox clipPath for GPU-clipped video */}
        <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
          <defs>
            <clipPath id="sparkle-box-clip" clipPathUnits="objectBoundingBox">
              <path d={SPARKLE_BOX_PATH} />
            </clipPath>
          </defs>
        </svg>

        {/* Sparkle wipe into the next section */}
        <div className="pointer-events-none absolute inset-0 z-30 hidden md:grid place-items-center overflow-hidden" aria-hidden>
          <motion.div
            style={{
              scale: wipeScale,
              rotate: wipeSpin,
              opacity: wipeOpacity,
            }}
            className="relative h-[100vmax] w-[100vmax] will-change-transform grid place-items-center"
          >
            {/* Dark background silhouette */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
              <path d={SPARKLE_PATH} fill="var(--bg)" />
            </svg>

            {/* Video container clipped to 4-point X shape */}
            <div
              className="absolute inset-0 size-full overflow-hidden"
              style={{
                clipPath: "url(#sparkle-box-clip)",
                WebkitClipPath: "url(#sparkle-box-clip)",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/images/ticket-dancer.jpg"
                onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                className="size-full object-cover object-center scale-105"
              >
                <source src="/assets/dance1.mp4" type="video/mp4" />
                <source src="/assets/dance2.mp4" type="video/mp4" />
              </video>
              {/* Subtle tint overlay for text contrast and stage harmony */}
              <div className="absolute inset-0 bg-[#0b1124]/20" />
            </div>

            {/* Glowing neon border preserving the iconic X-shape curvature */}
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id="sparkle-border-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca34d" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d={SPARKLE_PATH}
                fill="none"
                stroke="url(#sparkle-border-glow)"
                strokeWidth="0.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
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
          className="hidden md:block absolute inset-x-0 bottom-0 z-20 h-[2px] origin-left"
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
      <img src={slot.src} alt="" loading="lazy" draggable={false} className="absolute inset-0 size-full object-cover" />
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
