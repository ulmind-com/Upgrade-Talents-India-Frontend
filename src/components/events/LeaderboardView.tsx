"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy, Flame, Search, ChevronDown, Users, Sparkles, Vote, Gavel, ExternalLink, Layers, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { publicApi, competeApi } from "@/lib/api";
import { imageFor, cn } from "@/lib/utils";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@/components/motion/Providers";

type Row = {
  rank?: number;
  name?: string;
  participant_id?: string;
  email?: string;
  profile_photo?: string;
  audience_votes?: number;
  judge_score?: number;
  final_score?: number;
  points?: number;
  category?: string;
  is_verified?: boolean;
  verified_badge?: boolean;
  is_advancing?: boolean;
  round_status?: string;
  is_present?: boolean;
};

type Comp = { _id?: string; id?: string; title?: string; name?: string };

const DEMO: Row[] = [
  { rank: 1, name: "Riya Sharma", email: "riya@upgradetalentsindia.in", audience_votes: 3045, judge_score: 92, final_score: 98.4, category: "Junior" },
  { rank: 2, name: "Arjun Mehta", email: "arjun@upgradetalentsindia.in", audience_votes: 2774, judge_score: 88, final_score: 94.1, category: "Senior" },
  { rank: 3, name: "Neha Kapoor", email: "neha@upgradetalentsindia.in", audience_votes: 1988, judge_score: 90, final_score: 91.7, category: "Sub-Junior" },
  { rank: 4, name: "Kabir Rao", email: "kabir@upgradetalentsindia.in", audience_votes: 1589, judge_score: 84, final_score: 86.0, category: "Junior" },
  { rank: 5, name: "Ananya Das", email: "ananya@upgradetalentsindia.in", audience_votes: 1021, judge_score: 82, final_score: 80.2, category: "Senior" },
  { rank: 6, name: "Dev Patel", email: "dev@upgradetalentsindia.in", audience_votes: 1000, judge_score: 79, final_score: 77.9, category: "Sub-Junior" },
  { rank: 7, name: "Simran Gill", email: "simran@upgradetalentsindia.in", audience_votes: 842, judge_score: 76, final_score: 72.4, category: "Junior" },
  { rank: 8, name: "Ved Nair", email: "ved@upgradetalentsindia.in", audience_votes: 640, judge_score: 71, final_score: 66.8, category: "Senior" },
];

const handle = (r: Row) => "@" + ((r.email || r.participant_id || r.name || "player").split("@")[0].replace(/\s+/g, "_").toLowerCase());
const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));

