"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, CalendarDays, User, Loader2, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, TicketX, Receipt,
  Crown, CreditCard, QrCode, X,
} from "lucide-react";
import { bookingsApi, vipApi, ApiError, type MyTicket } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR } from "@/lib/utils";
import { TicketPass } from "@/components/ticket/TicketPass";

declare global { interface Window { Razorpay?: any } }

type Tab = "tickets" | "bookings" | "vip" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vipBookings, setVipBookings] = useState<any[]>([]);
  const [vipPasses, setVipPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/dashboard");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      bookingsApi.myTickets(),
      bookingsApi.my(),
      vipApi.myBookings(),
      vipApi.myPasses(),
    ])
      .then(([t, b, vb, vp]) => {
        if (cancelled) return;
        if (t.status === "fulfilled") setTickets(Array.isArray(t.value) ? t.value : []);
        if (b.status === "fulfilled") setBookings(Array.isArray(b.value) ? b.value : []);
        if (vb.status === "fulfilled") {
          const bks = vb.value?.bookings || (Array.isArray(vb.value) ? vb.value : []);
          setVipBookings(bks);
        }
        if (vp.status === "fulfilled") {
          const pss = vp.value?.passes || (Array.isArray(vp.value) ? vp.value : []);
          setVipPasses(pss);
        }
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

  const vipCount = vipBookings.length + vipPasses.length;

  const TABS: { key: Tab; label: string; Icon: any; count?: number }[] = [
    { key: "tickets", label: "My Tickets", Icon: Ticket, count: tickets.length },
    { key: "bookings", label: "Bookings", Icon: Receipt, count: bookings.length },
    { key: "vip", label: "VIP Passes", Icon: Crown, count: vipCount },
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

        {/* ── VIP PASSES & BOOKINGS ── */}
        {!loading && tab === "vip" && (
          <VipDashboardTab vipBookings={vipBookings} vipPasses={vipPasses} user={user} />
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

/* ═══════════════════════════════════════════════════════════════════
   VIP DASHBOARD TAB — Shows VIP bookings + issued passes + QR
   ═══════════════════════════════════════════════════════════════════ */

function VipDashboardTab({ vipBookings, vipPasses, user }: { vipBookings: any[]; vipPasses: any[]; user: any }) {
  const [qrModal, setQrModal] = useState<any>(null);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const hasNothing = vipBookings.length === 0 && vipPasses.length === 0;

  /* ── Load Razorpay ── */
  const loadRazorpay = useCallback(
    () => new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    }),
    []
  );

  /* ── Retry Payment for a pending VIP booking ── */
  const retryPayment = async (b: any) => {
    const bRef = b.booking_reference;
    const bId = b._id || b.booking_id;
    setPayBusy(bId);
    setPayErr(null);
    setPaySuccess(null);

    try {
      // The original booking should already have payment_details
      // but if not, we can re-book (the idempotency key should return the same booking)
      const paymentDetails = b.payment_details;
      if (!paymentDetails || paymentDetails.status === "PENDING_CONFIGURATION") {
        setPayErr("Payment gateway is being configured. Try again later.");
        setPayBusy(null);
        return;
      }

      const rzpLoaded = await loadRazorpay();
      if (!rzpLoaded) {
        setPayErr("Could not reach the payment gateway.");
        setPayBusy(null);
        return;
      }

      const checkout = paymentDetails.checkout_data || {};
      const keyId = checkout.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) {
        setPayErr("Payment gateway is not configured.");
        setPayBusy(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: checkout.amount || Math.round((b.total_amount || 0) * 100),
        currency: checkout.currency || b.currency || "INR",
        name: checkout.name || "Upgrade Talents India",
        description: checkout.description || `VIP Pass — ${b.pass_name || "VIP"}`,
        order_id: checkout.order_id || paymentDetails.provider_order_id,
        prefill: {
          email: user?.email || "",
          name: user?.name || "",
          contact: user?.phone_number || "",
        },
        theme: { color: "#bfff2e" },
        modal: {
          ondismiss: () => {
            setPayBusy(null);
          },
        },
        handler: async (resp: any) => {
          try {
            await vipApi.verifyPayment({
              booking_reference: bRef,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setPaySuccess(bId);
            setTimeout(() => location.reload(), 1500);
          } catch (e: any) {
            setPayErr(e?.message || "Payment verification failed.");
          } finally {
            setPayBusy(null);
          }
        },
      });

      rzp.on("payment.failed", (r: any) => {
        setPayErr(r?.error?.description || "Payment failed.");
        setPayBusy(null);
      });
      rzp.open();
    } catch (e: any) {
      setPayErr(e?.message || "Something went wrong.");
      setPayBusy(null);
    }
  };

  if (hasNothing) {
    return (
      <EmptyState
        Icon={Crown}
        title="No VIP passes"
        body="Book a VIP pass from an event page and it will appear here with your QR code."
      />
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-8">
      {/* ── Confirmed VIP Passes ── */}
      {vipPasses.length > 0 && (
        <Reveal>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase">
            <Crown className="size-5 text-[var(--accent)]" aria-hidden /> Your VIP Passes
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vipPasses.map((p, i) => (
              <motion.div
                key={p._id || p.pass_reference || i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--accent)] bg-[var(--surface)]"
                style={{ boxShadow: "0 0 40px -15px color-mix(in srgb, var(--accent) 40%, transparent)" }}
              >
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--grad-brand)" }} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">{p.event_title || "Event"}</p>
                      <p className="mt-1 font-display text-lg font-bold">{p.pass_name || p.category || "VIP Pass"}</p>
                    </div>
                    <Badge tone={p.status === "ACTIVE" ? "success" : p.status === "REVOKED" ? "danger" : "warning"}>
                      {p.status || "Active"}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[12px] text-[var(--fg-muted)]">
                    <p className="flex items-center gap-1.5"><User className="size-3.5" aria-hidden /> {p.holder_name || "Guest"}</p>
                    <p className="font-mono text-[11px] text-[var(--fg-subtle)]">Ref: {p.pass_reference || p._id}</p>
                  </div>

                  {p.status === "ACTIVE" && (
                    <button
                      onClick={() => setQrModal(p)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-[var(--on-accent)]"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <QrCode className="size-4" aria-hidden /> Show QR Code
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      )}

      {/* ── VIP Bookings ── */}
      {vipBookings.length > 0 && (
        <Reveal>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase">
            <CreditCard className="size-5 text-[var(--accent)]" aria-hidden /> VIP Bookings
          </h3>
          {payErr && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
              <p className="text-[12.5px] text-[var(--danger)]">{payErr}</p>
            </div>
          )}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <ul className="divide-y divide-[var(--border)]">
              {vipBookings.map((b, i) => {
                const paid = b.payment_status === "PAID" || b.booking_status === "CONFIRMED";
                const cancelled = b.booking_status === "CANCELLED";
                const pending = b.booking_status === "PENDING_PAYMENT" || b.payment_status === "PENDING";
                const isRetrying = payBusy === (b._id || b.booking_id);
                const isSuccess = paySuccess === (b._id || b.booking_id);
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
                        <Badge tone={cancelled ? "danger" : paid || isSuccess ? "success" : "warning"}>
                          {cancelled ? "Cancelled" : paid || isSuccess ? "Confirmed" : "Payment pending"}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-subtle)]">
                          <Crown className="size-3" aria-hidden /> {b.pass_name || "VIP"}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">{b.quantity || 1} × pass</span>
                      </div>
                      <p className="mt-2 font-mono text-sm font-semibold [overflow-wrap:anywhere]">{b.booking_reference}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
                        <Clock className="size-3.5 shrink-0" aria-hidden /> {formatEventDate(b.booked_at || b.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="font-display text-xl font-bold">{formatINR(b.total_amount)}</span>
                      {(paid || isSuccess) ? (
                        <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" aria-label="Confirmed" />
                      ) : pending && !cancelled ? (
                        <button
                          onClick={() => retryPayment(b)}
                          disabled={!!payBusy}
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold text-[var(--on-accent)] disabled:opacity-50"
                          style={{ background: "var(--grad-brand)" }}
                        >
                          {isRetrying ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CreditCard className="size-3.5" aria-hidden />}
                          Pay now
                        </button>
                      ) : null}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      )}

      {/* ── QR CODE MODAL ── */}
      <QrCodeModal pass={qrModal} onClose={() => setQrModal(null)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QR CODE MODAL — Shows the VIP pass QR code
   ═══════════════════════════════════════════════════════════════════ */

function QrCodeModal({ pass, onClose }: { pass: any | null; onClose: () => void }) {
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pass) { setQrData(null); setError(""); return; }
    setLoading(true);
    setError("");

    const passId = pass._id || pass.pass_id || pass.id;
    vipApi.passQr(passId)
      .then((data) => setQrData(data))
      .catch((e: any) => setError(e?.message || "Could not load QR code."))
      .finally(() => setLoading(false));
  }, [pass]);

  useEffect(() => {
    document.body.style.overflow = pass ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [pass]);

  return (
    <AnimatePresence>
      {pass && (
        <motion.div
          className="fixed inset-0 z-[130] grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={onClose} aria-hidden />
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-[380px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--accent)] bg-[var(--bg-elevated)]"
            role="dialog" aria-label="VIP Pass QR Code"
          >
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--grad-brand)" }} />
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Crown className="size-5 text-[var(--accent)]" aria-hidden /> VIP Pass
              </p>
              <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]">
                <X className="size-4.5" aria-hidden />
              </button>
            </div>

            <div className="grid place-items-center p-6 text-center">
              {loading && <Loader2 className="size-8 animate-spin text-[var(--accent)]" aria-hidden />}
              {error && (
                <div>
                  <AlertCircle className="mx-auto size-10 text-[var(--danger)]" aria-hidden />
                  <p className="mt-3 text-[13px] text-[var(--danger)]">{error}</p>
                </div>
              )}
              {!loading && !error && qrData && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-4">
                    {qrData.qr_image_base64 ? (
                      <img src={`data:image/png;base64,${qrData.qr_image_base64}`} alt="VIP Pass QR Code" className="size-48" />
                    ) : qrData.qr_data ? (
                      <div className="grid size-48 place-items-center">
                        <QrCode className="size-24 text-gray-800" aria-hidden />
                      </div>
                    ) : (
                      <div className="grid size-48 place-items-center text-gray-400">
                        <QrCode className="size-20" aria-hidden />
                        <p className="text-xs">QR unavailable</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 font-display text-lg font-bold">{pass.pass_name || pass.category || "VIP Pass"}</p>
                  <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{pass.event_title || "Event"}</p>
                  <p className="mt-1 text-[12px] text-[var(--fg-subtle)]">{pass.holder_name || "Guest"}</p>
                  <p className="mt-2 font-mono text-[11px] text-[var(--fg-subtle)]">{pass.pass_reference || ""}</p>
                  <p className="mt-4 text-[11px] text-[var(--fg-subtle)]">Show this QR code at the gate for entry</p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

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
