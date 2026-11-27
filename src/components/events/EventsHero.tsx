"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { imageFor } from "@/lib/utils";

/** Full-bleed crowd banner with a glitched wordmark and gradient rule. */
export default function EventsHero({
  title,
  subtitle,
  image,
  seed = 2,
}: {
  title: string;
  subtitle?: string;
  image?: string | null;
  seed?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);

  return (
    <section ref={ref} className="on-media relative isolate flex min-h-[62vh] items-center justify-center overflow-hidden md:min-h-[74vh]">
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-20">
        <img src={imageFor(image, seed)} alt="" aria-hidden className="size-full object-cover object-[center_30%]" />
      </motion.div>

      {/* Stage scrim — keeps the wordmark legible in both themes */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,16,0.62) 0%, rgba(5,6,16,0.3) 42%, rgba(5,6,16,0.72) 100%)",
        }}
      />

      <div className="container-x relative z-10 pb-20 pt-32 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative inline-block"
        >
          <span
            data-text={title}
            className="glitch font-display text-[clamp(2.8rem,11vw,8rem)] font-bold uppercase leading-[0.9] tracking-[0.01em]"
          >
            {title}
            <span className="glitch-slices" aria-hidden />
          </span>
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="font-hero mx-auto mt-3 max-w-2xl text-[clamp(1.05rem,2.6vw,1.9rem)] font-light italic leading-snug text-white"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Gradient rule closing the banner */}
      <span aria-hidden className="rainbow-rule absolute inset-x-0 bottom-0 z-10 h-[5px]" />
    </section>
  );
}
