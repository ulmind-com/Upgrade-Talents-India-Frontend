"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Poppins } from "next/font/google";
import {
  Trophy,
  Search,
  ChevronLeft,
  SlidersHorizontal,
  Sparkles,
  Lock,
  CheckCircle2,
  Heart,
  Loader2,
  Clock,
  ShieldCheck,
  Share2,
  X,
  Flag,
  ArrowUpRight,
  Check,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { publicApi, competeApi } from "@/lib/api";
import { imageFor, cn } from "@/lib/utils";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth, useTheme } from "@/components/motion/Providers";
import { useRealtimeSubscription } from "@/lib/realtime";
import { Podium3D, RankLaurel, type PodiumContestant } from "@/components/events/Podium3D";

/* The app's display face (Poppins ExtraBold) — scoped to the leaderboard only. */
const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-lb-display", display: "swap" });
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-lb-display), 'Inter', system-ui, sans-serif" };

/* app palette */
const RED = "#FF385C";
const OK = "#22C55E";
const GOLD = "#F5C542";
const MUTED = "#8A90A6";
const RING = ["#06B6D4", "#EC4899", "#F59E0B", "#A855F7", "#3B82F6", "#10B981", "#F97316"];

type Row = {
  rank?: number;
  name?: string;
  participant_id?: string;
  email?: string;
  profile_photo?: string;
  audience_votes?: number;
  raw_audience_votes?: number;
  judge_score?: number;
  raw_judge_score?: number;
  final_score?: number;
  points?: number;
  category?: string;
  is_verified?: boolean;
  verified_badge?: boolean;
  is_advancing?: boolean;
  round_status?: string;
  is_present?: boolean;
  ranking_mode?: string;
  audience_weight?: number;
  judge_weight?: number;
};

type Comp = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  prize?: string;
  prize_pool?: string;
  total_prize?: string;
  voting_end?: string;
  submission_deadline?: string;
  registration_deadline?: string;
  end_date?: string;
  audience_voting_enabled?: boolean;
  voting_status?: string;
};

const handle = (r: Row) =>
  "@" +
  ((r.email || r.participant_id || r.name || "player")
    .split("@")[0]
    .replace(/\s+/g, "_")
    .toLowerCase());

const nf = (n?: number) =>
  new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));

const pidOf = (r: Row | PodiumContestant) => r.participant_id || r.email || "";

function useCountdown(target?: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const end = new Date(target).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - now;
  if (ms <= 0) return "Voting Ended";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  return `${h}h ${m}m ${sec}s`;
}

