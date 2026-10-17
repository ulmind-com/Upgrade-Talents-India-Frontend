"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, ShieldCheck, CheckCircle2, AlertCircle, Clock, Search,
  Lock, Unlock, ChevronRight, Award, Trophy, Star, ExternalLink,
  Save, SkipForward, LogOut, ArrowLeft, RefreshCw, Send, Check
} from "lucide-react";
import {
  judgeCompetitionsApi,
  tokenStore,
  type JudgeCompetition,
  type JudgeContestant,
  type JudgingCriterion
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, Spotlights } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

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

  // Load contestants when selected competition changes
  useEffect(() => {
    if (!selectedComp) return;
    let cancelled = false;
    setContestantsLoading(true);
    setActiveContestant(null);

    judgeCompetitionsApi
      .listContestants(selectedComp._id)
      .then((data) => {
        if (cancelled) return;
        setContestants(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.message?.includes("PIN")) {
          setShowPinModal(true);
        }
      })
      .finally(() => {
        if (!cancelled) setContestantsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedComp]);

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
    setSubmittingScore(true);
    setScoreNotice(null);
    try {
      await judgeCompetitionsApi.submitScore(activeContestant._id, scores, comments);
      setScoreNotice({ tone: "success", text: "Official score successfully submitted!" });
      setTimeout(() => {
        setActiveContestant(null);
        if (selectedComp) {
          judgeCompetitionsApi.listContestants(selectedComp._id).then(setContestants);
        }
      }, 1200);
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
      judgeCompetitionsApi.listContestants(selectedComp._id).then(setContestants);
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
      judgeCompetitionsApi.listContestants(selectedComp._id).then(setContestants);
    } catch (err: any) {
      setScoreNotice({ tone: "error", text: err?.message || "Could not skip contestant." });
    } finally {
      setSkipping(false);
    }
  };

  // Filtered Contestants
  const filteredContestants = useMemo(() => {
    return contestants.filter((c) => {
      const matchSearch =
        search === "" ||
        (c.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.title || "").toLowerCase().includes(search.toLowerCase());

      return matchSearch;
    });
  }, [contestants, search]);

  const handleLogout = () => {
    tokenStore.clear();
    logout();
    router.replace("/judge/login");
  };

  return (
    <div className="relative min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <Spotlights />

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors hover:border-[var(--accent)]"
            >
              <ArrowLeft className="size-4 text-[var(--fg-subtle)] transition-transform group-hover:-translate-x-0.5 group-hover:text-[var(--accent)]" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--grad-brand)" }}>
                <Gavel className="size-4 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-[var(--fg)] sm:text-base">Judges Scoring Portal</h1>
                  <Badge tone="brand">Official</Badge>
                </div>
                <p className="text-[11px] text-[var(--fg-subtle)]">
                  {user?.email || "Authenticated Judge Session"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              {selectedComp && (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-4 py-2.5 backdrop-blur-md">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">Scoring Phase</p>
                    <p className="text-xs font-bold text-[var(--fg)]">
                      {selectedComp.judging_status === "CLOSED" ? "Closed" : "Open for Scoring"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      selectedComp.judging_status === "CLOSED" ? "bg-[var(--error)]" : "animate-pulse bg-[var(--success)]"
                    )}
                  />
                </div>
              )}
            </section>

            {/* ── Scoring Layout: Contestant List + Scoring Drawer ── */}
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
                      placeholder="Search contestant by name, email or entry…"
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] pl-10 pr-4 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--fg-subtle)]">
                      {filteredContestants.length} {filteredContestants.length === 1 ? "contestant" : "contestants"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => selectedComp && judgeCompetitionsApi.listContestants(selectedComp._id).then(setContestants)}>
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                </div>

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
                    {filteredContestants.map((c) => {
                      const isSelected = activeContestant?._id === c._id;
                      return (
                        <motion.div
                          key={c._id}
                          layout
                          onClick={() => setActiveContestant(c)}
                          className={cn(
                            "group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200",
                            isSelected
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-elevated))] shadow-lg"
                              : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                                {c.user_name || c.user_email || "Contestant Entry"}
                              </h3>
                              <p className="text-xs text-[var(--fg-subtle)] line-clamp-1">
                                {c.title || c.description || "Submission entry"}
                              </p>
                            </div>
                            <Badge tone={isSelected ? "brand" : "neutral"}>
                              {c.status || "Submitted"}
                            </Badge>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)]/60 pt-3 text-[11px] text-[var(--fg-subtle)]">
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3" />
                              {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : "Active Round"}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent)]">
                              Score <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                            </span>
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
                    {/* Panel Header */}
                    <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                          Judging Worksheet
                        </span>
                        <h2 className="mt-0.5 text-lg font-bold text-[var(--fg)]">
                          {activeContestant.user_name || activeContestant.user_email}
                        </h2>
                        {activeContestant.title && (
                          <p className="text-xs text-[var(--fg-muted)]">{activeContestant.title}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {activeContestant.submission_url && (
                          <a
                            href={activeContestant.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
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

                    {/* Notice */}
                    {scoreNotice && (
                      <div
                        className={cn(
                          "rounded-xl border p-3 text-xs font-semibold",
                          scoreNotice.tone === "success"
                            ? "border-[var(--success)]/30 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
                            : "border-[var(--error)]/30 bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error)]"
                        )}
                      >
                        {scoreNotice.text}
                      </div>
                    )}

                    {/* Criteria Scoring Inputs */}
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                          Evaluation Criteria
                        </span>
                        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg)] px-3 py-1.5 border border-[var(--border)]">
                          <span className="text-xs text-[var(--fg-subtle)]">Total:</span>
                          <span className="text-base font-black text-[var(--accent)]">
                            {calculatedTotal}
                          </span>
                          <span className="text-xs text-[var(--fg-subtle)]">/ {maxPossibleTotal}</span>
                        </div>
                      </div>

                      {criteriaList.map((crit) => {
                        const currentVal = scores[crit.name] ?? 0;
                        return (
                          <div
                            key={crit.name}
                            className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/70 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-[var(--fg)]">{crit.name}</h4>
                                {crit.description && (
                                  <p className="text-[11px] text-[var(--fg-subtle)]">{crit.description}</p>
                                )}
                              </div>
                              <span className="font-mono text-sm font-bold text-[var(--accent)]">
                                {currentVal} / {crit.max_score}
                              </span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={crit.max_score}
                              step={1}
                              value={currentVal}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [crit.name]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--border-strong)] accent-[var(--accent)]"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback / Comments */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Judges Feedback & Comments
                      </label>
                      <textarea
                        rows={3}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Constructive feedback for the participant…"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
