"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, Ticket, CalendarDays, Users, Radio, MapPin, Quote,
  GraduationCap, Clock, Trophy, Smartphone, Sparkles, ArrowRight,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, SplitHeading, Parallax } from "@/components/motion/Reveal";
import { Badge, Button, Magnetic, SectionLabel, Spotlights, TiltCard } from "@/components/ui/Primitives";
import { GooglePlayIcon, AppleIcon } from "@/components/ui/Icons";
import { cn, formatINR, imageFor, isUsableImageUrl, splitDate, truncate, isEventExpired, isDeadlinePassed } from "@/lib/utils";
import type { BannerItem, ContestPromotion, CourseItem, EventItem, LiveEventItem, TestimonialItem } from "@/lib/api";
import CoverflowCarousel from "./CoverflowCarousel";

/* ═══════════ MARQUEE TICKER ═══════════ */

export function Marquee({ words = ["JOIN THE MOVEMENT", "BOOK YOUR STAGE", "DANCE LOUDER"] }: { words?: string[] }) {
  const items = [...words, ...words, ...words, ...words];
  return (
    <section aria-hidden className="relative overflow-hidden border-y border-[var(--border)] py-5" style={{ background: "var(--grad-brand)" }}>
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.map((w, i) => (
              <span key={`${dup}-${i}`} className="flex items-center gap-8 px-8 font-display text-base font-bold uppercase tracking-[0.2em] text-white md:text-xl">
                {w}
                <Sparkles className="size-4 shrink-0 opacity-80" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════ LIVE NOW ═══════════ */

export function LiveNow({ items }: { items: LiveEventItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <Spotlights variant="c" />
      <div className="container-x relative">
        <Reveal>
          <SectionLabel>Streaming right now</SectionLabel>
          <SplitHeading text="Live Stage" className="mt-5 font-display text-[clamp(2.2rem,6vw,4.2rem)] font-bold uppercase" />
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((ev, i) => (
            <StaggerItem key={ev._id}>
              <TiltCard className="group h-full">
                <article className="glow-ring relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="relative aspect-video overflow-hidden">
                    <img src={imageFor(ev.image_url, i)} alt="" className="size-full object-cover transition-transform duration-[1.1s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
                    <div className="absolute left-4 top-4"><Badge tone="live">Live</Badge></div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-display text-xl font-bold uppercase leading-tight">{ev.title}</h3>
                    {ev.description && <p className="text-sm text-[var(--fg-muted)]">{truncate(ev.description, 110)}</p>}
                    {ev.public_url && (
                      <a
                        href={ev.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex min-h-[44px] items-center gap-2 pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]"
                      >
                        <Radio className="size-4" aria-hidden /> Watch stream
                      </a>
                    )}
                  </div>
                </article>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ═══════════ EVENT CARD ═══════════ */

export function EventCard({ ev, index = 0 }: { ev: EventItem; index?: number }) {
  const d = splitDate(ev.date);
  const expired = isEventExpired(ev.date, ev.time);
  const deadlinePassed = isDeadlinePassed(ev.registration_deadline);
  const soldOut = expired || deadlinePassed || ev.event_status === "completed" || ev.registration_enabled === false;

  return (
    <TiltCard className="group h-full" intensity={7}>
      <article className={cn(
        "glow-ring relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] transition-all duration-500",
        expired ? "border-red-500/30" : "border-[var(--border)] hover:shadow-[0_40px_90px_-50px_var(--accent)]"
      )}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={imageFor(ev.image_url, index)}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110",
              expired && "filter blur-[1.5px] grayscale-[40%] opacity-60"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent" aria-hidden />

          {/* Date chip */}
          <div className="absolute left-4 top-4 flex flex-col items-center rounded-2xl border border-white/15 bg-black/55 px-3.5 py-2.5 backdrop-blur-xl">
            <span className="font-display text-2xl font-bold leading-none text-white">{d.day}</span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80">{d.month}</span>
          </div>

          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            {ev.event_status === "live" && <Badge tone="live">Live</Badge>}
            {expired ? (
              <Badge tone="danger">Expired</Badge>
            ) : soldOut ? (
              <Badge tone="danger">Closed</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <h3 className="font-display text-[22px] font-bold uppercase leading-[1.05] tracking-tight transition-colors group-hover:text-[var(--accent)]">
            {ev.title}
          </h3>

          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[var(--fg-muted)]">
            {ev.venue && (
              <li className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />{ev.venue}</li>
            )}
            {ev.time && (
              <li className="inline-flex items-center gap-1.5"><Clock className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />{ev.time}</li>
            )}
          </ul>

          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{truncate(ev.description, 96)}</p>

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
            <div>
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">From</span>
              <span className="font-display text-xl font-bold text-[var(--fg)]">{formatINR(ev.price)}</span>
            </div>
            <Link
              href={`/events/${ev._id}`}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-all duration-300",
                expired
                  ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "border-[var(--border-strong)] hover:border-transparent hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
              )}
            >
              <Ticket className="size-4" aria-hidden /> {expired ? "Expired" : "Book"}
            </Link>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}

/* ═══════════ UPCOMING EVENTS ═══════════ */

export function UpcomingEvents({ events }: { events: EventItem[] }) {
  if (!events?.length) return null;
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <Spotlights variant="a" />
      <div className="container-x relative">
        <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel>What's next</SectionLabel>
            <SplitHeading
              text="Upcoming Events"
              className="mt-5 font-display text-[clamp(2.2rem,7vw,5rem)] font-bold uppercase leading-[0.9]"
            />
          </div>
          <Magnetic>
            <Button href="/events" variant="outline">
              View all <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          </Magnetic>
        </Reveal>

        <div className="mt-12">
          <CoverflowCarousel events={events} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════ STATS ═══════════ */

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1600);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, reduce]);

  return <span ref={ref} className="tabular-nums">{val.toLocaleString("en-IN")}{suffix}</span>;
}

export function Stats({ eventCount = 0, courseCount = 0 }: { eventCount?: number; courseCount?: number }) {
  const stats = [
    { label: "Live events", value: Math.max(eventCount, 12), suffix: "+", Icon: CalendarDays },
    { label: "Dancers on stage", value: 25000, suffix: "+", Icon: Users },
    { label: "Masterclasses", value: Math.max(courseCount, 40), suffix: "+", Icon: GraduationCap },
    { label: "Cities covered", value: 28, suffix: "", Icon: Trophy },
  ];

  return (
    <section className="relative border-y border-[var(--border)] bg-[var(--bg-elevated)] py-14 noise">
      <div className="container-x">
        <StaggerGroup className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="flex flex-col gap-2">
                <s.Icon className="size-5 text-[var(--accent)]" aria-hidden />
                <span className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none text-gradient">
                  <Counter to={s.value} suffix={s.suffix} />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">{s.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ═══════════ COURSES / WORKSHOPS ═══════════ */

export function LearnGrid({
  title,
  label,
  items,
  href,
}: {
  title: string;
  label: string;
  items: CourseItem[];
  href: string;
}) {
  if (!items?.length) return null;

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <Spotlights variant="b" />
      <div className="container-x relative">
        <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel>{label}</SectionLabel>
            <SplitHeading text={title} className="mt-5 font-display text-[clamp(2.2rem,7vw,5rem)] font-bold uppercase leading-[0.9]" />
          </div>
          <Button href={href} variant="outline">All {label.toLowerCase()} <ArrowUpRight className="size-4" aria-hidden /></Button>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
          {items.slice(0, 4).map((c, i) => (
            <StaggerItem key={c._id} className="h-full">
              <TiltCard className="group h-full" intensity={6}>
                <article className="glow-ring flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={imageFor(c.thumbnail, i + 2)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1.2s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/20 to-transparent" aria-hidden />
                    <div className="absolute inset-x-4 bottom-4">
                      {c.registration_status && (
                        <Badge tone={c.can_register ? "success" : "neutral"}>{c.registration_status}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <h3 className="font-display text-lg font-bold uppercase leading-tight">{c.title}</h3>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">{c.instructor_name}</p>
                    <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">{truncate(c.description, 72)}</p>
                    <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
                      <span className="font-display text-base font-bold">{formatINR(c.price)}</span>
                      {typeof c.available_seats === "number" && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                          {c.available_seats} seats
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ═══════════ TESTIMONIALS ═══════════ */

export function Testimonials({ items }: { items: TestimonialItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--bg-elevated)] py-20 noise md:py-28">
      <div className="container-x relative">
        <Reveal className="max-w-2xl">
          <SectionLabel>Voices from the floor</SectionLabel>
          <SplitHeading text="What dancers say" className="mt-5 font-display text-[clamp(2.2rem,6vw,4.2rem)] font-bold uppercase leading-[0.9]" />
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.09}>
          {items.slice(0, 6).map((t, i) => (
            <StaggerItem key={t._id} className="h-full">
              <figure className="glow-ring flex h-full flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-7">
                <Quote className="size-7 shrink-0 text-[var(--accent)]" aria-hidden />
                <blockquote className="flex-1 text-[15px] leading-relaxed text-[var(--fg)]">"{t.message}"</blockquote>
                <figcaption className="flex items-center gap-3 border-t border-[var(--border)] pt-5">
                  <img
                    src={imageFor(t.profile_image, i)}
                    alt=""
                    loading="lazy"
                    className="size-11 shrink-0 rounded-full border border-[var(--border-strong)] object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{t.person_name}</span>
                    {t.role && <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">{t.role}</span>}
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ═══════════ CONTEST PROMOTIONS ═══════════ */

export function ContestBand({ items }: { items: ContestPromotion[] }) {
  if (!items?.length) return null;
  const main = items[0];

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container-x">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]">
            <Parallax speed={0.3} className="absolute inset-0 -z-20">
              <img src={imageFor(main.image_url, 4)} alt="" className="h-[130%] w-full object-cover" />
            </Parallax>
            <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(100deg, var(--bg) 8%, color-mix(in srgb,var(--bg) 60%,transparent) 55%, transparent)" }} aria-hidden />

            <div className="relative grid gap-8 p-9 md:p-16 lg:w-3/5">
              <div>
                <Badge tone="brand"><Trophy className="size-3" aria-hidden /> Competition</Badge>
                <h2 className="mt-5 font-display text-[clamp(2rem,5.5vw,3.8rem)] font-bold uppercase leading-[0.92]">{main.title}</h2>
                {main.description && <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">{truncate(main.description, 200)}</p>}
              </div>
              <div className="flex flex-wrap gap-4">
                <Magnetic>
                  <Button href={main.target_url || "/events"} size="lg">Enter now <ArrowRight className="size-4" aria-hidden /></Button>
                </Magnetic>
                <Button href="/events" variant="outline" size="lg">See prizes</Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════ SPONSORS ═══════════ */

export function Sponsors({ items }: { items: BannerItem[] }) {
  if (!items?.length) return null;
  const list = [...items, ...items];

  return (
    <section className="relative overflow-hidden border-y border-[var(--border)] py-12">
      <div className="container-x mb-8">
        <SectionLabel>Powered by our partners</SectionLabel>
      </div>
      <div className="relative">
        <div className="marquee-track items-center gap-14">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center gap-14 pr-14">
              {list.map((b, i) => (
                <a
                  key={`${dup}-${b._id}-${i}`}
                  href={b.target_url || "#"}
                  target={b.target_url ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group flex h-16 shrink-0 items-center opacity-55 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0"
                  aria-label={b.sponsor_name || b.title}
                >
                  {isUsableImageUrl(b.image_url) ? (
                    <img
                      src={b.image_url}
                      alt={b.sponsor_name || b.title}
                      className="h-full w-auto max-w-[180px] object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        img.nextElementSibling?.removeAttribute("hidden");
                      }}
                    />
                  ) : null}
                  <span
                    hidden={isUsableImageUrl(b.image_url)}
                    className="whitespace-nowrap text-lg font-semibold tracking-tight text-[var(--fg)]"
                  >
                    {b.sponsor_name || b.title}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ APP PROMOTION ═══════════ */

export function AppPromo({ promo }: { promo: Record<string, any> | null }) {
  if (!promo || !Object.keys(promo).length) return null;

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <Spotlights variant="b" />
      <div className="container-x relative">
        <div className="grid items-center gap-12 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9 md:p-14 lg:grid-cols-2">
          <Reveal>
            <Badge tone="brand"><Smartphone className="size-3" aria-hidden /> Mobile app</Badge>
            <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold uppercase leading-[0.92]">
              {promo.title || "Carry the stage in your pocket"}
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
              {promo.description || "Get instant ticket access, live results and backstage updates on the official app."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {promo.android_url && (
                <Button
                  href={promo.android_url}
                  size="lg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2.5"
                >
                  <GooglePlayIcon className="size-5 shrink-0" />
                  Google Play
                </Button>
              )}
              {promo.ios_url && (
                <Button
                  href={promo.ios_url}
                  variant="outline"
                  size="lg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2.5"
                >
                  <AppleIcon className="size-5 shrink-0" />
                  App Store
                </Button>
              )}
              {!promo.android_url && !promo.ios_url && (
                <Button href="/events" size="lg">
                  Explore events
                </Button>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.12} x={40} y={0}>
            <Parallax speed={0.2}>
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-[2.2rem] border-[6px] border-[var(--surface-2)] shadow-[0_50px_100px_-40px_var(--accent)]">
                <img src={imageFor(promo.image_url, 5)} alt="" className="size-full object-cover" loading="lazy" />
              </div>
            </Parallax>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
