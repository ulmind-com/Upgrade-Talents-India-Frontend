"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { SectionLabel, Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";
import type { EventItem } from "@/lib/api";

/* Scattered image-card collage that reveals with a staggered fade-up
   (opacity 0→1, y 40→0, easeOut) and keeps a gentle continuous float —
   framer-motion, matching the reference animation. */

type Card = { t: string; l: string; w: string; rot: number; delay: number; dur: number; z: number };
const CARDS: Card[] = [
  { t: "6%", l: "28%", w: "40%", rot: -4, delay: 0.0, dur: 6.5, z: 30 }, // hero centre
  { t: "0%", l: "2%", w: "30%", rot: -9, delay: 0.12, dur: 7.5, z: 20 },
  { t: "40%", l: "0%", w: "33%", rot: 6, delay: 0.24, dur: 8, z: 20 },
  { t: "2%", l: "70%", w: "30%", rot: 8, delay: 0.18, dur: 7, z: 20 },
  { t: "52%", l: "66%", w: "34%", rot: -6, delay: 0.3, dur: 8.5, z: 25 },
  { t: "66%", l: "30%", w: "32%", rot: 3, delay: 0.42, dur: 7.8, z: 15 },
];

export default function GalleryReveal({ events = [] }: { events?: EventItem[] }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* soft depth accents */}
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]" style={{ background: "var(--grad-surface)" }} />

      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        {/* ── Copy ── */}
        <div className="relative z-10">
          <Reveal><SectionLabel>In motion</SectionLabel></Reveal>
          <SplitHeading text="A stage worth watching" className="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[0.95]" />
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]"
          >
            Every performance, workshop and showdown — captured and brought to life. Scroll through
            the moments that make Upgrade Talents unforgettable.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="mt-7 flex items-center gap-3"
          >
            <Button href="/gallery" size="lg"><Sparkles className="size-4" aria-hidden /> Explore the gallery</Button>
            <Button href="/events" variant="ghost" size="lg">Upcoming events <ArrowUpRight className="size-4" aria-hidden /></Button>
          </motion.div>
        </div>

        {/* ── Collage ── */}
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px]">
          {CARDS.map((c, i) => (
            <motion.figure
              key={i}
              className="absolute overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]"
              style={{ top: c.t, left: c.l, width: c.w, zIndex: c.z }}
              initial={{ opacity: 0, y: 40, scale: 0.85, rotate: c.rot }}
              whileInView={{ opacity: 1, y: 0, scale: 1, rotate: c.rot }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: c.delay }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: c.dur, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
              >
                <img
                  src={imageFor(events[i]?.image_url, i)}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(160deg, transparent 55%, color-mix(in srgb, var(--accent) 22%, transparent))" }} />
              </motion.div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