const TIERS = [
  // 1st Place - GOLD CHAMPION
  {
    place: 0,
    rank: 1,
    title: "1st Place - Grand Champion",
    label: "1st Place • Champion",
    tierName: "🥇 1st Place - Gold Champion",
    badgeLabel: "1st",
    TagIcon: Crown,
    cardWrapper:
      "border-2 border-amber-400 dark:border-amber-400/90 shadow-[0_16px_50px_-10px_rgba(245,158,11,0.35),0_0_30px_rgba(245,158,11,0.22)] bg-gradient-to-b from-amber-500/[0.14] via-amber-400/[0.04] to-[var(--surface)] dark:from-amber-500/25 dark:via-amber-950/25 dark:to-[var(--surface)] sm:-translate-y-6 sm:scale-[1.03] z-10",
    badgeBg:
      "bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-slate-950 shadow-[0_0_22px_rgba(245,158,11,0.7)] ring-4 ring-amber-400/40",
    ribbonClass:
      "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-md font-black ring-1 ring-amber-300",
    avatarSize: 96,
    avatarRing: "from-amber-300 via-yellow-400 to-amber-600",
    avatarOuterRing: "ring-4 ring-amber-400/35",
    avatarGlow: "shadow-[0_0_28px_rgba(245,158,11,0.45)]",
    scoreText:
      "text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-amber-300 dark:via-yellow-300 dark:to-amber-500",
    statBorder: "border-amber-400/35 bg-amber-500/10 dark:bg-amber-500/15 text-amber-950 dark:text-amber-200",
    cornerIconColor: "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    pedestalBorder: "border-t border-amber-400/30",
    pedestalText: "text-amber-600 dark:text-amber-400",
  },
  // 2nd Place - SILVER RUNNER-UP
  {
    place: 1,
    rank: 2,
    title: "2nd Place - Runner-Up",
    label: "2nd Place • Runner-Up",
    tierName: "🥈 2nd Place - Silver Runner-Up",
    badgeLabel: "2nd",
    TagIcon: Medal,
    cardWrapper:
      "border-2 border-slate-300 dark:border-slate-500/70 shadow-[0_10px_35px_-8px_rgba(148,163,184,0.32),0_0_20px_rgba(203,213,225,0.18)] bg-gradient-to-b from-slate-200/30 via-slate-100/5 to-[var(--surface)] dark:from-slate-400/15 dark:via-slate-800/20 dark:to-[var(--surface)] sm:-translate-y-1.5",
    badgeBg:
      "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-900 shadow-[0_0_18px_rgba(203,213,225,0.6)] ring-4 ring-slate-300/35",
    ribbonClass:
      "bg-slate-200/95 dark:bg-slate-700/90 text-slate-800 dark:text-slate-100 font-bold border border-slate-300 dark:border-slate-500 shadow-sm",
    avatarSize: 84,
    avatarRing: "from-slate-200 via-slate-400 to-slate-200",
    avatarOuterRing: "ring-4 ring-slate-300/30",
    avatarGlow: "shadow-[0_0_20px_rgba(148,163,184,0.35)]",
    scoreText: "text-slate-800 dark:text-slate-100",
    statBorder: "border-slate-300/50 bg-slate-100/70 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200",
    cornerIconColor: "text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]",
    pedestalBorder: "border-t border-slate-300/30 dark:border-slate-600/30",
    pedestalText: "text-slate-600 dark:text-slate-400",
  },
  // 3rd Place - BRONZE 2ND RUNNER-UP
  {
    place: 2,
    rank: 3,
    title: "3rd Place - 2nd Runner-Up",
    label: "3rd Place • 2nd Runner-Up",
    tierName: "🥉 3rd Place - Bronze 2nd Runner-Up",
    badgeLabel: "3rd",
    TagIcon: Medal,
    cardWrapper:
      "border-2 border-amber-700/60 dark:border-amber-600/60 shadow-[0_10px_35px_-8px_rgba(180,83,9,0.28),0_0_20px_rgba(180,83,9,0.15)] bg-gradient-to-b from-amber-700/15 via-orange-950/5 to-[var(--surface)] dark:from-amber-700/20 dark:via-amber-950/25 dark:to-[var(--surface)] sm:translate-y-1",
    badgeBg:
      "bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 text-amber-50 shadow-[0_0_18px_rgba(180,83,9,0.5)] ring-4 ring-amber-700/35",
    ribbonClass:
      "bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold border border-amber-300/70 dark:border-amber-700 shadow-sm",
    avatarSize: 84,
    avatarRing: "from-amber-600 via-amber-700 to-amber-900",
    avatarOuterRing: "ring-4 ring-amber-700/30",
    avatarGlow: "shadow-[0_0_20px_rgba(180,83,9,0.35)]",
    scoreText: "text-amber-800 dark:text-amber-300",
    statBorder: "border-amber-700/35 bg-amber-700/10 dark:bg-amber-900/30 text-amber-950 dark:text-amber-200",
    cornerIconColor: "text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.4)]",
    pedestalBorder: "border-t border-amber-700/30 dark:border-amber-800/30",
    pedestalText: "text-amber-700 dark:text-amber-400",
  },
];

function Avatar({ row, size = 72, ring }: { row: Row; size?: number; ring?: string }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: ring ? `linear-gradient(140deg, ${ring}, transparent 70%)` : "var(--surface-2)", padding: 2.5 }}
    >
      <img
        src={imageFor(row.profile_photo, row.rank ?? 0)}
        alt=""
        className="size-full rounded-full object-cover"
        style={{ width: size - 5, height: size - 5 }}
      />
    </span>
  );
}

