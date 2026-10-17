"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, QrCode, CalendarDays, User, X, Loader2, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, TicketX, Receipt, Download,
  ShieldCheck,
} from "lucide-react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { bookingsApi, type MyTicket } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { Reveal, StaggerGroup, StaggerItem, SplitHeading } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR } from "@/lib/utils";

type Tab = "tickets" | "bookings" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal QR State
  const [qrFor, setQrFor] = useState<{
    ticket: MyTicket;
    data: any;
    qrDataUrl: string | null;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Download state
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);
  const modalPassRef = useRef<HTMLDivElement>(null);
  const hiddenPassRef = useRef<HTMLDivElement>(null);
  const [hiddenPassTicket, setHiddenPassTicket] = useState<{
    ticket: MyTicket;
    qrDataUrl: string;
  } | null>(null);

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

  // Open QR modal and generate high-res QR data URL
  const openQr = async (ticket: MyTicket) => {
    setQrLoading(true);
    setQrFor({ ticket, data: null, qrDataUrl: null });
    try {
      const data = await bookingsApi.ticketQr(ticket.ticket_ref);
      const token = data?.qr_token || data?.token || ticket.ticket_ref;
      const dataUrl = await QRCode.toDataURL(String(token), {
        width: 500,
        margin: 1,
        color: { dark: "#0b0f19", light: "#ffffff" },
      });
      setQrFor({ ticket, data, qrDataUrl: dataUrl });
    } catch (e: any) {
      try {
        const dataUrl = await QRCode.toDataURL(ticket.ticket_ref, {
          width: 500,
          margin: 1,
          color: { dark: "#0b0f19", light: "#ffffff" },
        });
        setQrFor({ ticket, data: null, qrDataUrl: dataUrl });
      } catch {
        setQrFor({ ticket, data: { error: e?.message || "Could not load this pass." }, qrDataUrl: null });
      }
    } finally {
      setQrLoading(false);
    }
  };

  // Direct 1-click download from card (transparent PNG, ticket only)
  const downloadTicket = async (ticket: MyTicket) => {
    if (downloadingRef) return;
    setDownloadingRef(ticket.ticket_ref);
    try {
      let token = ticket.qr_token || ticket.ticket_ref;
      try {
        const data = await bookingsApi.ticketQr(ticket.ticket_ref);
        if (data?.qr_token || data?.token) token = data.qr_token || data.token;
      } catch {
        // graceful fallback to ticket_ref
      }

      const qrDataUrl = await QRCode.toDataURL(String(token), {
        width: 500,
        margin: 1,
        color: { dark: "#0b0f19", light: "#ffffff" },
      });

      setHiddenPassTicket({ ticket, qrDataUrl });
      // allow React to render hidden pass
      await new Promise((r) => setTimeout(r, 80));

      if (hiddenPassRef.current) {
        const canvas = await html2canvas(hiddenPassRef.current, {
          backgroundColor: null,
          scale: 3,
          useCORS: true,
          logging: false,
        } as any);
        const link = document.createElement("a");
        link.download = `eventora-ticket-${ticket.ticket_ref.toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download ticket:", err);
    } finally {
      setDownloadingRef(null);
      setHiddenPassTicket(null);
    }
  };

  // Download from inside the QR modal
  const downloadModalTicket = async () => {
    if (!qrFor || !modalPassRef.current || downloadingRef) return;
    setDownloadingRef(qrFor.ticket.ticket_ref);
    try {
      const canvas = await html2canvas(modalPassRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      } as any);
      const link = document.createElement("a");
      link.download = `eventora-ticket-${qrFor.ticket.ticket_ref.toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download modal ticket:", err);
    } finally {
      setDownloadingRef(null);
    }
  };

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

        {/* ── TICKETS: RESTORED SLEEK DARK LUXURY CARDS WITH INR PRICE & DOWNLOAD ── */}
        {!loading && tab === "tickets" && (
          tickets.length ? (
            <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tickets.map((t) => (
                <StaggerItem key={t.ticket_ref} className="h-full">
                  <article className="glow-ring relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                    {/* Header: Pass Type, Price & Status */}
                    <div className="flex items-start justify-between gap-3 p-6" style={{ background: "var(--grad-surface)" }}>
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">Pass</span>
                        <p className="mt-1 truncate font-display text-lg font-bold uppercase">{t.ticket_type || "General"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge tone={t.is_checked_in ? "neutral" : "success"}>
                          {t.is_checked_in ? "Used" : "Valid"}
                        </Badge>
                        <span className="font-display text-base font-bold text-[var(--accent)]">
                          {formatINR(t.price ?? t.base_price ?? 500)}
                        </span>
                      </div>
                    </div>

                    {/* Classic Ticket Notch with Perforation */}
                    <div className="ticket-notch border-y border-dashed border-[var(--border-strong)]" />

                    {/* Body: Holder, Reference, Issued Date & Actions */}
                    <div className="flex flex-1 flex-col gap-3.5 p-6">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Holder</span>
                        <p className="mt-1 truncate text-sm font-semibold">{t.holder_name}</p>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Reference</span>
                        <p className="mt-1 font-mono text-[13px] [overflow-wrap:anywhere]">{t.ticket_ref}</p>
                      </div>
                      <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
                        <CalendarDays className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                        Issued {formatEventDate(t.issued_at)}
                      </p>

                      {/* Action buttons: Show QR + 1-Click Transparent Download */}
                      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
                        <Button onClick={() => openQr(t)} variant="outline" size="sm" className="w-full">
                          <QrCode className="size-4" aria-hidden /> Show QR
                        </Button>
                        <Button
                          onClick={() => downloadTicket(t)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={downloadingRef === t.ticket_ref}
                        >
                          {downloadingRef === t.ticket_ref ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Download className="size-4" aria-hidden />
                          )}
                          Download
                        </Button>
                      </div>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
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

      {/* ── QR PASS MODAL (ULTRA LUXURY DIGITAL ENTRY PASS) ── */}
      <AnimatePresence>
        {qrFor && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-6 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Digital ticket pass"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[var(--scrim)] backdrop-blur-xl"
              onClick={() => setQrFor(null)}
            />

            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[380px] flex flex-col items-center z-10 my-auto py-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setQrFor(null)}
                aria-label="Close pass"
                className="absolute -top-3 -right-3 sm:top-0 sm:right-0 grid size-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-colors z-30 shadow-lg"
              >
                <X className="size-4" aria-hidden />
              </button>

              {/* ── CAPTURED TICKET PASS (Downloaded with transparent background) ── */}
              <div ref={modalPassRef} className="w-full">
                <PassTicketCard
                  ticket={qrFor.ticket}
                  qrDataUrl={qrFor.qrDataUrl}
                  isLoading={qrLoading}
                  error={qrFor.data?.error}
                />
              </div>

              {/* Actions below the pass */}
              <div className="mt-4 w-full flex flex-col gap-2">
                <Button
                  onClick={downloadModalTicket}
                  variant="primary"
                  className="w-full"
                  disabled={downloadingRef === qrFor.ticket.ticket_ref || qrLoading}
                >
                  {downloadingRef === qrFor.ticket.ticket_ref ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  Download Ticket (PNG)
                </Button>
                <p className="text-center text-[11px] text-[var(--fg-muted)]">
                  Show this pass at the gate. Keep screen brightness up for scanning.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HIDDEN PASS FOR 1-CLICK DOWNLOAD DIRECTLY FROM CARD ── */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0">
        {hiddenPassTicket && (
          <div ref={hiddenPassRef} style={{ width: "380px" }}>
            <PassTicketCard
              ticket={hiddenPassTicket.ticket}
              qrDataUrl={hiddenPassTicket.qrDataUrl}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Ultra-luxury digital pass card that matches Eventora's dark glass aesthetic.
 * When exported to PNG with html2canvas (backgroundColor: null), exports
 * ONLY the ticket itself with rounded corners and transparent background.
 */
function PassTicketCard({
  ticket,
  qrDataUrl,
  isLoading,
  error,
}: {
  ticket: MyTicket;
  qrDataUrl?: string | null;
  isLoading?: boolean;
  error?: string | null;
}) {
  const price = ticket.price ?? ticket.base_price ?? 500;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[26px] border border-white/20 text-left shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      style={{
        background: "linear-gradient(165deg, #131b2e 0%, #0b0f19 100%)",
        color: "#ffffff",
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/95">
            Eventora India
          </span>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
          {ticket.is_checked_in ? "Used Pass" : "Verified Ticket"}
        </span>
      </div>

      {/* Main Info */}
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Pass Tier
            </span>
            <h3 className="mt-0.5 font-display text-2xl font-bold uppercase text-white truncate">
              {ticket.ticket_type || "General Pass"}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Price
            </span>
            <p className="mt-0.5 font-display text-2xl font-bold text-orange-400">
              {formatINR(price)}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3.5 border-t border-white/10 pt-3.5">
          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-400">
              Attendee
            </span>
            <p className="mt-0.5 text-[13px] font-semibold text-white truncate">
              {ticket.holder_name}
            </p>
          </div>
          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-400">
              Reference
            </span>
            <p className="mt-0.5 font-mono text-[13px] font-bold text-zinc-200 truncate">
              {ticket.ticket_ref}
            </p>
          </div>
          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-400">
              Issued Date
            </span>
            <p className="mt-0.5 text-[12px] font-medium text-white">
              {formatEventDate(ticket.issued_at)}
            </p>
          </div>
          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-400">
              Venue
            </span>
            <p className="mt-0.5 text-[12px] font-medium text-white truncate">
              {ticket.event_venue || "Kolkata Arena"}
            </p>
          </div>
        </div>
      </div>

      {/* Perforation Notch Divider */}
      <div className="ticket-notch border-y border-dashed border-white/20 bg-white/[0.02] py-1" />

      {/* QR Code Section */}
      <div className="p-6 text-center bg-black/25">
        <div className="mx-auto grid aspect-square w-48 place-items-center overflow-hidden rounded-2xl bg-white p-3 shadow-lg">
          {isLoading ? (
            <Loader2 className="size-7 animate-spin text-zinc-800" />
          ) : error ? (
            <p className="px-3 text-[12px] text-red-600 font-medium">{error}</p>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR for ${ticket.ticket_ref}`}
              className="size-full object-contain block"
            />
          ) : (
            <Loader2 className="size-7 animate-spin text-zinc-800" />
          )}
        </div>
        <p className="mt-3.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-300">
          Scan for gate check-in
        </p>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[9.5px] text-zinc-400">
          <ShieldCheck className="size-3 text-emerald-400" />
          <span>Non-transferable • Official Pass</span>
        </div>
      </div>
    </div>
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
