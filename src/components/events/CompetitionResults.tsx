"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Crown, Medal, ArrowLeft, Download, Award, Star,
  Search, MessageSquare, Volume2, CheckCircle2, AlertCircle,
  ExternalLink, Sparkles, UserCheck, ShieldCheck, Flame, Loader2, Play, Pause, Layers
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Badge } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
import { publicApi, certificatesApi, profileApi } from "@/lib/api";
import { imageFor, formatEventDate } from "@/lib/utils";

type LeaderboardEntry = {
  rank?: number;
  participant_id?: string;
  user_email?: string;
  email?: string;
  name?: string;
  profile_photo?: string;
  final_score?: number;
  raw_audience_votes?: number;
  audience_votes?: number;
  normalized_audience_score?: number;
  raw_judge_score?: number;
  judge_score?: number;
  normalized_judge_score?: number;
  ranking_mode?: string;
  submission_id?: string;
  category?: string;
};

type ResultSnapshot = {
  _id?: string;
  competition_id?: string;
  calculated_at?: string;
  ranking_mode?: string;
  is_approved?: boolean;
  is_published?: boolean;
  category?: string;
  categories?: string[];
  category_leaderboards?: Record<string, LeaderboardEntry[]>;
  leaderboard?: LeaderboardEntry[];
};

type JudgeFeedback = {
  _id?: string;
  competition_id?: string;
  submission_id?: string;
  judge_email?: string;
  feedback_text?: string;
  audio_feedback_url?: string;
  created_at?: string;
};

const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));
const handle = (r: LeaderboardEntry) =>
  "@" + ((r.email || r.participant_id || r.user_email || r.name || "player").split("@")[0].replace(/\s+/g, "_").toLowerCase());

