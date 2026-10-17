"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Ticket, CalendarDays, User, Loader2, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, TicketX, Receipt,
} from "lucide-react";
import { bookingsApi, type MyTicket } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR } from "@/lib/utils";
import { TicketPass } from "@/components/ticket/TicketPass";

type Tab = "tickets" | "bookings" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/dashboard");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([bookingsApi.myTickets(), bookingsApi.my()])
      .then(([t, b]) => {
        if (cancelled) return;
        if (t.status === "fulfilled") setTickets(Array.isArray(t.value) ? t.value : []);
        if (b.status === "fulfilled") setBookings(Array.isArray(b.value) ? b.value : []);
        if (t.status === "rejected" && b.status === "rejected") {
          setError("Could not load your bookings right now.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || !user) {
    return (
      <section className="grid min-h-dvh place-items-center">
        <Loader2 className="size-7 animate-spin text-[var(--accent)]" aria-label="Loading" />
      </section>
    );
  }

  const TABS: { key: Tab; label: string; Icon: any; count?: number }[] = [
    { key: "tickets", label: "My Tickets", Icon: Ticket, count: tickets.length },
    { key: "bookings", label: "Bookings", Icon: Receipt, count: bookings.length },
    { key: "profile", label: "Profile", Icon: User },
  ];

  return (
    <section className="relative min-h-dvh overflow-hidden pb-24 pt-32 noise md:pt-40">
      <Spotlights variant="b" />

      <div className="container-x relative">
        <Reveal>
          <SectionLabel>Your account</SectionLabel>
          <SplitHeading
            text={`Hey, ${user?.name?.split(" ")[0] || "dancer"}`}
            className="mt-5 font-display text-[clamp(2.2rem,7vw,4.6rem)] font-bold uppercase leading-[0.9]"
          />
          <p className="mt-4 max-w-lg text-[15px] text-[var(--fg-muted)]">
            Your passes, bookings and profile — all in one place.
          </p>
        </Reveal>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative inline-flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-full border px-5 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors duration-300",
                tab === t.key ? "border-transparent text-[var(--on-accent)]" : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
              )}
            >
              {tab === t.key && (
                <motion.span layoutId="dash-tab" className="absolute inset-0 -z-10 rounded-full" style={{ background: "var(--grad-brand)" }} transition={{ type: "spring", stiffness: 340, damping: 30 }} />
              )}
              <t.Icon className="size-4" aria-hidden /> {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] tabular-nums">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-10 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-6">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" aria-hidden />
            <div>
              <p className="text-sm text-[var(--danger)]">{error}</p>
              <Button onClick={() => location.reload()} variant="outline" size="sm" className="mt-4">Retry</Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-[var(--radius-lg)]" />)}
          </div>
        )}

        {/* ── TICKETS: ULTRA-PRO HORIZONTAL TICKET VOUCHER ── */}
        {!loading && tab === "tickets" && (
          tickets.length ? (
            <div className="mt-10 flex flex-col gap-10">
              {tickets.map((t, idx) => (
                <Reveal key={t.ticket_ref} delay={idx * 0.08}>
                  <TicketPass ticket={t} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              Icon={TicketX}
              title="No tickets yet"
              body="Once you book an event, your QR passes appear here instantly."
            />
          )
        )}

        {/* ── BOOKINGS ── */}
        {!loading && tab === "bookings" && (
          bookings.length ? (
            <div className="mt-10 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              <ul className="divide-y divide-[var(--border)]">
                {bookings.map((b, i) => {
                  const paid = b.payment_status === "PAID" || b.payment_status === "NOT_REQUIRED";
                  const cancelled = b.booking_status === "CANCELLED";
                  return (
                    <motion.li
                      key={b._id || b.booking_reference || i}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="flex flex-col gap-4 p-6 transition-colors hover:bg-[var(--surface-2)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={cancelled ? "danger" : paid ? "success" : "warning"}>
                            {cancelled ? "Cancelled" : paid ? "Confirmed" : "Payment pending"}
                          </Badge>
                          <span className="font-mono text-[11px] text-[var(--fg-subtle)]">{b.quantity} × pass</span>
                        </div>
                        <p className="mt-2 font-mono text-sm font-semibold [overflow-wrap:anywhere]">{b.booking_reference}</p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
                          <Clock className="size-3.5 shrink-0" aria-hidden /> {formatEventDate(b.booked_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="font-display text-xl font-bold">{formatINR(b.total_amount)}</span>
                        {paid ? (
                          <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" aria-label="Confirmed" />
                        ) : !cancelled ? (
                          <Button href="/events" size="sm" variant="outline">Complete</Button>
                        ) : null}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState Icon={Receipt} title="No bookings yet" body="Your booking history will show up here." />
          )
        )}

        {/* ── PROFILE ── */}
        {!loading && tab === "profile" && (
          <Reveal className="mt-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                <span className="mx-auto grid size-24 place-items-center overflow-hidden rounded-full border-2 border-[var(--accent)]">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt="" className="size-full object-cover" />
                  ) : (
                    <User className="size-9 text-[var(--fg-muted)]" aria-hidden />
                  )}
                </span>
                <h2 className="mt-5 font-display text-xl font-bold uppercase">{user?.name || "Dancer"}</h2>
                <p className="mt-1 text-[13px] text-[var(--fg-muted)] [overflow-wrap:anywhere]">{user?.email}</p>
                <Button onClick={logout} variant="outline" className="mt-7 w-full">Log out</Button>
              </div>

              <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                {[
                  { k: "Full name", v: user?.name },
                  { k: "Email", v: user?.email },
                  { k: "Phone", v: user?.phone_number },
                  { k: "Date of birth", v: user?.date_of_birth ? formatEventDate(user.date_of_birth) : null },
                  { k: "Address", v: user?.address },
                  { k: "Referral code", v: user?.referral_code },
                ].map((row) => (
                  <div key={row.k} className="flex items-start justify-between gap-6 px-7 py-5">
                    <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">{row.k}</dt>
                    <dd className="text-right text-sm font-semibold [overflow-wrap:anywhere]">{row.v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function EmptyState({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] px-6 py-24 text-center">
      <Icon className="size-10 text-[var(--fg-subtle)]" aria-hidden />
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      <p className="max-w-sm text-sm text-[var(--fg-muted)]">{body}</p>
      <Button href="/events">Browse events <ArrowUpRight className="size-4" aria-hidden /></Button>
    </div>
  );
}