function PodiumCard({ row, place }: { row: Row; place: 0 | 1 | 2 }) {
  const tier = TIERS[place] || TIERS[0];
  const TagIcon = tier.TagIcon;

  return (
    <div
      className={`relative flex flex-col items-center rounded-3xl ${tier.cardWrapper} px-5 pb-6 pt-9 text-center transition-all duration-500 hover:-translate-y-1.5`}
    >
      {/* Top Floating Rank Disc */}
      <span
        className={`absolute -top-5 grid size-11 place-items-center rounded-full text-[14px] font-black ${tier.badgeBg}`}
      >
        {place === 0 ? "1st" : place === 1 ? "2nd" : "3rd"}
      </span>

      {/* Top right corner medal/crown */}
      <TagIcon className={`absolute right-4 top-4 size-5 ${tier.cornerIconColor}`} aria-hidden />

      {/* Prominent Header Banner (Ensures 1st, 2nd, 3rd are unmistakable on phones & desktops) */}
      <div className={`mb-3.5 w-full rounded-xl py-2 px-3.5 flex items-center justify-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm shadow-sm ${
        place === 0
          ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 ring-2 ring-amber-300"
          : place === 1
          ? "bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 text-slate-900 dark:text-slate-100 ring-1 ring-slate-400/40"
          : "bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-amber-50 ring-1 ring-amber-600/40"
      }`}>
        <TagIcon className="size-4 shrink-0 fill-current" />
        <span>
          {place === 0 ? "🥇 1ST PLACE • CHAMPION" : place === 1 ? "🥈 2ND PLACE • RUNNER-UP" : "🥉 3RD PLACE • 2ND RUNNER-UP"}
        </span>
      </div>

      {/* Avatar with customized metallic frame & floating crown/medal */}
      <div className="relative mt-1">
        {place === 0 && (
          <Crown
            className="absolute -top-5 left-1/2 -translate-x-1/2 size-7 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)] z-10 animate-bounce"
            style={{ animationDuration: "3s" }}
          />
        )}
        <div
          className={`grid place-items-center rounded-full p-[3px] bg-gradient-to-tr ${tier.avatarRing} ${tier.avatarOuterRing} ${tier.avatarGlow}`}
          style={{ width: tier.avatarSize, height: tier.avatarSize }}
        >
          <img
            src={imageFor(row.profile_photo, row.rank ?? place + 1)}
            alt={row.name || "Contestant"}
            className="size-full rounded-full object-cover bg-[var(--surface-2)]"
          />
        </div>
        {place > 0 && (
          <div className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-[var(--surface)] shadow-md border border-[var(--border)]">
            <TagIcon className={`size-3.5 ${tier.cornerIconColor}`} />
          </div>
        )}
      </div>

      {/* Name & verification */}
      <p className="mt-3.5 line-clamp-1 font-display text-[clamp(1.15rem,2.5vw,1.4rem)] font-bold leading-tight flex items-center justify-center gap-1.5">
        <span>{row.name || "—"}</span>
        {(row.is_verified || row.verified_badge) && <VerifiedBadge size="sm" />}
      </p>
      <p className="text-xs sm:text-sm text-[var(--fg-subtle)] truncate max-w-full font-medium">{handle(row)}</p>

      {/* Points with tier-specific styling */}
      <div className="mt-3">
        <p className={`font-display text-[clamp(2rem,4.5vw,2.6rem)] font-black leading-none tabular-nums ${tier.scoreText}`}>
          {nf(row.points ?? row.final_score ?? row.audience_votes)}
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Total Points
        </p>
      </div>

      {/* Stat pills (Votes & Judge) */}
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <div className={`rounded-xl border ${tier.statBorder} py-2.5 px-3`}>
          <p className="font-display text-base sm:text-lg font-bold tabular-nums">{nf(row.audience_votes)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Votes</p>
        </div>
        <div className={`rounded-xl border ${tier.statBorder} py-2.5 px-3`}>
          <p className="font-display text-base sm:text-lg font-bold tabular-nums">{nf(row.judge_score)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Judge</p>
        </div>
      </div>

      {/* Podium Pedestal Footer Bar */}
      <div className={`mt-4 w-full pt-2.5 ${tier.pedestalBorder} flex items-center justify-between text-xs font-bold tracking-wider uppercase ${tier.pedestalText}`}>
        <span>Rank {place === 0 ? "1st" : place === 1 ? "2nd" : "3rd"}</span>
        <span>{tier.tierName}</span>
      </div>
    </div>
  );
}

function StatCard({ Icon, value, label }: { Icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-[var(--fg-muted)]">{label}</p>
      </div>
    </div>
  );
}

export default function LeaderboardView({
  competitions,
  initialCompId,
  initialRows,
  initialCategories,
  initialCategoryLeaderboards,
}: {
  competitions: Comp[];
  initialCompId?: string;
  initialRows: Row[];
  initialCategories?: string[];
  initialCategoryLeaderboards?: Record<string, Row[]>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlCompId =
    searchParams?.get("competition") ||
    searchParams?.get("comp_id") ||
    searchParams?.get("id") ||
    "";

  // Prioritize URL query param, then initialCompId prop, then first competition
  const effectiveInitialId =
    urlCompId ||
    initialCompId ||
    competitions?.[0]?._id ||
    competitions?.[0]?.id ||
    "";

  const { user } = useAuth();
  const [compId, setCompId] = useState<string>(effectiveInitialId);
  const [compList, setCompList] = useState<Comp[]>(competitions || []);
  const [rows, setRows] = useState<Row[]>(initialRows || []);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [categories, setCategories] = useState<string[]>(initialCategories || []);
  const [categoryLeaderboards, setCategoryLeaderboards] = useState<Record<string, Row[]>>(initialCategoryLeaderboards || {});
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(false);
  const [roundsData, setRoundsData] = useState<any | null>(null);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
  const [isScorePublic, setIsScorePublic] = useState<boolean>(true);

  const pick = useCallback(async (id: string, targetRound?: number) => {
    if (!id) return;
    setLoading(true);
    try {
      let rData = null;
      try {
        rData = await publicApi.rounds(id);
        if (rData && Array.isArray(rData.rounds) && rData.rounds.length > 0) {
          setRoundsData(rData);
        } else {
          setRoundsData(null);
        }
      } catch {
        setRoundsData(null);
      }

      const activeR = targetRound ?? rData?.current_round ?? 1;
      setActiveRoundNumber(activeR);

      let d: any = null;
      if (rData && Array.isArray(rData.rounds) && rData.rounds.length > 1) {
        d = await publicApi.roundLeaderboard(id, activeR);
      } else {
        d = await publicApi.leaderboard(id);
      }

      const activeCompObj = compList.find((c: any) => (c._id || c.id) === id);
      const isPub = d?.score_visible_for_public !== undefined
        ? Boolean(d.score_visible_for_public)
        : (d?.is_published !== undefined ? Boolean(d.is_published) : Boolean((activeCompObj as any)?.score_visible_for_public ?? (activeCompObj as any)?.results_published ?? true));
      setIsScorePublic(isPub);

      setRows(Array.isArray(d?.leaderboard) ? d.leaderboard : []);
      if (Array.isArray(d?.categories)) {
        setCategories(d.categories);
      }
      if (d?.category_leaderboards && typeof d.category_leaderboards === "object") {
        setCategoryLeaderboards(d.category_leaderboards);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectRound = async (roundNum: number) => {
    if (!compId) return;
    setActiveRoundNumber(roundNum);
    setLoading(true);
    try {
      const d: any = await publicApi.roundLeaderboard(compId, roundNum);
      const activeCompObj = compList.find((c: any) => (c._id || c.id) === compId);
      const isPub = d?.score_visible_for_public !== undefined
        ? Boolean(d.score_visible_for_public)
        : (d?.is_published !== undefined ? Boolean(d.is_published) : Boolean((activeCompObj as any)?.score_visible_for_public ?? (activeCompObj as any)?.results_published ?? true));
      setIsScorePublic(isPub);
      setRows(Array.isArray(d?.leaderboard) ? d.leaderboard : []);
      if (Array.isArray(d?.categories)) {
        setCategories(d.categories);
      }
      if (d?.category_leaderboards && typeof d.category_leaderboards === "object") {
        setCategoryLeaderboards(d.category_leaderboards);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync competition list when competitions prop updates
  useEffect(() => {
    if (Array.isArray(competitions) && competitions.length > 0) {
      setCompList((prev) => {
        const map = new Map<string, Comp>();
        for (const c of competitions) {
          const cid = c._id || c.id;
          if (cid) map.set(cid, c);
        }
        for (const c of prev) {
          const cid = c._id || c.id;
          if (cid && !map.has(cid)) map.set(cid, c);
        }
        return Array.from(map.values());
      });
    }
  }, [competitions]);

  // If active compId is not present in dropdown list, fetch single competition details
  useEffect(() => {
    if (compId && !compList.some((c) => (c._id || c.id) === compId)) {
      publicApi.competition(compId).then((single) => {
        if (single && (single._id || single.id)) {
          setCompList((prev) => {
            const sid = single._id || single.id;
            if (prev.some((c) => (c._id || c.id) === sid)) return prev;
            return [single, ...prev];
          });
        }
      }).catch(() => {});
    }
  }, [compId, compList]);

  // Detect URL search param change (e.g. user navigation or browser back/forward)
  useEffect(() => {
    if (urlCompId && urlCompId !== compId) {
      setCompId(urlCompId);
      pick(urlCompId);
    }
  }, [urlCompId, compId, pick]);

  // Sync server initial props if initialCompId changed and no conflicting urlCompId
  useEffect(() => {
    if (initialCompId && initialCompId !== compId && !urlCompId) {
      setCompId(initialCompId);
      setRows(initialRows || []);
      if (initialCategories) setCategories(initialCategories);
      if (initialCategoryLeaderboards) setCategoryLeaderboards(initialCategoryLeaderboards);
    }
  }, [initialCompId, initialRows, initialCategories, initialCategoryLeaderboards, compId, urlCompId]);

  // Preview query check
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) {
      setPreview(true);
    }
  }, []);

  // Real-time live scores via WebSocket
  useEffect(() => {
    if (!compId || typeof window === "undefined") return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(competeApi.socketUrl(compId));
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.type === "INITIAL_STATE" && Array.isArray(payload.leaderboard)) {
            setRows(payload.leaderboard);
            if (Array.isArray(payload.categories)) setCategories(payload.categories);
            if (payload.category_leaderboards) setCategoryLeaderboards(payload.category_leaderboards);
          } else if (
            payload.type === "LEADERBOARD_UPDATED" ||
            payload.type === "SCORE_SUBMITTED" ||
            payload.type === "LIVE_SCORE_BROADCAST"
          ) {
            publicApi.leaderboard(compId).then((d) => {
              if (Array.isArray(d?.leaderboard)) setRows(d.leaderboard);
              if (Array.isArray(d?.categories)) setCategories(d.categories);
              if (d?.category_leaderboards) setCategoryLeaderboards(d.category_leaderboards);
            }).catch(() => {});
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [compId]);

  const handleSelectComp = (newId: string) => {
    if (!newId) return;
    setCompId(newId);
    pick(newId);
    // Sync browser URL query string without reloading page
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("competition", newId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeComp = useMemo(() => {
    return compList.find((c) => (c._id || c.id) === compId);
  }, [compList, compId]);

  // Available categories derived dynamically from backend metadata or participant entries
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(categories)) {
      for (const c of categories) {
        if (c && typeof c === "string" && c.trim()) set.add(c.trim());
      }
    }
    if (categoryLeaderboards && typeof categoryLeaderboards === "object") {
      for (const k of Object.keys(categoryLeaderboards)) {
        if (k && k.trim()) set.add(k.trim());
      }
    }
    for (const r of rows) {
      if (r.category && typeof r.category === "string" && r.category.trim()) {
        set.add(r.category.trim());
      }
    }
    const compCats = (activeComp as any)?.categories;
    if (Array.isArray(compCats)) {
      for (const c of compCats) {
        const name = typeof c === "string" ? c : c?.name;
        if (name && typeof name === "string" && name.trim()) set.add(name.trim());
      }
    }
    // Default divisions to guarantee tabs are present if competition has no custom categories defined
    if (set.size === 0) {
      set.add("Junior");
      set.add("Sub-Junior");
      set.add("Senior");
    }
    return Array.from(set);
  }, [categories, categoryLeaderboards, rows, activeComp]);

  const allNormalizedRows = useMemo(() => {
    const rawList = rows.length ? rows : preview ? DEMO : [];

    // Filter to only contestants who have actually been scored, voted, or evaluated
    // Un-evaluated or un-scored registered contestants are not shown on public 1st/2nd/3rd standings
    const scoredList = rawList.filter((r: any) => {
      const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
      const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0);
      const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
      const effectivePoints = (rawFinal != null && rawFinal > 0) ? rawFinal : (judge > 0 ? judge : votes);
      return effectivePoints > 0 || Boolean(r.is_scored || r.has_scored);
    });

    const targetList = scoredList.length > 0 ? scoredList : (preview ? DEMO : []);

    // Sort descending by points
    targetList.sort((a: any, b: any) => {
      const aPts = (a.final_score ?? a.total_score ?? a.score ?? a.points ?? a.judge_score ?? a.audience_votes ?? 0);
      const bPts = (b.final_score ?? b.total_score ?? b.score ?? b.points ?? b.judge_score ?? b.audience_votes ?? 0);
      return Number(bPts) - Number(aPts);
    });

    return targetList.map((r: any, i) => {
      const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
      const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0);
      const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
      const effectivePoints = (rawFinal != null && rawFinal > 0) ? rawFinal : (judge > 0 ? judge : votes);
      return {
        ...r,
        rank: i + 1,
        audience_votes: votes,
        judge_score: judge,
        final_score: effectivePoints,
        points: effectivePoints,
      };
    });
  }, [rows, preview]);

  // Recalculates category-specific ranks: when a category tab is selected, rank 1, 2, 3 reflect the top 3 of that category!
  const categoryRows = useMemo(() => {
    if (activeCategory === "ALL") return allNormalizedRows;

    const precalcKey = Object.keys(categoryLeaderboards).find(
      (k) => k.trim().toLowerCase() === activeCategory.trim().toLowerCase()
    );
    const precalc = precalcKey ? categoryLeaderboards[precalcKey] : undefined;
    if (Array.isArray(precalc) && precalc.length > 0) {
      const scoredPrecalc = precalc.filter((r: any) => {
        const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
        const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0);
        const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
        return (rawFinal != null && rawFinal > 0) || votes > 0 || judge > 0 || Boolean(r.is_scored || r.has_scored);
      });

      return scoredPrecalc.map((r: any, i) => {
        const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
        const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0);
        const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
        const effectivePoints = (rawFinal != null && rawFinal > 0) ? rawFinal : (judge > 0 ? judge : votes);
        return {
          ...r,
          rank: i + 1,
          audience_votes: votes,
          judge_score: judge,
          final_score: effectivePoints,
          points: effectivePoints,
        };
      });
    }

    const filteredList = allNormalizedRows.filter(
      (r) => (r.category || "").trim().toLowerCase() === activeCategory.trim().toLowerCase()
    );
    filteredList.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    return filteredList.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }, [activeCategory, allNormalizedRows, categoryLeaderboards]);

  // Dynamic counts per category for the tab indicators
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of availableCategories) {
      const cClean = cat.trim().toLowerCase();
      const precalcKey = Object.keys(categoryLeaderboards).find((k) => k.trim().toLowerCase() === cClean);
      const precalc = precalcKey ? categoryLeaderboards[precalcKey] : undefined;
      if (Array.isArray(precalc)) {
        counts[cat] = precalc.length;
      } else {
        counts[cat] = allNormalizedRows.filter(
          (r) => (r.category || "").trim().toLowerCase() === cClean
        ).length;
      }
    }
    return counts;
  }, [availableCategories, categoryLeaderboards, allNormalizedRows]);

  const data = categoryRows;
  const podium = useMemo(() => categoryRows.slice(0, 3), [categoryRows]);

  const userContestantRow = useMemo(() => {
    if (!user?.email) return null;
    const cleanUserEmail = user.email.trim().toLowerCase();
    return allNormalizedRows.find((r) => {
      const rEmail = (r.email || r.participant_id || "").trim().toLowerCase();
      return rEmail === cleanUserEmail;
    });
  }, [user, allNormalizedRows]);

  const filtered = useMemo(
    () =>
      data.filter(
        (r) =>
          !q ||
          (r.name || "").toLowerCase().includes(q.toLowerCase()) ||
          handle(r).includes(q.toLowerCase())
      ),
    [data, q]
  );

  return (
    <section className="container-x relative pb-24 pt-14 md:pt-20">
      {/* Controls */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionLabel>Live rankings</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">
              {activeComp?.title || activeComp?.name || "Global Ranking"}
            </h2>
            {compId && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--fg-subtle)]">
                <span>Official Live Standings</span>
                <span>•</span>
                <Link
                  href={`/competitions/${compId}`}
                  className="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Competition info <ExternalLink className="size-3" />
                </Link>
                <Link
                  href={`/competitions/${compId}/results`}
                  className="font-medium text-[var(--fg-muted)] hover:text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Results &amp; winners →
                </Link>
              </div>
            )}
          </div>
          {compList.length > 0 && (
            <div className="relative">
              <select
                value={compId}
                onChange={(e) => handleSelectComp(e.target.value)}
                aria-label="Choose competition"
                className="appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-5 pr-11 text-[13.5px] font-semibold text-[var(--fg)] outline-none transition-colors hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {compList.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Competition"}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
            </div>
          )}
        </div>
      </Reveal>

      {/* Knockout Stages / Multi-Round Selector (Prelims → Semifinal → Final) */}
      {roundsData && Array.isArray(roundsData.rounds) && roundsData.rounds.length > 1 && (
        <Reveal className="mt-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)]/60 via-[var(--surface)] to-[var(--surface-2)]/60 p-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-black uppercase tracking-wider text-[var(--fg)] flex items-center gap-2">
                <Layers className="size-4 text-[var(--brand)]" />
                Competition Stages &amp; Knockout Rounds
              </span>
              <span className="text-xs text-[var(--fg-muted)]">
                Stage {activeRoundNumber ?? roundsData.current_round ?? 1} of {roundsData.total_rounds ?? roundsData.rounds.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {roundsData.rounds.map((rd: any) => {
                const isSelected = (activeRoundNumber ?? roundsData.current_round ?? 1) === rd.round_number;
                const isActive = rd.status === "ACTIVE";
                const isCompleted = rd.status === "COMPLETED";

                return (
                  <button
                    key={rd.round_number}
                    type="button"
                    onClick={() => handleSelectRound(rd.round_number)}
                    className={cn(
                      "cursor-pointer rounded-xl p-3 text-left transition-all border relative flex flex-col justify-between gap-2",
                      isSelected
                        ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]/40 shadow-lg"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-black tracking-wide text-[var(--fg)]">
                        {rd.name || `Round ${rd.round_number}`}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase",
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : isCompleted
                            ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        )}
                      >
                        {isActive ? "Active Stage" : isCompleted ? "Completed" : "Upcoming"}
                      </span>
                    </div>
                    {rd.description && (
                      <p className="line-clamp-1 text-[11px] text-[var(--fg-muted)]">{rd.description}</p>
                    )}
                    {rd.advancing_count && !rd.is_final_round && (
                      <span className="text-[10.5px] font-bold text-amber-400">
                        Top {rd.advancing_count} advance to next stage
                      </span>
                    )}
                    {rd.is_final_round && (
                      <span className="text-[10.5px] font-bold text-yellow-400 flex items-center gap-1">
                        👑 Grand Finale Championship
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* Category Tabs (Junior, Sub-Junior, Senior) */}
      {availableCategories.length > 0 && (
        <Reveal className="mt-6">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                Select Competition Category
              </span>
              <span className="text-[11.5px] text-[var(--fg-subtle)] font-medium">
                {activeCategory === "ALL"
                  ? `Showing all ${allNormalizedRows.length} ranked contestants`
                  : `${activeCategory} Category: Showing ${categoryRows.length} contestants • Top 3 Podium below`}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("ALL")}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  activeCategory === "ALL"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/50 font-black"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white hover:border-[var(--border-strong)]"
                )}
              >
                <span>All Categories</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums",
                    activeCategory === "ALL" ? "bg-black/25 text-black" : "bg-[var(--surface)] text-[var(--fg-subtle)]"
                  )}
                >
                  {allNormalizedRows.length}
                </span>
              </button>

              {availableCategories.map((cat) => {
                const count = categoryCounts[cat] ?? 0;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                      isActive
                        ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/50 font-black"
                        : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white hover:border-[var(--border-strong)]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums",
                        isActive ? "bg-black/25 text-black" : "bg-[var(--surface)] text-[var(--fg-subtle)]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {data.length === 0 ? (
        <Reveal>
          <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]">
              <Trophy className="size-7 text-[var(--fg-subtle)]" aria-hidden />
            </span>
            <p className="mt-5 font-display text-xl font-bold">No rankings yet</p>
            <p className="mt-1.5 max-w-sm text-sm text-[var(--fg-muted)]">
              Rankings for <span className="font-semibold text-[var(--fg)]">{activeComp?.title || "this competition"}</span> appear here once contestants are scored or audience votes begin.
            </p>
            {compId && (
              <Link
                href={`/competitions/${compId}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-xs font-semibold hover:border-[var(--border-strong)] transition-colors"
              >
                View Competition &amp; Submit Entry
              </Link>
            )}
          </div>
        </Reveal>
      ) : !isScorePublic ? (
        /* ── PRIVATE SCORE MODE (Score visible for public: OFF) ── */
        <Reveal className="mt-8">
          <div className="flex flex-col gap-6">
            {/* Contestant-Only Verified Scorecard */}
            {userContestantRow && (
              <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-[var(--surface-2)] to-[var(--surface)] p-6 md:p-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={imageFor(userContestantRow.profile_photo, userContestantRow.rank ?? 1)}
                      alt={userContestantRow.name || "Contestant"}
                      className="size-16 rounded-full border-3 border-amber-400 object-cover shadow-lg ring-4 ring-amber-400/20"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Your Verified Scorecard
                        </span>
                        <span className="rounded-full bg-slate-700/40 border border-slate-600/40 px-2.5 py-0.5 text-xs font-mono text-slate-300">
                          {userContestantRow.category || "General"}
                        </span>
                      </div>
                      <h4 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <span>{userContestantRow.name}</span>
                        {(userContestantRow.is_verified || userContestantRow.verified_badge) && <VerifiedBadge size="sm" />}
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--fg-subtle)] font-medium">
                        Your performance score is confidential and visible only to you until the public leaderboard is officially published.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-around gap-4 bg-[var(--surface)]/90 rounded-2xl p-4 border border-[var(--border)] shadow-inner">
                    <div className="text-center px-3 border-r border-[var(--border)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Judge Score</p>
                      <p className="text-2xl font-black text-amber-400 tabular-nums">
                        {nf(userContestantRow.judge_score)}
                      </p>
                    </div>
                    <div className="text-center px-3 border-r border-[var(--border)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Audience Votes</p>
                      <p className="text-2xl font-black text-sky-400 tabular-nums">
                        {nf(userContestantRow.audience_votes)}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Total Points</p>
                      <p className="text-2xl font-black text-emerald-400 tabular-nums">
                        {nf(userContestantRow.points ?? userContestantRow.final_score ?? userContestantRow.judge_score)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Public Scores Private Notice Card */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[var(--surface-2)] to-[var(--surface)] p-8 sm:p-12 text-center shadow-xl">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 ring-4 ring-amber-500/10 shadow-md">
                <Lock className="size-8" />
              </div>
              <h3 className="mt-5 font-display text-2xl sm:text-3xl font-bold text-[var(--fg)]">
                Leaderboard Scores are Set to Private
              </h3>
              <p className="mt-3 text-sm sm:text-base text-[var(--fg-muted)] max-w-xl mx-auto leading-relaxed">
                Live contestant points and rankings for <strong className="text-white font-semibold">{activeComp?.title || "this competition"}</strong> are held in private mode by the administrators while judging rounds are underway.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {user ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-5 py-2 text-xs sm:text-sm font-bold text-emerald-300 shadow-sm">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    Signed in as {user.name || user.email} {userContestantRow ? "• Your score is displayed above" : "• No competition entry found for this account"}
                  </div>
                ) : (
                  <Link
                    href={`/login?next=/leaderboard?competition=${compId}`}
                    className="inline-flex items-center gap-2 rounded-full py-2.5 px-6 text-xs sm:text-sm font-black text-slate-950 shadow-md hover:scale-[1.02] transition-transform"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <Users className="size-4" /> Contestant Sign In to View Your Score
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        /* ── PUBLIC LEADERBOARD (Score visible for public: ON) ── */
        <>
          {/* Stats */}
          <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-3">
            <StaggerItem><StatCard Icon={Users} value={nf(data.length)} label="Contestants ranked" /></StaggerItem>
            <StaggerItem><StatCard Icon={Vote} value={nf(data.reduce((a, r) => a + Number(r.audience_votes || 0), 0))} label="Total audience votes" /></StaggerItem>
            <StaggerItem><StatCard Icon={Flame} value={nf(data[0]?.final_score ?? data[0]?.audience_votes)} label="Top score" /></StaggerItem>
          </StaggerGroup>

          {/* Podium */}
          <div className="mt-12">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 px-4 py-2 text-xs sm:text-sm font-extrabold text-amber-300 shadow-sm">
                <Trophy className="size-4 text-amber-400" />
                <span>
                  {activeCategory === "ALL" ? "Official Top 3 Podium" : `${activeCategory} Category • Official Top 3 Podium`}
                </span>
              </span>
            </div>

            {/* Responsive Podium Cards:
                - On Mobile: 1st Place (Gold Champion 🥇) is rendered FIRST in DOM and visual top (order-1) so 1st and 2nd are completely unmistakable!
                - On Desktop (sm+): Classic 3-column Olympic layout (2nd Silver on left sm:order-1, 1st elevated Gold in center sm:order-2, 3rd Bronze on right sm:order-3)
            */}
            <StaggerGroup className="grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
              {podium[0] && (
                <StaggerItem
                  key={podium[0].participant_id || podium[0].email || "podium-1"}
                  className="order-1 sm:order-2 w-full"
                >
                  <PodiumCard row={podium[0]} place={0} />
                </StaggerItem>
              )}
              {podium[1] && (
                <StaggerItem
                  key={podium[1].participant_id || podium[1].email || "podium-2"}
                  className="order-2 sm:order-1 w-full"
                >
                  <PodiumCard row={podium[1]} place={1} />
                </StaggerItem>
              )}
              {podium[2] && (
                <StaggerItem
                  key={podium[2].participant_id || podium[2].email || "podium-3"}
                  className="order-3 sm:order-3 w-full"
                >
                  <PodiumCard row={podium[2]} place={2} />
                </StaggerItem>
              )}
            </StaggerGroup>
          </div>

          {/* Table */}
          <Reveal className="mt-12">
            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-4 md:p-5">
                <p className="flex items-center gap-2 font-display text-lg font-bold">
                  <Gavel className="size-4 text-[var(--accent)]" aria-hidden />
                  {activeCategory === "ALL" ? "Full standings" : `${activeCategory} standings`}
                </p>
                <div className="relative w-full max-w-[240px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
                  <input
                    value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players"
                    className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-10 pr-4 text-xs sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                      <th className="px-5 py-3 font-bold">Rank</th>
                      <th className="px-3 py-3 font-bold">Player</th>
                      <th className="px-3 py-3 font-bold">Category</th>
                      <th className="px-3 py-3 text-right font-bold">Votes</th>
                      <th className="px-3 py-3 text-right font-bold">Judge</th>
                      <th className="px-5 py-3 text-right font-bold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      return (
                        <motion.tr
                          key={(r.rank ?? 0) + (r.email || r.name || "")}
                          whileHover={{ backgroundColor: "var(--surface-2)" }}
                          className="border-t border-[var(--border)] text-sm"
                        >
                          <td className="px-5 py-3.5">
                            {r.rank === 1 ? (
                              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-slate-950 font-black text-xs shadow-[0_0_10px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/30">
                                1
                              </span>
                            ) : r.rank === 2 ? (
                              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-900 font-bold text-xs shadow-[0_0_8px_rgba(203,213,225,0.4)] ring-2 ring-slate-300/30">
                                2
                              </span>
                            ) : r.rank === 3 ? (
                              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 text-amber-50 font-bold text-xs shadow-[0_0_8px_rgba(180,83,9,0.35)] ring-2 ring-amber-700/30">
                                3
                              </span>
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--fg-muted)] font-semibold text-xs">
                                {r.rank}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar row={r} size={42} />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5">
                                  <span>{r.name || "—"}</span>
                                  {(r.is_verified || r.verified_badge) && <VerifiedBadge size="xs" />}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <p className="truncate text-xs text-[var(--fg-subtle)] font-medium">{handle(r)}</p>
                                  {r.is_advancing && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-extrabold text-emerald-400">
                                      <Sparkles className="size-3" /> Qualifies
                                    </span>
                                  )}
                                  {r.round_status === "ELIMINATED" && (
                                    <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400">
                                      Eliminated
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                              {r.category || "General"}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-right tabular-nums text-sm font-semibold text-[var(--fg-muted)]">{nf(r.audience_votes)}</td>
                          <td className="px-3 py-3.5 text-right tabular-nums text-sm font-semibold text-[var(--fg-muted)]">{nf(r.judge_score)}</td>
                          <td className="px-5 py-3.5 text-right font-display text-sm sm:text-base font-black tabular-nums">{nf(r.points ?? r.final_score ?? r.audience_votes)}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && <div className="border-t border-[var(--border)] p-4 text-center text-xs text-[var(--fg-subtle)]">Updating…</div>}
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}
