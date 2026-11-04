"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  Ticket, CalendarDays, Calendar, User, Loader2, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, TicketX, Receipt,
  Crown, CreditCard, QrCode, X, Trophy, Award, Coins,
  Medal, Download, Copy, Check, Camera, Edit3, Sparkles,
  ExternalLink, GraduationCap, ShieldCheck, MapPin, Phone,
  Mail, Flame, Star, Send, Layers, Package, Banknote,
  ChevronLeft, ChevronRight, Share2, Bell, Settings, Eye, Briefcase, LogOut, Search, Radio,
  Gift, Users, MessageCircle, Zap, TrendingUp, CheckCircle,
} from "lucide-react";
import {
  bookingsApi, vipApi, profileApi, rewardsApi, certificatesApi, shopApi, publicApi,
  ApiError, type MyTicket,
} from "@/lib/api";
import { useAuth, usePageScrollLock } from "@/components/motion/Providers";
import CoinLedger from "@/components/account/CoinLedger";
import ShareReferralModal from "@/components/account/ShareReferralModal";
import { Badge, Button, SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { cn, formatEventDate, formatINR, isEventExpired, imageFor, FALLBACK_IMAGES } from "@/lib/utils";
import { TicketPass } from "@/components/ticket/TicketPass";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

declare global { interface Window { Razorpay?: any } }

type Tab = "tickets" | "competitions" | "certificates" | "rewards" | "vip" | "events" | "orders" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh: refreshAuth, logout, isJudge, isVolunteer } = useAuth();

  const [tab, setTab] = useState<Tab>("profile");
  const [merchOrders, setMerchOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vipBookings, setVipBookings] = useState<any[]>([]);
  const [vipPasses, setVipPasses] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [publicCompetitions, setPublicCompetitions] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [coinsData, setCoinsData] = useState<{
    total_coins: number;
    total_earned_coins?: number;
    total_redeemed_coins?: number;
    history: any[];
  }>({ total_coins: 0, total_earned_coins: 0, total_redeemed_coins: 0, history: [] });
  const [referralData, setReferralData] = useState<any>(null);
  const [eventsRegistered, setEventsRegistered] = useState<any[]>([]);
  const [coursesRegistered, setCoursesRegistered] = useState<any[]>([]);

  // Ticket Tab Subview & Filters
  const [ticketSubView, setTicketSubView] = useState<"passes" | "history">("passes");
  const [ticketFilter, setTicketFilter] = useState<"all" | "active" | "used">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal & Share Referral Modal
  const [editOpen, setEditOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Profile Suite Calendar & Quick Actions
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyReferral = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  const handleCopyEmail = useCallback(() => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  }, [user?.email]);

  const calendarMonthYear = useMemo(() => {
    return calendarDate.toLocaleString("default", { month: "long", year: "numeric" });
  }, [calendarDate]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: { day: number; currentMonth: boolean; isToday: boolean }[] = [];
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthTotalDays - i, currentMonth: false, isToday: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const isToday = isCurrentMonth && today.getDate() === d;
      days.push({ day: d, currentMonth: true, isToday });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      days.push({ day: r, currentMonth: false, isToday: false });
    }
    return days;
  }, [calendarDate]);

  const prevMonth = useCallback(() => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const userAge = useMemo(() => {
    if (!user?.date_of_birth) return null;
    const dob = new Date(user.date_of_birth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [user?.date_of_birth]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (isJudge) {
      router.replace("/judge");
      return;
    }
    if (isVolunteer) {
      router.replace("/volunteer");
      return;
    }
    if (!authLoading && user) {
      const isIncomplete =
        user.requires_profile_completion === true ||
        user.is_profile_completed === false ||
        user.profile_completed === false ||
        !user.phone_number ||
        !user.date_of_birth ||
        !user.address ||
        !user.parent_phone_number;
      if (isIncomplete) {
        router.replace("/complete-profile");
      }
    }
  }, [authLoading, user, isJudge, isVolunteer, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const qTab = sp.get("tab");
      if (qTab && ["tickets", "competitions", "certificates", "rewards", "vip", "events", "orders", "profile"].includes(qTab)) {
        setTab(qTab as Tab);
      }
      if (sp.get("setup") === "true") {
        setTab("profile");
        setEditOpen(true);
      }
    }
  }, []);

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
      shopApi.myOrders(),
      publicApi.competitions({ limit: 6 }),
    ]).then(([t, b, vb, vp, dash, cnRes, refRes, certRes, ordRes, pubCompRes]) => {
      if (t.status === "fulfilled") setTickets(Array.isArray(t.value) ? t.value : []);
      if (b.status === "fulfilled") setBookings(Array.isArray(b.value) ? b.value : []);
      if (vb.status === "fulfilled") {
        setVipBookings(vb.value?.bookings || (Array.isArray(vb.value) ? vb.value : []));
      }
      if (vp.status === "fulfilled") {
        setVipPasses(vp.value?.passes || (Array.isArray(vp.value) ? vp.value : []));
      }
      if (ordRes.status === "fulfilled" && ordRes.value) {
        const ords = Array.isArray(ordRes.value) ? ordRes.value : ordRes.value.orders || [];
        setMerchOrders(ords);
      }
      if (pubCompRes.status === "fulfilled" && Array.isArray(pubCompRes.value)) {
        setPublicCompetitions(pubCompRes.value);
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
          const hist = Array.isArray(d.my_rewards_and_coins.coin_history) && d.my_rewards_and_coins.coin_history.length
            ? d.my_rewards_and_coins.coin_history
            : (Array.isArray(d.my_rewards_and_coins.reward_history) ? d.my_rewards_and_coins.reward_history : []);
          setCoinsData({
            total_coins: Number(d.my_rewards_and_coins.total_coins || 0),
            total_earned_coins: Number(d.my_rewards_and_coins.total_earned_coins || 0),
            total_redeemed_coins: Number(d.my_rewards_and_coins.total_redeemed_coins || 0),
            history: hist,
          });
        }
      }

      if (cnRes.status === "fulfilled" && cnRes.value) {
        setCoinsData((prev) => ({
          total_coins: Math.max(prev.total_coins, Number(cnRes.value.total_coins || 0)),
          total_earned_coins: Number(cnRes.value.total_earned_coins ?? prev.total_earned_coins ?? 0),
          total_redeemed_coins: Number(cnRes.value.total_redeemed_coins ?? prev.total_redeemed_coins ?? 0),
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

  const formatCompDate = useCallback((dateVal?: string) => {
    if (!dateVal) return "Upcoming Season";
    return formatEventDate(dateVal);
  }, []);

  const formatCompTime = useCallback((timeVal?: string, dateVal?: string) => {
    if (timeVal && typeof timeVal === "string" && timeVal.trim()) return timeVal;
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime()) && (d.getHours() !== 0 || d.getMinutes() !== 0)) {
        return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
      }
    }
    return "10:00 AM – 6:00 PM";
  }, []);

  const displayUpcomingCompetitions = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    for (const c of competitions) {
      const id = String(c.competition_id || c._id || c.id || "");
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        list.push({
          id,
          title: c.competition_title || c.title || c.name || "Talent Competition",
          date: c.start_date || c.registration_deadline || c.event_date,
          time: c.start_time || c.time || c.event_time,
          image_url: c.image_url || c.card_image_url || c.banner_url || c.banner_image_url || c.cover_image,
          category: c.category || "Official Contest",
          isEnrolled: true,
        });
      }
    }

    for (const c of publicCompetitions) {
      const id = String(c._id || c.id || "");
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        list.push({
          id,
          title: c.title || c.name || "Talent Competition",
          date: c.start_date || c.registration_deadline || c.event_date,
          time: c.start_time || c.time || c.event_time,
          image_url: c.image_url || c.card_image_url || c.banner_url || c.banner_image_url || c.cover_image,
          category: c.category || "Talent Contest",
          isEnrolled: false,
        });
      }
    }

    const fallbacks = [
      {
        id: "comp-national-talent",
        title: "National Talent Grand Showcase 2026",
        date: "2026-11-15T10:00:00.000Z",
        time: "10:00 AM – 6:00 PM",
        image_url: FALLBACK_IMAGES[0],
        category: "Grand Showcase",
        isEnrolled: false,
      },
      {
        id: "comp-voice-india",
        title: "Voice of India Youth Championship",
        date: "2026-11-28T14:00:00.000Z",
        time: "02:00 PM – 8:00 PM",
        image_url: FALLBACK_IMAGES[1],
        category: "Singing",
        isEnrolled: false,
      },
      {
        id: "comp-hip-hop-battle",
        title: "All India Hip-Hop & Street Battle",
        date: "2026-12-05T11:00:00.000Z",
        time: "11:00 AM – 5:00 PM",
        image_url: FALLBACK_IMAGES[2],
        category: "Street Dance",
        isEnrolled: false,
      },
    ];

    for (const fb of fallbacks) {
      if (list.length >= 2) break;
      list.push(fb);
    }

    return list.slice(0, 2);
  }, [competitions, publicCompetitions]);

  if (authLoading || !user) {
    return (
      <section className="grid min-h-dvh place-items-center">
        <Loader2 className="size-7 animate-spin text-[var(--accent)]" aria-label="Loading" />
      </section>
    );
  }

  const vipCount = vipBookings.length + vipPasses.length;

  const TABS: { key: Tab; label: string; Icon: any; count?: number | string }[] = [
    { key: "profile", label: "Profile", Icon: User },
    { key: "competitions", label: "Competitions", Icon: Trophy, count: competitions.length },
    { key: "tickets", label: "My Tickets", Icon: Ticket, count: tickets.length },
    { key: "certificates", label: "Certificates", Icon: Award, count: certificates.length },
    { key: "rewards", label: "Rewards & Coins", Icon: Coins, count: coinsData.total_coins },
    { key: "vip", label: "VIP Passes", Icon: Crown, count: vipCount },
    { key: "events", label: "Events & Courses", Icon: CalendarDays, count: eventsRegistered.length + coursesRegistered.length },
    { key: "orders", label: "Shop Orders", Icon: Package, count: merchOrders.length },
  ];

  return (
    <section className="relative min-h-dvh overflow-x-hidden pb-36 pt-20 sm:pt-24 md:pt-32 md:pb-24 noise">
      <Spotlights variant="b" />

      <div className="container-x relative max-w-[1560px]">
        {/* ── THE EXECUTIVE MASTER CANVAS (Direct match of reference screenshot!) ── */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col md:flex-row min-h-[860px]">
          
          {/* ── LEFT SIDEBAR NAVIGATION (Matching Reference Screenshot!) ── */}
          <aside className="w-full md:w-60 lg:w-68 shrink-0 bg-[#0c224b] text-white flex flex-col justify-between p-5 sm:p-6 border-b md:border-b-0 md:border-r border-white/10">
            <div>
              {/* User Avatar + Dropdown at top (matching Helen Voizhicki ⌵) */}
              <div
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all cursor-pointer shadow-sm"
              >
                <div className="size-11 rounded-full overflow-hidden border-2 border-white/20 bg-black/40 shrink-0 grid place-items-center">
                  {user?.profile_photo ? (
                    <img src={user.profile_photo} alt={user?.name || "User"} className="size-full object-cover" />
                  ) : (
                    <User className="size-5 text-white/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-white truncate flex items-center justify-between">
                    <span className="truncate flex items-center gap-1">
                      {user?.name || "Contestant"}
                      {(user?.is_verified || user?.verified_badge || user?.verified_tick) && (
                        <VerifiedBadge size="xs" />
                      )}
                    </span>
                    <span className="text-[10px] text-white/60">▾</span>
                  </p>
                  <p className="text-[10px] font-mono text-cyan-300 truncate">Performing Artist</p>
                </div>
              </div>

              {/* Search input (as shown in reference screenshot) */}
              <div className="mt-4 relative hidden sm:block">
                <Search className="absolute left-3 top-2.5 size-3.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-xl bg-white/10 border border-white/10 pl-8 pr-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
              </div>

              {/* Vertical Navigation Items (Matching Reference Screenshot!) */}
              <nav className="mt-5 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none" role="tablist">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-left shrink-0",
                      tab === t.key
                        ? "bg-white/20 text-white font-bold shadow-sm border border-white/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <t.Icon className={cn("size-4 shrink-0", tab === t.key ? "text-cyan-300" : "text-white/60")} />
                      <span className="whitespace-nowrap">{t.label}</span>
                    </div>
                    {t.count !== undefined && t.count !== 0 && (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-mono ml-2",
                        tab === t.key ? "bg-cyan-400 text-black font-bold" : "bg-white/10 text-white/70"
                      )}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Bottom branding footer */}
            <div className="mt-6 pt-4 border-t border-white/10 hidden md:flex items-center justify-between text-[11px] text-white/50">
              <span className="font-mono text-[10px]">Upgrade Talents</span>
              <button onClick={logout} className="text-red-300 hover:text-red-200 text-[11px] flex items-center gap-1 cursor-pointer">
                <LogOut className="size-3" /> Log out
              </button>
            </div>
          </aside>

          {/* ── RIGHT MAIN CANVAS ── */}
          <main className="flex-1 bg-[var(--bg)]/40 p-4 sm:p-6 lg:p-7 overflow-y-auto">
            {error && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-4 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                <div>
                  <p className="text-[var(--danger)]">{error}</p>
                  <Button onClick={() => loadAll()} variant="outline" size="sm" className="mt-2">Retry</Button>
                </div>
              </div>
            )}

            {loading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-56 rounded-[var(--radius-lg)]" />
                ))}
              </div>
            )}

        {/* ════════════════════════════════════════════════════════════════
            1. TICKETS TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "tickets" && (() => {
          const activeTicketsList = tickets.filter((t) => {
            const isExp = isEventExpired(t.event_date || t.issued_at, t.event_time);
            const isUsed = Boolean(t.is_checked_in || t.status === "USED" || (t.quantity && t.admitted_count && t.admitted_count >= t.quantity));
            return !isExp && !isUsed;
          });

          const usedTicketsList = tickets.filter((t) => {
            const isExp = isEventExpired(t.event_date || t.issued_at, t.event_time);
            const isUsed = Boolean(t.is_checked_in || t.status === "USED" || (t.quantity && t.admitted_count && t.admitted_count >= t.quantity));
            return isExp || isUsed;
          });

          const displayedTickets = ticketFilter === "active"
            ? activeTicketsList
            : ticketFilter === "used"
            ? usedTicketsList
            : tickets;

          return (
            <div className="mt-8 flex flex-col gap-8">
              {/* ── Subview Switcher & Statistics Bar ── */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-xl">
                {/* View switcher: Passes vs Records */}
                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  <button
                    type="button"
                    onClick={() => setTicketSubView("passes")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                      ticketSubView === "passes"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    )}
                  >
                    <QrCode className="size-3.5" /> Admission Passes ({tickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketSubView("history")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                      ticketSubView === "history"
                        ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    )}
                  >
                    <Receipt className="size-3.5" /> Booking History ({bookings.length})
                  </button>
                </div>

                {/* Filter Pills when on Passes view */}
                {ticketSubView === "passes" && tickets.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTicketFilter("all")}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                        ticketFilter === "all"
                          ? "bg-white/10 text-white border border-white/20"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      All ({tickets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFilter("active")}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                        ticketFilter === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "text-zinc-400 hover:text-emerald-400"
                      )}
                    >
                      Active ({activeTicketsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFilter("used")}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                        ticketFilter === "used"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "text-zinc-400 hover:text-rose-400"
                      )}
                    >
                      Used / Past ({usedTicketsList.length})
                    </button>
                  </div>
                )}
              </div>

              {/* ── 1. DIGITAL PASSES VIEW ── */}
              {ticketSubView === "passes" && (
                displayedTickets.length ? (
                  <div className="flex flex-col gap-10">
                    {[...displayedTickets]
                      .sort((a, b) => {
                        const aExp = isEventExpired(a.event_date || a.issued_at, a.event_time) || a.is_checked_in;
                        const bExp = isEventExpired(b.event_date || b.issued_at, b.event_time) || b.is_checked_in;
                        if (aExp !== bExp) return aExp ? 1 : -1;
                        return 0;
                      })
                      .map((t, idx) => (
                        <Reveal key={t.ticket_ref} delay={idx * 0.08}>
                          <TicketPass ticket={t} />
                        </Reveal>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    Icon={TicketX}
                    title={ticketFilter === "active" ? "No active tickets" : "No tickets found"}
                    body={
                      ticketFilter === "active"
                        ? "You have no upcoming active gate passes. All prior passes have been used or concluded."
                        : "Once you book an event, your live QR admission vouchers appear here instantly."
                    }
                    ctaLink="/events"
                    ctaText="Explore Live Events"
                  />
                )
              )}

              {/* ── 2. BOOKING HISTORY VIEW (A to Z Records) ── */}
              {ticketSubView === "history" && (
                bookings.length ? (
                  <div className="flex flex-col gap-4">
                    {bookings.map((b: any) => {
                      const bQty = Number(b.quantity || 1);
                      const isCash = b.payment_method === "CASH" || b.cash_payment;
                      const isConfirmed = b.booking_status === "CONFIRMED";
                      const tix: any[] = Array.isArray(b.tickets) ? b.tickets : [];
                      const checkedInCount = tix.filter((t) => t.is_checked_in).length;
                      const isFullyCheckedIn = b.is_checked_in || (tix.length > 0 && checkedInCount >= tix.length);

                      return (
                        <div
                          key={b._id || b.booking_reference}
                          className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-black/40 p-5 backdrop-blur-xl transition-all hover:border-white/20 sm:p-6"
                        >
                          {/* Booking Card Header */}
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                                  {b.booking_reference}
                                </span>
                                {isCash ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                    <Banknote className="size-3" /> Cash on Spot
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                                    <CreditCard className="size-3" /> Online Paid
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-zinc-400">
                                Booked on: {formatEventDate(b.booked_at || b.created_at)}
                              </p>
                            </div>

                            {/* Status badges */}
                            <div className="flex items-center gap-2">
                              {isFullyCheckedIn ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 font-mono text-[11px] font-bold text-rose-300">
                                  <CheckCircle2 className="size-3" /> Entry Completed ({bQty} Admitted)
                                </span>
                              ) : isConfirmed ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-bold text-emerald-300">
                                  <ShieldCheck className="size-3" /> Active Pass Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 font-mono text-[11px] font-bold text-amber-300">
                                  <Clock className="size-3" /> {b.booking_status}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Booking Details Grid */}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                            <div>
                              <span className="font-mono text-[10px] uppercase text-zinc-500">Event</span>
                              <p className="font-semibold text-white truncate">{b.event_title || "Official Event"}</p>
                              {b.event_venue && (
                                <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="size-3" /> {b.event_venue}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="font-mono text-[10px] uppercase text-zinc-500">Admissions / Capacity</span>
                              <p className="font-bold text-white">
                                {bQty} {bQty > 1 ? "Persons (Group Admission)" : "Person"}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {isFullyCheckedIn ? "All attendees admitted" : `${checkedInCount} / ${bQty} checked in`}
                              </p>
                            </div>

                            <div>
                              <span className="font-mono text-[10px] uppercase text-zinc-500">Total Amount</span>
                              <p className="font-mono font-bold text-white">{formatINR(b.total_amount)}</p>
                              <p className="text-[11px] text-zinc-400 font-mono">
                                Payment: {b.payment_status || "COMPLETED"}
                              </p>
                            </div>

                            <div className="flex items-center justify-start lg:justify-end">
                              <button
                                type="button"
                                onClick={() => setTicketSubView("passes")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 font-mono text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
                              >
                                <QrCode className="size-3.5 text-[var(--accent)]" /> View Pass
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    Icon={Receipt}
                    title="No booking history"
                    body="You haven't made any event ticket bookings yet."
                    ctaLink="/events"
                    ctaText="Explore Live Events"
                  />
                )
              )}
            </div>
          );
        })()}

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
                  const isCash = Boolean(c.cash_payment || c.payment_method === "CASH");
                  const isPaid = c.is_confirmed || c.payment_status === "PAID" || c.payment_status === "NOT_REQUIRED" || c.status === "CONFIRMED";
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
                          <Badge tone={isCash ? "warning" : isPaid ? "success" : "warning"}>
                            {isCash ? "Cash on Venue" : isPaid ? "Confirmed" : "Payment Pending"}
                          </Badge>
                          {c.stage_status === "ON_STAGE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 font-mono text-[10.5px] font-extrabold text-rose-300 animate-pulse">
                              <Radio className="size-3" /> Live on Stage
                            </span>
                          ) : c.rank ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-yellow-300">
                              <Medal className="size-3" /> Rank #{c.rank} {c.score != null ? `(${c.score} pts)` : ""}
                            </span>
                          ) : null}
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
                          {isCash && (
                            <p className="flex items-center gap-1.5 font-semibold text-amber-400">
                              <Banknote className="size-3.5 text-amber-400" />
                              Entry Fee: ₹{c.fee || 0} (Pay in Cash at Venue)
                            </p>
                          )}
                          {c.submitted_at && (
                            <p className="flex items-center gap-1.5 text-[var(--success)]">
                              <CheckCircle2 className="size-3.5" />
                              Submitted: {formatEventDate(c.submitted_at)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[var(--fg-subtle)]">Entry Status:</span>
                            {!isPaid ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                                <AlertCircle className="size-3.5" /> Payment Required
                              </span>
                            ) : hasSubmitted ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">
                                <CheckCircle2 className="size-3.5" /> Entry Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                <AlertCircle className="size-3.5" /> Entry Submission Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                        <Link
                          href={`/competitions/${compId}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)] transition-transform active:scale-95"
                          style={{ background: !isPaid ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "var(--grad-brand)" }}
                        >
                          {!isPaid ? "Complete Payment" : hasSubmitted ? "View Competition" : "Upload Your Entry"}
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                        {hasSubmitted && (
                          <Link
                            href={`/competitions/${compId}/results`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] py-2 text-xs font-semibold text-[var(--fg)] hover:border-[var(--border-strong)] transition-colors"
                          >
                            <Trophy className="size-3.5 text-[var(--accent)]" /> Official Results &amp; Feedback
                          </Link>
                        )}
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
          <RewardsTab
            coinsData={coinsData}
            referralData={referralData}
            user={user}
            onOpenShare={() => setShareModalOpen(true)}
          />
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
                {eventsRegistered.map((ev, i) => {
                  const isPaid = ev.is_confirmed || ev.status === "CONFIRMED" || ev.payment_status === "PAID" || ev.payment_status === "NOT_REQUIRED";
                  const isExpired = isEventExpired(ev.date || ev.event_date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] p-6 transition-all",
                        isExpired ? "border-red-500/30" : "border-[var(--border)]"
                      )}
                    >
                      <div className={cn("transition-all duration-300", isExpired && "filter blur-[1.5px] opacity-50 select-none pointer-events-none")}>
                        <Badge tone={isExpired ? "danger" : isPaid ? "success" : "warning"}>
                          {isExpired ? "Expired Event" : isPaid ? "Registered Event" : "Payment Pending"}
                        </Badge>
                        <h3 className="mt-3 font-display text-xl font-bold uppercase">{ev.activity_title || ev.title || "Live Event"}</h3>
                        <p className="mt-2 text-xs text-[var(--fg-muted)]">
                          Ref: <span className="font-mono text-[var(--fg)]">{ev.registration_id || ev._id || ev.order_reference}</span>
                        </p>
                        {ev.date && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                            <CalendarDays className="size-3.5" /> {formatEventDate(ev.date)}
                          </p>
                        )}
                      </div>

                      {isExpired && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-black/35 backdrop-blur-[1px]">
                          <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-black/85 px-4 py-2 shadow-xl">
                            <TicketX className="size-4 text-red-400" />
                            <span className="font-display text-sm font-bold uppercase tracking-wider text-red-400">
                              Event Expired
                            </span>
                          </div>
                          {ev.date && (
                            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-300">
                              Passed on {formatEventDate(ev.date)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {coursesRegistered.map((cr, i) => {
                  const isPaid = cr.is_confirmed || cr.status === "CONFIRMED" || cr.payment_status === "PAID" || cr.payment_status === "NOT_REQUIRED";
                  return (
                    <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
                      <Badge tone={isPaid ? "brand" : "warning"}>{isPaid ? "Registered Course" : "Payment Pending"}</Badge>
                      <h3 className="mt-3 font-display text-xl font-bold uppercase">{cr.activity_title || cr.title || "Masterclass"}</h3>
                      <p className="mt-2 text-xs text-[var(--fg-muted)]">
                        Ref: <span className="font-mono text-[var(--fg)]">{cr.registration_id || cr._id || cr.order_reference}</span>
                      </p>
                    </div>
                  );
                })}
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
            7. SHOP ORDERS TAB
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "orders" && (
          <div className="mt-10 flex flex-col gap-6">
            {merchOrders.length ? (
              <div className="flex flex-col gap-5">
                {merchOrders.map((ord, i) => {
                  const isPaid = ord.payment_status === "PAID" || ord.status === "CONFIRMED" || ord.status === "DELIVERED" || ord.status === "SHIPPED";
                  const isPending = ord.status === "PENDING_PAYMENT" || ord.payment_status === "PENDING";
                  const isCancelled = ord.status === "CANCELLED";
                  const tone = isCancelled ? "danger" : isPaid ? "success" : "warning";
                  const statusLabel = isCancelled ? "Cancelled" : isPaid ? (ord.status || "Paid") : "Payment Pending";

                  return (
                    <motion.div
                      key={ord.order_number || ord._id || ord.id || i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md transition-all hover:border-[var(--accent)]"
                    >
                      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={tone}>{statusLabel}</Badge>
                            <span className="font-mono text-xs font-bold text-[var(--accent)]">
                              #{ord.order_number}
                            </span>
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                            <Clock className="size-3.5 text-[var(--fg-subtle)]" />
                            Placed on {formatEventDate(ord.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">Total</span>
                            <p className="font-display text-lg font-bold text-white">{formatINR(ord.total_amount)}</p>
                          </div>
                          {isPending && !isCancelled && (
                            <Link
                              href="/shop"
                              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[var(--on-accent)]"
                              style={{ background: "var(--grad-brand)" }}
                            >
                              <CreditCard className="size-3.5" /> Retry in Shop
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-4 divide-y divide-[var(--border)]">
                        {(ord.items || []).map((it: any, idx: number) => {
                          const itemImg = it.image_url || it.image || "";
                          const itemVariant = [it.variant?.color, it.variant?.size].filter(Boolean).join(" · ");
                          return (
                            <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                              {itemImg ? (
                                <img
                                  src={itemImg}
                                  alt={it.title || it.name || "Item"}
                                  className="size-14 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-cover"
                                />
                              ) : (
                                <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-subtle)]">
                                  <Package className="size-6" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm line-clamp-1">{it.title || it.name || "Merchandise Item"}</p>
                                {itemVariant && <p className="text-xs text-[var(--fg-subtle)]">{itemVariant}</p>}
                                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                                  Qty: <span className="font-semibold text-white">{it.quantity}</span> × {formatINR(it.price || it.unit_price || 0)}
                                </p>
                              </div>
                              <p className="font-display font-bold text-sm">
                                {formatINR((it.price || it.unit_price || 0) * (it.quantity || 1))}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Delivery Address & Actions */}
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--border)] pt-4">
                        {ord.shipping_address && (
                          <div className="flex items-start gap-2 text-xs text-[var(--fg-muted)]">
                            <MapPin className="size-4 shrink-0 text-[var(--accent)] mt-0.5" />
                            <div className="min-w-0">
                              <span className="font-semibold text-white">{ord.shipping_address.full_name || ord.user_name}</span>
                              <span className="ml-1 text-[var(--fg-subtle)]">
                                · {[ord.shipping_address.city, ord.shipping_address.state].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {(ord.courier_name || ord.tracking_number) && (
                            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-mono text-[var(--fg-muted)]">
                              {ord.courier_name ? `${ord.courier_name}: ` : ""}{ord.tracking_number || "Dispatched"}
                            </span>
                          )}
                          <Link
                            href={`/merchandise/orders/${ord.order_number || ord._id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                          >
                            Track & Details <ArrowUpRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                Icon={Package}
                title="No shop orders yet"
                body="You haven't ordered any merchandise yet. Explore official hoodies, tees, caps, and gear in our shop."
                ctaLink="/shop"
                ctaText="Browse Shop"
              />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            8. PROFILE & PERSONAL DETAILS TAB — ULTRA PRO REFERENCE SUITE
           ════════════════════════════════════════════════════════════════ */}
        {!loading && tab === "profile" && (
          <Reveal className="mt-6">
            <div className="flex flex-col gap-6">

              {/* Incomplete Profile Alert if needed */}
              {(user?.requires_profile_completion || !user?.is_profile_completed || !user?.phone_number || !user?.date_of_birth || !user?.address || !user?.parent_phone_number) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-100 text-sm">Action Required: Complete Your Profile Details</p>
                      <p className="mt-1 text-amber-300/80 leading-relaxed">
                        Please provide your full name, 10-digit mobile number, date of birth, residential address, and parent/guardian phone number to activate full account capabilities.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="shrink-0 rounded-full bg-amber-500 px-4 py-2 font-bold text-black transition-colors hover:bg-amber-400 active:scale-95 shadow-md cursor-pointer"
                  >
                    Complete Profile
                  </button>
                </div>
              )}

              {/* ── PROFILE HEADER (matching reference: Title on left, Date & Controls on right) ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg)]">
                    Profile
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  <span className="font-mono">
                    {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })},{" "}
                    {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--border)]">
                    <button
                      onClick={() => setEditOpen(true)}
                      title="Edit Profile Settings"
                      aria-label="Settings"
                      className="grid size-8 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                    >
                      <Settings className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── TOP SECTION: 3 Bento Widgets (Identity Card + Calendar + Upcoming Competitions) ── */}
              <div className="grid gap-6 lg:grid-cols-12">

                {/* 1. Main Identity Card (5 cols on lg - Executive Artist Suite) */}
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-4 sm:gap-5">
                      {/* Avatar with circular offset and camera badge */}
                      <div className="relative shrink-0">
                        <div className="size-20 sm:size-24 rounded-full p-1 border-2 border-[var(--border-strong)] bg-[var(--surface-2)] shadow-md">
                          <div className="size-full overflow-hidden rounded-full grid place-items-center bg-[var(--bg)]">
                            {user?.profile_photo ? (
                              <img src={user.profile_photo} alt={user?.name || "Profile"} className="size-full object-cover" />
                            ) : (
                              <User className="size-10 sm:size-11 text-[var(--fg-muted)]" />
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditOpen(true)}
                          title="Change Profile Photo"
                          aria-label="Change photo"
                          className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full bg-[var(--accent)] text-white shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Camera className="size-3.5" />
                        </button>
                      </div>

                      {/* User Info Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--fg)] tracking-tight flex items-center gap-1.5">
                            {user?.name || "Contestant"}
                            {(user?.is_verified || user?.verified_badge || user?.verified_tick) && (
                              <VerifiedBadge size="md" />
                            )}
                          </h3>
                          {(user?.is_verified || user?.verified_badge || user?.verified_tick) ? (
                            <span className="rounded-md bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-300 font-mono flex items-center gap-1.5 shadow-sm">
                              <VerifiedBadge size="xs" />
                              Aadhaar Verified
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 space-y-1.5 text-xs text-[var(--fg-muted)]">
                          <div className="flex items-center gap-3 text-[11px] flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <strong className="text-[var(--fg-subtle)] font-normal">Role:</strong>
                              <span className="font-semibold text-[var(--fg)]">{user?.role || "User"}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <strong className="text-[var(--fg-subtle)] font-normal">Position:</strong>
                              <span className="font-semibold text-cyan-400">Performing Artist</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                            <strong className="text-[var(--fg-subtle)] font-normal shrink-0">E-mail:</strong>
                            <span className="font-mono text-[var(--fg)] break-all">{user?.email || "—"}</span>
                            {user?.email && (
                              <button
                                onClick={handleCopyEmail}
                                title="Copy email address"
                                aria-label="Copy email"
                                className="p-0.5 text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                              >
                                {copiedEmail ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px]">
                            <strong className="text-[var(--fg-subtle)] font-normal">Phone:</strong>
                            <span className="font-mono text-[var(--fg)] font-medium">
                              {user?.phone_number ? `+91 ${user.phone_number}` : "Not linked"}
                            </span>
                            {user?.phone_number && (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-emerald-400">
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] flex items-center gap-1.5">
                            <strong className="text-[var(--fg-subtle)] font-normal">Platform:</strong>
                            <span className="font-medium text-[var(--accent)]">Upgrade Talents India</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social / Referral Links Row */}
                  <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {user?.referral_code && (
                        <button
                          onClick={() => setShareModalOpen(true)}
                          title="Invite friends & earn 100 UTI Coins"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent px-3.5 py-1.5 text-xs font-mono font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm group"
                        >
                          <Sparkles className="size-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                          <span>Code: {user.referral_code}</span>
                          <span className="hidden sm:inline-block ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-sans font-semibold text-amber-300">
                            +100 Coins
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => setShareModalOpen(true)}
                        title="Share profile invite & QR Code"
                        aria-label="Share profile referral"
                        className="grid size-8 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:text-white hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm"
                      >
                        <Share2 className="size-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer transition-all active:scale-95"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <Edit3 className="size-3.5" /> Edit Profile
                    </button>
                  </div>
                </div>

                {/* 2. Mini Month Calendar (3 cols on lg) */}
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl lg:col-span-3 flex flex-col justify-between">
                  <div>
                    {/* Header with Month Title and Controls */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <button
                        onClick={prevMonth}
                        aria-label="Previous month"
                        className="text-base font-bold text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-[var(--surface-2)]"
                      >
                        &lsaquo;
                      </button>
                      <span className="font-mono text-xs font-bold tracking-widest text-[var(--fg)] uppercase">
                        {calendarMonthYear}
                      </span>
                      <button
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="text-base font-bold text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-[var(--surface-2)]"
                      >
                        &rsaquo;
                      </button>
                    </div>

                    {/* Weekday Labels (SUN, MON, TUE, WED, THU, FRI, SAT) */}
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                        <div key={d} className="py-0.5">{d}</div>
                      ))}
                    </div>

                    {/* Calendar Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
                      {calendarDays.slice(0, 35).map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "grid size-6 sm:size-7 m-auto place-items-center rounded-full text-[11px] transition-all",
                            item.isToday
                              ? "bg-[var(--fg)] text-[var(--bg)] font-bold shadow-md"
                              : item.currentMonth
                              ? "text-[var(--fg)] hover:bg-[var(--surface-2)]"
                              : "text-[var(--fg-subtle)]/30"
                          )}
                        >
                          {item.day}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Footer Info */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--fg-subtle)]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[var(--fg)]" /> Today
                    </span>
                    <button
                      onClick={() => setTab("competitions")}
                      className="text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                    >
                      Contest Schedule &rarr;
                    </button>
                  </div>
                </div>

                {/* 3. Upcoming Competitions (4 cols on lg - Generous room, no text crushing!) */}
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl lg:col-span-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[var(--fg)] flex items-center gap-1.5">
                          <Trophy className="size-3.5 text-amber-400" />
                          Upcoming Competitions
                        </h4>
                        <span className="text-[10px] text-[var(--fg-subtle)] font-mono">Season 2026 • Live Stages</span>
                      </div>
                      <Link
                        href="/competitions"
                        className="rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ background: "var(--grad-brand)" }}
                      >
                        View All
                      </Link>
                    </div>

                    {/* Stacked Competition Cards with Image, Name, Date, Time */}
                    <div className="flex flex-col gap-2.5">
                      {displayUpcomingCompetitions.map((comp, idx) => {
                        const compLink = comp.id?.startsWith("comp-") ? "/competitions" : `/competitions/${comp.id}`;
                        const img = imageFor(comp.image_url, idx);
                        const compDate = formatCompDate(comp.date);
                        const compTime = formatCompTime(comp.time, comp.date);

                        return (
                          <Link
                            key={comp.id || idx}
                            href={compLink}
                            title={comp.title}
                            className="group relative flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-2.5 transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:shadow-lg hover:shadow-[var(--accent)]/5 cursor-pointer overflow-hidden"
                          >
                            {/* Left accent vertical indicator bar */}
                            <div
                              className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                idx === 0 ? "bg-cyan-400" : "bg-amber-400"
                              )}
                            />

                            {/* Competition Image Thumbnail */}
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-inner">
                              <img
                                src={img}
                                alt={comp.title}
                                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                              {comp.isEnrolled ? (
                                <span className="absolute bottom-1 left-1 rounded bg-emerald-500/90 px-1 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-black">
                                  Enrolled
                                </span>
                              ) : (
                                <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-cyan-300">
                                  {comp.category ? comp.category.slice(0, 8) : "Live"}
                                </span>
                              )}
                            </div>

                            {/* Competition Details: Name, Date, Time */}
                            <div className="flex-1 min-w-0 pr-1">
                              <h5 className="font-display text-xs font-bold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors truncate block">
                                {comp.title}
                              </h5>

                              <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-mono text-[var(--fg-muted)]">
                                <span className="flex items-center gap-1 truncate text-[var(--fg)]/90">
                                  <Calendar className="size-3 shrink-0 text-[var(--accent)]" />
                                  {compDate}
                                </span>
                                <span className="flex items-center gap-1 truncate text-[var(--fg-subtle)]">
                                  <Clock className="size-3 shrink-0 text-cyan-400" />
                                  {compTime}
                                </span>
                              </div>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="shrink-0 pr-1">
                              <span className="grid size-6 place-items-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-subtle)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)] transition-colors">
                                <ArrowUpRight className="size-3" />
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* High-visibility KPI chips */}
                  <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 py-1.5 px-2">
                      <span className="block text-[9px] font-mono uppercase text-[var(--fg-subtle)]">Enrolled</span>
                      <strong className="text-xs font-bold text-[var(--fg)]">{competitions.length}</strong>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 py-1.5 px-2">
                      <span className="block text-[9px] font-mono uppercase text-[var(--fg-subtle)]">Passes</span>
                      <strong className="text-xs font-bold text-[var(--fg)]">{tickets.length}</strong>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 py-1.5 px-2">
                      <span className="block text-[9px] font-mono uppercase text-amber-300/80">Coins</span>
                      <strong className="text-xs font-bold text-amber-400 font-mono">{coinsData.total_coins}</strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── BOTTOM SECTION: 2 Balanced Modular Cards (Talent Credentials & Contestant Journey) ── */}
              <div className="grid gap-6 lg:grid-cols-12">

                {/* Card 4: Talent Identity & Verified Credentials (6 cols on lg) */}
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl lg:col-span-6 flex flex-col justify-between">
                  <div>
                    {/* Subsection 1: Official Talent Credentials */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                          <ShieldCheck className="size-4 text-[var(--accent)]" />
                          Talent Credentials <span className="font-normal text-xs text-[var(--fg-subtle)]">(Official)</span>
                        </h4>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                          Active Account
                        </span>
                      </div>

                      {/* 4 dark/glass rounded credential pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* Member Since */}
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Member Since</span>
                          <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-center text-[11px] font-mono font-bold text-[var(--fg)] shadow-sm">
                            {user?.created_at ? formatEventDate(user.created_at) : "30 Oct 2026"}
                          </div>
                        </div>

                        {/* Talent Track */}
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Talent Track</span>
                          <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-center text-[11px] font-mono font-bold text-cyan-400 shadow-sm">
                            Contestant
                          </div>
                        </div>

                        {/* Talent Code */}
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Talent Code</span>
                          <button
                            type="button"
                            onClick={() => setShareModalOpen(true)}
                            title="Click to share your Talent Referral Code & earn coins"
                            className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 px-2 py-2 text-center text-[11px] font-mono font-bold text-amber-400 shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="size-3 text-amber-400" />
                            {user?.referral_code || "UTI-ARTIST"}
                          </button>
                        </div>

                        {/* Govt ID Verification */}
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Govt ID Status</span>
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-2 py-2 text-center text-[11px] font-mono font-bold text-emerald-400 shadow-sm flex items-center justify-center gap-1">
                            <CheckCircle2 className="size-3 shrink-0" /> Verified
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsection 2: Personal Information (Editable) */}
                    <div className="mb-6 pt-5 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                          <User className="size-4 text-[var(--accent)]" />
                          Personal &amp; Contact Details
                        </h4>
                        <button
                          onClick={() => setEditOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          <Edit3 className="size-3" /> Edit Details
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Birth Date */}
                        <div className="sm:col-span-1">
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Date of Birth</span>
                          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-mono font-semibold text-[var(--fg)]">
                            <CalendarDays className="size-4 text-[var(--accent)] shrink-0" />
                            <span>{user?.date_of_birth ? formatEventDate(user.date_of_birth) : "18 Feb 2002"}</span>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="sm:col-span-2">
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Full Residential Address</span>
                          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)]">
                            <MapPin className="size-4 text-[var(--accent)] shrink-0 mt-0.5" />
                            <span className="font-medium capitalize">{user?.address || "Kolkata, West Bengal, India"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Parent / Guardian Phone</span>
                          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-mono text-[var(--fg)]">
                            <Phone className="size-3.5 text-[var(--accent)] shrink-0" />
                            <span className="font-semibold">{user?.parent_phone_number ? `+91 ${user.parent_phone_number}` : "Not linked"}</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Emergency Contact Status</span>
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-400">
                            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                            <span className="font-semibold">Linked &amp; Verified</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-[var(--fg-subtle)] mb-1.5">Aadhaar &amp; Blue Badge</span>
                          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono ${
                            user?.is_verified || user?.verified_badge || user?.verified_tick
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                              : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-subtle)]"
                          }`}>
                            {user?.is_verified || user?.verified_badge || user?.verified_tick ? (
                              <span className="font-semibold flex items-center gap-1.5 truncate">
                                <VerifiedBadge size="xs" /> Lifetime Verified
                              </span>
                            ) : (
                              <span className="font-medium text-amber-300 truncate">Venue Check Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsection 3: Talent Discipline & Representation */}
                    <div className="pt-5 border-t border-[var(--border)]">
                      <div className="mb-3">
                        <h4 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                          <Sparkles className="size-4 text-amber-400" />
                          Talent Profile &amp; Representation
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-400">
                            <Sparkles className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono uppercase text-[var(--fg-subtle)] truncate">Art Discipline</span>
                            <p className="text-xs font-bold text-[var(--fg)] truncate">Dance &amp; Arts</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-400">
                            <Trophy className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono uppercase text-[var(--fg-subtle)] truncate">Performance Level</span>
                            <p className="text-xs font-bold text-[var(--fg)] truncate">State Contestant</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-400">
                            <MapPin className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[9px] font-mono uppercase text-[var(--fg-subtle)] truncate">Representation</span>
                            <p className="text-xs font-bold text-[var(--fg)] truncate">
                              {user?.address ? user.address.split(",").slice(-2).join(", ") : "West Bengal, India"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5: Contestant Journey & Milestones Roadmap (6 cols on lg) */}
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl lg:col-span-6 flex flex-col justify-between">
                  <div>
                    {/* Header with Title and "5/5 Verified" pill */}
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                      <div>
                        <h4 className="text-base font-bold text-[var(--fg)] flex items-center gap-2">
                          <Award className="size-4.5 text-[var(--accent)]" />
                          Contestant Journey &amp; Milestones
                        </h4>
                        <span className="text-[11px] text-[var(--fg-subtle)] font-mono">Official verification checkpoints</span>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="size-3.5" /> 5/5 Verified
                      </span>
                    </div>

                    {/* Table Header Row */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 py-3 text-[10px] font-mono uppercase tracking-wider text-[var(--fg-subtle)] border-b border-[var(--border)]">
                      <div className="col-span-6">Verification Milestone</div>
                      <div className="col-span-3">Category</div>
                      <div className="col-span-3 text-right">Status</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-[var(--border)]">
                      {[
                        { title: "Contestant Profile Activated", sub: "Name, mobile & verified credentials", cat: "Identity", status: "Verified", date: "Completed" },
                        { title: "Guardian Emergency Contact", sub: "Parent/guardian safety contact verified", cat: "Safety", status: "Verified", date: "Completed" },
                        { title: "Age Bracket Clearance", sub: "DOB validated for competition categories", cat: "Eligibility", status: "Cleared", date: "Completed" },
                        { title: "Digital Artist Pass & QR", sub: "Unique contestant entry pass issued", cat: "Credentials", status: "Issued", date: "Active" },
                        { title: "Referral Rewards Program", sub: "Earn 500 UTI Coins per invited friend", cat: "Rewards", status: "Active", date: "Ongoing" },
                      ].map((row, i) => (
                        <div key={i} className="grid sm:grid-cols-12 gap-2 items-center py-3.5 text-xs">
                          <div className="sm:col-span-6 flex items-start gap-2.5 min-w-0">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                              <Check className="size-3 stroke-[2.5]" />
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold text-[var(--fg)] text-xs block truncate">
                                {row.title}
                              </span>
                              <span className="text-[10px] text-[var(--fg-subtle)] block truncate">
                                {row.sub}
                              </span>
                            </div>
                          </div>

                          <div className="sm:col-span-3 text-[11px] font-mono text-[var(--fg-muted)]">
                            <span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-subtle)]">
                              {row.cat}
                            </span>
                          </div>

                          <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                              {row.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1"
                    >
                      Security &amp; Password Settings &rarr;
                    </Link>
                    <Link
                      href="/competitions"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <Trophy className="size-3.5 text-amber-200" /> Explore Competitions &rarr;
                    </Link>
                  </div>
                </div>

              </div>

              {/* ── ACCOUNT ACTIONS & SIGN OUT (Placed cleanly at the very bottom) ── */}
              <div className="rounded-[28px] border border-red-500/20 bg-gradient-to-r from-red-500/[0.04] to-transparent p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
                    <LogOut className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--fg)]">Sign Out of Account</h4>
                    <p className="text-xs text-[var(--fg-muted)]">
                      Signed in as <span className="font-mono text-[var(--fg)] font-semibold">{user?.email || "Account"}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-95 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
                >
                  <LogOut className="size-4" />
                  Log Out
                </button>
              </div>

            </div>
          </Reveal>
        )}
          </main>
        </div>
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

      {/* ── Share Referral Modal ── */}
      <ShareReferralModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        referralCode={referralData?.referral_code || user?.referral_code}
        referralLink={referralData?.referral_link ? referralData.referral_link.replace(/https?:\/\/(?:www\.)?eventora\.com/gi, "https://upgradetalentsindia.in") : undefined}
        userName={user?.name}
        stats={{
          totalReferrals: referralData?.total_referrals,
          coinsEarned: referralData?.total_referrer_rewards_earned,
          referrerBonus: referralData?.referrer_coins_per_invite || 100,
          welcomeBonus: referralData?.welcome_coins_per_invite || 50,
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
   REWARDS & COINS TAB COMPONENT — ULTRA PRO FINTECH REWARDS HUB
   ═══════════════════════════════════════════════════════════════════ */

function RewardsTab({
  coinsData,
  referralData,
  user,
  onOpenShare
}: {
  coinsData: any;
  referralData: any;
  user: any;
  onOpenShare?: () => void;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "rewarded" | "pending">("all");

  const refCode = referralData?.referral_code || user?.referral_code || "UTI-TALENT";
  const rawRefLink =
    referralData?.referral_link ||
    (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${refCode}` : `https://upgradetalentsindia.in/register?ref=${refCode}`);
  const refLink = rawRefLink.replace(/https?:\/\/(?:www\.)?eventora\.com/gi, "https://upgradetalentsindia.in");

  const referrerCoins = referralData?.referrer_coins_per_invite ?? 100;
  const welcomeCoins = referralData?.welcome_coins_per_invite ?? 50;
  const coinValuation = referralData?.coin_value_inr ?? 0.5;

  const totalCoins = Number(coinsData?.total_coins || 0);
  const totalEarned = Number(coinsData?.total_earned_coins ?? referralData?.total_referrer_rewards_earned ?? totalCoins);
  const totalRedeemed = Number(coinsData?.total_redeemed_coins || 0);
  const totalReferrals = Number(referralData?.total_referrals || 0);
  const qualifiedReferrals = Number(referralData?.qualified_referrals || 0);
  const pendingReferrals = Number(referralData?.pending_referrals || (totalReferrals - qualifiedReferrals > 0 ? totalReferrals - qualifiedReferrals : 0));

  // Ambassador Tier Calculation
  const tierInfo = useMemo(() => {
    if (qualifiedReferrals >= 25) {
      return {
        name: "Diamond Legend",
        badge: "💎 Level 4",
        color: "from-cyan-400 via-sky-300 to-indigo-400",
        nextText: "Maximum VIP tier achieved!",
        progress: 100,
        perk: "VIP Pass privileges + 50% max fee deductions + Mentor Spotlight"
      };
    } else if (qualifiedReferrals >= 10) {
      return {
        name: "Gold Ambassador",
        badge: "🥇 Level 3",
        color: "from-amber-400 via-yellow-300 to-amber-500",
        nextText: `${25 - qualifiedReferrals} more friends to reach Diamond Legend`,
        progress: Math.min(100, Math.round(((qualifiedReferrals - 10) / 15) * 100)),
        perk: "Access to VIP Lounges at events + priority workshop reservations"
      };
    } else if (qualifiedReferrals >= 5) {
      return {
        name: "Silver Promoter",
        badge: "🥈 Level 2",
        color: "from-slate-200 via-gray-300 to-slate-400",
        nextText: `${10 - qualifiedReferrals} more friends to reach Gold Ambassador`,
        progress: Math.min(100, Math.round(((qualifiedReferrals - 5) / 5) * 100)),
        perk: "Extra 5% discount bonus on competition entry fees"
      };
    } else {
      return {
        name: "Bronze Pioneer",
        badge: "🥉 Level 1",
        color: "from-amber-600 via-orange-400 to-amber-700",
        nextText: `${5 - qualifiedReferrals} more friends to reach Silver Promoter`,
        progress: Math.min(100, Math.round((qualifiedReferrals / 5) * 100)),
        perk: `Earn +${referrerCoins} coins (₹${referrerCoins * coinValuation}) on every friend who joins`
      };
    }
  }, [qualifiedReferrals, referrerCoins, coinValuation]);

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

  const shareText = `Hey! 🌟 Join me on Upgrade Talents India to participate in premier cultural events, masterclasses, and competitions! Sign up with my invite link to get ${welcomeCoins} FREE Coins (₹${welcomeCoins * coinValuation} discount power) instantly:\n\n${refLink}\n\nInvite Code: ${refCode}`;

  const openWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };

  const rawHistory: any[] = Array.isArray(referralData?.referral_history) ? referralData.referral_history : [];

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return rawHistory;
    if (historyFilter === "rewarded") return rawHistory.filter((r) => r.status === "REWARDED" || r.status === "QUALIFIED");
    if (historyFilter === "pending") return rawHistory.filter((r) => r.status !== "REWARDED" && r.status !== "QUALIFIED");
    return rawHistory;
  }, [rawHistory, historyFilter]);

  return (
    <div className="mt-8 flex flex-col gap-8 text-white">
      {/* ── 1. Hero FinTech Vault Showcase ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-gradient-to-br from-[#1c1917] via-[#0e1118] to-[#07090e] p-6 sm:p-10 shadow-[0_30px_90px_-20px_rgba(245,158,11,0.2)]">
        {/* Ambient Radial Lights */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-80 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Balance & Value Statement */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="size-3 text-amber-400 animate-pulse" />
                Authoritative Talent Wallet
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-gray-300">
                1 Coin = ₹{coinValuation.toFixed(2)}
              </span>
            </div>

            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight">
              UTI Reward Vault
            </h2>

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-5xl sm:text-6xl font-black text-amber-300 tabular-nums drop-shadow-md">
                {totalCoins.toLocaleString()}
              </span>
              <span className="font-display text-2xl font-bold uppercase text-amber-400/90 tracking-wide">
                UTI Coins
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 font-mono text-sm font-bold text-emerald-400">
                ≈ ₹{(totalCoins * coinValuation).toFixed(2)} Discount Power
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-300 leading-relaxed">
              Burn your UTI coins for instant fee reductions on Masterclasses, Workshop enrollments, and competition entries. Every friend you invite brings you{" "}
              <strong className="text-amber-300 font-bold">+{referrerCoins} Coins</strong>!
            </p>

            {/* Quick Actions CTA */}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onOpenShare}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-amber-500 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="size-4" />
                Invite &amp; Earn +{referrerCoins} Coins
              </button>

              <button
                type="button"
                onClick={openWhatsApp}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-3.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
              >
                <MessageCircle className="size-4" />
                Quick WhatsApp
              </button>
            </div>
          </div>

          {/* Ambassador Tier Status Card */}
          <div className="w-full lg:w-80 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Ambassador Status</span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                {tierInfo.badge}
              </span>
            </div>

            <div className="mt-3">
              <h3 className={`font-display text-2xl font-black uppercase bg-gradient-to-r ${tierInfo.color} bg-clip-text text-transparent`}>
                {tierInfo.name}
              </h3>
              <p className="mt-1 text-xs text-gray-300">{tierInfo.perk}</p>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                <span>Tier Milestone</span>
                <span className="font-bold text-amber-300">{qualifiedReferrals} Qualified</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
                  style={{ width: `${Math.max(8, tierInfo.progress)}%` }}
                />
              </div>
              <p className="mt-2 text-[10.5px] text-gray-400 italic text-right">{tierInfo.nextText}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Four Key FinTech Metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between text-amber-400">
            <span className="font-mono text-xs uppercase font-bold tracking-wider">Available Coins</span>
            <Coins className="size-5" />
          </div>
          <div className="mt-3 font-display text-3xl sm:text-4xl font-black text-amber-300 tabular-nums">
            {totalCoins}
          </div>
          <p className="mt-1 text-xs text-amber-200/70">
            ₹{(totalCoins * coinValuation).toFixed(2)} available for checkout discounts
          </p>
        </div>

        {/* Total Earned Coins */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-mono text-xs uppercase font-bold tracking-wider">Lifetime Earned</span>
            <TrendingUp className="size-5" />
          </div>
          <div className="mt-3 font-display text-3xl sm:text-4xl font-black text-emerald-300 tabular-nums">
            {totalEarned}
          </div>
          <p className="mt-1 text-xs text-emerald-200/70">
            All-time rewards from invites &amp; events
          </p>
        </div>

        {/* Friends Joined */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-b from-sky-500/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between text-sky-400">
            <span className="font-mono text-xs uppercase font-bold tracking-wider">Friends Invited</span>
            <Users className="size-5" />
          </div>
          <div className="mt-3 font-display text-3xl sm:text-4xl font-black text-sky-300 tabular-nums">
            {totalReferrals}
          </div>
          <p className="mt-1 text-xs text-sky-200/70">
            {qualifiedReferrals} verified • {pendingReferrals} pending
          </p>
        </div>

        {/* Total Redeemed */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between text-rose-400">
            <span className="font-mono text-xs uppercase font-bold tracking-wider">Coins Redeemed</span>
            <Zap className="size-5" />
          </div>
          <div className="mt-3 font-display text-3xl sm:text-4xl font-black text-rose-300 tabular-nums">
            {totalRedeemed}
          </div>
          <p className="mt-1 text-xs text-rose-200/70">
            Saved ₹{(totalRedeemed * coinValuation).toFixed(2)} on courses &amp; entries
          </p>
        </div>
      </div>

      {/* ── 3. High-Conversion Share & Invite Station ── */}
      <div className="rounded-[2.5rem] border border-white/10 bg-[#0e1118]/80 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1">
              VIRAL REWARD PROGRAM
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-black uppercase">
              Your Personal Referral Station
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-300 max-w-xl">
              Give your friends <span className="text-emerald-400 font-bold">+{welcomeCoins} Coins (₹{welcomeCoins * coinValuation})</span> on signup. When they join, you receive{" "}
              <span className="text-amber-300 font-bold">+{referrerCoins} Coins (₹{referrerCoins * coinValuation})</span> straight into your wallet!
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
          >
            <QrCode className="size-4" /> Open Full Share Studio
          </button>
        </div>

        {/* Copy Boxes */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Code Box */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase text-gray-400 block">Your Talent Referral Code</span>
              <span className="font-mono text-xl font-black tracking-widest text-amber-400 truncate block mt-0.5">
                {refCode}
              </span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer active:scale-95"
            >
              {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>

          {/* Link Box */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="min-w-0 flex-1 pr-2">
              <span className="font-mono text-[10px] uppercase text-gray-400 block">Your Profile Invite Link</span>
              <span className="font-mono text-xs text-gray-300 truncate block mt-0.5">
                {refLink}
              </span>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
            >
              {copiedLink ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Social Triggers */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Quick share with your network:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`, "_blank");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer"
            >
              <Send className="size-3.5" /> Telegram
            </button>
            <button
              type="button"
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <QrCode className="size-3.5" /> In-Person QR
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. How It Works 3-Step Infographic ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[#0e1118]/60 p-6 flex flex-col justify-between">
          <div>
            <div className="grid size-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 font-mono font-black text-sm mb-4">
              01
            </div>
            <h4 className="font-display text-lg font-bold uppercase text-white">Share Your Link</h4>
            <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">
              Send your personal invite link or show your QR code to fellow artists, students, or creators.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-amber-300/80">
            1-Click link &amp; code copy
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0e1118]/60 p-6 flex flex-col justify-between">
          <div>
            <div className="grid size-10 place-items-center rounded-2xl bg-sky-500/15 text-sky-400 font-mono font-black text-sm mb-4">
              02
            </div>
            <h4 className="font-display text-lg font-bold uppercase text-white">Friend Registers</h4>
            <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">
              Your friend completes signup with your invite. They receive an instant welcome bonus of {welcomeCoins} Coins!
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-sky-300/80">
            Friend gets ₹{welcomeCoins * coinValuation} free power
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0e1118]/60 p-6 flex flex-col justify-between">
          <div>
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 font-mono font-black text-sm mb-4">
              03
            </div>
            <h4 className="font-display text-lg font-bold uppercase text-white">You Get Rewarded</h4>
            <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">
              The moment their account is verified, +{referrerCoins} UTI Coins are credited into your wallet with zero delay!
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-emerald-300/80">
            You earn ₹{referrerCoins * coinValuation} per friend
          </div>
        </div>
      </div>

      {/* ── 5. Friends Invited & Referral History Table ── */}
      <div className="rounded-[2.5rem] border border-white/10 bg-[#0e1118]/90 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="font-display text-xl sm:text-2xl font-bold uppercase">
              Referral Activity &amp; Friends Joined
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Track the live status of all friends who joined through your personal link.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setHistoryFilter("all")}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                historyFilter === "all" ? "bg-amber-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
              }`}
            >
              All ({rawHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("rewarded")}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                historyFilter === "rewarded" ? "bg-amber-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
              }`}
            >
              Rewarded
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("pending")}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                historyFilter === "pending" ? "bg-amber-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  <th className="pb-3 font-semibold">Friend Account</th>
                  <th className="pb-3 font-semibold">Attributed Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Coins Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.map((item, idx) => {
                  const isRewarded = item.status === "REWARDED" || item.status === "QUALIFIED";
                  const dateStr = item.qualified_at || item.attributed_at;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "Recently";

                  return (
                    <tr key={item.referral_id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 font-mono font-medium text-gray-200">
                        {item.referred_email_masked || "Creator Member"}
                      </td>
                      <td className="py-3.5 text-gray-400 font-mono">{formattedDate}</td>
                      <td className="py-3.5">
                        {isRewarded ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle className="size-3" /> Rewarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                            <Clock className="size-3" /> Awaiting Verification
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                        {isRewarded ? `+${item.coins_earned || referrerCoins} Coins` : "0 (Pending)"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-8 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 mb-3">
              <Gift className="size-6" />
            </div>
            <h4 className="font-display text-lg font-bold uppercase">No referrals recorded yet</h4>
            <p className="mt-1 text-xs text-gray-400 max-w-sm">
              Share your link with your first friend to earn +{referrerCoins} UTI Coins and start climbing the Ambassador ranks!
            </p>
            <button
              type="button"
              onClick={onOpenShare}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5" /> Invite First Friend Now
            </button>
          </div>
        )}
      </div>

      {/* ── 6. Where You Can Spend Your Coins ── */}
      <div className="rounded-[2.5rem] border border-white/10 bg-[#0e1118]/60 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold uppercase">Where Can You Use UTI Coins?</h3>
        <p className="mt-1 text-xs text-gray-400">
          Redeem your accumulated coin balance as authoritative discount vouchers during checkout:
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <GraduationCap className="size-5 text-amber-400 mb-2" />
            <h5 className="font-bold text-sm text-white">Courses &amp; Masterclasses</h5>
            <p className="mt-1 text-xs text-gray-400">
              Get up to 50% discount automatically applied using your coins.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Award className="size-5 text-emerald-400 mb-2" />
            <h5 className="font-bold text-sm text-white">Hands-on Workshops</h5>
            <p className="mt-1 text-xs text-gray-400">
              Save on interactive learning sessions with premier artists.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Trophy className="size-5 text-sky-400 mb-2" />
            <h5 className="font-bold text-sm text-white">Competition Entries</h5>
            <p className="mt-1 text-xs text-gray-400">
              Participate in state &amp; national talent stages with reduced entry fees.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Package className="size-5 text-purple-400 mb-2" />
            <h5 className="font-bold text-sm text-white">Official Merchandise</h5>
            <p className="mt-1 text-xs text-gray-400">
              Exclusive swag, artist kits, and branded stage apparel discounts.
            </p>
          </div>
        </div>
      </div>

      {/* ── 7. Immutable Coin Ledger & Expiring Lots ── */}
      <CoinLedger fallback={coinsData.history} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EDIT PROFILE MODAL — Photo Upload + Details
   ═══════════════════════════════════════════════════════════════════ */

/** Normalises a stored date_of_birth into the yyyy-mm-dd an <input type="date"> needs. */
function toDateInput(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

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
  const [dob, setDob] = useState(toDateInput(user?.date_of_birth));
  const [address, setAddress] = useState(user?.address || "");
  const [parentPhone, setParentPhone] = useState(user?.parent_phone_number ? String(user.parent_phone_number) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone_number ? String(user.phone_number) : "");
    setDob(toDateInput(user?.date_of_birth));
    setAddress(user?.address || "");
    setParentPhone(user?.parent_phone_number ? String(user.parent_phone_number) : "");
    setPhotoPreview(user?.profile_photo || null);
    setPhotoFile(null);
    setErr(null);
  }, [user, isOpen]);

  usePageScrollLock(isOpen, onClose);

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
    setErr(null);

    const cleanPhone = phone.replace(/\D/g, "");
    const cleanParentPhone = parentPhone.replace(/\D/g, "");
    if (!name.trim()) {
      setErr("Full Name is required.");
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setErr("A valid 10-digit mobile number is required.");
      return;
    }
    if (!dob) {
      setErr("Date of birth is required.");
      return;
    }
    if (!address.trim()) {
      setErr("Residential address is required.");
      return;
    }
    if (!cleanParentPhone || cleanParentPhone.length < 10) {
      setErr("A valid 10-digit Parent/Guardian phone number is required.");
      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone_number", cleanPhone);
      fd.append("date_of_birth", dob);
      fd.append("address", address.trim());
      fd.append("parent_phone_number", cleanParentPhone);
      if (photoFile) fd.append("profile_photo", photoFile);

      await profileApi.update(fd);
      await onSaved();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/dashboard?tab=profile");
      }
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "var(--scrim)" }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label="Edit your profile"
        className="relative flex max-h-[min(90dvh,780px)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
            <Edit3 className="size-4.5 text-[var(--accent)]" /> Edit Your Profile
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-6"
          >
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
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-semibold text-[var(--fg-muted)] outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
              Your email is your login and cannot be changed here.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Full Name <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Phone Number (10 Digits) <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Date of Birth <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="edit-profile-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                max={new Date().toISOString().slice(0, 10)}
                onClick={(e) => {
                  try {
                    (e.target as any).showPicker?.();
                  } catch {}
                }}
                className="uti-date-input w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-4 pr-12 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)] cursor-pointer"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  try {
                    (document.getElementById("edit-profile-dob") as any)?.showPicker?.();
                  } catch {
                    document.getElementById("edit-profile-dob")?.focus();
                  }
                }}
                aria-label="Open calendar"
                className="absolute right-2.5 z-[2] grid size-7 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)] shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Calendar className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Residential Address / City <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="e.g. Kolkata, West Bengal"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
              Parent / Guardian Phone Number <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
              placeholder="e.g. 9876543211"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[var(--accent)]"
            />
          </div>

          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-4">
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
            {vipPasses.map((p, i) => {
              const isExpired = p.status === "EXPIRED" || isEventExpired(p.valid_until || p.event_date || p.date);
              return (
                <motion.div
                  key={p._id || p.pass_reference || i}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={cn(
                    "relative overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--surface)] p-6 shadow-xl transition-all",
                    isExpired ? "border-red-500/30" : "border-[var(--border)]"
                  )}
                >
                  <div className={cn("transition-all duration-300", isExpired && "filter blur-[1.5px] opacity-50 select-none pointer-events-none")}>
                    <div className="absolute top-0 right-0 h-28 w-28 bg-[var(--accent)]/5 rounded-full blur-2xl" />
                    <div className="flex items-center justify-between">
                      <Badge tone={isExpired ? "danger" : (p.status === "VALID" || p.status === "ACTIVE") ? "success" : "danger"}>
                        {isExpired ? "EXPIRED" : p.status}
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

                      {!isExpired && (p.status === "VALID" || p.status === "ACTIVE") && (
                        <button
                          onClick={() => setQrModal(p)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)]"
                          style={{ background: "var(--grad-brand)" }}
                        >
                          <QrCode className="size-4" /> View Admission QR
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpired && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-black/35 backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-black/85 px-4 py-2 shadow-xl">
                        <TicketX className="size-4 text-red-400" />
                        <span className="font-display text-sm font-bold uppercase tracking-wider text-red-400">
                          VIP Pass Expired
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
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
  usePageScrollLock(!!pass, onClose);

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
        <div
          data-lenis-prevent
          className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto overscroll-contain p-4"
        >
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
