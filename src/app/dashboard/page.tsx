"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  Ticket, CalendarDays, User, Loader2, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, TicketX, Receipt,
  Crown, CreditCard, QrCode, X, Trophy, Award, Coins,
  Medal, Download, Copy, Check, Camera, Edit3, Sparkles,
  ExternalLink, GraduationCap, ShieldCheck, MapPin, Phone,
  Mail, Flame, Star, Send, Layers,
} from "lucide-react";
import {
  bookingsApi, vipApi, profileApi, rewardsApi, certificatesApi,
  ApiError, type MyTicket,
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR } from "@/lib/utils";
import { TicketPass } from "@/components/ticket/TicketPass";

declare global { interface Window { Razorpay?: any } }

type Tab = "tickets" | "competitions" | "certificates" | "rewards" | "vip" | "events" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh: refreshAuth, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vipBookings, setVipBookings] = useState<any[]>([]);
  const [vipPasses, setVipPasses] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [coinsData, setCoinsData] = useState<{ total_coins: number; history: any[] }>({ total_coins: 0, history: [] });
  const [referralData, setReferralData] = useState<any>(null);
  const [eventsRegistered, setEventsRegistered] = useState<any[]>([]);
  const [coursesRegistered, setCoursesRegistered] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/dashboard");
  }, [authLoading, user, router]);

  const loadAll = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.allSettled([
      bookingsApi.myTickets(),
      bookingsApi.my(),
      vipApi.myBookings(),
      vipApi.myPasses(),
      profileApi.dashboard(),
      rewardsApi.coins(),
      rewardsApi.referralProfile(),
      certificatesApi.myCertificates(),
    ]).then(([t, b, vb, vp, dash, cnRes, refRes, certRes]) => {
      if (t.status === "fulfilled") setTickets(Array.isArray(t.value) ? t.value : []);
      if (b.status === "fulfilled") setBookings(Array.isArray(b.value) ? b.value : []);
      if (vb.status === "fulfilled") {
        setVipBookings(vb.value?.bookings || (Array.isArray(vb.value) ? vb.value : []));
      }
      if (vp.status === "fulfilled") {
        setVipPasses(vp.value?.passes || (Array.isArray(vp.value) ? vp.value : []));
      }

      if (dash.status === "fulfilled" && dash.value) {
        const d = dash.value;
        setCompetitions(Array.isArray(d.my_competitions) ? d.my_competitions : []);
        setRanks(Array.isArray(d.my_ranks) ? d.my_ranks : []);
        setEventsRegistered(Array.isArray(d.my_events) ? d.my_events : []);
        setCoursesRegistered(Array.isArray(d.my_courses) ? d.my_courses : []);
        if (Array.isArray(d.my_badges)) setBadges(d.my_badges);
        if (Array.isArray(d.my_certificates) && d.my_certificates.length) {
          setCertificates(d.my_certificates);
        }
        if (d.my_rewards_and_coins?.total_coins != null) {
          setCoinsData({
            total_coins: Number(d.my_rewards_and_coins.total_coins || 0),
            history: Array.isArray(d.my_rewards_and_coins.reward_history) ? d.my_rewards_and_coins.reward_history : [],
          });
        }
      }

      if (cnRes.status === "fulfilled" && cnRes.value) {
        setCoinsData((prev) => ({
          total_coins: Math.max(prev.total_coins, Number(cnRes.value.total_coins || 0)),
          history: cnRes.value.history?.length ? cnRes.value.history : prev.history,
        }));
      }

      if (refRes.status === "fulfilled" && refRes.value) {
        setReferralData(refRes.value);
      }

      if (certRes.status === "fulfilled" && certRes.value?.certificates) {
        setCertificates((prev) => (certRes.value.certificates?.length ? certRes.value.certificates : prev));
      }

      setLoading(false);
    }).catch(() => {
      setError("Could not load complete dashboard data. Please refresh.");
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (authLoading || !user) {
    return (
      <section className="grid min-h-dvh place-items-center">
        <Loader2 className="size-7 animate-spin text-[var(--accent)]" aria-label="Loading" />
      </section>
    );
  }

  const vipCount = vipBookings.length + vipPasses.length;

  const TABS: { key: Tab; label: string; Icon: any; count?: number | string }[] = [
    { key: "tickets", label: "My Tickets", Icon: Ticket, count: tickets.length },
    { key: "competitions", label: "My Competitions", Icon: Trophy, count: competitions.length },
    { key: "certificates", label: "Certificates", Icon: Award, count: certificates.length },
    { key: "rewards", label: "Rewards & Coins", Icon: Coins, count: `${coinsData.total_coins} 🪙` },
    { key: "vip", label: "VIP Passes", Icon: Crown, count: vipCount },
    { key: "events", label: "Events & Courses", Icon: CalendarDays, count: eventsRegistered.length + coursesRegistered.length },
    { key: "profile", label: "Profile", Icon: User },
  ];

  return (
    <section className="relative min-h-dvh overflow-hidden pb-24 pt-32 noise md:pt-40">
      <Spotlights variant="b" />

      <div className="container-x relative">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Your Account & Profile</SectionLabel>
              <SplitHeading
                text={`Hey, ${user?.name?.split(" ")[0] || "Champion"}`}
                className="mt-4 font-display text-[clamp(2.2rem,6.5vw,4.4rem)] font-bold uppercase leading-[0.9]"
              />
              <p className="mt-3 max-w-lg text-[15px] text-[var(--fg-muted)]">
                Manage your entries, tickets, rank standings, certificates and rewards all in one place.
              </p>
            </div>

            {/* Quick Hero Stat Chips */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold backdrop-blur-md">
                <Coins className="size-4 text-amber-400" />
                <span className="font-mono tabular-nums text-amber-300 font-bold">{coinsData.total_coins}</span>
                <span className="text-[var(--fg-subtle)]">UTI Coins</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold backdrop-blur-md">
                <Trophy className="size-4 text-[var(--accent)]" />
                <span className="font-mono tabular-nums text-[var(--accent)] font-bold">{competitions.length}</span>
                <span className="text-[var(--fg-subtle)]">Competitions</span>
              </div>
              {ranks.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-300 backdrop-blur-md">
                  <Medal className="size-4 text-yellow-400" />
                  <span>Top Rank #{ranks[0].rank}</span>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ── Navigation Tabs ── */}
        <div className="mt-10 flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative inline-flex min-h-[46px] cursor-pointer shrink-0 items-center gap-2 rounded-full border px-4.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] transition-all duration-300",
                tab === t.key
                  ? "border-transparent text-[var(--on-accent)] shadow-lg shadow-[var(--accent)]/15"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] bg-[var(--surface)]"
              )}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="dash-tab"
                  className="absolute inset-0 -z-10 rounded-full"
                  style={{ background: "var(--grad-brand)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 32 }}
                />
              )}
              <t.Icon className="size-4" aria-hidden />
              <span>{t.label}</span>
              {t.count !== undefined && t.count !== 0 && t.count !== "0 🪙" && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  tab === t.key ? "bg-black/30 text-white" : "bg-[var(--surface-2)] text-[var(--fg-muted)]"
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-8 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-5">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" aria-hidden />
            <div>
              <p className="text-sm text-[var(--danger)]">{error}</p>
              <Button onClick={() => loadAll()} variant="outline" size="sm" className="mt-3">Retry</Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-56 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            1. TICKETS TAB
           ════════════════════════════════════════════════════════════════ */}
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
              body="Once you book an event, your live QR admission vouchers appear here instantly."
              ctaLink="/events"
              ctaText="Explore Live Events"
            />
          )
        )}

        {/* ════════════════════════════════════════════════════════════════
            2. MY COMPETITIONS & RANKS TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "competitions" && (
          <div className="mt-10 flex flex-col gap-10">
            {/* Rank Spotlight Card if user has achieved a rank */}
            {ranks.length > 0 && (
              <Reveal>
                <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-500/30">
                        <Trophy className="size-8" />
                      </div>
                      <div>
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-yellow-400">Official Leaderboard Standing</span>
                        <h3 className="font-display text-2xl font-bold uppercase text-white">
                          Rank #{ranks[0].rank} — {ranks[0].competition_title || "Competition"}
                        </h3>
                        {ranks[0].score != null && (
                          <p className="mt-1 text-sm text-[var(--fg-muted)]">
                            Jury Final Score: <span className="font-bold text-white">{ranks[0].score}/100</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/competitions/${ranks[0].competition_id || ""}`}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-yellow-500/30 bg-yellow-500/20 px-5 py-2.5 text-xs font-bold text-yellow-300 hover:bg-yellow-500/30 md:self-auto"
                    >
                      View Full Standings <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            )}

            {/* List of Registered Competitions */}
            {competitions.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {competitions.map((c, i) => {
                  const compId = c.competition_id || c.activity_id || c._id;
                  const isPaid = c.payment_status === "PAID" || c.status === "CONFIRMED";
                  const hasSubmitted = c.has_submitted || c.submission_id;
                  return (
                    <motion.div
                      key={c._id || i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-xl hover:shadow-[var(--accent)]/5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={isPaid ? "success" : "warning"}>
                            {isPaid ? "Confirmed" : "Payment Pending"}
                          </Badge>
                          {c.rank && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-yellow-300">
                              <Medal className="size-3" /> Rank #{c.rank}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 font-display text-xl font-bold uppercase transition-colors group-hover:text-[var(--accent)]">
                          {c.title || c.name || "Competition"}
                        </h3>

                        <div className="mt-4 space-y-2 text-xs text-[var(--fg-muted)]">
                          {c.registration_reference && (
                            <p className="font-mono text-[11px] text-[var(--fg-subtle)]">
                              Ref: <span className="text-[var(--fg)]">{c.registration_reference}</span>
                            </p>
                          )}
                          <p className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-[var(--fg-subtle)]" />
                            Registered: {formatEventDate(c.registered_at || c.created_at)}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[var(--fg-subtle)]">Entry Status:</span>
                            {hasSubmitted ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">
                                <CheckCircle2 className="size-3.5" /> Video/Entry Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                <AlertCircle className="size-3.5" /> Entry Submission Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-[var(--border)] pt-4">
                        <Link
                          href={`/competitions/${compId}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)] transition-transform active:scale-95"
                          style={{ background: "var(--grad-brand)" }}
                        >
                          {hasSubmitted ? "View Competition & Leaderboard" : "Upload Your Entry"}
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                Icon={Trophy}
                title="No competitions entered yet"
                body="Showcase your talent on India's biggest stage. Compete in Dance, Music, and Art competitions."
                ctaLink="/competitions"
                ctaText="Browse Competitions"
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            3. MY CERTIFICATES & BADGES TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "certificates" && (
          <div className="mt-10 flex flex-col gap-10">
            {certificates.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert, i) => (
                  <CertificateCard key={cert._id || cert.id || cert.certificate_id || i} cert={cert} index={i} />
                ))}
              </div>
            ) : (
              <EmptyState
                Icon={Award}
                title="No certificates issued yet"
                body="Participate in competitions and events to earn official verified certificates with digital signatures & QR codes."
                ctaLink="/competitions"
                ctaText="Enter a Competition"
              />
            )}

            {/* Earned Badges Section */}
            {badges.length > 0 && (
              <Reveal className="mt-8">
                <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase">
                  <Sparkles className="size-5 text-[var(--accent)]" /> Earned Achievement Badges ({badges.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {badges.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                        <Star className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm">{b.badge_name || b.name || "Badge"}</p>
                        <p className="text-[11px] text-[var(--fg-muted)]">{b.description || "Earned achievement"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            4. REWARDS & COINS TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "rewards" && (
          <RewardsTab coinsData={coinsData} referralData={referralData} user={user} />
        )}

        {/* ════════════════════════════════════════════════════════════════
            5. VIP PASSES TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "vip" && (
          <VipDashboardTab vipBookings={vipBookings} vipPasses={vipPasses} user={user} />
        )}

        {/* ════════════════════════════════════════════════════════════════
            6. EVENTS & COURSES TAB (Event-Specific Information)
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "events" && (
          <div className="mt-10 flex flex-col gap-10">
            {eventsRegistered.length || coursesRegistered.length ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {eventsRegistered.map((ev, i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
                    <Badge tone="success">Registered Event</Badge>
                    <h3 className="mt-3 font-display text-xl font-bold uppercase">{ev.activity_title || ev.title || "Live Event"}</h3>
                    <p className="mt-2 text-xs text-[var(--fg-muted)]">
                      Ref: <span className="font-mono text-[var(--fg)]">{ev.registration_id || ev._id}</span>
                    </p>
                    {ev.date && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                        <CalendarDays className="size-3.5" /> {formatEventDate(ev.date)}
                      </p>
                    )}
                  </div>
                ))}
                {coursesRegistered.map((cr, i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
                    <Badge tone="brand">Registered Course</Badge>
                    <h3 className="mt-3 font-display text-xl font-bold uppercase">{cr.activity_title || cr.title || "Masterclass"}</h3>
                    <p className="mt-2 text-xs text-[var(--fg-muted)]">
                      Ref: <span className="font-mono text-[var(--fg)]">{cr.registration_id || cr._id}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                Icon={CalendarDays}
                title="No registered workshops or courses"
                body="You haven't enrolled in any separate events or workshops yet. Explore live events and masterclasses."
                ctaLink="/events"
                ctaText="Browse Events"
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            7. PROFILE & PERSONAL DETAILS TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "profile" && (
          <Reveal className="mt-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
              {/* Profile Card */}
              <div className="flex flex-col items-center justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-lg">
                <div className="flex flex-col items-center">
                  <div className="relative group size-28">
                    <span className="grid size-full place-items-center overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--bg)] shadow-md">
                      {user?.profile_photo ? (
                        <img src={user.profile_photo} alt={user?.name || "Profile"} className="size-full object-cover" />
                      ) : (
                        <User className="size-12 text-[var(--fg-muted)]" aria-hidden />
                      )}
                    </span>
                    <button
                      onClick={() => setEditOpen(true)}
                      title="Update Profile Photo"
                      className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-[var(--accent)] text-black shadow-md transition-transform hover:scale-110 active:scale-95"
                    >
                      <Camera className="size-4" />
                    </button>
                  </div>

                  <h2 className="mt-5 font-display text-2xl font-bold uppercase">{user?.name || "Artist"}</h2>
                  <p className="mt-1 text-sm text-[var(--fg-muted)] font-mono [overflow-wrap:anywhere]">{user?.email}</p>

                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-semibold text-green-400">
                    <ShieldCheck className="size-3.5" /> Verified Account
                  </div>
                </div>

                <div className="mt-8 flex w-full flex-col gap-3">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-bold text-[var(--on-accent)] transition-all active:scale-98"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <Edit3 className="size-4" /> Edit Profile & Photo
                  </button>
                  <Button onClick={logout} variant="outline" className="w-full">
                    Log out
                  </Button>
                </div>
              </div>

              {/* Details Key-Value List */}
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="border-b border-[var(--border)] px-7 py-5 flex items-center justify-between">
                  <h3 className="font-display text-base font-bold uppercase tracking-wider text-[var(--fg)]">
                    Personal Information
                  </h3>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </button>
                </div>
                <dl className="divide-y divide-[var(--border)]">
                  {[
                    { k: "Full Name", v: user?.name, icon: User },
                    { k: "Email Address", v: user?.email, icon: Mail },
                    { k: "Phone Number", v: user?.phone_number ? `+91 ${user.phone_number}` : null, icon: Phone },
                    { k: "Date of Birth", v: user?.date_of_birth ? formatEventDate(user.date_of_birth) : null, icon: CalendarDays },
                    { k: "Residential Address", v: user?.address, icon: MapPin },
                    { k: "Parent / Emergency Contact", v: user?.parent_phone_number ? `+91 ${user.parent_phone_number}` : null, icon: Phone },
                    { k: "My Unique Referral Code", v: user?.referral_code, icon: Coins },
                  ].map((row) => (
                    <div key={row.k} className="flex items-start justify-between gap-6 px-7 py-4.5">
                      <dt className="flex items-center gap-2 shrink-0 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                        <row.icon className="size-3.5 text-[var(--accent)]" /> {row.k}
                      </dt>
                      <dd className="text-right text-sm font-semibold [overflow-wrap:anywhere]">{row.v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        isOpen={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          await refreshAuth();
          loadAll();
        }}
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CERTIFICATE CARD COMPONENT — Official Verified PDF Certificate
   ═══════════════════════════════════════════════════════════════════ */

function CertificateCard({ cert, index }: { cert: any; index: number }) {
  const [downloading, setDownloading] = useState(false);
  const certId = cert.certificate_id || cert.id || cert._id;

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await certificatesApi.downloadPdf(certId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${cert.activity_title ? cert.activity_title.replace(/\s+/g, "_") : certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Could not download certificate PDF. Please contact support.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 via-[var(--surface)] to-[var(--surface)] p-6 shadow-xl"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-300">
            <Award className="size-3" /> {cert.certificate_type || "Official Certificate"}
          </span>
          {cert.rank && (
            <span className="rounded-full bg-yellow-400 px-2 py-0.5 font-mono text-[10px] font-black text-black">
              Rank #{cert.rank}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-lg font-bold uppercase text-white">
          {cert.award_title || "Certificate of Excellence"}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
          {cert.activity_title || "National Talent Competition"}
        </p>

        <div className="mt-4 space-y-1.5 text-xs text-[var(--fg-muted)]">
          <p className="font-mono text-[11px]">
            ID: <span className="text-white">{certId}</span>
          </p>
          <p>Issued: {formatEventDate(cert.issued_at || cert.issue_date_str)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2.5 border-t border-[var(--border)] pt-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-black disabled:opacity-50"
          style={{ background: "var(--grad-brand)" }}
        >
          {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {downloading ? "Generating PDF…" : "Download Official PDF"}
        </button>
        {cert.verification_url && (
          <a
            href={cert.verification_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-white"
          >
            <ShieldCheck className="size-3 text-green-400" /> Verify Authenticity <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REWARDS & COINS TAB COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function RewardsTab({ coinsData, referralData, user }: { coinsData: any; referralData: any; user: any }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const refCode = referralData?.referral_code || user?.referral_code || "EVNT-PRO";
  const refLink = referralData?.referral_link || (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${refCode}` : "");

  function copyCode() {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="mt-10 flex flex-col gap-8">
      {/* Coin Balance & Value Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-[var(--surface)] to-[var(--surface)] p-6 shadow-xl">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-400">Available Coin Balance</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-amber-300 tabular-nums">
              {coinsData.total_coins}
            </span>
            <span className="font-bold text-amber-400">UTI Coins</span>
          </div>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            Redeemable value: <span className="font-bold text-white">₹{coinsData.total_coins} INR</span> on ticket and fee checkouts.
          </p>
        </div>

        {/* Referral Earnings Card */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">Referral Earnings</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-white tabular-nums">
              {referralData?.rewards_earned ?? referralData?.total_coins_earned ?? coinsData.total_coins}
            </span>
            <span className="font-bold text-[var(--fg-muted)]">Earned</span>
          </div>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            Friends referred: <span className="font-bold text-white">{referralData?.total_referrals ?? 0}</span>
          </p>
        </div>

        {/* Benefits Card */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-green-400">Coin Perks</span>
          <ul className="mt-3 space-y-1.5 text-xs text-[var(--fg-muted)]">
            <li className="flex items-center gap-1.5 text-white">
              <Check className="size-3.5 text-green-400" /> Instant discount on paid event tickets
            </li>
            <li className="flex items-center gap-1.5 text-white">
              <Check className="size-3.5 text-green-400" /> Use coins for competition entries
            </li>
            <li className="flex items-center gap-1.5 text-white">
              <Check className="size-3.5 text-green-400" /> Exclusive merchandise discounts
            </li>
          </ul>
        </div>
      </div>

      {/* Share & Invite Friends Card */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <h3 className="font-display text-2xl font-bold uppercase">Invite Friends & Earn Free Coins</h3>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Give your friends 50 coins on signup, and you get 50 bonus coins whenever they join an event or competition!
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Referral Code Box */}
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <div>
              <p className="font-mono text-[10px] uppercase text-[var(--fg-subtle)]">Your Referral Code</p>
              <p className="font-mono text-lg font-black tracking-widest text-[var(--accent)]">{refCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent)] hover:text-black transition-colors"
            >
              {copiedCode ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
              {copiedCode ? "Copied!" : "Copy Code"}
            </button>
          </div>

          {/* Referral Link Box */}
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="min-w-0 pr-3">
              <p className="font-mono text-[10px] uppercase text-[var(--fg-subtle)]">Your Invite Link</p>
              <p className="truncate font-mono text-xs text-[var(--fg-muted)]">{refLink}</p>
            </div>
            <button
              onClick={copyLink}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full py-2 px-4 text-xs font-bold text-black"
              style={{ background: "var(--grad-brand)" }}
            >
              {copiedLink ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
              {copiedLink ? "Copied!" : "Share Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Coin Ledger History */}
      {coinsData.history && coinsData.history.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--fg)]">
              Coin History & Transactions
            </h4>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {coinsData.history.map((h: any, i: number) => (
              <li key={i} className="flex items-center justify-between px-6 py-4 text-xs">
                <div>
                  <p className="font-semibold text-white">{h.reason || h.description || "Reward Points"}</p>
                  <p className="text-[11px] text-[var(--fg-subtle)]">{formatEventDate(h.created_at || h.date)}</p>
                </div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  +{h.coins || h.amount || 0} 🪙
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EDIT PROFILE MODAL — Photo Upload + Details
   ═══════════════════════════════════════════════════════════════════ */

function EditProfileModal({
  isOpen,
  user,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo || null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone_number ? String(user.phone_number) : "");
  const [address, setAddress] = useState(user?.address || "");
  const [parentPhone, setParentPhone] = useState(user?.parent_phone_number ? String(user.parent_phone_number) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone_number ? String(user.phone_number) : "");
    setAddress(user?.address || "");
    setParentPhone(user?.parent_phone_number ? String(user.parent_phone_number) : "");
    setPhotoPreview(user?.profile_photo || null);
    setPhotoFile(null);
    setErr(null);
  }, [user, isOpen]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const fd = new FormData();
      if (name.trim()) fd.append("name", name.trim());
      if (phone.trim()) fd.append("phone_number", phone.trim());
      if (address.trim()) fd.append("address", address.trim());
      if (parentPhone.trim()) fd.append("parent_phone_number", parentPhone.trim());
      if (photoFile) fd.append("profile_photo", photoFile);

      await profileApi.update(fd);
      await onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center p-4">
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "var(--scrim)" }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
            <Edit3 className="size-4.5 text-[var(--accent)]" /> Edit Your Profile
          </h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {/* Photo Picker */}
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--surface)]">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-10 m-auto text-[var(--fg-muted)]" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold hover:border-[var(--accent)] transition-colors"
              >
                <Camera className="size-3.5 text-[var(--accent)]" /> Upload New Photo
              </button>
              <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">JPG, PNG or WebP up to 5MB</p>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Residential Address / City
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Kolkata, West Bengal"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Parent / Guardian Phone (Optional)
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="e.g. 9876543211"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full px-5 py-2.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold text-black disabled:opacity-50"
              style={{ background: "var(--grad-brand)" }}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VIP DASHBOARD TAB COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function VipDashboardTab({ vipBookings, vipPasses, user }: { vipBookings: any[]; vipPasses: any[]; user: any }) {
  const [qrModal, setQrModal] = useState<any>(null);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const hasNothing = vipBookings.length === 0 && vipPasses.length === 0;

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

  const retryPayment = async (b: any) => {
    const bId = b._id || b.booking_id;
    setPayBusy(bId);
    setPayErr(null);
    setPaySuccess(null);

    try {
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

      const rzp = new window.Razorpay({
        key: paymentDetails.key_id,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        name: "Upgrade Talents India",
        description: `VIP Booking - ${b.booking_reference}`,
        order_id: paymentDetails.order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone_number || "",
        },
        theme: { color: "#bfff2e" },
        handler: async (response: any) => {
          setPaySuccess(bId);
          setTimeout(() => location.reload(), 1500);
        },
        modal: {
          ondismiss: () => setPayBusy(null),
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        setPayErr(resp.error?.description || "Payment failed.");
        setPayBusy(null);
      });

      rzp.open();
    } catch (e: any) {
      setPayErr(e?.message || "Failed to initiate payment.");
      setPayBusy(null);
    }
  };

  if (hasNothing) {
    return (
      <EmptyState
        Icon={Crown}
        title="No VIP passes yet"
        body="Experience events like royalty. Enjoy backstage access, VIP lounge, and priority entry."
        ctaLink="/vip"
        ctaText="Explore VIP Passes"
      />
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-12">
      {vipPasses.length > 0 && (
        <Reveal>
          <h3 className="mb-6 flex items-center gap-2 font-display text-xl font-bold uppercase">
            <Crown className="size-5 text-[var(--accent)]" /> Active VIP Access Passes ({vipPasses.length})
          </h3>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vipPasses.map((p, i) => (
              <motion.div
                key={p._id || p.pass_reference || i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
              >
                <div className="absolute top-0 right-0 h-28 w-28 bg-[var(--accent)]/5 rounded-full blur-2xl" />
                <div className="flex items-center justify-between">
                  <Badge tone={p.status === "VALID" || p.status === "ACTIVE" ? "success" : "danger"}>
                    {p.status}
                  </Badge>
                  <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
                    {p.entry_policy?.replace(/_/g, " ") || "Single Entry"}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="font-display text-2xl font-bold">{p.pass_name || p.category || "VIP Pass"}</h4>
                  <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{p.event_title || "Event"}</p>
                </div>

                {p.access_areas && p.access_areas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.access_areas.map((area: string) => (
                      <span key={area} className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[10px] uppercase text-[var(--fg-muted)]">
                        {area.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 border-t border-[var(--border)] pt-4">
                  <div className="text-xs text-[var(--fg-muted)] space-y-1">
                    <p className="flex items-center gap-1.5"><User className="size-3.5" /> {p.holder_name || "Guest"}</p>
                    <p className="font-mono text-[11px] text-[var(--fg-subtle)]">Ref: {p.pass_reference || p._id}</p>
                  </div>

                  {(p.status === "VALID" || p.status === "ACTIVE") && (
                    <button
                      onClick={() => setQrModal(p)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)]"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <QrCode className="size-4" /> View Admission QR
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      )}

      {vipBookings.length > 0 && (
        <Reveal>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold uppercase">
            <CreditCard className="size-5 text-[var(--accent)]" /> VIP Orders & Bookings
          </h3>
          {payErr && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{payErr}</span>
            </div>
          )}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <ul className="divide-y divide-[var(--border)]">
              {vipBookings.map((b, i) => {
                const paid = b.payment_status === "PAID" || b.booking_status === "CONFIRMED";
                const cancelled = b.booking_status === "CANCELLED";
                const pending = b.booking_status === "PENDING_PAYMENT" || b.payment_status === "PENDING";
                const isRetrying = payBusy === (b._id || b.booking_id);
                return (
                  <motion.li
                    key={b._id || b.booking_reference || i}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={cancelled ? "danger" : paid ? "success" : "warning"}>
                          {cancelled ? "Cancelled" : paid ? "Confirmed" : "Payment pending"}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-subtle)]">
                          <Crown className="size-3" /> {b.pass_name || "VIP"}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">{b.quantity || 1} × pass</span>
                      </div>
                      <p className="mt-2 font-mono text-sm font-semibold [overflow-wrap:anywhere]">{b.booking_reference}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
                        <Clock className="size-3.5 shrink-0" /> {formatEventDate(b.booked_at || b.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="font-display text-xl font-bold">{formatINR(b.total_amount)}</span>
                      {paid ? (
                        <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" />
                      ) : pending && !cancelled ? (
                        <button
                          onClick={() => retryPayment(b)}
                          disabled={!!payBusy}
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-black"
                          style={{ background: "var(--grad-brand)" }}
                        >
                          {isRetrying ? <Loader2 className="size-3.5 animate-spin" /> : <CreditCard className="size-3.5" />}
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

      {/* QR Modal */}
      <QrCodeModal pass={qrModal} onClose={() => setQrModal(null)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QR CODE MODAL — Shows VIP pass QR Code
   ═══════════════════════════════════════════════════════════════════ */

function QrCodeModal({ pass, onClose }: { pass: any | null; onClose: () => void }) {
  const [qrData, setQrData] = useState<any>(null);
  const [clientQrUrl, setClientQrUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pass) {
      setQrData(null);
      setClientQrUrl("");
      setError("");
      return;
    }
    setLoading(true);
    setError("");

    const passId = pass._id || pass.pass_id || pass.id;
    vipApi
      .passQr(passId)
      .then((data) => {
        setQrData(data);
        const token = data?.qr_token || pass?.pass_reference;
        if (token) {
          QRCode.toDataURL(String(token), {
            width: 320,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          })
            .then(setClientQrUrl)
            .catch(() => {});
        }
      })
      .catch(async (e: any) => {
        if (pass?.pass_reference) {
          try {
            const url = await QRCode.toDataURL(String(pass.pass_reference), {
              width: 320,
              margin: 1,
              color: { dark: "#000000", light: "#ffffff" },
            });
            setClientQrUrl(url);
          } catch {
            setError(e?.message || "Could not load QR code.");
          }
        } else {
          setError(e?.message || "Could not load QR code.");
        }
      })
      .finally(() => setLoading(false));
  }, [pass]);

  const qrSrc = useMemo(() => {
    if (qrData?.qr_image_base64) {
      const raw = String(qrData.qr_image_base64).trim();
      return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
    }
    return clientQrUrl;
  }, [qrData, clientQrUrl]);

  const handleDownload = () => {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `VIP-Pass-${pass?.pass_reference || "QR"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {pass && (
        <div className="fixed inset-0 z-[130] grid place-items-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={onClose} />
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative w-full max-w-[380px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--accent)] bg-[var(--bg-elevated)] p-6 text-center shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <Crown className="size-5 text-[var(--accent)]" /> VIP Admission
              </p>
              <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]">
                <X className="size-4" />
              </button>
            </div>

            {loading && (
              <div className="py-12">
                <Loader2 className="mx-auto size-8 animate-spin text-[var(--accent)]" />
                <p className="mt-3 text-xs text-[var(--fg-muted)]">Generating secure QR pass...</p>
              </div>
            )}
            {error && !qrSrc && <p className="text-xs text-red-400 py-6">{error}</p>}
            {!loading && qrSrc && (
              <>
                <div className="mx-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-3 size-52 flex items-center justify-center shadow-inner">
                  <img src={qrSrc} alt="VIP Pass QR" className="size-full object-contain" />
                </div>
                <h4 className="mt-4 font-display text-lg font-bold">{pass.pass_name || pass.category}</h4>
                <p className="text-xs text-[var(--fg-muted)]">{pass.event_title}</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--fg-subtle)]">{pass.pass_reference}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-1.5 text-xs font-semibold text-[var(--fg)] hover:border-[var(--accent)] transition-colors"
                  >
                    <Download className="size-3.5 text-[var(--accent)]" /> Download QR
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[var(--fg-subtle)]">Scan this QR at the VIP entrance gate</p>
              </>
            )}
            {!loading && !error && !qrSrc && (
              <div className="py-8">
                <QrCode className="mx-auto size-16 text-[var(--fg-subtle)]" />
                <p className="mt-2 text-xs text-[var(--fg-muted)]">No QR available for this pass.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPTY STATE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function EmptyState({
  Icon,
  title,
  body,
  ctaLink = "/events",
  ctaText = "Browse Events",
}: {
  Icon: any;
  title: string;
  body: string;
  ctaLink?: string;
  ctaText?: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] px-6 py-20 text-center">
      <Icon className="size-10 text-[var(--fg-subtle)]" />
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      <p className="max-w-sm text-sm text-[var(--fg-muted)]">{body}</p>
      <Button href={ctaLink}>
        {ctaText} <ArrowUpRight className="size-4" />
      </Button>
    </div>
  );
}
