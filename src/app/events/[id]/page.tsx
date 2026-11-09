import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Clock, Users, Ticket, ArrowUpRight, ShieldCheck, Zap, QrCode, Armchair, Check, Sparkles } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import { EventCard } from "@/components/home/Sections";
import { Reveal, StaggerGroup, StaggerItem, SplitHeading } from "@/components/motion/Reveal";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { getEventById, getRelatedEvents } from "@/lib/events";
import { formatEventDate, formatINR, isEventExpired, isDeadlinePassed } from "@/lib/utils";
import Countdown from "@/components/events/Countdown";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { getSeatingZoneMeta } from "@/components/events/BookingFlow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const expired = isEventExpired(ev.date, ev.time);
  const deadlinePassed = isDeadlinePassed(ev.registration_deadline);
  const bookable = !expired && !deadlinePassed && ev.registration_enabled !== false && ev.event_status !== "completed" && ev.event_status !== "cancelled";

  // Category & Price Range Calculation (BookMyShow Style)
  const categories = Array.isArray(ev.categories) && ev.categories.length > 0 ? ev.categories : null;
  const categoryPrices = categories
    ? categories.map((c) => Number(c.price || 0)).filter((p) => !isNaN(p))
    : [Number(ev.price || 0)];

  const minPrice = categoryPrices.length ? Math.min(...categoryPrices) : Number(ev.price || 0);
  const maxPrice = categoryPrices.length ? Math.max(...categoryPrices) : Number(ev.price || 0);
  const priceRangeDisplay = minPrice === maxPrice ? formatINR(minPrice) : `${formatINR(minPrice)} – ${formatINR(maxPrice)}`;

  const facts = [
    { Icon: CalendarDays, label: "Date", value: formatEventDate(ev.date) },
    { Icon: Clock, label: "Time", value: ev.time || "To be announced" },
    { Icon: MapPin, label: "Venue", value: ev.venue || "To be announced" },
    { Icon: Users, label: "Capacity", value: ev.capacity ? `${ev.capacity} seats` : "Open" },
  ];

  const perks = [
    { Icon: QrCode, title: "Instant digital ticket", body: "A scannable QR pass with assigned tier lands in your dashboard immediately." },
    { Icon: ShieldCheck, title: "Secure checkout", body: "Payments verified server-side with Razorpay signature validation and auto-receipt." },
    { Icon: Zap, title: "Gate-ready entry", body: "Direct scan at venue turnstiles with designated fast-track gates for VIP/Platinum." },
  ];

  return (
    <>
      <PageHero
        title={ev.title}
        subtitle={ev.venue}
        image={ev.banner_url || ev.banner_image_url || ev.image_url}
        seed={3}
      />

      <section className="relative overflow-hidden py-16 md:py-24">
        <Spotlights variant="a" />
        <div className="container-x relative grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          {/* Main */}
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                {ev.event_status === "live" && <Badge tone="live">Live now</Badge>}
                {expired ? (
                  <Badge tone="danger">Event Expired</Badge>
                ) : (
                  <Badge tone={bookable ? "success" : "danger"}>{bookable ? "Booking open" : "Booking closed"}</Badge>
                )}
                {minPrice === 0 && <Badge tone="brand">Free entry available</Badge>}
                {categories && (
                  <Badge tone="brand">
                    <Armchair className="mr-1 inline-block size-3.5" />
                    {categories.length} Seating Tiers Available
                  </Badge>
                )}
              </div>

              <SplitHeading
                text="About this event"
                className="mt-8 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase"
              />
              <div className="mt-6">
                <FormattedDescription content={ev.description} />
              </div>
            </Reveal>

            {/* ═══════════ BOOKMYSHOW SEATING TIERS SHOWCASE ═══════════ */}
            {categories && categories.length > 0 && (
              <Reveal className="mt-14">
                <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--acid)] flex items-center gap-1.5">
                        <Armchair className="size-4" /> BookMyShow Arena Seating Layout
                      </span>
                      <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-white mt-1">
                        Seating Categories &amp; Pricing
                      </h3>
                    </div>
                    <Link
                      href={`/events/${ev._id}/book`}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--acid)] hover:underline"
                    >
                      View Live Arena Map <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {categories.map((cat, idx) => {
                      const meta = getSeatingZoneMeta(cat.name);
                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-5 transition-all hover:border-white/30"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: meta.badgeBg, color: meta.themeColor }}
                              >
                                {meta.badge}
                              </span>
                              <span className="font-mono text-xs text-white/50">{meta.badgeLabel}</span>
                            </div>
                            <h4 className="font-display mt-2.5 text-base font-bold uppercase text-white">
                              {cat.name} Tier
                            </h4>
                            <p className="mt-1 text-xs text-white/60">
                              {cat.description || meta.zoneSubtitle}
                            </p>
                            <div className="mt-4 flex items-baseline gap-1.5">
                              <span className="font-street text-2xl font-bold" style={{ color: meta.themeColor }}>
                                {formatINR(cat.price)}
                              </span>
                              <span className="font-mono text-[11px] text-white/40">/ pass</span>
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="font-mono text-[10.5px] text-white/50">
                              {cat.capacity ? `${cat.capacity} max seats` : "Arena access"}
                            </span>
                            <Link
                              href={`/events/${ev._id}/book?tier=${encodeURIComponent(cat.name)}`}
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-white hover:text-[var(--acid)]"
                            >
                              Book Tier <ArrowUpRight className="size-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

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
                  <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--fg-subtle)]">
                    {categories && categories.length > 1 ? "Seating passes from" : "Tickets from"}
                  </span>
                  <p className="mt-2 font-display text-[clamp(1.9rem,5vw,2.9rem)] font-bold leading-none text-gradient">
                    {priceRangeDisplay}
                  </p>

                  {categories && categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {categories.map((c, i) => (
                        <span key={i} className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-white/80">
                          {c.name}: {formatINR(c.price)}
                        </span>
                      ))}
                    </div>
                  )}

                  <Countdown target={ev.registration_deadline || ev.date} />

                  <div className="mt-7 flex flex-col gap-3">
                    <Button href={bookable ? `/events/${ev._id}/book` : undefined} size="lg" disabled={!bookable} className="w-full">
                      <Ticket className="size-4" aria-hidden /> {expired ? "Event Expired" : deadlinePassed ? "Registration Closed" : bookable ? "Select Seats & Book" : "Booking closed"}
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
