"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays, Ticket, ArrowUpRight } from "lucide-react";
import { imageFor, formatEventDate, splitDate } from "@/lib/utils";
import type { EventItem } from "@/lib/api";

/* Glassy 3D coverflow carousel — center card flat & crisp, neighbours
   recede in perspective (rotateY + scale + dim). Auto-advances, arrow
   + dot controls, click a side card to bring it forward. */

function placement(d: number) {
  const ad = Math.abs(d);
  if (ad > 2) return { x: `${d > 0 ? 170 : -170}%`, rotateY: 0, scale: 0.5, z: 0, opacity: 0, blur: 6 };
  if (d === 0) return { x: "0%", rotateY: 0, scale: 1, z: 40, opacity: 1, blur: 0 };
  const dir = d > 0 ? 1 : -1;
  if (ad === 1) return { x: `${dir * 56}%`, rotateY: -dir * 34, scale: 0.84, z: 25, opacity: 0.72, blur: 1.5 };
  return { x: `${dir * 100}%`, rotateY: -dir * 42, scale: 0.68, z: 12, opacity: 0.38, blur: 3 };
}

export default function CoverflowCarousel({ events }: { events: EventItem[] }) {
  const items = (events || []).slice(0, 7);
  const n = items.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((dir: number) => setActive((a) => (a + dir + n) % n), [n]);

  useEffect(() => {
    if (paused || n <= 1) return;
    timer.current = setInterval(() => setActive((a) => (a + 1) % n), 4500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused, n]);

  if (!n) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* stage */}
      <div className="relative mx-auto h-[460px] md:h-[520px]" style={{ perspective: "1500px" }}>
        {items.map((ev, i) => {
          let d = i - active;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const p = placement(d);
          const isActive = d === 0;
          const sd = splitDate(ev.date);
          return (
            <div key={ev._id || i} className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: p.z, perspective: "1500px" }}>
              <motion.article
                className={`w-[78vw] max-w-[340px] ${isActive ? "" : "pointer-events-auto"} cursor-pointer`}
                animate={{ x: p.x, rotateY: p.rotateY, scale: p.scale, opacity: p.opacity, filter: `blur(${p.blur}px)` }}
                transition={{ type: "spring", stiffness: 170, damping: 24 }}
                onClick={() => (isActive ? null : setActive(i))}
                aria-hidden={!isActive}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="group pointer-events-auto relative h-[420px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] md:h-[470px]"
                  style={{ boxShadow: isActive ? "0 36px 70px -42px rgba(0,0,0,0.4), 0 0 60px -28px color-mix(in srgb, var(--accent) 55%, transparent)" : "0 22px 48px -40px rgba(0,0,0,0.38)" }}
                >
                  <img src={imageFor(ev.image_url, i)} alt="" className="absolute inset-0 size-full object-cover" />
                  <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,6,16,0.15) 0%, rgba(5,6,16,0.35) 45%, rgba(5,6,16,0.92) 100%)" }} />

                  {/* top row */}
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white backdrop-blur-md" style={{ background: "rgba(255,255,255,0.14)" }}>
                      <CalendarDays className="size-3" aria-hidden /> {sd.month} {sd.day}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md" style={{ background: "rgba(0,0,0,0.35)" }}>{i + 1} / {n}</span>
                  </div>

                  {/* glass info panel */}
                  <div className="absolute inset-x-3 bottom-3 rounded-[var(--radius-lg)] border border-white/15 p-4 text-white backdrop-blur-xl" style={{ background: "rgba(10,12,24,0.42)" }}>
                    <h3 className="font-display text-[1.35rem] font-bold leading-tight">{ev.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/75"><MapPin className="size-3.5 shrink-0" aria-hidden /> {ev.venue || "Venue TBA"}</p>
                    {isActive && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/75"><CalendarDays className="size-3.5 shrink-0" aria-hidden /> {formatEventDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</p>
                        <Link href={`/events/${ev._id}`} onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                          <Ticket className="size-4" aria-hidden /> Book tickets
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.article>
            </div>
          );
        })}
      </div>

      {/* controls */}
      {n > 1 && (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button onClick={() => go(-1)} aria-label="Previous event" className="grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"><ChevronLeft className="size-5" aria-hidden /></button>
          <div className="flex items-center gap-2">
            {items.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} aria-label={`Go to event ${i + 1}`}
                className="h-2 rounded-full transition-all duration-300"
                style={i === active ? { width: 26, background: "var(--grad-brand)" } : { width: 8, background: "var(--border-strong)" }} />
            ))}
          </div>
          <button onClick={() => go(1)} aria-label="Next event" className="grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"><ChevronRight className="size-5" aria-hidden /></button>
        </div>
      )}
    </div>
  );
}
