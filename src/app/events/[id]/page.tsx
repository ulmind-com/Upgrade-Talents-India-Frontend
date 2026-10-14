import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Clock, Users, Ticket, ArrowUpRight, ShieldCheck, Zap, QrCode } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import { EventCard } from "@/components/home/Sections";
import { Reveal, StaggerGroup, StaggerItem, SplitHeading } from "@/components/motion/Reveal";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { getEventById, getRelatedEvents } from "@/lib/events";
import { formatEventDate, formatINR } from "@/lib/utils";
import Countdown from "@/components/events/Countdown";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEventById(id);
  return {
    title: ev?.title || "Event",
    description: ev?.description?.slice(0, 150) || "Event details and ticket booking.",
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = await getEventById(id);
  if (!ev) notFound();

  const related = await getRelatedEvents(id);
  const bookable = ev.registration_enabled !== false && ev.event_status !== "completed" && ev.event_status !== "cancelled";

  const facts = [
    { Icon: CalendarDays, label: "Date", value: formatEventDate(ev.date) },
    { Icon: Clock, label: "Time", value: ev.time || "To be announced" },
    { Icon: MapPin, label: "Venue", value: ev.venue || "To be announced" },
    { Icon: Users, label: "Capacity", value: ev.capacity ? `${ev.capacity} seats` : "Open" },
  ];

  const perks = [
    { Icon: QrCode, title: "Instant digital ticket", body: "A scannable QR pass lands in your dashboard the moment payment clears." },
    { Icon: ShieldCheck, title: "Secure checkout", body: "Payments are verified server-side with Razorpay signature validation." },
    { Icon: Zap, title: "Gate-ready entry", body: "Tap in at the gate — one scan per pass, re-entry rules handled automatically." },
  ];

  return (
    <>
      <PageHero title={ev.title} subtitle={ev.venue} image={ev.image_url} seed={3} />

      <section className="relative overflow-hidden py-16 md:py-24">
        <Spotlights variant="a" />
        <div className="container-x relative grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          {/* Main */}
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                {ev.event_status === "live" && <Badge tone="live">Live now</Badge>}
                <Badge tone={bookable ? "success" : "danger"}>{bookable ? "Booking open" : "Booking closed"}</Badge>
                {!ev.price && <Badge tone="brand">Free entry</Badge>}
              </div>

              <SplitHeading
                text="About this event"
                className="mt-8 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase"
              />
              <p className="mt-6 whitespace-pre-line text-[15px] leading-[1.85] text-[var(--fg-muted)]">{ev.description}</p>
            </Reveal>

            <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2">
              {facts.map((f) => (
                <StaggerItem key={f.label}>
                  <div className="glow-ring flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--grad-brand)" }}>
                      <f.Icon className="size-5 text-white" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">{f.label}</span>
                      <span className="mt-1 block text-[15px] font-semibold [overflow-wrap:anywhere]">{f.value}</span>
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-3">
              {perks.map((p) => (
                <StaggerItem key={p.title}>
                  <div className="flex h-full flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-5">
                    <p.Icon className="size-5 text-[var(--accent)]" aria-hidden />
                    <h3 className="font-display text-base font-bold uppercase leading-tight">{p.title}</h3>
                    <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">{p.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>

          {/* Sticky booking rail */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <Reveal delay={0.1}>
              <div className="glow-ring overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                <div className="p-7" style={{ background: "var(--grad-surface)" }}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--fg-subtle)]">Tickets from</span>
                  <p className="mt-2 font-display text-[clamp(2.2rem,6vw,3.2rem)] font-bold leading-none text-gradient">
                    {formatINR(ev.price)}
                  </p>

                  <Countdown target={ev.registration_deadline || ev.date} />

                  <div className="mt-7 flex flex-col gap-3">
                    <Button href={`/events/${ev._id}/book`} size="lg" disabled={!bookable} className="w-full">
                      <Ticket className="size-4" aria-hidden /> {bookable ? "Book tickets" : "Booking closed"}
                    </Button>
                    <Button href="/events" variant="outline" size="lg" className="w-full">
                      Other events <ArrowUpRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                  {facts.slice(0, 3).map((f) => (
                    <li key={f.label} className="flex items-center justify-between gap-4 px-7 py-4">
                      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                        <f.Icon className="size-3.5" aria-hidden /> {f.label}
                      </span>
                      <span className="truncate text-right text-[13px] font-semibold">{f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="relative border-t border-[var(--border)] py-20">
          <div className="container-x">
            <Reveal className="flex items-end justify-between gap-6">
              <div>
                <SectionLabel>Keep dancing</SectionLabel>
                <SplitHeading text="You may also like" className="mt-5 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-bold uppercase" />
              </div>
              <Link href="/events" className="hidden shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] md:inline-flex">
                All events <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </Reveal>

            <StaggerGroup className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <StaggerItem key={r._id} className="h-full"><EventCard ev={r} index={i} /></StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}
    </>
  );
}
