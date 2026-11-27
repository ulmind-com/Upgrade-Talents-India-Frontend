"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { imageFor } from "@/lib/utils";

/**
 * Street-poster banner: the wordmark straddles the photo with a narrow
 * centred blurb punched through the middle.
 */
export default function TicketsHero({
  left = "Class",
  right = "Tickets",
  blurb,
  image,
  seed = 3,
}: {
  left?: string;
  right?: string;
  blurb?: string;
  image?: string | null;
  seed?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section ref={ref} className="street-bg relative isolate overflow-hidden pt-20">
      <div className="relative min-h-[46vh] md:min-h-[62vh]">
        {/* Photo */}
        <motion.div style={{ y, scale }} className="absolute inset-0 -z-20">
          <img src={imageFor(image, seed)} alt="" aria-hidden className="size-full object-cover" />
        </motion.div>

        {/* Grade: desaturated, high-contrast street look */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(180deg, rgba(8,8,10,0.55), rgba(8,8,10,0.35) 45%, rgba(8,8,10,0.88))" }}
        />

        {/* Wordmark + blurb */}
        <div className="container-x relative z-10 flex min-h-[46vh] items-center md:min-h-[62vh]">
          <div className="flex w-full flex-col items-center gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <motion.span
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.95, ease }}
              className="font-street block text-center text-[clamp(3rem,14vw,10.5rem)] uppercase leading-[0.82] md:text-left"
              style={{ color: "var(--acid)", textShadow: "0 0 50px rgba(191,255,46,0.35)" }}
            >
              {left}
            </motion.span>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease }}
              className="font-cond max-w-[190px] shrink-0 text-center text-[clamp(0.68rem,1.1vw,0.86rem)] font-medium uppercase leading-[1.18] tracking-[0.02em] text-white"
            >
              {blurb || "A flexible system. Choose the best option and start your dance journey with us!"}
            </motion.p>

            <motion.span
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.95, delay: 0.08, ease }}
              className="font-street block text-center text-[clamp(3rem,14vw,10.5rem)] uppercase leading-[0.82] md:text-right"
              style={{ color: "var(--acid)", textShadow: "0 0 50px rgba(191,255,46,0.35)" }}
            >
              {right}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Acid rule closing the banner */}
      <span aria-hidden className="block h-[6px] w-full" style={{ background: "var(--acid)" }} />
    </section>
  );
}