export default function CompetitionResults({
  compId,
  comp,
  initialSnapshot,
}: {
  compId: string;
  comp: any;
  initialSnapshot: ResultSnapshot | null;
}) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ResultSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [userSubmission, setUserSubmission] = useState<{
    submission_id?: string;
    registration_reference?: string;
    rank?: number;
    score?: number;
  } | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<JudgeFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [myCert, setMyCert] = useState<any | null>(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const [roundsData, setRoundsData] = useState<any | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  useEffect(() => {
    publicApi.rounds(compId)
      .then((rd) => {
        setRoundsData(rd);
        if (rd && Array.isArray(rd.rounds) && rd.rounds.length > 1) {
          setSelectedRound(rd.total_rounds ?? rd.rounds.length);
        }
      })
      .catch(() => setRoundsData(null));
  }, [compId]);

  const handleSelectRound = async (rNum: number) => {
    setSelectedRound(rNum);
    setLoading(true);
    try {
      const data = await publicApi.roundLeaderboard(compId, rNum);
      if (data) {
        setSnapshot((prev) => ({
          ...prev,
          category: data.category,
          categories: data.categories || prev?.categories,
          category_leaderboards: data.category_leaderboards || prev?.category_leaderboards,
          leaderboard: data.leaderboard || [],
        }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Load snapshot if missing
  useEffect(() => {
    if (!initialSnapshot) {
      setLoading(true);
      publicApi
        .results(compId)
        .then((data) => setSnapshot(data))
        .catch(() => setSnapshot(null))
        .finally(() => setLoading(false));
    }
  }, [compId, initialSnapshot]);

  // Check current user's enrollment/submission/certificate
  useEffect(() => {
    if (!user) return;
    profileApi
      .dashboard()
      .then((dash) => {
        const myComps = Array.isArray(dash?.my_competitions) ? dash.my_competitions : [];
        const match = myComps.find(
          (c: any) =>
            String(c.competition_id || c._id || c.activity_id) === String(compId) ||
            String(c.title || c.name || "").toLowerCase().trim() ===
              String(comp.title || comp.name || "").toLowerCase().trim()
        );
        if (match) {
          setUserSubmission({
            submission_id: match.submission_id,
            registration_reference: match.registration_reference,
            rank: match.rank,
            score: match.score,
          });

          // Fetch feedbacks if contestant has a submission_id
          if (match.submission_id) {
            setFeedbackLoading(true);
            publicApi
              .contestantFeedbacks(compId, match.submission_id)
              .then((fbs) => setMyFeedbacks(Array.isArray(fbs) ? fbs : []))
              .catch(() => setMyFeedbacks([]))
              .finally(() => setFeedbackLoading(false));
          }
        }
      })
      .catch(() => {});

    // Check certificate
    certificatesApi
      .myCertificates({ activity_id: compId })
      .then((res) => {
        const certList = res?.certificates || (Array.isArray(res) ? res : []);
        if (certList.length > 0) {
          setMyCert(certList[0]);
        }
      })
      .catch(() => {});
  }, [user, compId, comp.title, comp.name]);

  // Audio player toggle
  function toggleAudio(url: string) {
    if (activeAudioUrl === url && audioPlaying) {
      audioEl?.pause();
      setAudioPlaying(false);
    } else {
      if (audioEl) {
        audioEl.pause();
      }
      const audio = new Audio(url);
      audio.onended = () => setAudioPlaying(false);
      audio.onerror = () => setAudioPlaying(false);
      audio.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
      setAudioEl(audio);
      setActiveAudioUrl(url);
    }
  }

  async function downloadCertificate() {
    if (!myCert) return;
    const certId = myCert.certificate_id || myCert.id || myCert._id;
    setCertDownloading(true);
    try {
      const blob = await certificatesApi.downloadPdf(certId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${(comp.title || "Competition").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not download certificate. Please check your dashboard.");
    } finally {
      setCertDownloading(false);
    }
  }

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(snapshot?.categories)) {
      for (const c of snapshot.categories) {
        if (c && typeof c === "string" && c.trim()) set.add(c.trim());
      }
    }
    if (snapshot?.category_leaderboards && typeof snapshot.category_leaderboards === "object") {
      for (const k of Object.keys(snapshot.category_leaderboards)) {
        if (k && k.trim()) set.add(k.trim());
      }
    }
    if (Array.isArray(snapshot?.leaderboard)) {
      for (const r of snapshot.leaderboard) {
        if (r.category && typeof r.category === "string" && r.category.trim()) {
          set.add(r.category.trim());
        }
      }
    }
    const compCats = comp?.categories;
    if (Array.isArray(compCats)) {
      for (const c of compCats) {
        const name = typeof c === "string" ? c : c?.name;
        if (name && typeof name === "string" && name.trim()) set.add(name.trim());
      }
    }
    return Array.from(set);
  }, [snapshot, comp]);

  const rawLeaderboard = useMemo(() => {
    return Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [];
  }, [snapshot]);

  const leaderboard = useMemo(() => {
    if (activeCategory === "ALL") return rawLeaderboard;

    const precalc = snapshot?.category_leaderboards?.[activeCategory];
    if (Array.isArray(precalc) && precalc.length > 0) return precalc;

    const filteredList = rawLeaderboard.filter(
      (r) => (r.category || "").trim().toLowerCase() === activeCategory.trim().toLowerCase()
    );
    filteredList.sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
    return filteredList.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [rawLeaderboard, snapshot, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of availableCategories) {
      const precalc = snapshot?.category_leaderboards?.[cat];
      if (Array.isArray(precalc)) {
        counts[cat] = precalc.length;
      } else {
        counts[cat] = rawLeaderboard.filter(
          (r) => (r.category || "").trim().toLowerCase() === cat.trim().toLowerCase()
        ).length;
      }
    }
    return counts;
  }, [availableCategories, snapshot, rawLeaderboard]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leaderboard;
    const q = search.toLowerCase();
    return leaderboard.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.participant_id || "").toLowerCase().includes(q) ||
        (r.user_email || "").toLowerCase().includes(q)
    );
  }, [leaderboard, search]);

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  // Check if current user is in leaderboard
  const myLeaderboardEntry = useMemo(() => {
    if (!user) return null;
    return leaderboard.find(
      (r) =>
        r.participant_id === user.email ||
        r.user_email === user.email ||
        r.email === user.email
    );
  }, [leaderboard, user]);

  if (loading) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[var(--accent)]" />
        <p className="mt-4 text-sm text-[var(--fg-muted)]">Loading official results…</p>
      </div>
    );
  }

  if (!snapshot || !snapshot.is_published) {
    return (
      <div className="container-x py-20 text-center">
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 md:p-12 shadow-2xl">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Trophy className="size-8" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold">Results Pending Publication</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            The official rankings and scores for <strong className="text-[var(--fg)]">{comp.title || "this competition"}</strong> are currently being reviewed and finalized by the judging panel.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={`/competitions/${compId}`}
              className="inline-flex items-center gap-2 rounded-full py-2.5 px-5 text-xs font-bold text-[var(--on-accent)]"
              style={{ background: "var(--grad-brand)" }}
            >
              <ArrowLeft className="size-3.5" /> Back to Competition
            </Link>
            <Link
              href={`/leaderboard?competition=${compId}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] py-2.5 px-5 text-xs font-semibold hover:border-[var(--border-strong)] transition-colors"
            >
              View Provisional Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pb-24 pt-8">
      {/* ── Breadcrumb & Back ── */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/competitions/${compId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          <ArrowLeft className="size-3.5" /> Back to competition details
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
          <CheckCircle2 className="size-3.5" /> Official Final Results
        </span>
      </div>

      {/* ── Hero / Header ── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-10 shadow-xl" style={{ background: "var(--grad-surface), var(--surface)" }}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
              <Trophy className="size-3" /> Certified Leaderboard
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold md:text-4xl">
              {comp.title || comp.name || "Competition"} Results
            </h1>
            <p className="mt-2 text-xs text-[var(--fg-muted)] md:text-sm">
              Published: {snapshot.calculated_at ? formatEventDate(snapshot.calculated_at) : "Official Release"} · Mode:{" "}
              <span className="font-semibold text-[var(--fg)]">
                {(snapshot.ranking_mode || "Combined").replace(/_/g, " ")}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {comp.prize && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-right">
                <span className="text-[11px] font-medium text-[var(--fg-muted)]">Prize Awarded</span>
                <p className="font-display text-lg font-bold text-[var(--accent)]">{comp.prize}</p>
              </div>
            )}
            {myCert && (
              <button
                onClick={downloadCertificate}
                disabled={certDownloading}
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold text-[var(--on-accent)] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                style={{ background: "var(--grad-brand)" }}
              >
                {certDownloading ? <Loader2 className="size-4 animate-spin" /> : <Award className="size-4" />}
                Download Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Current Participant Spotlight (If user competed) ── */}
      {user && (myLeaderboardEntry || userSubmission) && (
        <Reveal className="mt-8">
          <div className="rounded-[var(--radius-xl)] border-2 border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/10 via-[var(--surface)] to-[var(--surface)] p-6 shadow-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-[var(--accent)] font-display text-xl font-bold text-[var(--on-accent)] shadow-md">
                  #{myLeaderboardEntry?.rank ?? userSubmission?.rank ?? "—"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                      Your Performance Summary
                    </span>
                    {userSubmission?.registration_reference && (
                      <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
                        ({userSubmission.registration_reference})
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[var(--fg)]">
                    {user.name || user.email}
                  </h3>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Official Standing in this competition
                  </p>
                </div>
              </div>

              {/* Score Badges */}
              <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <p className="font-display text-base font-bold text-[var(--accent)]">
                    {myLeaderboardEntry?.final_score != null ? nf(myLeaderboardEntry.final_score) : (userSubmission?.score ?? "—")}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Final Score</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <p className="font-display text-base font-bold text-[var(--fg)]">
                    {nf(myLeaderboardEntry?.audience_votes ?? myLeaderboardEntry?.raw_audience_votes ?? 0)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Votes</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <p className="font-display text-base font-bold text-[var(--fg)]">
                    {nf(myLeaderboardEntry?.judge_score ?? myLeaderboardEntry?.raw_judge_score ?? 0)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Judge Score</p>
                </div>
              </div>
            </div>

            {/* Judge Feedback Section */}
            {myFeedbacks.length > 0 && (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
                  <MessageSquare className="size-4 text-[var(--accent)]" /> Official Judge Feedback ({myFeedbacks.length})
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {myFeedbacks.map((fb, idx) => (
                    <div key={fb._id || idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[var(--fg-subtle)]">
                        <span className="font-semibold text-[var(--fg)]">Judge {idx + 1}</span>
                        <span>{fb.created_at ? formatEventDate(fb.created_at) : ""}</span>
                      </div>
                      {fb.feedback_text && (
                        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                          &ldquo;{fb.feedback_text}&rdquo;
                        </p>
                      )}
                      {fb.audio_feedback_url && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAudio(fb.audio_feedback_url!)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
                          >
                            {activeAudioUrl === fb.audio_feedback_url && audioPlaying ? (
                              <Pause className="size-3" />
                            ) : (
                              <Play className="size-3" />
                            )}
                            {activeAudioUrl === fb.audio_feedback_url && audioPlaying ? "Pause Audio Feedback" : "Play Voice Feedback"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Multi-Round Knockout Stages Selector ── */}
      {roundsData && Array.isArray(roundsData.rounds) && roundsData.rounds.length > 1 && (
        <Reveal className="mt-8">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[var(--surface-2)] to-amber-500/10 p-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-black uppercase tracking-wider text-[var(--fg)] flex items-center gap-2">
                <Layers className="size-4 text-amber-400" />
                Tournament Stages &amp; Final Rankings
              </span>
              <span className="text-xs text-[var(--fg-muted)]">
                Viewing: {roundsData.rounds.find((r: any) => r.round_number === selectedRound)?.name || `Stage ${selectedRound || 1}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {roundsData.rounds.map((rd: any) => {
                const isSelected = selectedRound === rd.round_number;
                return (
                  <button
                    key={rd.round_number}
                    type="button"
                    onClick={() => handleSelectRound(rd.round_number)}
                    className={`cursor-pointer rounded-xl p-3 text-left transition-all border relative flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/40 shadow-lg text-white font-bold"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-black tracking-wide text-[var(--fg)]">
                        {rd.name || `Round ${rd.round_number}`}
                      </span>
                      {rd.is_final_round ? (
                        <span className="rounded-full bg-yellow-500/20 border border-yellow-500/40 px-2 py-0.5 text-[9.5px] font-extrabold text-yellow-300">
                          👑 Final
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[9.5px] font-bold text-slate-300">
                          Qualifying
                        </span>
                      )}
                    </div>
                    {rd.description && (
                      <p className="line-clamp-1 text-[11px] text-[var(--fg-muted)]">{rd.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* ── Category Tabs (Junior, Sub-Junior, Senior) ── */}
      {availableCategories.length > 0 && (
        <Reveal className="mt-8">
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" />
                Select Result Category
              </span>
              <span className="text-[11.5px] text-[var(--fg-subtle)] font-medium">
                {activeCategory === "ALL"
                  ? `All Categories: ${rawLeaderboard.length} contestants`
                  : `${activeCategory} Category: Showing ${leaderboard.length} contestants • Top 3 Podium below`}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("ALL")}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeCategory === "ALL"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/50 font-black"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
                }`}
              >
                <span>All Categories</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums ${
                    activeCategory === "ALL" ? "bg-black/25 text-black" : "bg-[var(--surface)] text-[var(--fg-subtle)]"
                  }`}
                >
                  {rawLeaderboard.length}
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
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/50 font-black"
                        : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-white"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums ${
                        isActive ? "bg-black/25 text-black" : "bg-[var(--surface)] text-[var(--fg-subtle)]"
                      }`}
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

      {/* ── Top 3 Podium ── */}
      {top3.length > 0 && (
        <Reveal className="mt-12">
          <div className="text-center">
            <SectionLabel>Winners Podium</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-bold">
              {activeCategory === "ALL" ? "Top Contestants" : `${activeCategory} Category • Top Contestants`}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
            {/* Rank 2 (Silver) */}
            {top3[1] && (
              <div className="order-2 md:order-1 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border-2 border-slate-300 dark:border-slate-500/70 bg-gradient-to-b from-slate-200/30 via-slate-100/5 to-[var(--surface)] dark:from-slate-400/15 dark:via-slate-800/20 dark:to-[var(--surface)] p-6 text-center shadow-[0_10px_35px_-8px_rgba(148,163,184,0.32)]">
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 font-display text-sm font-extrabold text-slate-900 shadow-[0_0_18px_rgba(203,213,225,0.6)] ring-4 ring-slate-300/35">
                    2
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[1].profile_photo, 2)}
                      alt=""
                      className="size-20 rounded-full border-3 border-slate-300 object-cover shadow-[0_0_18px_rgba(148,163,184,0.35)] ring-4 ring-slate-300/20"
                    />
                    <Medal className="absolute -bottom-1 -right-1 size-6 text-slate-400 drop-shadow" />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-200/90 dark:bg-slate-700/90 border border-slate-300 dark:border-slate-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    🥈 2nd Place • Runner-Up
                  </span>
                  <h3 className="mt-2 line-clamp-1 font-display text-lg font-bold">{top3[1].name || "Contestant"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[1])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-slate-300/50 bg-slate-100/70 dark:bg-slate-800/40 p-3">
                  <p className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {nf(top3[1].final_score ?? top3[1].raw_audience_votes)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Final Score</p>
                  <div className="mt-2 flex justify-around text-[11px] text-[var(--fg-muted)]">
                    <span>Votes: {nf(top3[1].audience_votes ?? top3[1].raw_audience_votes)}</span>
                    <span>Judge: {nf(top3[1].judge_score ?? top3[1].raw_judge_score)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {top3[0] && (
              <div className="order-1 md:order-2 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border-2 border-amber-400 dark:border-amber-400/90 bg-gradient-to-b from-amber-500/[0.16] via-amber-400/[0.04] to-[var(--surface)] dark:from-amber-500/25 dark:via-amber-950/25 dark:to-[var(--surface)] p-8 text-center shadow-[0_16px_50px_-10px_rgba(245,158,11,0.35),0_0_25px_rgba(245,158,11,0.2)] md:-translate-y-5 z-10">
                <div className="flex flex-col items-center">
                  <span className="grid size-12 place-items-center rounded-full font-display text-base font-black bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-slate-950 shadow-[0_0_22px_rgba(245,158,11,0.7)] ring-4 ring-amber-400/40">
                    1
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[0].profile_photo, 1)}
                      alt=""
                      className="size-24 rounded-full border-4 border-amber-400 object-cover shadow-[0_0_28px_rgba(245,158,11,0.45)] ring-4 ring-amber-400/35"
                    />
                    <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 size-7 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)] animate-bounce" style={{ animationDuration: "3s" }} />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md ring-1 ring-amber-300">
                    <Crown className="size-3.5 fill-current" /> 🥇 1st Place • Grand Champion
                  </span>
                  <h3 className="mt-2 line-clamp-1 font-display text-xl font-bold">{top3[0].name || "Winner"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[0])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-amber-400/35 bg-amber-500/10 dark:bg-amber-500/15 p-4">
                  <p className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-amber-300 dark:via-yellow-300 dark:to-amber-500">
                    {nf(top3[0].final_score ?? top3[0].raw_audience_votes)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Final Score</p>
                  <div className="mt-3 flex justify-around text-xs text-[var(--fg-muted)]">
                    <span>Votes: {nf(top3[0].audience_votes ?? top3[0].raw_audience_votes)}</span>
                    <span>Judge: {nf(top3[0].judge_score ?? top3[0].raw_judge_score)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3[2] && (
              <div className="order-3 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border-2 border-amber-700/60 dark:border-amber-600/60 bg-gradient-to-b from-amber-700/15 via-orange-950/5 to-[var(--surface)] dark:from-amber-700/20 dark:via-amber-950/25 dark:to-[var(--surface)] p-6 text-center shadow-[0_10px_35px_-8px_rgba(180,83,9,0.28)]">
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 font-display text-sm font-extrabold text-amber-50 shadow-[0_0_18px_rgba(180,83,9,0.5)] ring-4 ring-amber-700/35">
                    3
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[2].profile_photo, 3)}
                      alt=""
                      className="size-20 rounded-full border-3 border-amber-700 object-cover shadow-[0_0_18px_rgba(180,83,9,0.35)] ring-4 ring-amber-700/20"
                    />
                    <Medal className="absolute -bottom-1 -right-1 size-6 text-amber-600 drop-shadow" />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300/70 dark:border-amber-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    🥉 3rd Place • 2nd Runner-Up
                  </span>
                  <h3 className="mt-2 line-clamp-1 font-display text-lg font-bold">{top3[2].name || "Contestant"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[2])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-amber-700/35 bg-amber-700/10 dark:bg-amber-900/30 p-3">
                  <p className="font-display text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {nf(top3[2].final_score ?? top3[2].raw_audience_votes)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Final Score</p>
                  <div className="mt-2 flex justify-around text-[11px] text-[var(--fg-muted)]">
                    <span>Votes: {nf(top3[2].audience_votes ?? top3[2].raw_audience_votes)}</span>
                    <span>Judge: {nf(top3[2].judge_score ?? top3[2].raw_judge_score)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Full Leaderboard Table ── */}
      <Reveal className="mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionLabel>All Standings</SectionLabel>
            <h2 className="mt-1 font-display text-xl font-bold">Complete Ranking Table</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contestant…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-4 text-xs focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Rank</th>
                  <th className="px-4 py-3.5">Contestant</th>
                  <th className="px-3 py-3.5">Category</th>
                  <th className="px-4 py-3.5 text-right">Audience Votes</th>
                  <th className="px-4 py-3.5 text-right">Judge Score</th>
                  <th className="py-3.5 pl-4 pr-6 text-right font-bold text-[var(--accent)]">Final Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((row, i) => {
                  const rRank = row.rank ?? i + 1;
                  const isTop = rRank <= 3;
                  const isMe =
                    user &&
                    (row.participant_id === user.email ||
                      row.user_email === user.email ||
                      row.email === user.email);

                  return (
                    <tr
                      key={row.participant_id || row.user_email || i}
                      className={`transition-colors hover:bg-[var(--surface-2)]/40 ${
                        isMe ? "bg-[var(--accent)]/10 font-medium" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <span
                          className={`inline-grid size-7 place-items-center rounded-full text-[11.5px] font-bold ${
                            rRank === 1
                              ? "bg-[var(--accent)] text-[var(--on-accent)]"
                              : rRank === 2
                              ? "bg-slate-300 text-slate-900"
                              : rRank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-[var(--surface-2)] text-[var(--fg-muted)]"
                          }`}
                        >
                          {rRank}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={imageFor(row.profile_photo, rRank)}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[13px] text-[var(--fg)]">
                              {row.name || "Contestant"}{" "}
                              {isMe && (
                                <span className="ml-1.5 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[11px] text-[var(--fg-subtle)]">{handle(row)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-violet-300">
                          {row.category || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[12px] text-[var(--fg-muted)]">
                        {nf(row.audience_votes ?? row.raw_audience_votes)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-[12px] text-[var(--fg-muted)]">
                        {nf(row.judge_score ?? row.raw_judge_score)}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right font-mono text-[13.5px] font-bold text-[var(--accent)]">
                        {nf(row.final_score ?? row.raw_audience_votes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)]">
              No contestants match &ldquo;{search}&rdquo;.
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
