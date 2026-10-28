"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, ShieldCheck, CheckCircle2, AlertCircle, Clock, Search,
  Lock, Unlock, ChevronRight, Award, Trophy, Star, ExternalLink,
  Save, SkipForward, LogOut, ArrowLeft, RefreshCw, Send, Check,
  Play, Music, Video, User, FileText, Crown, Sparkles, MessageSquare,
  Flame, Filter, ChevronLeft, Radio
} from "lucide-react";
import {
  judgeCompetitionsApi,
  publicApi,
  tokenStore,
  type JudgeCompetition,
  type JudgeContestant,
  type JudgingCriterion,
  type JudgeScoreboardResponse
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, Spotlights } from "@/components/ui/Primitives";
import { cn, imageFor, formatEventDate } from "@/lib/utils";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";

const EASE = [0.16, 1, 0.3, 1] as const;

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function isAudio(url?: string): boolean {
  if (!url) return false;
  return /\.mp3(\?.*)?$/i.test(url) || url.includes("/audio/") || url.includes("format=mp3");
}

export default function JudgeDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [competitions, setCompetitions] = useState<JudgeCompetition[]>([]);
  const [selectedComp, setSelectedComp] = useState<JudgeCompetition | null>(null);
  const [contestants, setContestants] = useState<JudgeContestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [contestantsLoading, setContestantsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "scored">("all");

  // View Mode: Evaluation vs Live Scoreboard (1st, 2nd, 3rd)
  const [activeTab, setActiveTab] = useState<"evaluate" | "scoreboard">("evaluate");
  const [scoreboardData, setScoreboardData] = useState<JudgeScoreboardResponse | null>(null);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  // Scoring Drawer / Selected Contestant
  const [activeContestant, setActiveContestant] = useState<JudgeContestant | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreNotice, setScoreNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Session PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [sessionPin, setSessionPin] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinVerified, setPinVerified] = useState(false);

  // COI Skip Modal
  const [showCoiModal, setShowCoiModal] = useState(false);
  const [coiReason, setCoiReason] = useState("");
  const [skipping, setSkipping] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace("/judge/login");
    }
  }, [router]);

  // Load assigned competitions
  const loadCompetitions = async () => {
    setLoading(true);
    setError(null);
    try {
      const comps = await judgeCompetitionsApi.listAssigned();
      setCompetitions(Array.isArray(comps) ? comps : []);
      if (comps && comps.length > 0 && !selectedComp) {
        setSelectedComp(comps[0]);
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        setError("Access restricted. Please log in with your verified Judge account.");
      } else {
        setError(err?.message || "Failed to load assigned competitions.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  // Load contestants & enrich with contestant names/avatars and parsed submission files
  const loadContestantsForComp = useCallback(async (compId: string) => {
    setContestantsLoading(true);
    try {
      const [data, lb] = await Promise.all([
        judgeCompetitionsApi.listContestants(compId),
        publicApi.leaderboard(compId).catch(() => ({ leaderboard: [] })),
      ]);

      const lbRows = Array.isArray(lb?.leaderboard) ? lb.leaderboard : [];
      const userMap = new Map<string, { name?: string; profile_photo?: string }>();
      for (const r of lbRows) {
        const em = (r.email || r.participant_id || "").toLowerCase().trim();
        if (em) {
          userMap.set(em, { name: r.name, profile_photo: r.profile_photo });
        }
      }

      const rawList = Array.isArray(data) ? data : [];
      const enriched: JudgeContestant[] = rawList.map((c: any) => {
        const em = (c.user_email || "").toLowerCase().trim();
        const info = userMap.get(em);

        const rawFiles = c.files && typeof c.files === "object" ? c.files : {};
        const parsedFiles = Object.entries(rawFiles).map(([k, v]) => ({ label: k, url: String(v) }));
        const primaryUrl = c.submission_url || parsedFiles[0]?.url || "";

        const emailName = em
          ? em.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
          : "Contestant";
        const finalName = c.user_name || info?.name || emailName;
        const regRef = c.registration_reference || c.registration_number || c.reg_no || "";
        const userPhone = c.user_phone || c.phone || "";

        return {
          ...c,
          user_name: finalName,
          profile_photo: c.profile_photo || info?.profile_photo || "",
          submission_url: primaryUrl,
          parsed_files: parsedFiles,
          registration_reference: regRef,
          registration_number: regRef,
          user_phone: userPhone,
        };
      });

      // Synchronize with public leaderboard participants so ALL enrolled competitors appear in judges panel
      const existingEmails = new Set(
        enriched.map((c) => (c.user_email || "").toLowerCase().trim()).filter(Boolean)
      );

      for (const r of lbRows) {
        const em = (r.email || r.participant_id || "").toLowerCase().trim();
        if (em && !existingEmails.has(em)) {
          existingEmails.add(em);
          const emailName = em
            ? em.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
            : "Contestant";
          const rRef = r.registration_reference || r.registration_number || "";

          enriched.push({
            _id: r.submission_id || `reg_${em}`,
            competition_id: compId,
            user_email: em,
            user_name: r.name || emailName,
            profile_photo: r.profile_photo || "",
            status: r.submission_id ? "Submitted" : "Registered",
            submission_url: "",
            parsed_files: [],
            registration_reference: rRef,
            registration_number: rRef,
            is_scored: Boolean(r.judge_average && r.judge_average > 0),
            has_scored: Boolean(r.judge_average && r.judge_average > 0),
            total_score: r.judge_average,
            my_score: r.judge_average,
          });
        }
      }

      setContestants(enriched);
    } catch (err: any) {
      if (err?.message?.includes("PIN")) {
        setShowPinModal(true);
      }
    } finally {
      setContestantsLoading(false);
    }
  }, []);

  // Load scoreboard (1st, 2nd, 3rd standings) calculated directly from live contestant scores & leaderboard
  const loadScoreboard = useCallback(async (compId: string) => {
    setScoreboardLoading(true);
    try {
      // 1. Fetch public leaderboard for aggregated score data if available
      let lbRows: any[] = [];
      try {
        const lb = await publicApi.leaderboard(compId);
        if (Array.isArray(lb?.leaderboard)) {
          lbRows = lb.leaderboard;
        }
      } catch {
        // Fallback to local state
      }

      // 2. Separate scored and pending contestants
      const scoredList: JudgeContestant[] = [];
      const pendingList: JudgeContestant[] = [];

      for (const c of contestants) {
        const sc = c.my_score ?? c.total_score;
        const isSc = Boolean(c.is_scored || c.has_scored || (sc != null && sc > 0));
        if (isSc && sc != null) {
          scoredList.push({ ...c, total_score: sc, my_score: sc });
        } else {
          pendingList.push(c);
        }
      }

      scoredList.sort((a, b) => (b.my_score ?? b.total_score ?? 0) - (a.my_score ?? a.total_score ?? 0));
      pendingList.sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));

      const standings: JudgeContestant[] = [];
      scoredList.forEach((c, idx) => {
        const prev = idx > 0 ? scoredList[idx - 1] : null;
        const prevScore = prev ? (prev.my_score ?? prev.total_score) : null;
        const currentScore = c.my_score ?? c.total_score;
        const rank = prev && prevScore === currentScore ? (prev.rank ?? idx + 1) : idx + 1;
        standings.push({ ...c, rank });
      });

      pendingList.forEach((c) => {
        standings.push({ ...c, rank: null });
      });

      const podium = {
        first: scoredList[0] || null,
        second: scoredList[1] || null,
        third: scoredList[2] || null,
      };

      setScoreboardData({
        competition_id: compId,
        competition_title: selectedComp?.title || "Competition",
        total_contestants: contestants.length,
        scored_count: scoredList.length,
        pending_count: pendingList.length,
        criteria: selectedComp?.judging_criteria || [],
        podium,
        standings,
      });
    } catch (err: any) {
      console.error("Failed to compute live scoreboard:", err);
    } finally {
      setScoreboardLoading(false);
    }
  }, [contestants, selectedComp]);

  // Load contestants & scoreboard when selected competition changes
  useEffect(() => {
    if (!selectedComp) return;
    setActiveContestant(null);
    loadContestantsForComp(selectedComp._id);
    loadScoreboard(selectedComp._id);
  }, [selectedComp, loadContestantsForComp, loadScoreboard]);

  // Load draft scores when active contestant opens
  useEffect(() => {
    if (!activeContestant || !selectedComp) return;
    setScoreNotice(null);

    // Initialize scores based on criteria
    const defaultScores: Record<string, number> = {};
    const criteria = selectedComp.judging_criteria?.length
      ? selectedComp.judging_criteria
      : [
          { name: "Technical Execution", max_score: 25 },
          { name: "Creativity & Originality", max_score: 25 },
          { name: "Presentation & Style", max_score: 25 },
          { name: "Overall Impact", max_score: 25 },
        ];

    criteria.forEach((c) => {
      defaultScores[c.name] = Math.round(c.max_score * 0.7);
    });

    const isAlreadyScored = Boolean(
      activeContestant.is_scored ||
      activeContestant.has_scored ||
      activeContestant.status === "Scored" ||
      activeContestant.is_locked
    );

    if (isAlreadyScored) {
      if (activeContestant.my_scores && Object.keys(activeContestant.my_scores).length > 0) {
        setScores(activeContestant.my_scores);
      } else {
        setScores(defaultScores);
      }
      setComments(activeContestant.my_comments || "");
      return;
    }

    judgeCompetitionsApi
      .getDraft(selectedComp._id, activeContestant._id)
      .then((draft) => {
        if (draft && draft.scores && Object.keys(draft.scores).length > 0) {
          setScores(draft.scores);
          setComments(draft.comments || "");
        } else {
          setScores(defaultScores);
          setComments("");
        }
      })
      .catch(() => {
        setScores(defaultScores);
        setComments("");
      });
  }, [activeContestant, selectedComp]);

  // Criteria fallback
  const criteriaList: JudgingCriterion[] = useMemo(() => {
    if (selectedComp?.judging_criteria && selectedComp.judging_criteria.length > 0) {
      return selectedComp.judging_criteria;
    }
    return [
      { name: "Technical Execution", max_score: 25, weight: 1.0 },
      { name: "Creativity & Originality", max_score: 25, weight: 1.0 },
      { name: "Presentation & Style", max_score: 25, weight: 1.0 },
      { name: "Overall Impact", max_score: 25, weight: 1.0 },
    ];
  }, [selectedComp]);

  // Calculated weighted total
  const calculatedTotal = useMemo(() => {
    let total = 0;
    criteriaList.forEach((c) => {
      const s = scores[c.name] || 0;
      total += s * (c.weight || 1.0);
    });
    return Math.round(total * 10) / 10;
  }, [scores, criteriaList]);

  const maxPossibleTotal = useMemo(() => {
    return criteriaList.reduce((acc, c) => acc + c.max_score * (c.weight || 1.0), 0);
  }, [criteriaList]);

  // Handle Draft Save
  const handleSaveDraft = async () => {
    if (!selectedComp || !activeContestant) return;
    setSavingDraft(true);
    setScoreNotice(null);
    try {
      await judgeCompetitionsApi.saveDraft(selectedComp._id, activeContestant._id, scores, comments);
      setScoreNotice({ tone: "success", text: "Draft auto-saved successfully." });
    } catch (err: any) {
      setScoreNotice({ tone: "error", text: err?.message || "Failed to save draft." });
    } finally {
      setSavingDraft(false);
    }
  };

  // Handle Official Score Submit
  const handleSubmitScore = async () => {
    if (!activeContestant) return;
    const isAlreadyScored = Boolean(
      activeContestant.is_scored ||
      activeContestant.has_scored ||
      activeContestant.status === "Scored" ||
      activeContestant.is_locked
    );
    if (isAlreadyScored) {
      setScoreNotice({ tone: "error", text: "You have already submitted an official score for this participant in this competition. Each participant can only be scored once." });
      return;
    }

    setSubmittingScore(true);
    setScoreNotice(null);
    try {
      const res = await judgeCompetitionsApi.submitScore(activeContestant._id, scores, comments);
      setScoreNotice({ tone: "success", text: "Official score successfully submitted!" });
      const finalScore = res.total_score ?? calculatedTotal;
      setContestants((prev) =>
        prev.map((c) =>
          c._id === activeContestant._id
            ? {
                ...c,
                is_scored: true,
                has_scored: true,
                is_locked: true,
                status: "Scored",
                my_score: finalScore,
                total_score: finalScore,
                my_scores: scores,
                my_comments: comments,
              }
            : c
        )
      );
      setActiveContestant((prev) =>
        prev
          ? {
              ...prev,
              is_scored: true,
              has_scored: true,
              is_locked: true,
              status: "Scored",
              my_score: finalScore,
              total_score: finalScore,
              my_scores: scores,
              my_comments: comments,
            }
          : null
      );
      setTimeout(() => {
        if (selectedComp) {
          loadContestantsForComp(selectedComp._id);
          loadScoreboard(selectedComp._id);
        }
      }, 1500);
    } catch (err: any) {
      setScoreNotice({ tone: "error", text: err?.message || "Failed to submit score. Verify session PIN or score range." });
    } finally {
      setSubmittingScore(false);
    }
  };

  // Handle Verify Session PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp || !sessionPin.trim()) return;
    setPinVerifying(true);
    setPinError(null);
    try {
      await judgeCompetitionsApi.verifyPin(selectedComp._id, sessionPin.trim());
      setPinVerified(true);
      setShowPinModal(false);
      setSessionPin("");
      // Reload contestants
      loadContestantsForComp(selectedComp._id);
    } catch (err: any) {
      setPinError(err?.message || "Invalid Session PIN. Please ask event coordinators.");
    } finally {
      setPinVerifying(false);
    }
  };

  // Handle COI Skip
  const handleSkipContestant = async () => {
    if (!selectedComp || !activeContestant || !coiReason.trim()) return;
    setSkipping(true);
    try {
      await judgeCompetitionsApi.skipContestant(selectedComp._id, activeContestant._id, coiReason.trim());
      setShowCoiModal(false);
      setCoiReason("");
      setActiveContestant(null);
      loadContestantsForComp(selectedComp._id);
    } catch (err: any) {
      setScoreNotice({ tone: "error", text: err?.message || "Could not skip contestant." });
    } finally {
      setSkipping(false);
    }
  };

  // Filtered Contestants with Search across Name, Email, Title & Registration Reference
  const filteredContestants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contestants.filter((c) => {
      const matchSearch =
        q === "" ||
        (c.user_name || "").toLowerCase().includes(q) ||
        (c.user_email || "").toLowerCase().includes(q) ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.registration_reference || "").toLowerCase().includes(q) ||
        (c.registration_number || "").toLowerCase().includes(q) ||
        (c.reg_no || "").toLowerCase().includes(q);

      const isScored = Boolean(
        c.is_scored || c.has_scored || c.status === "Scored" || c.is_locked
      );

      if (filter === "pending") return matchSearch && !isScored;
      if (filter === "scored") return matchSearch && isScored;
      return matchSearch;
    });
  }, [contestants, search, filter]);

  const totalCount = contestants.length;
  const scoredCount = useMemo(() => {
    return contestants.filter((c) => Boolean(c.is_scored || c.has_scored || c.status === "Scored" || c.is_locked)).length;
  }, [contestants]);
  const pendingCount = totalCount - scoredCount;

  // Active Contestant Stage Queue Positioning (1 of 20, 2 of 20...)
  const currentIndex = activeContestant
    ? filteredContestants.findIndex((c) => c._id === activeContestant._id)
    : -1;
  const prevContestant = currentIndex > 0 ? filteredContestants[currentIndex - 1] : null;
  const nextContestant =
    currentIndex >= 0 && currentIndex < filteredContestants.length - 1
      ? filteredContestants[currentIndex + 1]
      : null;

  // Keyboard Stage Navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeContestant) return;
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "ArrowRight" && nextContestant) {
        setActiveContestant(nextContestant);
      } else if (e.key === "ArrowLeft" && prevContestant) {
        setActiveContestant(prevContestant);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeContestant, nextContestant, prevContestant]);

  const handleLogout = () => {
    tokenStore.clear();
    logout();
    router.replace("/judge/login");
  };

  const isAlreadyScored = Boolean(
    activeContestant?.is_scored ||
    activeContestant?.has_scored ||
    activeContestant?.status === "Scored" ||
    activeContestant?.is_locked
  );

  return (
    <div className="relative min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <Spotlights />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9.5 place-items-center rounded-xl shadow-inner" style={{ background: "var(--grad-brand)" }}>
                <Gavel className="size-4.5 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-[var(--fg)] sm:text-base">Judges Scoring Portal</h1>
                  <Badge tone="brand">Official</Badge>
                </div>
                <p className="text-[11px] font-mono text-[var(--fg-subtle)]">
                  {user?.email || "Authenticated Judge Session"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/leaderboard"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--fg)] transition-all"
              title="Open public leaderboard standings in new tab"
            >
              <Trophy className="size-3.5 text-[var(--accent)]" />
              <span>Live Standings</span>
              <ExternalLink className="size-3 text-[var(--fg-subtle)]" />
            </Link>
            {selectedComp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPinModal(true)}
                className="hidden gap-1.5 sm:inline-flex"
              >
                {pinVerified ? <Unlock className="size-3.5 text-[var(--success)]" /> : <Lock className="size-3.5 text-[var(--accent)]" />}
                <span>Session PIN</span>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-[var(--fg-subtle)] hover:text-[var(--error)]">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <span className="size-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="text-sm text-[var(--fg-muted)]">Loading your assigned competitions…</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-[var(--error)]/30 bg-[color-mix(in_srgb,var(--error)_8%,transparent)] p-8 text-center">
            <AlertCircle className="mx-auto size-10 text-[var(--error)]" />
            <h2 className="mt-4 text-lg font-bold text-[var(--fg)]">Authentication Required</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{error}</p>
            <Button onClick={() => router.push("/judge/login")} className="mt-6" size="md">
              Sign In to Judge Portal
            </Button>
          </div>
        ) : competitions.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center">
            <Trophy className="mx-auto size-12 text-[var(--fg-subtle)]" />
            <h2 className="mt-4 text-lg font-bold text-[var(--fg)]">No Competitions Assigned Yet</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              Your registered email has not been assigned to any live competitions yet. Please contact the Event Coordinators or Administration to receive judging assignments.
            </p>
            <Button onClick={loadCompetitions} variant="outline" size="sm" className="mt-6 gap-2">
              <RefreshCw className="size-4" /> Refresh Assignments
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* ── Competitions Selector Bar ── */}
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Active Assignment</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {competitions.map((c) => {
                    const active = selectedComp?._id === c._id;
                    return (
                      <button
                        key={c._id}
                        onClick={() => setSelectedComp(c)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
                          active
                            ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--fg)] shadow-sm"
                            : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                        )}
                      >
                        <Award className={cn("size-4", active ? "text-[var(--accent)]" : "text-[var(--fg-subtle)]")} />
                        <span>{c.title}</span>
                        {c.category && (
                          <span className="text-[11px] font-normal text-[var(--fg-subtle)]">({c.category})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Competition Status Pill */}
              {selectedComp && (() => {
                const compLifecycle = getCompetitionLifecycle(selectedComp);
                return (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-2.5 backdrop-blur-md">
                    <div className="text-right">
                      <p className="text-[10.5px] uppercase tracking-wider text-[var(--fg-subtle)]">
                        {compLifecycle.isLive
                          ? "Competition Live"
                          : selectedComp.start_date
                          ? `Starts ${formatEventDate(selectedComp.start_date)}`
                          : "Scoring Phase"}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-[var(--fg)]">
                        {compLifecycle.isLive && (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-extrabold uppercase text-[10.5px] tracking-wider">
                            <Radio className="size-3 animate-pulse" /> Live Now
                          </span>
                        )}
                        <span>
                          {selectedComp.judging_status === "CLOSED" ? "Closed" : "Open for Scoring"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        selectedComp.judging_status === "CLOSED"
                          ? "bg-[var(--error)]"
                          : compLifecycle.isLive
                          ? "animate-ping bg-rose-500"
                          : "animate-pulse bg-[var(--success)]"
                      )}
                    />
                  </div>
                );
              })()}
            </section>

            {/* ── Main View Selector Tabs (Evaluation vs Live Scoreboard & Standings) ── */}
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5 shadow-sm">
                <button
                  onClick={() => setActiveTab("evaluate")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200",
                    activeTab === "evaluate"
                      ? "bg-[var(--accent)] text-white shadow-md"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  )}
                >
                  <Gavel className="size-4" />
                  <span>Contestant Evaluation</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    activeTab === "evaluate" ? "bg-white/20 text-white" : "bg-[var(--bg)] text-[var(--fg-subtle)]"
                  )}>
                    {contestants.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("scoreboard");
                    if (selectedComp) loadScoreboard(selectedComp._id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200",
                    activeTab === "scoreboard"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  )}
                >
                  <Trophy className={cn("size-4", activeTab === "scoreboard" ? "text-amber-200" : "text-amber-400")} />
                  <span>Live Scoreboard & Standings</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    activeTab === "scoreboard" ? "bg-black/20 text-amber-100" : "bg-amber-400/10 text-amber-400"
                  )}>
                    1st • 2nd • 3rd
                  </span>
                </button>
              </div>

              {activeTab === "scoreboard" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedComp && loadScoreboard(selectedComp._id)}
                  className="gap-2 self-start sm:self-auto"
                  disabled={scoreboardLoading}
                >
                  <RefreshCw className={cn("size-3.5", scoreboardLoading && "animate-spin")} />
                  <span>Refresh Standings</span>
                </Button>
              )}
            </section>

            {/* ── Scoring Layout: Contestant List + Scoring Drawer ── */}
            {activeTab === "evaluate" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Contestant List Column */}
              <div className={cn("flex flex-col gap-4", activeContestant ? "lg:col-span-5" : "lg:col-span-12")}>
                {/* Search & Filters */}
                <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search contestant by name, CRG ref, email or title…"
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-10 pr-8 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills: All, Pending, Scored */}
                  <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1">
                    <button
                      onClick={() => setFilter("all")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                        filter === "all" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      )}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setFilter("pending")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                        filter === "pending" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      )}
                    >
                      Pending ({pendingCount})
                    </button>
                    <button
                      onClick={() => setFilter("scored")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                        filter === "scored" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      )}
                    >
                      Scored ({scoredCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => selectedComp && loadContestantsForComp(selectedComp._id)}>
                      <RefreshCw className={cn("size-3.5", contestantsLoading && "animate-spin")} />
                    </Button>
                  </div>
                </div>

                {/* Stage Participation Queue Banner (1 of 20, 2 of 20...) */}
                {filteredContestants.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--bg-elevated)] via-[color-mix(in_srgb,var(--accent)_6%,var(--bg-elevated))] to-[var(--bg-elevated)] p-3.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] font-mono font-bold text-xs">
                        {currentIndex >= 0 ? `#${currentIndex + 1}` : "Stage"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                          {activeContestant ? `Contestant ${currentIndex + 1} of ${filteredContestants.length} on Stage` : `Stage Queue (${filteredContestants.length} Contestants)`}
                        </p>
                        <p className="text-xs font-bold text-[var(--fg)] truncate">
                          {activeContestant ? (activeContestant.user_name || activeContestant.user_email) : "Select Contestant #1 to begin evaluating in order"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!activeContestant ? (
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => setActiveContestant(filteredContestants[0])}
                          className="gap-1.5 text-xs font-bold"
                        >
                          <span>Start Queue (#1)</span>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!prevContestant}
                            onClick={() => {
                              if (prevContestant) setActiveContestant(prevContestant);
                            }}
                            className="gap-1 text-xs"
                          >
                            <ChevronLeft className="size-3" /> Prev
                          </Button>
                          <Button
                            size="sm"
                            variant="accent"
                            disabled={!nextContestant}
                            onClick={() => {
                              if (nextContestant) setActiveContestant(nextContestant);
                            }}
                            className="gap-1 text-xs font-bold"
                          >
                            Next <ChevronRight className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contestants Cards */}
                {contestantsLoading ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                    <span className="size-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    <p className="text-xs text-[var(--fg-muted)]">Loading submissions…</p>
                  </div>
                ) : filteredContestants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-8 text-center">
                    <p className="text-sm text-[var(--fg-muted)]">No approved contestants match your criteria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {filteredContestants.map((c, index) => {
                      const isSelected = activeContestant?._id === c._id;
                      const hasVideo = c.submission_url && getYouTubeEmbedUrl(c.submission_url);
                      const hasAudio = c.submission_url && isAudio(c.submission_url);
                      const isScored = Boolean(
                        c.is_scored || c.has_scored || c.status === "Scored" || c.is_locked
                      );
                      return (
                        <motion.div
                          key={c._id}
                          layout
                          onClick={() => setActiveContestant(c)}
                          className={cn(
                            "group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200",
                            isSelected
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-elevated))] shadow-lg ring-1 ring-[var(--accent)]/50"
                              : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                          )}
                        >
                          <div className="flex items-start gap-3.5">
                            {/* Contestant Avatar */}
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                              <img
                                src={imageFor(c.profile_photo, 1)}
                                alt=""
                                className="size-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="rounded bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.2 font-mono text-[10px] font-bold text-[var(--fg-muted)]">
                                      #{index + 1}
                                    </span>
                                    <h3 className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors truncate">
                                      {c.user_name || "Contestant Entry"}
                                    </h3>
                                    {(c.registration_reference || c.registration_number || c.reg_no) && (
                                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
                                        {c.registration_reference || c.registration_number || c.reg_no}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11.5px] text-[var(--fg-subtle)] truncate">
                                    {c.user_email}
                                  </p>
                                </div>
                                <Badge tone={isScored ? "success" : isSelected ? "brand" : "neutral"} className="shrink-0 text-[10.5px]">
                                  {isScored ? "Scored" : c.status || "Submitted"}
                                </Badge>
                              </div>

                              {/* Performance type tag */}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {hasVideo && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                                    <Video className="size-2.5" /> YouTube Video
                                  </span>
                                )}
                                {hasAudio && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                    <Music className="size-2.5" /> MP3 Audio
                                  </span>
                                )}
                                {c.parsed_files && c.parsed_files.length > 0 && !hasVideo && !hasAudio && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                                    <FileText className="size-2.5" /> {c.parsed_files.length} {c.parsed_files.length === 1 ? "file" : "files"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)]/60 pt-3 text-[11px] text-[var(--fg-subtle)]">
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3" />
                              {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : "Active Round"}
                            </span>
                            {isScored ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                                <CheckCircle2 className="size-3.5 text-emerald-400" />
                                {c.my_score != null || c.total_score != null ? `${c.my_score ?? c.total_score} pts` : "Scored"}
                                <span className="text-[10px] text-[var(--fg-subtle)] font-normal">View</span>
                                <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
                                Score <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Scoring Panel Column */}
              <AnimatePresence mode="wait">
                {activeContestant && (
                  <motion.div
                    key={activeContestant._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="flex flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-2xl lg:col-span-7"
                  >
                    {/* Panel Header with User Profile Spotlight */}
                    <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--surface-2)] shadow-md">
                          <img
                            src={imageFor(activeContestant.profile_photo, 1)}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                              Contestant Under Evaluation
                            </span>
                            {(activeContestant.registration_reference || activeContestant.registration_number || activeContestant.reg_no) && (
                              <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
                                {activeContestant.registration_reference || activeContestant.registration_number || activeContestant.reg_no}
                              </span>
                            )}
                          </div>
                          <h2 className="mt-0.5 text-base font-bold text-[var(--fg)] sm:text-lg">
                            {activeContestant.user_name || activeContestant.user_email}
                          </h2>
                          <p className="text-xs text-[var(--fg-subtle)]">
                            {activeContestant.user_email}
                            {activeContestant.user_phone ? ` • ${activeContestant.user_phone}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Prev / Next Contestant Stepper */}
                        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1">
                          <button
                            type="button"
                            disabled={!prevContestant}
                            onClick={() => prevContestant && setActiveContestant(prevContestant)}
                            className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Previous Contestant"
                          >
                            <ChevronLeft className="size-4" />
                          </button>

                          <span className="px-2 text-[11px] font-mono font-bold text-[var(--fg-subtle)] whitespace-nowrap">
                            {currentIndex + 1} / {filteredContestants.length}
                          </span>

                          <button
                            type="button"
                            disabled={!nextContestant}
                            onClick={() => nextContestant && setActiveContestant(nextContestant)}
                            className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Next Contestant"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>

                        {activeContestant.submission_url && (
                          <a
                            href={activeContestant.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                          >
                            <ExternalLink className="size-3" /> View Entry
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveContestant(null)}
                          className="size-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>

                    {/* Performance Submission Media Viewer */}
                    {activeContestant.submission_url && (
                      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/80 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)] flex items-center gap-1.5">
                            <Award className="size-3.5 text-[var(--accent)]" /> Submitted Performance
                          </span>
                          <a
                            href={activeContestant.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                          >
                            Open raw link <ExternalLink className="size-3" />
                          </a>
                        </div>

                        {/* YouTube Player */}
                        {getYouTubeEmbedUrl(activeContestant.submission_url) ? (
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black shadow-md">
                            <iframe
                              src={getYouTubeEmbedUrl(activeContestant.submission_url)!}
                              title="Contestant Performance Video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="size-full border-0"
                            />
                          </div>
                        ) : isAudio(activeContestant.submission_url) ? (
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                            <audio controls className="w-full" src={activeContestant.submission_url}>
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        ) : null}

                        {/* Other Parsed Files */}
                        {activeContestant.parsed_files && activeContestant.parsed_files.length > 1 && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]/60">
                            <span className="text-[11px] font-semibold text-[var(--fg-subtle)]">Attached Submissions:</span>
                            <div className="flex flex-wrap gap-2">
                              {activeContestant.parsed_files.map((f, i) => (
                                <a
                                  key={i}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-strong)] transition-colors"
                                >
                                  <FileText className="size-3 text-[var(--accent)]" /> {f.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Awaiting Media Upload Notice (When contestant has enrolled/registered but has not submitted files yet) */}
                    {!activeContestant.submission_url && (!activeContestant.parsed_files || activeContestant.parsed_files.length === 0) && (
                      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs text-amber-300 shadow-sm">
                        <AlertCircle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-amber-200">Awaiting Performance Media</p>
                          <p className="mt-1 text-amber-300/80 leading-relaxed">
                            This contestant is officially registered in this competition, but has not yet uploaded their performance audition (YouTube link or MP3 audio).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Locked / Already Scored Official Banner */}
                    {isAlreadyScored && (
                      <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-emerald-300 shadow-md">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-emerald-200">Official Score Submitted &amp; Finalized</span>
                            <span className="rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-[10.5px] font-black text-emerald-300">
                              Total: {activeContestant.my_score ?? activeContestant.total_score ?? calculatedTotal} pts
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-emerald-300/80">
                            You have already submitted your official score for this participant. Re-scoring is disabled to ensure fairness.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notice & Next Contestant Fast-Action */}
                    {scoreNotice && (
                      <div
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 text-xs font-semibold shadow-sm",
                          scoreNotice.tone === "success"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-[var(--error)]/30 bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error)]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {scoreNotice.tone === "success" ? (
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="size-4 text-[var(--error)] shrink-0" />
                          )}
                          <span>{scoreNotice.text}</span>
                        </div>

                        {scoreNotice.tone === "success" && nextContestant && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setActiveContestant(nextContestant);
                              setScoreNotice(null);
                            }}
                            className="gap-1.5 self-start sm:self-auto shrink-0 bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-md"
                          >
                            <span>Score Next Contestant (#{currentIndex + 2})</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Criteria Scoring Inputs */}
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                          Evaluation Criteria {isAlreadyScored && "(Read-Only)"}
                        </span>
                        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg)] px-3 py-1.5 border border-[var(--border)]">
                          <span className="text-xs text-[var(--fg-subtle)]">Total:</span>
                          <span className="text-base font-black text-[var(--accent)]">
                            {isAlreadyScored ? (activeContestant.my_score ?? activeContestant.total_score ?? calculatedTotal) : calculatedTotal}
                          </span>
                          <span className="text-xs text-[var(--fg-subtle)]">/ {maxPossibleTotal}</span>
                        </div>
                      </div>

                      {criteriaList.map((crit) => {
                        const currentVal = scores[crit.name] ?? 0;
                        return (
                          <div
                            key={crit.name}
                            className={cn(
                              "flex flex-col gap-2 rounded-2xl border p-4 transition-colors",
                              isAlreadyScored
                                ? "border-emerald-500/20 bg-[var(--bg)]/40"
                                : "border-[var(--border)] bg-[var(--bg)]/70"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-[var(--fg)]">{crit.name}</h4>
                                {crit.description && (
                                  <p className="text-[11px] text-[var(--fg-subtle)]">{crit.description}</p>
                                )}
                              </div>
                              <span className={cn("font-mono text-sm font-bold", isAlreadyScored ? "text-emerald-400" : "text-[var(--accent)]")}>
                                {currentVal} / {crit.max_score}
                              </span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={crit.max_score}
                              step={1}
                              value={currentVal}
                              disabled={isAlreadyScored}
                              onChange={(e) =>
                                !isAlreadyScored &&
                                setScores((prev) => ({
                                  ...prev,
                                  [crit.name]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className={cn(
                                "h-2 w-full appearance-none rounded-lg",
                                isAlreadyScored
                                  ? "cursor-not-allowed bg-[var(--border)] opacity-60 accent-emerald-500"
                                  : "cursor-pointer bg-[var(--border-strong)] accent-[var(--accent)]"
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback / Comments */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Judges Feedback &amp; Comments {isAlreadyScored && "(Submitted)"}
                      </label>
                      <textarea
                        rows={3}
                        value={comments}
                        disabled={isAlreadyScored}
                        onChange={(e) => !isAlreadyScored && setComments(e.target.value)}
                        placeholder={isAlreadyScored ? "No comments submitted." : "Constructive feedback for the participant…"}
                        className={cn(
                          "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none",
                          isAlreadyScored && "cursor-not-allowed opacity-75 bg-[var(--surface-2)]/60"
                        )}
                      />
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                      {isAlreadyScored ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="size-4" /> Score Recorded ({activeContestant.my_score ?? activeContestant.total_score ?? calculatedTotal} pts)
                          </span>
                          <div className="flex items-center gap-2">
                            {prevContestant && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveContestant(prevContestant)}
                                className="gap-1 text-xs"
                              >
                                <ChevronLeft className="size-3" /> Prev (#{currentIndex})
                              </Button>
                            )}
                            {nextContestant && (
                              <Button
                                type="button"
                                variant="accent"
                                size="sm"
                                onClick={() => setActiveContestant(nextContestant)}
                                className="gap-1 text-xs font-bold"
                              >
                                Next (#{currentIndex + 2}) <ChevronRight className="size-3" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveContestant(null)}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCoiModal(true)}
                            className="gap-1.5 text-[var(--fg-subtle)] hover:text-[var(--error)]"
                          >
                            <SkipForward className="size-4" /> Declare COI / Skip
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              loading={savingDraft}
                              onClick={handleSaveDraft}
                              className="gap-1.5"
                            >
                              <Save className="size-4" /> Save Draft
                            </Button>

                            <Button
                              type="button"
                              variant="primary"
                              size="md"
                              loading={submittingScore}
                              onClick={handleSubmitScore}
                              className="gap-1.5"
                            >
                              <Send className="size-4" /> Submit Official Score
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* ── Scoreboard & Standings View (1st, 2nd, 3rd) ── */}
            {activeTab === "scoreboard" && (
              <div className="flex flex-col gap-8">
                {/* Scoreboard Header & Overview Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                      Total Contestants
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[var(--fg)]">
                        {scoreboardData?.total_contestants ?? totalCount}
                      </span>
                      <span className="text-xs text-[var(--fg-subtle)]">enrolled</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Evaluated & Scored
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {scoreboardData?.scored_count ?? scoredCount}
                      </span>
                      <span className="text-xs text-emerald-500/80">contestants</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Pending Evaluation
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400">
                        {scoreboardData?.pending_count ?? pendingCount}
                      </span>
                      <span className="text-xs text-amber-500/80">remaining</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Leading Score
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-amber-400">
                          {scoreboardData?.podium?.first?.my_score ?? scoreboardData?.podium?.first?.total_score ?? "—"}
                        </span>
                        {scoreboardData?.podium?.first && <span className="text-xs text-[var(--fg-subtle)]">pts</span>}
                      </div>
                    </div>
                    <Trophy className="size-8 text-amber-400/80" />
                  </div>
                </div>

                {/* ── 3-Tier Podium (Top 3: 1st Gold, 2nd Silver, 3rd Bronze) ── */}
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 p-6 sm:p-8 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="size-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-[var(--fg)]">Live Podium Standings</h2>
                      </div>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                        Real-time top rankings based on official points awarded by judges.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-400">
                      <Crown className="size-3.5" /> 1st • 2nd • 3rd Place
                    </span>
                  </div>

                  {scoreboardLoading ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                      <span className="size-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <p className="text-xs text-[var(--fg-muted)]">Calculating live podium standings…</p>
                    </div>
                  ) : !scoreboardData?.podium?.first ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Award className="size-12 text-[var(--fg-subtle)] mb-3" />
                      <h3 className="text-base font-bold text-[var(--fg)]">No Contestants Scored Yet</h3>
                      <p className="mt-1 max-w-md text-xs text-[var(--fg-muted)]">
                        As soon as you evaluate contestants and award points, the live 1st, 2nd, and 3rd place podium will appear here automatically.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("evaluate")}
                        className="mt-4 gap-2"
                      >
                        <Gavel className="size-3.5" /> Start Evaluating Contestants
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
                      {/* 2nd Place (Silver) */}
                      <div className="order-2 md:order-1 rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-400/10 via-[var(--bg-elevated)] to-[var(--bg)] p-5 text-center shadow-lg relative flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-300/15 border border-slate-300/30 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
                          🥈 2nd Place (Silver)
                        </span>
                        <div className="relative mt-3 size-16 overflow-hidden rounded-full border-2 border-slate-300 bg-[var(--surface-2)] shadow-md">
                          <img
                            src={imageFor(scoreboardData.podium.second?.profile_photo, 1)}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-[var(--fg)] truncate max-w-full">
                          {scoreboardData.podium.second?.user_name || "Runner-Up"}
                        </h3>
                        {scoreboardData.podium.second?.registration_reference && (
                          <span className="mt-0.5 rounded bg-slate-400/15 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                            {scoreboardData.podium.second.registration_reference}
                          </span>
                        )}
                        <div className="mt-3 rounded-xl bg-slate-300/10 border border-slate-300/20 px-3 py-1.5">
                          <span className="text-xl font-black text-slate-200">
                            {scoreboardData.podium.second?.my_score ?? scoreboardData.podium.second?.total_score ?? "—"}
                          </span>
                          <span className="ml-1 text-xs text-slate-400">pts</span>
                        </div>
                      </div>

                      {/* 1st Place (Gold Champion) */}
                      <div className="order-1 md:order-2 rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/20 via-[var(--bg-elevated)] to-[var(--bg)] p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.2)] relative flex flex-col items-center md:-translate-y-2">
                        <div className="absolute -top-3.5 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                          <Crown className="size-3.5" /> 1st Place Champion
                        </div>
                        <div className="relative mt-2 size-20 overflow-hidden rounded-full border-3 border-amber-400 bg-[var(--surface-2)] shadow-lg ring-4 ring-amber-400/20">
                          <img
                            src={imageFor(scoreboardData.podium.first?.profile_photo, 1)}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <h3 className="mt-2.5 text-base font-extrabold text-[var(--fg)] truncate max-w-full">
                          {scoreboardData.podium.first?.user_name || "Winner"}
                        </h3>
                        {scoreboardData.podium.first?.registration_reference && (
                          <span className="mt-0.5 rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 border border-amber-400/30">
                            {scoreboardData.podium.first.registration_reference}
                          </span>
                        )}
                        <div className="mt-3 rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2">
                          <span className="text-2xl font-black text-amber-400">
                            {scoreboardData.podium.first?.my_score ?? scoreboardData.podium.first?.total_score ?? "—"}
                          </span>
                          <span className="ml-1 text-xs font-bold text-amber-300/80">pts</span>
                        </div>
                      </div>

                      {/* 3rd Place (Bronze) */}
                      <div className="order-3 md:order-3 rounded-2xl border border-amber-700/30 bg-gradient-to-b from-amber-700/10 via-[var(--bg-elevated)] to-[var(--bg)] p-5 text-center shadow-lg relative flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-700/15 border border-amber-700/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-500">
                          🥉 3rd Place (Bronze)
                        </span>
                        <div className="relative mt-3 size-16 overflow-hidden rounded-full border-2 border-amber-700 bg-[var(--surface-2)] shadow-md">
                          <img
                            src={imageFor(scoreboardData.podium.third?.profile_photo, 1)}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-[var(--fg)] truncate max-w-full">
                          {scoreboardData.podium.third?.user_name || "3rd Position"}
                        </h3>
                        {scoreboardData.podium.third?.registration_reference && (
                          <span className="mt-0.5 rounded bg-amber-700/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-600">
                            {scoreboardData.podium.third.registration_reference}
                          </span>
                        )}
                        <div className="mt-3 rounded-xl bg-amber-700/10 border border-amber-700/20 px-3 py-1.5">
                          <span className="text-xl font-black text-amber-600">
                            {scoreboardData.podium.third?.my_score ?? scoreboardData.podium.third?.total_score ?? "—"}
                          </span>
                          <span className="ml-1 text-xs text-amber-700">pts</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Complete Ranked Standings Table ── */}
                <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-[var(--fg)]">Complete Contestant Standings</h3>
                      <p className="text-xs text-[var(--fg-subtle)]">
                        All enrolled contestants ranked by points with criteria-by-criteria breakdown.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--fg-subtle)]">
                        {(scoreboardData?.standings ?? contestants).length} Contestants Total
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                          <th className="pb-3 pl-3 pr-2">Rank</th>
                          <th className="pb-3 px-3">Contestant</th>
                          <th className="pb-3 px-3">Reg Ref #</th>
                          <th className="pb-3 px-3">Criteria Breakdown</th>
                          <th className="pb-3 px-3 text-right">Total Points</th>
                          <th className="pb-3 px-3">Feedback / Notes</th>
                          <th className="pb-3 pr-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]/60">
                        {(scoreboardData?.standings ?? contestants).map((c, index) => {
                          const rank = c.rank ?? (c.is_scored ? index + 1 : null);
                          const scoreVal = c.my_score ?? c.total_score;
                          const hasScore = Boolean(c.is_scored || c.has_scored || scoreVal != null);
                          const scoresMap = c.my_scores || c.scores || {};

                          return (
                            <tr
                              key={c._id || index}
                              className="hover:bg-[var(--bg-subtle)] transition-colors group"
                            >
                              {/* Rank Badge */}
                              <td className="py-3.5 pl-3 pr-2 whitespace-nowrap">
                                {rank === 1 ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2.5 py-1 text-xs font-black text-amber-400 border border-amber-400/30">
                                    🥇 #1
                                  </span>
                                ) : rank === 2 ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-300/20 px-2.5 py-1 text-xs font-black text-slate-300 border border-slate-300/30">
                                    🥈 #2
                                  </span>
                                ) : rank === 3 ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-700/20 px-2.5 py-1 text-xs font-black text-amber-600 border border-amber-700/30">
                                    🥉 #3
                                  </span>
                                ) : rank ? (
                                  <span className="inline-flex items-center rounded-lg bg-[var(--bg)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--fg-muted)] border border-[var(--border)]">
                                    #{rank}
                                  </span>
                                ) : (
                                  <span className="text-[var(--fg-subtle)] font-mono pl-2">—</span>
                                )}
                              </td>

                              {/* Contestant Profile */}
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="size-9 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                                    <img
                                      src={imageFor(c.profile_photo, 1)}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-[var(--fg)] truncate group-hover:text-[var(--accent)] transition-colors">
                                      {c.user_name || "Contestant"}
                                    </p>
                                    <p className="text-[11px] text-[var(--fg-subtle)] truncate">
                                      {c.user_email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Reg Ref # */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {c.registration_reference || c.registration_number || c.reg_no ? (
                                  <span className="rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400">
                                    {c.registration_reference || c.registration_number || c.reg_no}
                                  </span>
                                ) : (
                                  <span className="text-[var(--fg-subtle)]">—</span>
                                )}
                              </td>

                              {/* Criteria Breakdown */}
                              <td className="py-3.5 px-3">
                                {hasScore && Object.keys(scoresMap).length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                    {Object.entries(scoresMap).map(([crit, pts]) => (
                                      <span
                                        key={crit}
                                        className="inline-flex items-center gap-1 rounded-md bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--fg-muted)]"
                                      >
                                        <span className="font-medium text-[var(--fg-subtle)]">{crit}:</span>
                                        <span className="font-bold text-[var(--fg)]">{pts}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] italic text-[var(--fg-subtle)]">
                                    Pending Evaluation
                                  </span>
                                )}
                              </td>

                              {/* Total Points */}
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                {hasScore ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 font-mono text-sm font-black text-emerald-400">
                                    {scoreVal} <span className="text-[10px] font-normal text-emerald-500/70">pts</span>
                                  </span>
                                ) : (
                                  <Badge tone="neutral" className="text-[10.5px]">Pending</Badge>
                                )}
                              </td>

                              {/* Comments / Notes */}
                              <td className="py-3.5 px-3 max-w-[200px]">
                                {c.my_comments || c.comments ? (
                                  <p className="text-[11px] text-[var(--fg-muted)] italic truncate" title={c.my_comments || c.comments}>
                                    "{c.my_comments || c.comments}"
                                  </p>
                                ) : (
                                  <span className="text-[var(--fg-subtle)]">—</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 pr-3 text-right whitespace-nowrap">
                                <Button
                                  variant={hasScore ? "outline" : "accent"}
                                  size="sm"
                                  onClick={() => {
                                    setActiveContestant(c);
                                    setActiveTab("evaluate");
                                  }}
                                  className="gap-1 text-xs"
                                >
                                  {hasScore ? (
                                    <>View Score <ChevronRight className="size-3" /></>
                                  ) : (
                                    <>Score Now <ChevronRight className="size-3" /></>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Session PIN Modal ── */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
                  <Lock className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--fg)]">Unlock Live Judging Session</h3>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Enter the session PIN provided by stage coordinators.
                  </p>
                </div>
              </div>

              {pinError && (
                <div className="mt-4 rounded-xl border border-[var(--error)]/30 bg-[color-mix(in_srgb,var(--error)_8%,transparent)] p-3 text-xs text-[var(--error)]">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="mt-5 flex flex-col gap-4">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={sessionPin}
                  onChange={(e) => setSessionPin(e.target.value)}
                  placeholder="PIN code (e.g. 1234)"
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] text-center font-mono text-xl tracking-[0.4em] text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
                  autoFocus
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPinModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="md" loading={pinVerifying}>
                    Verify & Unlock
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COI Modal ── */}
      <AnimatePresence>
        {showCoiModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-2xl"
            >
              <h3 className="text-base font-bold text-[var(--fg)]">Conflict of Interest (COI)</h3>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                If you personally know or mentor this contestant, state your reason to excuse yourself from scoring this entry.
              </p>

              <textarea
                rows={3}
                value={coiReason}
                onChange={(e) => setCoiReason(e.target.value)}
                placeholder="Reason for skipping (e.g., student of my academy, relative, etc.)"
                className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
              />

              <div className="mt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCoiModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  loading={skipping}
                  onClick={handleSkipContestant}
                  disabled={!coiReason.trim()}
                  className="bg-[var(--error)] hover:bg-[var(--error)]/90"
                >
                  Confirm COI Skip
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