function Avatar({ row, size = 44, ring }: { row: Row; size?: number; ring?: string }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-2)]"
      style={{ width: size, height: size, border: `2px solid ${ring || "var(--border-strong)"}` }}
    >
      <img
        src={imageFor(row.profile_photo, row.rank ?? 0)}
        alt=""
        className="size-full rounded-full object-cover"
        loading="lazy"
      />
    </span>
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

  const effectiveInitialId =
    urlCompId ||
    initialCompId ||
    competitions?.[0]?._id ||
    competitions?.[0]?.id ||
    "";

  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "blue" || theme === "light";
  const [compId, setCompId] = useState<string>(effectiveInitialId);
  const [compList, setCompList] = useState<Comp[]>(competitions || []);
  const [rows, setRows] = useState<Row[]>(initialRows || []);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [categories, setCategories] = useState<string[]>(initialCategories || []);
  const [categoryLeaderboards, setCategoryLeaderboards] = useState<Record<string, Row[]>>(
    initialCategoryLeaderboards || {}
  );
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [roundsData, setRoundsData] = useState<any | null>(null);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
  const [isScorePublic, setIsScorePublic] = useState<boolean>(true);
  const reqIdRef = useRef(0);
  const compListRef = useRef<Comp[]>(compList);
  useEffect(() => {
    compListRef.current = compList;
  }, [compList]);

  /* ── Interactive Voting State ── */
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteToast, setVoteToast] = useState<{ tone: "success" | "error"; msg: string } | null>(null);
  const [bump, setBump] = useState<Record<string, number>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());
  useEffect(() => setBump({}), [rows]);

  const activeComp = useMemo(() => {
    return compList.find((c) => (c._id || c.id) === compId);
  }, [compList, compId]);

  const isVotingOpen = Boolean(
    activeComp?.audience_voting_enabled !== false &&
    (activeComp?.audience_voting_enabled === true || activeComp?.voting_status !== "CLOSED")
  );

  const userEmail = user?.email?.toLowerCase().trim();
  const userVoteKey = userEmail ? `uti_votes_${userEmail}` : null;
  const isMultiRound = Boolean(roundsData && roundsData.rounds && roundsData.rounds.length > 1);
  const currentRoundNum = activeRoundNumber ?? roundsData?.current_round ?? 1;
  const voteScope = isMultiRound && currentRoundNum ? `${compId}#r${currentRoundNum}` : String(compId);

  // Restore stored votes for user
  useEffect(() => {
    if (!compId || !userVoteKey) {
      setVoted(new Set());
      setBump({});
      return;
    }
    try {
      const stored = localStorage.getItem(userVoteKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVoted(new Set<string>(parsed[voteScope] || []));
      }
    } catch {
      setVoted(new Set());
    }
  }, [compId, userVoteKey, voteScope]);

  const rememberVote = (pid: string) => {
    if (!userVoteKey || !compId) return;
    try {
      const stored = localStorage.getItem(userVoteKey);
      const all = stored ? JSON.parse(stored) : {};
      const mine: string[] = all[voteScope] || [];
      if (!mine.includes(pid)) {
        all[voteScope] = [...mine, pid];
        localStorage.setItem(userVoteKey, JSON.stringify(all));
      }
    } catch {}
  };

  const handleVote = async (r: Row | PodiumContestant) => {
    const pId = pidOf(r);
    const who = r.name || "the contestant";
    if (!pId || !compId) return;

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`${pathname}?competition=${compId}`)}`);
      return;
    }

    if (voted.has(pId)) {
      setVoteToast({ tone: "success", msg: `Your vote for ${who} is already in.` });
      setTimeout(() => setVoteToast(null), 3500);
      return;
    }

    // Prevent self-vote
    const uEmail = user.email?.toLowerCase().trim();
    const rEmail = (r.email || r.participant_id || "").toLowerCase().trim();
    if (uEmail && rEmail && uEmail === rEmail) {
      setVoteToast({ tone: "error", msg: "Contestants cannot vote for their own entry." });
      setTimeout(() => setVoteToast(null), 3500);
      return;
    }

    setVoted((prev) => new Set(prev).add(pId));
    setBump((b) => ({ ...b, [pId]: (b[pId] || 0) + 1 }));
    setVotingId(pId);

    try {
      await competeApi.vote(compId, pId, "WEBSITE");
      rememberVote(pId);
      setVoteToast({ tone: "success", msg: `★ Vote Counted! You backed ${who}. Rankings update live.` });
      setTimeout(() => setVoteToast(null), 4000);

      // Refresh current round & category standings
      if (isMultiRound && currentRoundNum) {
        publicApi.roundLeaderboard(compId, currentRoundNum).then((d: any) => applyBoard(d, compId)).catch(() => {});
      } else {
        publicApi.leaderboard(compId).then((d: any) => applyBoard(d, compId)).catch(() => {});
      }
    } catch (e: any) {
      const msg = e?.message || "Could not submit vote right now.";
      if (/already voted/i.test(msg)) {
        rememberVote(pId);
        setVoteToast({ tone: "success", msg: `Your vote for ${who} is already recorded.` });
      } else {
        setVoted((prev) => {
          const next = new Set(prev);
          next.delete(pId);
          return next;
        });
        setBump((b) => ({ ...b, [pId]: Math.max(0, (b[pId] || 1) - 1) }));
        setVoteToast({ tone: "error", msg });
      }
      setTimeout(() => setVoteToast(null), 4000);
    } finally {
      setVotingId(null);
    }
  };

  const applyBoard = useCallback((d: any, targetId: string) => {
    const activeCompObj = compListRef.current.find((c: any) => (c._id || c.id) === targetId);
    const isPub =
      d?.score_visible_for_public !== undefined
        ? Boolean(d.score_visible_for_public)
        : d?.is_published !== undefined
        ? Boolean(d.is_published)
        : Boolean(
            (activeCompObj as any)?.score_visible_for_public ??
              (activeCompObj as any)?.results_published ??
              true
          );
    setIsScorePublic(isPub);
    setRows(Array.isArray(d?.leaderboard) ? d.leaderboard : []);
    setCategories(Array.isArray(d?.categories) ? d.categories : []);
    setCategoryLeaderboards(
      d?.category_leaderboards && typeof d.category_leaderboards === "object"
        ? d.category_leaderboards
        : {}
    );
  }, []);

  const fetchRoundOrOverallBoard = useCallback(
    (id: string, roundNum: number | null, multi: boolean) =>
      multi && roundNum
        ? publicApi.roundLeaderboard(id, roundNum)
        : publicApi.leaderboard(id),
    []
  );

  const pick = useCallback(
    async (id: string, targetRound?: number) => {
      if (!id) return;
      const rid = ++reqIdRef.current;
      setLoading(true);
      try {
        let rData: any = null;
        try {
          rData = await publicApi.rounds(id);
        } catch {
          rData = null;
        }
        if (rid !== reqIdRef.current) return;

        const hasRounds = Boolean(rData && Array.isArray(rData.rounds) && rData.rounds.length > 0);
        const multi = Boolean(rData && Array.isArray(rData.rounds) && rData.rounds.length > 1);
        setRoundsData(hasRounds ? rData : null);

        const activeR = targetRound ?? rData?.current_round ?? 1;
        setActiveRoundNumber(activeR);

        const d: any = await fetchRoundOrOverallBoard(id, activeR, multi);
        if (rid !== reqIdRef.current) return;

        applyBoard(d, id);
      } catch {
        if (rid === reqIdRef.current) {
          setRows([]);
          setCategories([]);
          setCategoryLeaderboards({});
        }
      } finally {
        if (rid === reqIdRef.current) {
          setLoading(false);
        }
      }
    },
    [applyBoard, fetchRoundOrOverallBoard]
  );

  const handleSelectRound = async (roundNum: number) => {
    if (!compId) return;
    const rid = ++reqIdRef.current;
    setActiveRoundNumber(roundNum);
    setLoading(true);
    try {
      const d: any = await publicApi.roundLeaderboard(compId, roundNum);
      if (rid !== reqIdRef.current) return;
      applyBoard(d, compId);
    } catch {
      if (rid === reqIdRef.current) {
        setRows([]);
        setCategories([]);
        setCategoryLeaderboards({});
      }
    } finally {
      if (rid === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

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

  useEffect(() => {
    if (compId && !compList.some((c) => (c._id || c.id) === compId)) {
      publicApi
        .competition(compId)
        .then((single) => {
          if (single && (single._id || single.id)) {
            setCompList((prev) => {
              const sid = single._id || single.id;
              if (prev.some((c) => (c._id || c.id) === sid)) return prev;
              return [single, ...prev];
            });
          }
        })
        .catch(() => {});
    }
  }, [compId, compList]);

  useEffect(() => {
    if (urlCompId && urlCompId !== compId) {
      setActiveCategory("ALL");
      setActiveRoundNumber(null);
      setCompId(urlCompId);
    }
  }, [urlCompId, compId]);

  useEffect(() => {
    if (initialCompId && initialCompId !== compId && !urlCompId) {
      setActiveCategory("ALL");
      setActiveRoundNumber(null);
      setCompId(initialCompId);
    }
  }, [initialCompId, compId, urlCompId]);

  // Always load rounds & standings on mount and whenever compId changes (ensures Semi-Final / Final tabs load immediately)
  useEffect(() => {
    if (!compId) return;
    pick(compId);
  }, [compId, pick]);

  useRealtimeSubscription(
    compId ? [`competition:${compId}`, "admin:competitions", "global"] : ["global"],
    useCallback(
      (evt) => {
        const data = evt.data || {};
        const targetCid = String(data.competition_id || evt.channel?.replace("competition:", "") || "");
        if (compId && targetCid && targetCid !== String(compId)) {
          return;
        }

        const eventRound = data.round_number != null ? Number(data.round_number) : null;
        const matchesCurrentRound =
          !isMultiRound || !eventRound || !activeRoundNumber || eventRound === Number(activeRoundNumber);

        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0 && matchesCurrentRound) {
          applyBoard(data, compId);
        } else if (compId) {
          fetchRoundOrOverallBoard(compId, activeRoundNumber, isMultiRound)
            .then((d: any) => applyBoard(d, compId))
            .catch(() => {});
        }
      },
      [compId, activeRoundNumber, isMultiRound, applyBoard, fetchRoundOrOverallBoard]
    ),
    6000
  );

  const handleSelectComp = (newId: string) => {
    if (!newId) return;
    setActiveCategory("ALL");
    setActiveRoundNumber(null);
    if (newId === compId) {
      pick(newId);
    } else {
      setCompId(newId);
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("competition", newId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
    return Array.from(set);
  }, [categories, categoryLeaderboards, rows, activeComp]);

  /** Normalizes scores/votes and ranks all contestants (including 0-point entries) descending. */
  const normalizeAndRankRows = useCallback(
    (list: any[]) => {
      if (!Array.isArray(list) || list.length === 0) return [];

      const enriched = list.map((r: any) => {
        const pid = pidOf(r);
        const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
        const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0) + (bump[pid] || 0);
        const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
        const effectivePoints =
          rawFinal != null && Number(rawFinal) > 0 ? Number(rawFinal) : judge > 0 ? judge : votes;
        return {
          ...r,
          audience_votes: votes,
          judge_score: judge,
          final_score: effectivePoints,
          points: effectivePoints,
        };
      });

      enriched.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.judge_score !== a.judge_score) return b.judge_score - a.judge_score;
        return b.audience_votes - a.audience_votes;
      });

      return enriched.map((r, i) => ({
        ...r,
        rank: i + 1,
      }));
    },
    [bump]
  );

  const allNormalizedRows = useMemo(
    () => normalizeAndRankRows(rows),
    [rows, normalizeAndRankRows]
  );

  const categoryRows = useMemo(() => {
    if (activeCategory === "ALL") return allNormalizedRows;

    const cClean = activeCategory.trim().toLowerCase();
    const precalcKey = Object.keys(categoryLeaderboards).find(
      (k) => k.trim().toLowerCase() === cClean
    );
    const precalc = precalcKey ? categoryLeaderboards[precalcKey] : undefined;
    if (Array.isArray(precalc) && precalc.length > 0) {
      return normalizeAndRankRows(precalc);
    }

    const filteredList = allNormalizedRows.filter(
      (r) => (r.category || "").trim().toLowerCase() === cClean
    );
    return filteredList.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }, [activeCategory, allNormalizedRows, categoryLeaderboards, normalizeAndRankRows]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of availableCategories) {
      const cClean = cat.trim().toLowerCase();
      const precalcKey = Object.keys(categoryLeaderboards).find((k) => k.trim().toLowerCase() === cClean);
      const precalc = precalcKey ? categoryLeaderboards[precalcKey] : undefined;
      if (Array.isArray(precalc) && precalc.length > 0) {
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
  const top1 = data[0] || null;
  const top2 = data[1] || null;
  const top3 = data[2] || null;

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

  const deadline =
    activeComp?.voting_end ||
    activeComp?.submission_deadline ||
    activeComp?.registration_deadline ||
    activeComp?.end_date ||
    null;
  const timeLeft = useCountdown(deadline);

  const prizeRaw = String(
    activeComp?.prize ?? activeComp?.prize_pool ?? activeComp?.total_prize ?? ""
  ).trim();
  const prizeTitle = prizeRaw
    ? /prize/i.test(prizeRaw)
      ? prizeRaw
      : `${prizeRaw} Championship Prize Pool`
    : activeComp?.title || activeComp?.name || "Official Championship Leaderboard";

  /* ── app-parity derived state ───────────────────────────────────────── */
  const liveRound = roundsData?.current_round ?? 1;
  const roundInfo: any = isMultiRound ? roundsData.rounds.find((r: any) => r.round_number === currentRoundNum) : null;
  const roundUpcoming = String(roundInfo?.status || "").toUpperCase() === "UPCOMING";
  const advancingCount: number | null = roundInfo?.advancing_count ?? null;
  /** votes only land while voting is open, and only in the live round */
  const canVote = isVotingOpen && (!isMultiRound || currentRoundNum === liveRound);

  /* a round that hasn't started has no scores — show who qualified into it */
  const [qualified, setQualified] = useState<any[] | null>(null);
  useEffect(() => {
    if (!roundUpcoming || !compId) {
      setQualified(null);
      return;
    }
    let alive = true;
    setQualified(null);
    publicApi
      .roundContestants(compId, currentRoundNum, activeCategory !== "ALL" ? activeCategory : undefined)
      .then((d: any) => alive && setQualified(Array.isArray(d?.contestants) ? d.contestants : []))
      .catch(() => alive && setQualified([]));
    return () => {
      alive = false;
    };
  }, [roundUpcoming, compId, currentRoundNum, activeCategory]);

  /* what SCORE and VOTES mean, straight off the ranking service's own fields */
  const scoreNote = useMemo(() => {
    const first: any = rows[0];
    const mode = String(first?.ranking_mode || "").toUpperCase();
    const pct = (w: any) => {
      const n = Number(w) || 0;
      return Math.round(n <= 1 ? n * 100 : n);
    };
    const votes = "VOTES are weighted vote points.";
    if (mode === "COMBINED_AUDIENCE_AND_JUDGES") {
      let a = pct(first?.audience_weight);
      let j = pct(first?.judge_weight);
      if (!a && !j) a = j = 50;
      return `SCORE out of 100 — judges ${j}% + audience ${a}%. ${votes}`;
    }
    if (mode === "AUDIENCE_VOTING_ONLY") return `SCORE comes from audience votes. ${votes}`;
    if (mode === "JUDGES_SCORE_ONLY") return "SCORE is the judges' marks — votes don't change the ranking.";
    return null;
  }, [rows]);

  const [searchFocused, setSearchFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/leaderboard?competition=${compId}` : "";
    const title = activeComp?.title || activeComp?.name || "Leaderboard";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} is live on Upgrade Talents India — check the leaderboard and vote!`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const compTitle = activeComp?.title || activeComp?.name || "";
  const fmt = (n?: number) => {
    const v = Number(n ?? 0);
    return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(2).replace(/\.?0+$/, "");
  };
  const iconBtn =
    "relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg)] shadow-sm transition hover:bg-[var(--surface-2)] active:scale-95";
  const goldInk = isLight ? "#b45309" : GOLD;
  const okInk = isLight ? "#15803d" : OK;

  return (
    <section className={cn("container-x relative pb-24 pt-8 md:pt-12", poppins.variable)}>
      {/* vote toast */}
      {voteToast && (
        <div className="pointer-events-none fixed left-1/2 top-24 z-50 w-[92vw] max-w-md -translate-x-1/2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-[var(--surface)] p-3.5 text-[13px] font-semibold text-[var(--fg)] shadow-2xl backdrop-blur-xl",
              voteToast.tone === "success" ? "border-emerald-500/40" : "border-[#FF385C]/50"
            )}
          >
            {voteToast.tone === "success" ? (
              <CheckCircle2 className="size-5 shrink-0" style={{ color: okInk }} />
            ) : (
              <ShieldCheck className="size-5 shrink-0" style={{ color: RED }} />
            )}
            <span>{voteToast.msg}</span>
          </div>
        </div>
      )}

      {/* the board — blends seamlessly with both dark & light page backgrounds */}
      <div className="relative mx-auto max-w-[760px] text-[var(--fg)]">

        {/* top bar: back · title · share + competition picker */}
        <div className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <Link href={compId ? `/competitions/${compId}` : "/competitions"} aria-label="Back to competition" className={iconBtn}>
            <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[19px] font-bold tracking-[-0.3px] text-[var(--fg)]">Leaderboard</p>
            {compTitle ? <p className="mt-px truncate text-[11px] font-medium text-[var(--fg-muted)]">{compTitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {compId ? (
              <button type="button" onClick={share} aria-label="Share leaderboard" className={iconBtn}>
                {copied ? <Check className="size-[17px]" /> : <Share2 className="size-[17px]" />}
              </button>
            ) : null}
            {compList.length > 0 ? (
              <label className={iconBtn} aria-label="Choose competition">
                <SlidersHorizontal className="size-[18px]" />
                <select
                  value={compId}
                  onChange={(e) => handleSelectComp(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Choose competition"
                >
                  {compList.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id} className="bg-[var(--surface)] text-[var(--fg)]">
                      {c.title || c.name || "Competition"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        <div className="relative pt-4">
          {/* competition pills */}
          {compList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 sm:px-6 [scrollbar-width:none]">
              {compList.map((c) => {
                const id = (c._id || c.id) as string;
                const on = id === compId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectComp(id)}
                    className={cn(
                      "h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition",
                      on
                        ? "border-[#FF385C] bg-[#FF385C] text-white shadow-sm"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                    )}
                  >
                    {c.title || c.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* round switch — real names + status, like the app */}
          {isMultiRound && (
            <div className="overflow-x-auto px-4 sm:px-6 [scrollbar-width:none]">
              <div className="mx-auto mb-3 mt-1 flex w-max gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
                {roundsData.rounds.map((rd: any) => {
                  const on = currentRoundNum === rd.round_number;
                  const st = roundTone(rd.status, isLight);
                  return (
                    <button
                      key={rd.round_number}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => handleSelectRound(rd.round_number)}
                      className={cn(
                        "flex min-h-[46px] cursor-pointer flex-col items-center justify-center rounded-full px-[18px] py-1.5 transition",
                        on ? "bg-[var(--surface)] shadow-sm" : "hover:bg-[var(--surface)]/60"
                      )}
                    >
                      <span className={cn("whitespace-nowrap text-[13px] font-bold", on ? "text-[var(--fg)]" : "text-[var(--fg-muted)]")}>
                        {rd.name || `Round ${rd.round_number}`}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold" style={{ color: st.color }}>
                        <span className="size-[5px] rounded-full" style={{ background: st.color }} />
                        {st.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {roundInfo ? (
            <RoundBrief round={roundInfo} total={roundsData.rounds.length} advancing={advancingCount} isLive={currentRoundNum === liveRound} isLight={isLight} />
          ) : null}

          {/* categories */}
          {availableCategories.length > 0 && (
            <div className="flex gap-[7px] overflow-x-auto px-4 pb-1.5 sm:px-6 [scrollbar-width:none]">
              {["ALL", ...availableCategories].map((cat) => {
                const on = activeCategory === cat;
                const n = cat === "ALL" ? allNormalizedRows.length : categoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex h-[30px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[11.5px] font-bold transition",
                      on
                        ? "border-[#FF385C] bg-[#FF385C]/15 text-[#E11D48] dark:text-[#FF385C]"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
                    )}
                    style={on ? { color: RED } : undefined}
                  >
                    {cat}
                    <span className={cn("tabular-nums", on ? "opacity-85" : "text-[var(--fg-subtle)]")}>{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* search */}
          <div className="px-4 pb-2 pt-2 sm:px-6">
            <div
              className={cn(
                "flex h-[50px] items-center gap-2.5 rounded-2xl border pl-1.5 pr-2 transition shadow-sm",
                searchFocused
                  ? "border-[#FF385C]/65 bg-[var(--surface)] shadow-[0_0_14px_rgba(255,56,92,0.18)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)]"
              )}
            >
              <span className={cn("grid size-[38px] shrink-0 place-items-center rounded-xl", searchFocused ? "bg-[#FF385C]/[0.14]" : "bg-[var(--surface-2)]")}>
                <Search className="size-4" strokeWidth={2.4} style={{ color: searchFocused ? RED : "var(--fg-muted)" }} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search name, email or ID"
                aria-label="Search contestants"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-[var(--fg)] caret-[#FF385C] outline-none placeholder:text-[var(--fg-subtle)]"
              />
              {q.trim() ? (
                <>
                  <span
                    className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] font-bold"
                    style={{ color: filtered.length ? "var(--fg-muted)" : RED }}
                  >
                    {filtered.length ? `${filtered.length} found` : "No match"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    aria-label="Clear search"
                    className="grid size-[26px] cursor-pointer place-items-center rounded-full bg-[var(--surface-2)] text-[var(--fg)] hover:bg-[var(--border)]"
                  >
                    <X className="size-[13px]" strokeWidth={2.6} />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* your standing */}
          {userContestantRow ? (
            <div
              className="mx-4 mb-2.5 flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-emerald-500/35 bg-[var(--surface)] p-3 shadow-sm sm:mx-6"
              style={{
                backgroundImage: isLight
                  ? "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(16,185,129,0.08))"
                  : "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(16,185,129,0.12))",
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-emerald-500/40 bg-emerald-500/15 text-base font-extrabold" style={{ ...DISPLAY, color: okInk }}>
                  #{userContestantRow.rank ?? "—"}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--fg)]">
                    <UserCheck className="size-[13px] text-violet-500" /> Your Standing
                  </p>
                  <p className="truncate text-[11px] text-[var(--fg-muted)]">
                    {userContestantRow.name || user?.name || "You"} • {fmt(userContestantRow.points ?? userContestantRow.final_score)} pts • {fmt(userContestantRow.audience_votes)} votes
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold" style={{ color: okInk }}>
                <TrendingUp className="size-[13px]" /> Active
              </span>
            </div>
          ) : null}

          {/* ── content ── */}
          {loading && !rows.length ? (
            <div className="space-y-3.5 px-4 pb-6 pt-2 sm:px-6">
              <div className="h-[260px] animate-pulse rounded-[22px] bg-[var(--surface)]" />
              <div className="h-[300px] animate-pulse rounded-[22px] bg-[var(--surface)]" />
            </div>
          ) : roundUpcoming ? (
            <QualifiedList
              rows={(qualified || []).filter(
                (r: any) => !q.trim() || String(r.user_name || r.full_name || "").toLowerCase().includes(q.trim().toLowerCase())
              )}
              loading={qualified === null}
              roundName={roundInfo?.name || `Round ${currentRoundNum}`}
              isLight={isLight}
            />
          ) : data.length === 0 ? (
            <Empty
              icon={<Trophy className="size-7" style={{ color: "var(--fg-muted)" }} />}
              title={q ? "No contestant matches search" : "No rankings available"}
              subtitle={q ? "Try searching with a different name." : "Scores will appear once judging or voting commences."}
              action={compId ? { href: `/competitions/${compId}`, label: "View competition" } : undefined}
            />
          ) : (
            <>
              {/* podium */}
              <div className="mt-3.5" style={{ opacity: loading ? 0.45 : 1, transition: "opacity .2s" }}>
                <Podium3D first={top1} second={top2} third={top3} replayKey={`${compId}|${currentRoundNum}|${activeCategory}`} maxWidth={560} />
              </div>

              {/* spotlight — cleanly below pedestal in Day mode, tucked on Dark mode */}
              <div
                className={cn(
                  "relative mb-3.5 flex flex-col items-center px-5 text-center",
                  isLight ? "mt-4" : "-mt-12 sm:-mt-14"
                )}
              >
                {compId ? (
                  <Link
                    href={`/competitions/${compId}`}
                    className="text-[13px] font-bold underline underline-offset-2"
                    style={{ color: goldInk, textDecorationColor: goldInk }}
                  >
                    See how it works
                  </Link>
                ) : null}
                <h2
                  className="mt-2 text-[28px] font-extrabold leading-[1.12] tracking-[-0.6px] text-[var(--fg)] sm:text-[34px]"
                  style={{ ...DISPLAY, textShadow: isLight ? "none" : "0 0 8px rgba(0,0,0,0.6)" }}
                >
                  {prizeTitle}
                </h2>
                {timeLeft ? (
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[var(--fg-muted)]">
                    <Clock className="size-[13px]" />
                    {/ended/i.test(timeLeft) ? "Entries closed" : `Ends in: ${timeLeft}`}
                  </p>
                ) : null}
                {!isScorePublic && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold" style={{ color: goldInk }}>
                    <Sparkles className="size-3" /> Live Audience Standings · Judging in Progress
                  </span>
                )}
              </div>

              {/* standings table */}
              <div className="mt-2 border-t border-[var(--border)]" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
                {scoreNote ? (
                  <p className="mx-4 mb-1 mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[11.5px] leading-4 text-[var(--fg-muted)] shadow-xs sm:mx-6">
                    <span className="font-bold text-[var(--fg)]">How it&apos;s scored · </span>
                    {scoreNote}
                  </p>
                ) : null}

                <div className="grid grid-cols-[44px_1fr_64px_70px] items-center border-b border-[var(--border)] px-4 py-2.5 text-[10.5px] font-bold tracking-[0.8px] text-[var(--fg-subtle)] sm:px-6">
                  <span className="text-center">RANK</span>
                  <span className="pl-2">USER</span>
                  <span className="pr-2.5 text-right">SCORE</span>
                  <span className="pr-1 text-right">VOTES</span>
                </div>

                <div className="pt-0.5">
                  {filtered.map((r: any, i) => {
                    const pid = pidOf(r);
                    const rankNum = r.rank ?? i + 1;
                    const uEmail = (user?.email || "").trim().toLowerCase();
                    const rEmail = (r.email || r.participant_id || "").trim().toLowerCase();
                    const isMe = Boolean(uEmail && rEmail && uEmail === rEmail);
                    const hasVoted = voted.has(pid);
                    const busy = votingId === pid;
                    const advancing = isMultiRound && !!r.is_advancing;
                    const out = String(r.round_status || "").toUpperCase() === "ELIMINATED";
                    const cutoffAfter = advancing && !(filtered[i + 1] as any)?.is_advancing && i < filtered.length - 1;
                    return (
                      <React.Fragment key={pid + rankNum}>
                        <div
                          className={cn(
                            "grid grid-cols-[44px_1fr_64px_70px] items-center border-b border-[var(--border)] px-4 py-2.5 sm:px-6",
                            isMe && "bg-[#FF385C]/[0.08]",
                            out && "opacity-55"
                          )}
                        >
                          <div className="grid place-items-center">
                            {rankNum <= 3 ? (
                              <RankLaurel rank={rankNum} size={42} medal />
                            ) : (
                              <span className="grid size-[30px] place-items-center rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] text-[12.5px] font-bold text-[var(--fg)]">
                                {rankNum}
                              </span>
                            )}
                          </div>

                          <div className="flex min-w-0 items-center gap-2.5 pl-2">
                            <Avatar row={r} size={38} ring={RING[i % RING.length]} />
                            <div className="min-w-0">
                              <p className="flex items-start gap-1 text-[13.5px] font-bold leading-[18px] text-[var(--fg)]">
                                <span className="break-words">{r.name || "Contestant"}</span>
                                {isMe ? (
                                  <span className="mt-px shrink-0 rounded px-1.5 text-[9.5px] font-extrabold leading-4 text-white" style={{ background: RED }}>
                                    YOU
                                  </span>
                                ) : null}
                                {(r.is_verified || r.verified_badge) && (
                                  <span className="mt-[3px] shrink-0">
                                    <VerifiedBadge size="xs" />
                                  </span>
                                )}
                              </p>
                              {r.category ? <p className="mt-px text-[10.5px] font-medium text-[var(--fg-subtle)]">{r.category}</p> : null}
                              {advancing || out ? (
                                <span
                                  className="mt-1 inline-flex h-[18px] items-center gap-[3px] rounded-full px-[7px] text-[10px] font-bold"
                                  style={{
                                    background: advancing ? "rgba(34,197,94,0.14)" : "var(--surface-2)",
                                    color: advancing ? okInk : "var(--fg-muted)",
                                  }}
                                >
                                  {advancing ? <ArrowUpRight className="size-[10px]" strokeWidth={3} /> : null}
                                  {advancing ? (roundInfo?.is_final_round ? "Winner zone" : "Qualifies") : "Eliminated"}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <span className="pr-2.5 text-right text-[13.5px] font-extrabold tabular-nums text-[var(--fg)]">
                            {fmt(r.points ?? r.final_score)}
                          </span>

                          <div className="flex justify-end pr-1">
                            {isMe || !canVote ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-[3px] text-[11.5px] font-bold text-[var(--fg-muted)]">
                                <Heart className="size-3" /> {fmt(r.audience_votes)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVote(r)}
                                disabled={hasVoted || busy}
                                aria-label={`Vote for ${r.name || "contestant"}`}
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-[3px] text-[11.5px] font-bold transition active:scale-90",
                                  hasVoted
                                    ? "cursor-default border-[#FF385C] bg-[#FF385C]/15 text-[#FF385C]"
                                    : "border-emerald-500/35 bg-emerald-500/[0.12] hover:bg-emerald-500/20"
                                )}
                                style={!hasVoted ? { color: okInk } : undefined}
                              >
                                {busy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Heart className={cn("size-3", hasVoted && "fill-[#FF385C]")} />
                                )}
                                {fmt(r.audience_votes)}
                              </button>
                            )}
                          </div>
                        </div>
                        {cutoffAfter ? (
                          <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
                            <span className="h-px flex-1 bg-emerald-500/35" />
                            <span className="text-[10px] font-bold tracking-[1.4px]" style={{ color: okInk }}>
                              {advancingCount ? `TOP ${advancingCount} ADVANCE` : "QUALIFYING CUTOFF"}
                            </span>
                            <span className="h-px flex-1 bg-emerald-500/35" />
                          </div>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* way out */}
          {compId ? (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 pb-7 pt-5 text-[12.5px] font-bold">
              <Link href={`/competitions/${compId}`} className="text-[var(--fg-muted)] transition hover:text-[var(--fg)]">Competition overview</Link>
              <Link href={`/competitions/${compId}/results`} className="transition hover:opacity-80" style={{ color: RED }}>
                Results &amp; Hall of Fame →
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── rounds ──────────────────────────────────────────────────────────────── */

const roundTone = (status?: string, isLight?: boolean) => {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return { label: "Live", color: RED };
  if (s === "COMPLETED") return { label: "Done", color: isLight ? "#15803d" : OK };
  return { label: "Upcoming", color: isLight ? "#6b5546" : MUTED };
};

const shortDate = (d?: string | null) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isFinite(t.getTime()) ? t.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
};

function RoundBrief({ round, total, advancing, isLive, isLight }: { round: any; total: number; advancing: number | null; isLive: boolean; isLight: boolean }) {
  const t = roundTone(round.status, isLight);
  const dates = [shortDate(round.start_date), shortDate(round.end_date)].filter(Boolean).join(" – ");
  const count = round.qualified_contestant_count ?? round.qualified_contestants_count;
  const facts = [`Round ${round.round_number} of ${total}`, count != null ? `${count} in this round` : null, dates || null].filter(Boolean);
  return (
    <div className="mx-4 mb-3 flex gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs sm:mx-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: t.color + "1F" }}>
        {round.is_final_round ? <Trophy className="size-4" style={{ color: t.color }} /> : <Flag className="size-4" style={{ color: t.color }} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--fg)]">{round.name || `Round ${round.round_number}`}</p>
        <p className="mt-0.5 text-[11.5px] text-[var(--fg-muted)]">{facts.join(" · ")}</p>
        {round.description ? <p className="mt-1.5 text-xs leading-[17px] text-[var(--fg-muted)]">{round.description}</p> : null}
        <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: round.is_final_round ? (isLight ? "#b45309" : GOLD) : (isLight ? "#15803d" : OK) }}>
          {round.is_final_round
            ? "Final round — this decides the winners"
            : advancing
            ? `Top ${advancing} advance to the next round`
            : "Qualifiers are picked when this round closes"}
        </p>
        {!isLive && String(round.status).toUpperCase() !== "UPCOMING" ? (
          <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">Votes now count towards the live round.</p>
        ) : null}
      </div>
    </div>
  );
}

function QualifiedList({ rows, loading, roundName, isLight }: { rows: any[]; loading: boolean; roundName: string; isLight: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2.5 px-4 pb-6 pt-2 sm:px-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-[var(--surface)]" />
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return <Empty icon={<Lock className="size-7" style={{ color: "var(--fg-muted)" }} />} title={`${roundName} hasn't started`} subtitle="Qualifiers are announced when the previous round closes." />;
  }
  const okInk = isLight ? "#15803d" : OK;
  return (
    <div className="px-4 pb-4 pt-2 sm:px-6">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[17px] font-bold text-[var(--fg)]">Qualified for {roundName}</p>
        <p className="text-xs font-semibold text-[var(--fg-muted)]">{rows.length}</p>
      </div>
      <div className="space-y-2">
        {rows.map((r: any, i) => (
          <div key={r.registration_id || r.user_email || i} className="flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-xs">
            <span className="w-[22px] text-center text-xs font-extrabold text-[var(--fg-muted)]">{i + 1}</span>
            <Avatar row={{ profile_photo: r.profile_photo || r.avatar, rank: i } as any} size={38} />
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1 text-[13.5px] font-bold leading-[18px] text-[var(--fg)]">
                <span className="break-words">{r.user_name || r.full_name || "Contestant"}</span>
                {(r.is_verified || r.verified_badge) && (
                  <span className="mt-[3px] shrink-0">
                    <VerifiedBadge size="xs" />
                  </span>
                )}
              </p>
              {r.category ? <p className="mt-px text-[10.5px] text-[var(--fg-subtle)]">{r.category}</p> : null}
            </div>
            <span className="inline-flex h-[18px] items-center gap-[3px] rounded-full px-[7px] text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.14)", color: okInk }}>
              <Check className="size-[10px]" strokeWidth={3} /> Qualified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mx-4 my-6 flex flex-col items-center rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/60 px-6 py-14 text-center sm:mx-6">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--surface-2)]">{icon}</span>
      <p className="mt-4 text-lg font-bold text-[var(--fg)]">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-[var(--fg-muted)]">{subtitle}</p>
      {action ? (
        <Link href={action.href} className="mt-5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-2.5 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--border)]">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
