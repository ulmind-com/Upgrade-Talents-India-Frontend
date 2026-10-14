"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImageOff } from "lucide-react";
import { Parallax, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { imageFor } from "@/lib/utils";

type Shot = { id: string; src?: string | null; caption?: string; seed: number };

export default function GalleryGrid({ shots }: { shots: Shot[] }) {
  const [open, setOpen] = useState<Shot | null>(null);

  // Guarantee a full-looking grid even with sparse CMS content.
  const filled: Shot[] = shots.length >= 9 ? shots : [
    ...shots,
    ...Array.from({ length: Math.max(0, 9 - shots.length) }, (_, i) => ({
      id: `f-${i}`, src: null, caption: "Upgrade Talents India", seed: i,
    })),
  ];

  if (!filled.length) {
    return (
      <section className="py-24">
        <div className="container-x flex flex-col items-center gap-4 text-center">
          <ImageOff className="size-10 text-[var(--fg-subtle)]" aria-hidden />
          <p className="text-sm text-[var(--fg-muted)]">No photos published yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 md:py-24">
      <div className="container-x">
        <StaggerGroup className="columns-2 gap-5 md:columns-3 lg:columns-4" stagger={0.05}>
          {filled.map((s, i) => (
            <StaggerItem key={s.id} className="mb-5 break-inside-avoid">
              <button
                onClick={() => setOpen(s)}
                className="group relative block w-full cursor-pointer overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"
                aria-label={`View ${s.caption || "photo"}`}
              >
                <Parallax speed={i % 3 === 0 ? 0.12 : 0.05}>
                  <img
                    src={imageFor(s.src, s.seed)}
                    alt={s.caption || ""}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                    style={{ aspectRatio: i % 4 === 0 ? "3/4" : i % 3 === 0 ? "1/1" : "4/5" }}
                  />
                </Parallax>
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "linear-gradient(180deg, transparent 40%, color-mix(in srgb,var(--bg) 88%,transparent))" }}
                />
                {s.caption && (
                  <span className="absolute inset-x-4 bottom-4 translate-y-3 text-left font-display text-sm font-bold uppercase leading-tight text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {s.caption}
                  </span>
                )}
              </button>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center p-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-label={open.caption || "Photo"}
          >
            <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-xl" onClick={() => setOpen(null)} />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)]"
            >
              <button
                onClick={() => setOpen(null)}
                aria-label="Close photo"
                className="absolute right-4 top-4 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur-xl"
              >
                <X className="size-4" aria-hidden />
              </button>
              <img src={imageFor(open.src, open.seed)} alt={open.caption || ""} className="max-h-[86vh] w-full object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
