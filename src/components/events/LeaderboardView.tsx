"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { useAuth } from "@/components/motion/Providers";
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
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#161724]"
      style={{ width: size, height: size, border: `2px solid ${ring || "rgba(255,255,255,0.14)"}` }}
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

  const pidOf = (r: Row | PodiumContestant) => r.participant_id || r.email || "";

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

      // Refresh standings
      if (activeRoundNumber && activeRoundNumber > 1) {
        publicApi.roundLeaderboard(compId, activeRoundNumber).then((d: any) => {
          if (Array.isArray(d?.leaderboard)) setRows(d.leaderboard);
        }).catch(() => {});
      } else {
        publicApi.leaderboard(compId).then((d: any) => {
          if (Array.isArray(d?.leaderboard)) setRows(d.leaderboard);
        }).catch(() => {});
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
  }, [compList]);

  const handleSelectRound = async (roundNum: number) => {
    if (!compId) return;
    setActiveRoundNumber(roundNum);
    setLoading(true);
    try {
      const d: any = await publicApi.roundLeaderboard(compId, roundNum);
      const activeCompObj = compList.find((c: any) => (c._id || c.id) === compId);
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
      setCompId(urlCompId);
      pick(urlCompId);
    }
  }, [urlCompId, compId, pick]);

  useEffect(() => {
    if (initialCompId && initialCompId !== compId && !urlCompId) {
      setCompId(initialCompId);
      setRows(initialRows || []);
      if (initialCategories) setCategories(initialCategories);
      if (initialCategoryLeaderboards) setCategoryLeaderboards(initialCategoryLeaderboards);
    }
  }, [initialCompId, initialRows, initialCategories, initialCategoryLeaderboards, compId, urlCompId]);

  useRealtimeSubscription(
    compId ? [`competition:${compId}`, "admin:competitions", "global"] : ["global"],
    useCallback(
      (evt) => {
        const data = evt.data || {};
        const targetCid = String(data.competition_id || evt.channel?.replace("competition:", "") || "");
        if (compId && targetCid && targetCid !== String(compId)) {
          return;
        }

        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
          setRows(data.leaderboard);
          if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
          if (data.category_leaderboards && typeof data.category_leaderboards === "object") {
            setCategoryLeaderboards(data.category_leaderboards);
          }
          if (data.score_visible_for_public !== undefined) {
            setIsScorePublic(Boolean(data.score_visible_for_public));
          }
        } else {
          if (activeRoundNumber && activeRoundNumber > 1) {
            publicApi.roundLeaderboard(compId, activeRoundNumber).then((d: any) => {
              if (Array.isArray(d?.leaderboard)) setRows(d.leaderboard);
              if (Array.isArray(d?.categories)) setCategories(d.categories);
              if (d?.category_leaderboards) setCategoryLeaderboards(d.category_leaderboards);
            }).catch(() => {});
          } else {
            publicApi.leaderboard(compId).then((d: any) => {
              if (Array.isArray(d?.leaderboard)) setRows(d.leaderboard);
              if (Array.isArray(d?.categories)) setCategories(d.categories);
              if (d?.category_leaderboards) setCategoryLeaderboards(d.category_leaderboards);
            }).catch(() => {});
          }
        }
      },
      [compId, activeRoundNumber]
    ),
    6000
  );

  const handleSelectComp = (newId: string) => {
    if (!newId) return;
    setCompId(newId);
    pick(newId);
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

  const allNormalizedRows = useMemo(() => {
    const rawList = rows.length ? rows : [];

    const scoredList = rawList.filter((r: any) => {
      const pid = pidOf(r);
      const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
      const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0) + (bump[pid] || 0);
      const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
      const effectivePoints = rawFinal != null && rawFinal > 0 ? rawFinal : judge > 0 ? judge : votes;
      return effectivePoints > 0 || Boolean(r.is_scored || r.has_scored);
    });

    const targetList = [...scoredList];

    targetList.sort((a: any, b: any) => {
      const aPid = pidOf(a);
      const bPid = pidOf(b);
      const aVotes = Number(a.audience_votes ?? a.raw_audience_votes ?? 0) + (bump[aPid] || 0);
      const bVotes = Number(b.audience_votes ?? b.raw_audience_votes ?? 0) + (bump[bPid] || 0);
      const aPts = a.final_score ?? a.total_score ?? a.score ?? a.points ?? a.judge_score ?? aVotes;
      const bPts = b.final_score ?? b.total_score ?? b.score ?? b.points ?? b.judge_score ?? bVotes;
      return Number(bPts) - Number(aPts);
    });

    return targetList.map((r: any, i) => {
      const pid = pidOf(r);
      const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
      const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0) + (bump[pid] || 0);
      const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
      const effectivePoints = rawFinal != null && rawFinal > 0 ? rawFinal : judge > 0 ? judge : votes;
      return {
        ...r,
        rank: i + 1,
        audience_votes: votes,
        judge_score: judge,
        final_score: effectivePoints,
        points: effectivePoints,
      };
    });
  }, [rows, bump]);

  const categoryRows = useMemo(() => {
    if (activeCategory === "ALL") return allNormalizedRows;

    const precalcKey = Object.keys(categoryLeaderboards).find(
      (k) => k.trim().toLowerCase() === activeCategory.trim().toLowerCase()
    );
    const precalc = precalcKey ? categoryLeaderboards[precalcKey] : undefined;
    if (Array.isArray(precalc) && precalc.length > 0) {
      const scoredPrecalc = precalc.filter((r: any) => {
        const pid = pidOf(r);
        const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
        const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0) + (bump[pid] || 0);
        const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
        return (rawFinal != null && rawFinal > 0) || votes > 0 || judge > 0 || Boolean(r.is_scored || r.has_scored);
      });

      return scoredPrecalc.map((r: any, i) => {
        const pid = pidOf(r);
        const rawFinal = r.final_score ?? r.total_score ?? r.score ?? r.points;
        const votes = Number(r.audience_votes ?? r.raw_audience_votes ?? 0) + (bump[pid] || 0);
        const judge = Number(r.judge_score ?? r.raw_judge_score ?? 0);
        const effectivePoints = rawFinal != null && rawFinal > 0 ? rawFinal : judge > 0 ? judge : votes;
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
  }, [activeCategory, allNormalizedRows, categoryLeaderboards, bump]);

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
    "relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-white/[0.12] bg-white/[0.08] text-white transition hover:bg-white/[0.14] active:scale-95";

  return (
    <section className={cn("container-x relative pb-24 pt-8 md:pt-12", poppins.variable)}>
      {/* vote toast */}
      {voteToast && (
        <div className="pointer-events-none fixed left-1/2 top-24 z-50 w-[92vw] max-w-md -translate-x-1/2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-[#0b0c14]/95 p-3.5 text-[13px] font-semibold text-white shadow-2xl backdrop-blur-xl",
              voteToast.tone === "success" ? "border-emerald-500/40" : "border-[#FF385C]/50"
            )}
          >
            {voteToast.tone === "success" ? (
              <CheckCircle2 className="size-5 shrink-0" style={{ color: OK }} />
            ) : (
              <ShieldCheck className="size-5 shrink-0" style={{ color: RED }} />
            )}
            <span>{voteToast.msg}</span>
          </div>
        </div>
      )}

      {/* the board — transparent stage blending seamlessly with page background */}
      <div className="relative mx-auto max-w-[760px] text-white">

        {/* top bar: back · title · share + competition picker */}
        <div className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <Link href={compId ? `/competitions/${compId}` : "/competitions"} aria-label="Back to competition" className={iconBtn}>
            <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[19px] font-bold tracking-[-0.3px]">Leaderboard</p>
            {compTitle ? <p className="mt-px truncate text-[11px] text-white/50">{compTitle}</p> : null}
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
                    <option key={c._id || c.id} value={c._id || c.id}>
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
                      on ? "border-[#FF385C] bg-[#FF385C] text-white" : "border-white/10 bg-white/[0.06] text-[#9EA3B8] hover:text-white"
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
              <div className="mx-auto mb-3 mt-1 flex w-max gap-1 rounded-full bg-white/[0.055] p-1">
                {roundsData.rounds.map((rd: any) => {
                  const on = currentRoundNum === rd.round_number;
                  const st = roundTone(rd.status);
                  return (
                    <button
                      key={rd.round_number}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => handleSelectRound(rd.round_number)}
                      className={cn(
                        "flex min-h-[46px] cursor-pointer flex-col items-center justify-center rounded-full px-[18px] py-1.5 transition",
                        on ? "bg-white/[0.13]" : "hover:bg-white/[0.06]"
                      )}
                    >
                      <span className={cn("whitespace-nowrap text-[13px] font-bold", on ? "text-white" : "text-white/55")}>
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
            <RoundBrief round={roundInfo} total={roundsData.rounds.length} advancing={advancingCount} isLive={currentRoundNum === liveRound} />
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
                      on ? "border-[#FF385C] bg-[#FF385C]/20 text-[#FF385C]" : "border-white/[0.08] bg-white/[0.05] text-[#9EA3B8] hover:text-white"
                    )}
                  >
                    {cat}
                    <span className={cn("tabular-nums", on ? "text-[#FF385C]/80" : "text-white/35")}>{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* search */}
          <div className="px-4 pb-2 pt-2 sm:px-6">
            <div
              className={cn(
                "flex h-[50px] items-center gap-2.5 rounded-2xl border pl-1.5 pr-2 transition",
                searchFocused
                  ? "border-[#FF385C]/55 bg-[#181A23] shadow-[0_0_14px_rgba(255,56,92,0.22)]"
                  : "border-white/[0.08] bg-[#14161E]"
              )}
            >
              <span className={cn("grid size-[38px] shrink-0 place-items-center rounded-xl", searchFocused ? "bg-[#FF385C]/[0.14]" : "bg-white/[0.06]")}>
                <Search className="size-4" strokeWidth={2.4} style={{ color: searchFocused ? RED : "#9EA3B8" }} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search name, email or ID"
                aria-label="Search contestants"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-white caret-[#FF385C] outline-none placeholder:text-[#6B7186]"
              />
              {q.trim() ? (
                <>
                  <span
                    className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] font-bold"
                    style={{ color: filtered.length ? "#C5CAD6" : RED }}
                  >
                    {filtered.length ? `${filtered.length} found` : "No match"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    aria-label="Clear search"
                    className="grid size-[26px] cursor-pointer place-items-center rounded-full bg-white/[0.14]"
                  >
                    <X className="size-[13px]" strokeWidth={2.6} />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* your standing */}
          {userContestantRow && isScorePublic ? (
            <div className="mx-4 mb-2.5 flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-emerald-500/35 p-3 sm:mx-6" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(16,185,129,0.12))" }}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-emerald-500/40 bg-emerald-500/15 text-base font-extrabold" style={{ ...DISPLAY, color: "#10B981" }}>
                  #{userContestantRow.rank ?? "—"}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-bold">
                    <UserCheck className="size-[13px] text-[#A78BFA]" /> Your Standing
                  </p>
                  <p className="truncate text-[11px] text-white/55">
                    {userContestantRow.name || user?.name || "You"} • {fmt(userContestantRow.points ?? userContestantRow.final_score)} pts • {fmt(userContestantRow.audience_votes)} votes
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/[0.12] px-2 py-1 text-[11px] font-bold" style={{ color: "#10B981" }}>
                <TrendingUp className="size-[13px]" /> Active
              </span>
            </div>
          ) : null}

          {/* ── content ── */}
          {loading && !rows.length ? (
            <div className="space-y-3.5 px-4 pb-6 pt-2 sm:px-6">
              <div className="h-[260px] animate-pulse rounded-[22px] bg-white/[0.05]" />
              <div className="h-[300px] animate-pulse rounded-[22px] bg-white/[0.05]" />
            </div>
          ) : roundUpcoming ? (
            <QualifiedList
              rows={(qualified || []).filter(
                (r: any) => !q.trim() || String(r.user_name || r.full_name || "").toLowerCase().includes(q.trim().toLowerCase())
              )}
              loading={qualified === null}
              roundName={roundInfo?.name || `Round ${currentRoundNum}`}
            />
          ) : data.length === 0 ? (
            <Empty
              icon={<Trophy className="size-7" style={{ color: "#9EA3B8" }} />}
              title={q ? "No contestant matches search" : "No rankings available"}
              subtitle={q ? "Try searching with a different name." : "Scores will appear once judging or voting commences."}
              action={compId ? { href: `/competitions/${compId}`, label: "View competition" } : undefined}
            />
          ) : !isScorePublic ? (
            /* private scores — your own card stays visible, the rest is hidden */
            <div className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
              {userContestantRow ? (
                <div className="rounded-[20px] border border-[#F5C542]/35 p-4" style={{ background: "linear-gradient(135deg, rgba(245,197,66,0.16), rgba(20,22,30,0.92))" }}>
                  <div className="flex items-center gap-3">
                    <Avatar row={userContestantRow} size={52} ring={GOLD} />
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[2px]" style={{ color: GOLD }}>Your scorecard</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[15px] font-bold">
                        {userContestantRow.name}
                        {(userContestantRow.is_verified || userContestantRow.verified_badge) && <VerifiedBadge size="xs" />}
                      </p>
                      <p className="text-[11px] text-white/55">{userContestantRow.category || "General"} · visible only to you</p>
                    </div>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    <Stat value={fmt(userContestantRow.judge_score)} label="Judge score" />
                    <Stat value={fmt(userContestantRow.audience_votes)} label="Votes" />
                    <Stat value={fmt(userContestantRow.points ?? userContestantRow.final_score)} label="Total" color={GOLD} />
                  </div>
                </div>
              ) : null}
              <Empty
                icon={<Lock className="size-7" style={{ color: GOLD }} />}
                title="Public standings hidden"
                subtitle="Judging is in progress. Rankings are revealed once the panel completes evaluations."
              />
            </div>
          ) : (
            <>
              {/* podium */}
              <div className="mt-3.5" style={{ opacity: loading ? 0.45 : 1, transition: "opacity .2s" }}>
                <Podium3D first={top1} second={top2} third={top3} replayKey={`${compId}|${currentRoundNum}|${activeCategory}`} maxWidth={560} />
              </div>

              {/* spotlight — sits on the fading foot of the champion block */}
              <div className="relative -mt-12 mb-3.5 flex flex-col items-center px-5 text-center sm:-mt-14">
                {compId ? (
                  <Link href={`/competitions/${compId}`} className="text-[13px] font-bold underline underline-offset-2" style={{ color: GOLD, textDecorationColor: GOLD }}>
                    See how it works
                  </Link>
                ) : null}
                <h2 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-[-0.6px] sm:text-[34px]" style={{ ...DISPLAY, textShadow: "0 0 8px rgba(0,0,0,0.6)" }}>
                  {prizeTitle}
                </h2>
                {timeLeft ? (
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-[12.5px] font-medium" style={{ color: MUTED }}>
                    <Clock className="size-[13px]" />
                    {/ended/i.test(timeLeft) ? "Entries closed" : `Ends in: ${timeLeft}`}
                  </p>
                ) : null}
              </div>

              {/* standings table */}
              <div className="mt-2 border-t border-white/[0.08]" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
                {scoreNote ? (
                  <p className="mx-4 mb-1 mt-3 rounded-xl bg-white/[0.035] px-3 py-2.5 text-[11.5px] leading-4 sm:mx-6" style={{ color: MUTED }}>
                    <span className="font-bold text-[#C5CAD6]">How it&apos;s scored · </span>
                    {scoreNote}
                  </p>
                ) : null}

                <div className="grid grid-cols-[44px_1fr_64px_70px] items-center border-b border-white/[0.05] px-4 py-2.5 text-[10.5px] font-bold tracking-[0.8px] text-[#64748B] sm:px-6">
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
                            "grid grid-cols-[44px_1fr_64px_70px] items-center border-b border-white/[0.04] px-4 py-2.5 sm:px-6",
                            isMe && "bg-[#FF385C]/[0.07]",
                            out && "opacity-55"
                          )}
                        >
                          <div className="grid place-items-center">
                            {rankNum <= 3 ? (
                              <RankLaurel rank={rankNum} size={42} medal />
                            ) : (
                              <span className="grid size-[30px] place-items-center rounded-full border-[1.5px] border-white/[0.16] bg-[#151824] text-[12.5px] font-bold text-[#E2E8F0]">
                                {rankNum}
                              </span>
                            )}
                          </div>

                          <div className="flex min-w-0 items-center gap-2.5 pl-2">
                            <Avatar row={r} size={38} ring={RING[i % RING.length]} />
                            <div className="min-w-0">
                              <p className="flex items-start gap-1 text-[13.5px] font-bold leading-[18px]">
                                <span className="break-words">{r.name || "Contestant"}</span>
                                {isMe ? (
                                  <span className="mt-px shrink-0 rounded px-1.5 text-[9.5px] font-extrabold leading-4" style={{ background: RED }}>
                                    YOU
                                  </span>
                                ) : null}
                                {(r.is_verified || r.verified_badge) && (
                                  <span className="mt-[3px] shrink-0">
                                    <VerifiedBadge size="xs" />
                                  </span>
                                )}
                              </p>
                              {r.category ? <p className="mt-px text-[10px] text-white/45">{r.category}</p> : null}
                              {advancing || out ? (
                                <span
                                  className="mt-1 inline-flex h-[18px] items-center gap-[3px] rounded-full px-[7px] text-[10px] font-bold"
                                  style={{ background: advancing ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)", color: advancing ? OK : MUTED }}
                                >
                                  {advancing ? <ArrowUpRight className="size-[10px]" strokeWidth={3} /> : null}
                                  {advancing ? (roundInfo?.is_final_round ? "Winner zone" : "Qualifies") : "Eliminated"}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <span className="pr-2.5 text-right text-[13.5px] font-extrabold tabular-nums">{fmt(r.points ?? r.final_score)}</span>

                          <div className="flex justify-end pr-1">
                            {isMe ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-[3px] text-[11.5px] font-bold text-[#C5CAD6]">
                                <Heart className="size-3" /> {fmt(r.audience_votes)}
                              </span>
                            ) : !canVote ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-[3px] text-[11.5px] font-bold text-[#C5CAD6]">
                                <Heart className="size-3" style={{ color: MUTED }} /> {fmt(r.audience_votes)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVote(r)}
                                disabled={hasVoted || busy}
                                aria-label={`Vote for ${r.name || "contestant"}`}
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-[3px] text-[11.5px] font-bold transition active:scale-90",
                                  hasVoted
                                    ? "cursor-default border-[#FF385C] bg-[#FF385C]/15 text-[#FF385C]"
                                    : "border-emerald-500/25 bg-emerald-500/[0.12] text-[#10B981] hover:bg-emerald-500/20"
                                )}
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
                            <span className="text-[10px] font-bold tracking-[1.4px]" style={{ color: OK }}>
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
              <Link href={`/competitions/${compId}`} className="text-white/70 transition hover:text-white">Competition overview</Link>
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

const ROUND_TONE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Live", color: RED },
  COMPLETED: { label: "Done", color: OK },
  UPCOMING: { label: "Upcoming", color: MUTED },
};
const roundTone = (status?: string) => ROUND_TONE[String(status || "").toUpperCase()] || ROUND_TONE.UPCOMING;

const shortDate = (d?: string | null) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isFinite(t.getTime()) ? t.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
};

function RoundBrief({ round, total, advancing, isLive }: { round: any; total: number; advancing: number | null; isLive: boolean }) {
  const t = roundTone(round.status);
  const dates = [shortDate(round.start_date), shortDate(round.end_date)].filter(Boolean).join(" – ");
  const count = round.qualified_contestant_count ?? round.qualified_contestants_count;
  const facts = [`Round ${round.round_number} of ${total}`, count != null ? `${count} in this round` : null, dates || null].filter(Boolean);
  return (
    <div className="mx-4 mb-3 flex gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-3.5 sm:mx-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: t.color + "1F" }}>
        {round.is_final_round ? <Trophy className="size-4" style={{ color: t.color }} /> : <Flag className="size-4" style={{ color: t.color }} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold">{round.name || `Round ${round.round_number}`}</p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>{facts.join(" · ")}</p>
        {round.description ? <p className="mt-1.5 text-xs leading-[17px] text-[#C5CAD6]">{round.description}</p> : null}
        <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: round.is_final_round ? GOLD : OK }}>
          {round.is_final_round
            ? "Final round — this decides the winners"
            : advancing
            ? `Top ${advancing} advance to the next round`
            : "Qualifiers are picked when this round closes"}
        </p>
        {!isLive && String(round.status).toUpperCase() !== "UPCOMING" ? (
          <p className="mt-1 text-[11px]" style={{ color: MUTED }}>Votes now count towards the live round.</p>
        ) : null}
      </div>
    </div>
  );
}

function QualifiedList({ rows, loading, roundName }: { rows: any[]; loading: boolean; roundName: string }) {
  if (loading) {
    return (
      <div className="space-y-2.5 px-4 pb-6 pt-2 sm:px-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    );
  }
  if (!rows.length) {
    return <Empty icon={<Lock className="size-7" style={{ color: "#9EA3B8" }} />} title={`${roundName} hasn't started`} subtitle="Qualifiers are announced when the previous round closes." />;
  }
  return (
    <div className="px-4 pb-4 pt-2 sm:px-6">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[17px] font-bold">Qualified for {roundName}</p>
        <p className="text-xs font-semibold" style={{ color: MUTED }}>{rows.length}</p>
      </div>
      <div className="space-y-2">
        {rows.map((r: any, i) => (
          <div key={r.registration_id || r.user_email || i} className="flex items-center gap-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.035] p-2.5">
            <span className="w-[22px] text-center text-xs font-extrabold" style={{ color: MUTED }}>{i + 1}</span>
            <Avatar row={{ profile_photo: r.profile_photo || r.avatar, rank: i } as any} size={38} />
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1 text-[13.5px] font-bold leading-[18px]">
                <span className="break-words">{r.user_name || r.full_name || "Contestant"}</span>
                {(r.is_verified || r.verified_badge) && (
                  <span className="mt-[3px] shrink-0">
                    <VerifiedBadge size="xs" />
                  </span>
                )}
              </p>
              {r.category ? <p className="mt-px text-[10.5px] text-white/45">{r.category}</p> : null}
            </div>
            <span className="inline-flex h-[18px] items-center gap-[3px] rounded-full px-[7px] text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.12)", color: OK }}>
              <Check className="size-[10px]" strokeWidth={3} /> Qualified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, color = "#fff" }: { value: string; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0B0C14] px-2 py-2.5 text-center">
      <p className="text-[17px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[1px]" style={{ color: MUTED }}>{label}</p>
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
    <div className="mx-4 my-6 flex flex-col items-center rounded-[22px] border border-dashed border-white/[0.12] px-6 py-14 text-center sm:mx-6">
      <span className="grid size-14 place-items-center rounded-full bg-white/[0.05]">{icon}</span>
      <p className="mt-4 text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-[13px]" style={{ color: MUTED }}>{subtitle}</p>
      {action ? (
        <Link href={action.href} className="mt-5 rounded-full border border-white/[0.12] px-5 py-2.5 text-xs font-semibold transition hover:bg-white/[0.06]">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
