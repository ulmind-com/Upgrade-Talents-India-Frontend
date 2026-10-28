"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Ticket, Trophy } from "lucide-react";
import { formatINR, imageFor, splitDate } from "@/lib/utils";
import type { EventItem } from "@/lib/api";

/* Arched card row — every panel's geometry comes from its x position, like
   the inside of a cylinder: panels widen and grow taller towards the screen
   edges, with their outer edge taller than the inner one. Drifts right to
   left, drag to scrub, momentum on release. */

const PITCH = 196;     // design units between card centres
const SPEED = 50;      // units per second, right -> left
const CX = 720;        // design-unit centre of the arch
const SPREAD = 706;    // normalising distance
const RADIUS = 15;     // corner radius, design units
const DECAY = 0.05;    // share of the throw velocity kept per second
const BAND = 460;     // design-unit height of the row

export type CoverflowItem = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  date?: string;
  image_url?: string;
  price?: number;
  href: string;
  ctaText?: string;
  isCompetition?: boolean;
};

type Panel = { item: CoverflowItem; key: string; idx: number };

const FALLBACK_COMPETITIONS: CoverflowItem[] = [
  {
    id: "all-india-hip-hop-championship",
    title: "All India Hip-Hop Championship",
    category: "Street Dance",
    date: "2026-11-15",
    price: 499,
    image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
  {
    id: "voice-of-the-nation-season-4",
    title: "Voice of the Nation - Season 4",
    category: "Singing & Vocals",
    date: "2026-11-28",
    price: 299,
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
  {
    id: "nritya-tarang-classical-solo",
    title: "Nritya Tarang: Classical Solo",
    category: "Classical Dance",
    date: "2026-12-05",
    price: 399,
    image_url: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
  {
    id: "desi-rap-cypher-league",
    title: "Desi Rap Cypher League",
    category: "Rap & Beatbox",
    date: "2026-12-12",
    price: 199,
    image_url: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
  {
    id: "symphony-strings-drums",
    title: "Symphony Strings & Drums Battle",
    category: "Instrumental",
    date: "2026-12-20",
    price: 349,
    image_url: "https://images.unsplash.com/photo-1545959570-a94084071b5d?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
  {
    id: "mono-act-dramatic-showcase",
    title: "Mono-Act Dramatic Showcase",
    category: "Acting & Drama",
    date: "2026-12-28",
    price: 249,
    image_url: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1400&q=80",
    href: "/competitions",
    isCompetition: true,
  },
];

const r2 = (v: number) => Math.round(v * 100) / 100;

function along(from: number[], to: number[], r: number) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.min(r, len / 2) / len;
  return [from[0] + dx * k, from[1] + dy * k];
}

/* rounded quad — the four corners are cut back and joined with a curve */
function quadPath(pts: number[][], r: number) {
  const n = pts.length;
  const seg = pts.map((cur, i) => ({
    cur,
    a: along(cur, pts[(i + n - 1) % n], r),
    b: along(cur, pts[(i + 1) % n], r),
  }));
  let d = `M ${r2(seg[0].a[0])} ${r2(seg[0].a[1])}`;
  for (let i = 0; i < n; i++) {
    const s = seg[i];
    const nx = seg[(i + 1) % n];
    d += ` Q ${r2(s.cur[0])} ${r2(s.cur[1])} ${r2(s.b[0])} ${r2(s.b[1])}`;
    d += ` L ${r2(nx.a[0])} ${r2(nx.a[1])}`;
  }
  return `${d} Z`;
}

export default function CoverflowCarousel({
  events,
  competitions,
}: {
  events?: EventItem[];
  competitions?: any[];
}) {
  let source: CoverflowItem[] = [];

  const rawComps = (competitions || []).filter(Boolean);
  const rawEvents = (events || []).filter(Boolean);

  if (rawComps.length > 0) {
    source = rawComps.map((c: any) => ({
      id: c._id || c.id || "",
      title: c.title || c.name || "Competition",
      subtitle: c.category || "Competition",
      category: c.category || "Talent Contest",
      date: c.start_date || c.registration_deadline || c.date,
      image_url: c.card_image_url || c.image_url || c.banner_image_url || c.banner_url,
      price: c.participation_fee,
      href: c._id || c.id ? `/competitions/${c._id || c.id}` : "/competitions",
      ctaText: "Enter competition",
      isCompetition: true,
    }));
  } else if (rawEvents.length > 0) {
    source = rawEvents.map((ev) => ({
      id: ev._id,
      title: ev.title,
      subtitle: ev.venue || "Venue TBA",
      category: "Talent Stage",
      date: ev.date,
      image_url: ev.image_url,
      price: ev.price,
      href: `/events/${ev._id}`,
      ctaText: "Enter competition",
      isCompetition: true,
    }));
  }

  // Ensure there are always at least 6 cards in source so arch never breaks or empties
  if (source.length < 6) {
    const existingIds = new Set(source.map((c) => c.id).filter(Boolean));
    const needed = 6 - source.length;
    const fill = FALLBACK_COMPETITIONS.filter((f) => !existingIds.has(f.id)).slice(0, needed);
    source = [...source, ...fill];
  }

  // Double fallback guard: if still empty for any reason, use full fallbacks
  if (source.length === 0) {
    source = FALLBACK_COMPETITIONS;
  }

  const panels: Panel[] = Array.from({ length: Math.max(10, source.length) }, (_, i) => {
    const item = source[i % source.length];
    return { item, key: `${item.id || i}-${i}`, idx: i % source.length };
  });
  const n = panels.length;
  const loop = n * PITCH;

  const hostRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scroll = useRef(0);
  const vel = useRef(0);
  const drag = useRef({ active: false, x: 0, t: 0, moved: 0 });
  const [height, setHeight] = useState(400);

  /* reserve the row's height before anything paints */
  useLayoutEffect(() => {
    const read = () => {
      const w = hostRef.current?.clientWidth || window.innerWidth;
      const narrow = window.innerWidth <= 820;
      const s = narrow ? w / 640 : w / 1440;
      // only a 640 unit window shows on phones, so the arch needs less room
      setHeight(Math.max(230, Math.round((narrow ? 320 : BAND) * s)));
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => {
    if (!n) return;
    const host = hostRef.current;
    if (!host) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scaleOf = () => {
      const w = host.clientWidth || 1;
      return window.innerWidth <= 820 ? w / 640 : w / 1440;
    };

    const layout = () => {
      const bw = host.clientWidth;
      const bh = host.clientHeight;
      if (!bw) return;
      const s = scaleOf();
      const ox = bw / 2;
      const oy = bh / 2;

      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        // even pitch, wrapped into [-loop/2, loop/2)
        let t = (i * PITCH - scroll.current) % loop;
        if (t < 0) t += loop;
        t -= loop / 2;
        // each centre is pushed outward so the gap survives the curve
        const x = CX + t * (1 + 0.083 * Math.pow(t / SPREAD, 2));

        const d = Math.abs(x - CX) / SPREAD;
        const w = 170 + 48 * d * d;
        const xL = x - w / 2;
        const xR = x + w / 2;
        const qL = Math.abs(xL - CX) / SPREAD;
        const qR = Math.abs(xR - CX) / SPREAD;
        const hL = 280 + 92 * Math.pow(qL, 2.6);
        const hR = 280 + 92 * Math.pow(qR, 2.6);
        const cy = 687 - 12 * d * d;

        const leftPx = (xL - CX) * s + ox;
        const wPx = w * s;
        if (leftPx > bw + 40 || leftPx + wPx < -40) {
          el.style.display = "none";
          continue;
        }
        el.style.display = "";

        const topU = Math.min(cy - hL / 2, cy - hR / 2);
        const botU = Math.max(cy + hL / 2, cy + hR / 2);
        const topPx = (topU - 687) * s + oy;
        const hPx = (botU - topU) * s;

        el.style.transform = `translate(${r2(leftPx)}px, ${r2(topPx)}px)`;
        el.style.width = `${r2(wPx)}px`;
        el.style.height = `${r2(hPx)}px`;

        const yTL = (cy - hL / 2 - topU) * s;
        const yBL = (cy + hL / 2 - topU) * s;
        const yTR = (cy - hR / 2 - topU) * s;
        const yBR = (cy + hR / 2 - topU) * s;
        el.style.clipPath = `path("${quadPath(
          [[0, yTL], [wPx, yTR], [wPx, yBR], [0, yBL]],
          RADIUS * s
        )}")`;

        const shade = el.querySelector<HTMLElement>("[data-shade]");
        if (shade) shade.style.opacity = String(Math.min(0.6, d * 0.52));
      }
    };

    layout();
    window.addEventListener("resize", layout);
    if (reduce) return () => window.removeEventListener("resize", layout);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag.current.active) {
        scroll.current += (SPEED + vel.current) * dt;
        vel.current *= Math.pow(DECAY, dt);
        if (Math.abs(vel.current) < 0.5) vel.current = 0;
      }
      layout();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
    };
  }, [n, loop]);

  if (!n) return null;

  const unitsPerPx = () => {
    const w = hostRef.current?.clientWidth || 1;
    return 1 / ((window.innerWidth <= 820 ? w / 640 : w / 1440) || 1);
  };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { active: true, x: e.clientX, t: performance.now(), moved: 0 };
    vel.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.x;
    const dt = Math.max(1 / 240, (now - drag.current.t) / 1000);
    drag.current.x = e.clientX;
    drag.current.t = now;
    drag.current.moved += Math.abs(dx);
    const du = dx * unitsPerPx();
    scroll.current -= du;     // follows the pointer 1:1
    vel.current = -du / dt;   // carries the throw
  };
  const onUp = () => { drag.current.active = false; };

  return (
    <div
      ref={hostRef}
      className="relative w-screen cursor-grab overflow-hidden touch-pan-y active:cursor-grabbing"
      style={{ height, marginLeft: "calc(50% - 50vw)" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {panels.map((p, i) => {
        const item = p.item;
        const sd = splitDate(item.date);
        return (
          <div
            key={p.key}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="absolute left-0 top-0 overflow-hidden bg-[var(--surface)]"
            style={{ willChange: "transform, clip-path, width, height" }}
          >
            <Link
              href={item.href}
              onClick={(e) => { if (drag.current.moved > 6) e.preventDefault(); }}
              draggable={false}
              className="group relative block size-full"
            >
              <img
                src={imageFor(item.image_url, p.idx)}
                alt={item.title}
                draggable={false}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* distance shade — panels darken towards the edges of the arch */}
              <span data-shade aria-hidden className="absolute inset-0 bg-[#04050c]" style={{ opacity: 0 }} />

              {/* details ride in on hover so the arch stays pure image at rest */}
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "linear-gradient(180deg, rgba(4,5,12,0) 25%, rgba(4,5,12,0.85) 72%, rgba(4,5,12,0.98) 100%)" }}
              />
              <div className="absolute inset-x-0 bottom-0 translate-y-3 p-3.5 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-semibold">
                    {sd.month ? `${sd.month} ${sd.day}` : "Upcoming"}
                  </p>
                  {item.category && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white/90 backdrop-blur-sm">
                      {item.category}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-display text-[0.98rem] font-bold leading-tight line-clamp-2">{item.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
                  {item.isCompetition ? (
                    <>
                      <Trophy className="size-3 shrink-0 text-amber-400" aria-hidden />
                      <span className="truncate">{item.price && item.price > 0 ? `Entry: ${formatINR(item.price)}` : "Free Entry"}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{item.subtitle || "Venue TBA"}</span>
                    </>
                  )}
                </p>
                <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--on-accent)] shadow-md" style={{ background: "var(--grad-brand)" }}>
                  {item.isCompetition ? <Trophy className="size-3.5" aria-hidden /> : <Ticket className="size-3.5" aria-hidden />}
                  {item.ctaText || (item.isCompetition ? "Enter competition" : "Book tickets")}
                </span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
