"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Crown,
  Medal,
  Trophy,
  Flame,
  Search,
  ChevronDown,
  Users,
  Sparkles,
  Vote,
  Gavel,
  ExternalLink,
  Layers,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Heart,
  Loader2,
  Clock,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { publicApi, competeApi } from "@/lib/api";
import { imageFor, cn } from "@/lib/utils";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@/components/motion/Providers";
import { useRealtimeSubscription } from "@/lib/realtime";
import { Podium3D, LaurelWreath, type PodiumContestant } from "@/components/events/Podium3D";

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

function Avatar({ row, size = 44 }: { row: Row; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden shadow-xs"
      style={{ width: size, height: size }}
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

  const activeComp = useMemo(() => {
    return compList.find((c) => (c._id || c.id) === compId);
  }, [compList, compId]);

  const isVotingOpen = Boolean(
    activeComp?.audience_voting_enabled !== false &&
    activeComp?.voting_status !== "CLOSED"
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

  return (
    <section className="container-x relative pb-24 pt-8 md:pt-14">
      {/* Toast alert for voting */}
      {voteToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] pointer-events-none">
          <div
            className={cn(
              "p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top duration-300",
              voteToast.tone === "success"
                ? "bg-slate-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-500/20"
                : "bg-slate-950/90 border-rose-500/50 text-rose-300 shadow-rose-500/20"
            )}
          >
            {voteToast.tone === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            ) : (
              <ShieldCheck className="size-5 shrink-0 text-rose-400" />
            )}
            <span>{voteToast.msg}</span>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionLabel>Live Championship Standings</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-extrabold leading-[0.98] text-[var(--fg)]">
              {activeComp?.title || activeComp?.name || "Competition Leaderboard"}
            </h2>
            {compId && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--fg-subtle)]">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Official Standings
                </span>
                <span>•</span>
                <Link
                  href={`/competitions/${compId}`}
                  className="font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Competition Overview <ExternalLink className="size-3" />
                </Link>
                <Link
                  href={`/competitions/${compId}/results`}
                  className="font-medium text-[var(--fg-muted)] hover:text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Results &amp; Hall of Fame →
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
                className="appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-5 pr-11 text-[13.5px] font-bold text-[var(--fg)] outline-none transition-colors hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] shadow-sm"
              >
                {compList.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Competition"}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]"
                aria-hidden
              />
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Spotlight Prize Pool Banner with Live Countdown (Matched 1:1 with Mobile) ── */}
      <Reveal className="mt-7">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[var(--surface)] to-amber-500/10 p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 sm:size-14 place-items-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-300 text-2xl shadow-inner shrink-0">
              🏆
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300/80 block">
                Championship Rewards
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 tracking-tight">
                {prizeTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {timeLeft && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] border border-amber-500/30 px-3.5 py-1.5 shadow-xs">
                <Clock className="size-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                  Closes in:
                </span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-800 dark:text-amber-300">
                  {timeLeft}
                </span>
              </div>
            )}
            <div className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Vote className="size-3.5 text-emerald-500" />
              <span>Audience Voting Live</span>
            </div>
          </div>
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
                Stage {activeRoundNumber ?? roundsData.current_round ?? 1} of{" "}
                {roundsData.total_rounds ?? roundsData.rounds.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {roundsData.rounds.map((rd: any) => {
                const isSelected =
                  (activeRoundNumber ?? roundsData.current_round ?? 1) === rd.round_number;
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
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                            : isCompleted
                            ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                            : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                        )}
                      >
                        {isActive ? "Active Stage" : isCompleted ? "Completed" : "Upcoming"}
                      </span>
                    </div>
                    {rd.description && (
                      <p className="line-clamp-1 text-[11px] text-[var(--fg-muted)]">{rd.description}</p>
                    )}
                    {rd.advancing_count && !rd.is_final_round && (
                      <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400">
                        Top {rd.advancing_count} advance to next stage
                      </span>
                    )}
                    {rd.is_final_round && (
                      <span className="text-[10.5px] font-bold text-amber-800 dark:text-yellow-400 flex items-center gap-1">
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

      {/* Category Tabs (Sub-Junior, Junior, Senior, Open, etc.) */}
      {availableCategories.length > 0 && (
        <Reveal className="mt-6">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                Select Competition Category
              </span>
              <span className="text-[11.5px] text-[var(--fg-subtle)] font-medium">
                {activeCategory === "ALL"
                  ? `Showing all ${allNormalizedRows.length} ranked contestants`
                  : `${activeCategory} Division: Showing ${categoryRows.length} contestants • Top 3 Podium below`}
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
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-strong)]"
                )}
              >
                <span>All Categories</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums",
                    activeCategory === "ALL"
                      ? "bg-black/25 text-black"
                      : "bg-[var(--surface)] text-[var(--fg-subtle)]"
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
                        : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums",
                        isActive
                          ? "bg-black/25 text-black"
                          : "bg-[var(--surface)] text-[var(--fg-subtle)]"
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

      {/* Empty State */}
      {data.length === 0 ? (
        <Reveal>
          <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]">
              <Trophy className="size-7 text-[var(--fg-subtle)]" aria-hidden />
            </span>
            <p className="mt-5 font-display text-xl font-bold text-[var(--fg)]">No rankings yet</p>
            <p className="mt-1.5 max-w-sm text-sm text-[var(--fg-muted)]">
              Rankings for{" "}
              <span className="font-semibold text-[var(--fg)]">
                {activeComp?.title || "this competition"}
              </span>{" "}
              appear here once contestants are scored or audience votes begin.
            </p>
            {compId && (
              <Link
                href={`/competitions/${compId}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-xs font-semibold hover:border-[var(--border-strong)] transition-colors text-[var(--fg)]"
              >
                View Competition &amp; Submit Entry
              </Link>
            )}
          </div>
        </Reveal>
      ) : !isScorePublic ? (
        /* Private Score Mode */
        <Reveal className="mt-8">
          <div className="flex flex-col gap-6">
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Your Verified Scorecard
                        </span>
                        <span className="rounded-full bg-slate-700/40 border border-slate-600/40 px-2.5 py-0.5 text-xs font-mono text-slate-800 dark:text-slate-300">
                          {userContestantRow.category || "General"}
                        </span>
                      </div>
                      <h4 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[var(--fg)] flex items-center gap-2">
                        <span>{userContestantRow.name}</span>
                        {(userContestantRow.is_verified || userContestantRow.verified_badge) && (
                          <VerifiedBadge size="sm" />
                        )}
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--fg-subtle)] font-medium">
                        Your performance score is confidential and visible only to you until the official public leaderboard is published.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-around gap-4 bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] shadow-inner">
                    <div className="text-center px-3 border-r border-[var(--border)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Judge Score
                      </p>
                      <p className="text-2xl font-black text-amber-800 dark:text-amber-400 tabular-nums">
                        {nf(userContestantRow.judge_score)}
                      </p>
                    </div>
                    <div className="text-center px-3 border-r border-[var(--border)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Audience Votes
                      </p>
                      <p className="text-2xl font-black text-sky-800 dark:text-sky-400 tabular-nums">
                        {nf(userContestantRow.audience_votes)}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Total Points
                      </p>
                      <p className="text-2xl font-black text-[var(--accent)] tabular-nums">
                        {nf(userContestantRow.points ?? userContestantRow.final_score)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-amber-500/30 bg-[var(--surface)] shadow-lg">
              <Lock className="size-10 text-amber-500 mb-3" />
              <h3 className="font-display text-xl font-bold text-[var(--fg)]">Public Standings Hidden</h3>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] max-w-md mt-1">
                Auditions are currently in progress. Final rankings will be revealed once the judging panel completes evaluations.
              </p>
            </div>
          </div>
        </Reveal>
      ) : (
        <>
          {/* ── 3D PODIUM (Matched 1:1 with Mobile App: Blocks, Wreaths, Crown & Floating Rings) ── */}
          <Reveal className="mt-8">
            <Podium3D
              first={top1}
              second={top2}
              third={top3}
              onVote={handleVote}
              votedIds={voted}
              votingId={votingId}
              isVotingOpen={isVotingOpen}
            />
          </Reveal>

          {/* ── CHAMPIONSHIP TABLE WITH VOTING ── */}
          <Reveal className="mt-12">
            {/* Pinned Logged-in Contestant Standing Card */}
            {userContestantRow && (
              <div className="mb-4 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-amber-400 text-slate-950 font-black text-base shadow-sm shrink-0">
                      #{userContestantRow.rank ?? "—"}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300">
                        <Trophy className="size-3" /> YOUR STANDING IN THIS COMPETITION
                      </span>
                      <p className="font-bold text-sm sm:text-base text-[var(--fg)]">
                        {userContestantRow.name || user?.name}
                      </p>
                      <span className="text-xs text-[var(--fg-muted)]">
                        Division: {userContestantRow.category || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400 block font-bold">
                        Audience Votes
                      </span>
                      <span className="font-display text-lg font-black text-emerald-800 dark:text-emerald-300">
                        {nf(userContestantRow.audience_votes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[var(--fg-subtle)] block font-bold">
                        Total Score
                      </span>
                      <span className="font-display text-xl font-black text-amber-800 dark:text-amber-300">
                        {nf(userContestantRow.points ?? userContestantRow.final_score)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Championship Table Card */}
            <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] p-4 md:p-5">
                <div className="flex items-center gap-2">
                  <Gavel className="size-5 text-[var(--accent)]" aria-hidden />
                  <p className="font-display text-lg font-bold text-[var(--fg)]">
                    {activeCategory === "ALL" ? "Championship Standings" : `${activeCategory} Standings`}
                  </p>
                  <span className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 text-[11px] font-mono font-bold text-[var(--fg-muted)]">
                    {filtered.length} players
                  </span>
                </div>

                <div className="relative w-full sm:max-w-[260px]">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]"
                    aria-hidden
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search player or handle..."
                    className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-10 pr-4 text-xs sm:text-sm text-[var(--fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] shadow-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--fg-subtle)] bg-[var(--surface-2)]/40">
                      <th className="px-5 py-3.5 font-bold">Rank</th>
                      <th className="px-3 py-3.5 font-bold">Performer</th>
                      <th className="px-3 py-3.5 font-bold">Category</th>
                      <th className="px-3 py-3.5 text-right font-bold">Votes</th>
                      <th className="px-3 py-3.5 text-right font-bold">Judge</th>
                      <th className="px-5 py-3.5 text-right font-bold">Points</th>
                      {isVotingOpen && <th className="px-5 py-3.5 text-center font-bold">Vote</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const uEmail = (user?.email || "").trim().toLowerCase();
                      const rEmail = (r.email || r.participant_id || "").trim().toLowerCase();
                      const isMe = Boolean(uEmail && rEmail && uEmail === rEmail);
                      const pid = pidOf(r);
                      const hasVoted = voted.has(pid);
                      const isVotingThis = votingId === pid;
                      const rankNum = r.rank ?? idx + 1;

                      return (
                        <motion.tr
                          key={pid + rankNum}
                          whileHover={{ backgroundColor: "var(--surface-2)" }}
                          className={cn(
                            "border-t border-[var(--border)] text-sm transition-colors",
                            isMe
                              ? "bg-amber-500/15 border-y-2 border-amber-400 font-bold shadow-sm"
                              : ""
                          )}
                        >
                          {/* Rank Column with Laurel Wreath for Top 3 */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {rankNum === 1 ? (
                              <LaurelWreath rank={1} size={42} />
                            ) : rankNum === 2 ? (
                              <LaurelWreath rank={2} size={40} />
                            ) : rankNum === 3 ? (
                              <LaurelWreath rank={3} size={38} />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)] font-extrabold text-xs shadow-xs">
                                {rankNum}
                              </span>
                            )}
                          </td>

                          {/* Player Info Column */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar row={r} size={42} />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5 text-[var(--fg)]">
                                  <span>{r.name || "—"}</span>
                                  {isMe && (
                                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9.5px] font-black text-slate-950 uppercase shadow-xs">
                                      YOU
                                    </span>
                                  )}
                                  {(r.is_verified || r.verified_badge) && <VerifiedBadge size="xs" />}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <p className="truncate text-xs text-[var(--fg-subtle)] font-medium">
                                    {handle(r)}
                                  </p>
                                  {r.is_advancing && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.2 text-[10.5px] font-extrabold text-emerald-800 dark:text-emerald-400">
                                      <Sparkles className="size-3" /> Advances
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Column */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:text-violet-300">
                              {r.category || "General"}
                            </span>
                          </td>

                          {/* Votes Column */}
                          <td className="px-3 py-3.5 text-right tabular-nums text-sm font-bold text-emerald-800 dark:text-emerald-400">
                            {nf(r.audience_votes)}
                          </td>

                          {/* Judge Score Column */}
                          <td className="px-3 py-3.5 text-right tabular-nums text-sm font-bold text-amber-800 dark:text-amber-400">
                            {r.judge_score != null && Number(r.judge_score) > 0 ? (
                              <span>★ {nf(r.judge_score)}</span>
                            ) : (
                              <span className="text-[var(--fg-subtle)] font-normal">—</span>
                            )}
                          </td>

                          {/* Total Score Column */}
                          <td className="px-5 py-3.5 text-right font-display text-base sm:text-lg font-black tabular-nums text-[var(--fg)]">
                            {nf(r.points ?? r.final_score ?? r.audience_votes)}
                          </td>

                          {/* Interactive Vote Button Column */}
                          {isVotingOpen && (
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              {isMe ? (
                                <span className="inline-flex items-center rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                                  Your Entry
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleVote(r)}
                                  disabled={hasVoted || isVotingThis}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95",
                                    hasVoted
                                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 cursor-default"
                                      : "border border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-300 hover:bg-rose-500 hover:text-white"
                                  )}
                                  aria-label={`Vote for ${r.name || "contestant"}`}
                                >
                                  {isVotingThis ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Heart
                                      className={cn("size-3.5", hasVoted ? "fill-rose-500 text-rose-500" : "")}
                                    />
                                  )}
                                  <span>{hasVoted ? "Voted" : "Vote"}</span>
                                </button>
                              )}
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && (
                <div className="border-t border-[var(--border)] p-4 text-center text-xs text-[var(--fg-subtle)]">
                  Updating standings in real time…
                </div>
              )}
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}
