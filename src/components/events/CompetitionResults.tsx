"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Crown, Medal, ArrowLeft, Download, Award, Star,
  Search, MessageSquare, Volume2, CheckCircle2, AlertCircle,
  ExternalLink, Sparkles, UserCheck, ShieldCheck, Flame, Loader2, Play, Pause,
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
};

type ResultSnapshot = {
  _id?: string;
  competition_id?: string;
  calculated_at?: string;
  ranking_mode?: string;
  is_approved?: boolean;
  is_published?: boolean;
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

  const leaderboard = useMemo(() => {
    return Array.isArray(snapshot?.leaderboard) ? snapshot.leaderboard : [];
  }, [snapshot]);

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
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] py-2.5 px-5 text-xs font-semibold hover:border-[var(--border-strong)]"
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

      {/* ── Top 3 Podium ── */}
      {top3.length > 0 && (
        <Reveal className="mt-12">
          <div className="text-center">
            <SectionLabel>Winners Podium</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-bold">Top Contestants</h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
            {/* Rank 2 (Silver) */}
            {top3[1] && (
              <div className="order-2 md:order-1 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border border-slate-400/30 bg-[var(--surface)] p-6 text-center shadow-lg">
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-full bg-slate-300 font-display text-sm font-bold text-slate-900 shadow-md">
                    2
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[1].profile_photo, 2)}
                      alt=""
                      className="size-20 rounded-full border-2 border-slate-300 object-cover"
                    />
                    <Medal className="absolute -bottom-1 -right-1 size-6 text-slate-300 drop-shadow" />
                  </div>
                  <h3 className="mt-4 line-clamp-1 font-display text-lg font-bold">{top3[1].name || "Contestant"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[1])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="font-display text-2xl font-bold text-slate-200">
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
              <div className="order-1 md:order-2 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border-2 border-[var(--accent)] bg-gradient-to-b from-[var(--accent)]/15 via-[var(--surface)] to-[var(--surface)] p-8 text-center shadow-2xl md:-translate-y-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-12 place-items-center rounded-full font-display text-base font-bold text-[var(--on-accent)] shadow-xl" style={{ background: "var(--grad-brand)" }}>
                    1
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[0].profile_photo, 1)}
                      alt=""
                      className="size-24 rounded-full border-4 border-[var(--accent)] object-cover shadow-xl"
                    />
                    <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 size-7 text-[var(--accent)] drop-shadow" />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                    Champion
                  </span>
                  <h3 className="mt-2 line-clamp-1 font-display text-xl font-bold">{top3[0].name || "Winner"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[0])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="font-display text-3xl font-bold text-[var(--accent)]">
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
              <div className="order-3 flex flex-col items-center justify-between rounded-[var(--radius-xl)] border border-amber-600/30 bg-[var(--surface)] p-6 text-center shadow-lg">
                <div className="flex flex-col items-center">
                  <span className="grid size-10 place-items-center rounded-full bg-amber-700 font-display text-sm font-bold text-amber-100 shadow-md">
                    3
                  </span>
                  <div className="mt-3 relative">
                    <img
                      src={imageFor(top3[2].profile_photo, 3)}
                      alt=""
                      className="size-20 rounded-full border-2 border-amber-700 object-cover"
                    />
                    <Medal className="absolute -bottom-1 -right-1 size-6 text-amber-500 drop-shadow" />
                  </div>
                  <h3 className="mt-4 line-clamp-1 font-display text-lg font-bold">{top3[2].name || "Contestant"}</h3>
                  <p className="text-xs text-[var(--fg-subtle)]">{handle(top3[2])}</p>
                </div>
                <div className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="font-display text-2xl font-bold text-amber-500">
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
