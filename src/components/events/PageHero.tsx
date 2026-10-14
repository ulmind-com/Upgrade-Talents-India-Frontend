"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { imageFor } from "@/lib/utils";

/** Reusable glitch-style page banner used across inner pages. */
export default function PageHero({
  title,
  subtitle,
  image,
  seed = 1,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  image?: string | null;
  seed?: number;
  compact?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={ref}
      className={`relative isolate flex items-end overflow-hidden noise ${compact ? "min-h-[52vh]" : "min-h-[72vh]"}`}
    >
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-20">
        <img src={imageFor(image, seed)} alt="" aria-hidden className="size-full object-cover" />
      </motion.div>

      <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-45 mix-blend-overlay"
        style={{ background: "var(--grad-brand)" }}
      />
      <div aria-hidden className="hero-fade absolute inset-0 -z-10" />

      <motion.div style={{ opacity }} className="on-media container-x relative z-10 pb-16 pt-40">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.6rem,11vw,8rem)] font-bold uppercase leading-[0.84] tracking-[-0.045em] text-white drop-shadow-[0_6px_40px_rgba(0,0,0,0.6)]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-xl text-base italic text-[var(--fg-muted)] md:text-lg"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}
