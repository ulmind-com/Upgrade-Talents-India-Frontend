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
  className,
  titleClassName,
}: {
  title: string;
  subtitle?: string;
  image?: string | null;
  seed?: number;
  compact?: boolean;
  className?: string;
  titleClassName?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={ref}
      className={`relative isolate flex items-end overflow-hidden noise ${
        compact ? "min-h-[34vh] sm:min-h-[38vh] md:min-h-[40vh]" : "min-h-[60vh] md:min-h-[68vh]"
      } ${className || ""}`}
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

      <motion.div
        style={{ opacity }}
        className={`on-media container-x relative z-10 ${
          compact ? "pb-6 sm:pb-8 pt-28 sm:pt-32 md:pt-36" : "pb-12 pt-36 md:pt-40"
        }`}
      >
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={`font-display font-bold uppercase leading-[0.9] tracking-[-0.035em] text-white drop-shadow-[0_6px_40px_rgba(0,0,0,0.6)] ${
            titleClassName || (compact ? "text-[clamp(2.2rem,6vw,4.2rem)]" : "text-[clamp(2.6rem,8.5vw,5.5rem)]")
          }`}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3.5 max-w-xl text-sm italic text-[var(--fg-muted)] sm:text-base md:text-lg"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}
