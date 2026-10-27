"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Calendar, Gavel, Upload, CheckCircle2, AlertCircle, ListChecks,
  ShieldCheck, LogIn, Loader2, Heart, Crown, FileUp, Link2, Film, Music, X,
  Radio, ArrowRight, Award, ExternalLink, Sparkles, MessageSquare, Play, Pause,
  CreditCard, Banknote, Zap, Clock,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Badge } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
import { competeApi, profileApi, publicApi, certificatesApi } from "@/lib/api";
import { imageFor, formatEventDate, cn } from "@/lib/utils";

type RulesObj = {
  terms_and_conditions?: string;
  eligibility_requirements?: string;
  submission_guidelines?: string;
  disqualification_rules?: string;
  prize_information?: string;
};

type Field = {
  name: string;
  label?: string;
  required?: boolean;
  type?: string;
  description?: string;
  allowed_formats?: string[];
  max_size_mb?: number;
};

type Comp = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  prize?: string;
  rules?: string | RulesObj;
  category?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  registration_start_date?: string;
  registration_deadline?: string;
  submission_deadline?: string;
  min_age?: number;
  max_age?: number;
  participation_fee?: number;
  fee?: number;
  currency?: string;
  voting_status?: "OPEN" | "CLOSED";
  judging_status?: "OPEN" | "CLOSED";
  result_status?: "PENDING" | "APPROVED" | "PUBLISHED";
  results_published?: boolean;
  results_published_at?: string;
  audience_voting_enabled?: boolean;
  judge_scoring_enabled?: boolean;
  judging_criteria?: { name: string; max_score?: number; weight?: number; description?: string }[];
  dynamic_submission_fields?: Field[];
};

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
};

const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));
const handle = (r: Row) =>
  "@" + ((r.email || r.participant_id || r.name || "player").split("@")[0].replace(/\s+/g, "_").toLowerCase());

const ALLOWED_AUDIO_EXTENSIONS = [
  ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".wma", ".opus", ".aiff"
];

export default function CompetitionDetail({
  comp,
  initialLeaderboard,
}: {
  comp: Comp;
  initialLeaderboard: Row[];
}) {
  const id = comp._id || comp.id || "";
  const { user, loading } = useAuth();
  const fields = comp.dynamic_submission_fields || [];

  const [step, setStep] = useState<"register" | "submit" | "done">("register");
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<{
    reference?: string;
    registered_at?: string;
    submission_id?: string;
    submitted_at?: string;
    rank?: number;
    score?: number;
    payment_method?: string;
    cash_payment?: boolean;
    cash_status?: string;
  } | null>(null);
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "CASH">("ONLINE");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [entryModes, setEntryModes] = useState<Record<string, "file" | "link">>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [rows, setRows] = useState<Row[]>(
    (initialLeaderboard || []).map((r: any) => ({
      ...r,
      audience_votes: r.audience_votes ?? r.raw_audience_votes,
      final_score: r.final_score,
    }))
  );
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [userCert, setUserCert] = useState<any | null>(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const isResultsPublished = comp.result_status === "PUBLISHED" || comp.results_published === true;
  const isVotingOpen = comp.audience_voting_enabled && comp.voting_status !== "CLOSED";

  const isParticipant = Boolean(
    enrollmentInfo?.reference ||
    enrollmentInfo?.submission_id ||
    step === "submit" ||
    step === "done" ||
    (user?.email &&
      rows.some(
        (r) =>
          r.email?.toLowerCase() === user.email.toLowerCase() ||
          r.participant_id?.toLowerCase() === user.email.toLowerCase()
      ))
  );

  // Authoritative enrollment check directly for this competition ID
  useEffect(() => {
    if (!user || !id) return;
    setCheckingEnrollment(true);

    // 1. Authoritative check via /my-registration endpoint
    competeApi
      .myRegistration(id)
      .then((reg) => {
        if (reg?.is_registered) {
          if (reg.is_confirmed) {
            const isCash = reg.payment_method === "CASH" || Boolean(reg.cash_payment);
            setEnrollmentInfo({
              reference: reg.registration_reference,
              registered_at: reg.registered_at,
              submission_id: reg.submission_id,
              submitted_at: reg.registered_at,
              payment_method: reg.payment_method,
              cash_payment: isCash,
              cash_status: reg.cash_status,
            });
            if (reg.has_submitted || reg.submission_id) {
              setStep("done");
              setMsg({ tone: "ok", text: "You have submitted your entry for this competition!" });
            } else {
              setStep(fields.length ? "submit" : "done");
              setMsg({
                tone: "ok",
                text: isCash
                  ? `You are enrolled via Cash on Spot (${reg.registration_reference || "Confirmed"}). Remember to deposit entry fee at the venue counter on event day. Upload your entry below.`
                  : `You are enrolled in this competition! (${reg.registration_reference || "Confirmed"}) Upload your entry below.`,
              });
            }
            return;
          } else {
            // Unconfirmed / Pending Payment — Keep registration step active so user can complete payment
            setStep("register");
            setMsg({
              tone: "err",
              text: "You have a pending registration. Please complete entry fee payment below to confirm your registration and submit your entry.",
            });
            return;
          }
        } else {
          // Explicitly NOT registered: Keep registration step clean
          setStep("register");
        }
        // Fallback: Check dashboard if not found in modern registrations
        return profileApi.dashboard().then((d) => {
          const myComps = Array.isArray(d?.my_competitions) ? d.my_competitions : [];
          const match = myComps.find(
            (c: any) =>
              String(c.competition_id || c._id || c.activity_id) === String(id) ||
              String(c.title || c.name || "").toLowerCase().trim() ===
                String(comp.title || comp.name || "").toLowerCase().trim()
          );
          if (match) {
            const isConfirmed =
              match.status === "CONFIRMED" ||
              match.payment_status === "PAID" ||
              match.payment_status === "NOT_REQUIRED" ||
              match.is_confirmed === true;

            if (isConfirmed) {
              const isCash = match.payment_method === "CASH" || Boolean(match.cash_payment);
              setEnrollmentInfo({
                reference: match.registration_reference,
                registered_at: match.registered_at,
                submission_id: match.submission_id,
                submitted_at: match.submitted_at,
                rank: match.rank,
                score: match.score,
                payment_method: match.payment_method,
                cash_payment: isCash,
                cash_status: match.cash_status,
              });
              if (match.has_submitted || match.submission_id) {
                setStep("done");
                setMsg({ tone: "ok", text: "You have submitted your entry for this competition!" });
              } else {
                setStep(fields.length ? "submit" : "done");
                setMsg({
                  tone: "ok",
                  text: isCash
                    ? `You are enrolled via Cash on Spot (${match.registration_reference || "Confirmed"}). Remember to deposit entry fee at the venue counter on event day. Upload your entry below.`
                    : `You are enrolled in this competition! (${match.registration_reference || "Confirmed"}) Upload your entry below.`,
                });
              }
            } else {
              setStep("register");
              setMsg({
                tone: "err",
                text: "You have a pending registration. Please complete entry fee payment below to confirm your registration and submit your entry.",
              });
            }
          }
        });
      })
      .catch(() => {
        // Fallback to strict ID-based check only from profile dashboard
        profileApi
          .dashboard()
          .then((d) => {
            const myComps = Array.isArray(d?.my_competitions) ? d.my_competitions : [];
            const match = myComps.find(
              (c: any) =>
                String(c.competition_id || c.activity_id || "") === String(id)
            );
            if (match) {
              const isConfirmed =
                match.status === "CONFIRMED" ||
                match.payment_status === "PAID" ||
                match.payment_status === "NOT_REQUIRED" ||
                match.is_confirmed === true;

              if (isConfirmed) {
                const isCash = match.payment_method === "CASH" || Boolean(match.cash_payment);
                setEnrollmentInfo({
                  reference: match.registration_reference,
                  registered_at: match.registered_at,
                  payment_method: match.payment_method,
                  cash_payment: isCash,
                  cash_status: match.cash_status,
                });
                if (match.has_submitted || match.submission_id) {
                  setStep("done");
                  setMsg({ tone: "ok", text: "You have submitted your entry for this competition!" });
                } else {
                  setStep(fields.length ? "submit" : "done");
                  setMsg({
                    tone: "ok",
                    text: isCash
                      ? `You are enrolled via Cash on Spot (${match.registration_reference || "Confirmed"}). Remember to deposit entry fee at the venue counter on event day. Upload your entry below.`
                      : `You are enrolled in this competition! (${match.registration_reference || "Confirmed"}) Upload your entry below.`,
                  });
                }
              } else {
                setStep("register");
                setMsg({
                  tone: "err",
                  text: "You have a pending registration. Please complete entry fee payment below to confirm your registration and submit your entry.",
                });
              }
            } else {
              setStep("register");
            }
          })
          .catch(() => {});
      })
      .finally(() => setCheckingEnrollment(false));
    // Check certificate
    certificatesApi
      .myCertificates({ activity_id: id })
      .then((res) => {
        const certList = res?.certificates || (Array.isArray(res) ? res : []);
        if (certList.length > 0) setUserCert(certList[0]);
      })
      .catch(() => {});
  }, [user, id, comp.title, comp.name, fields.length]);

  // Real-time WebSocket Leaderboard Updates
  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      const wsUrl = competeApi.socketUrl(id);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "INITIAL_STATE" && Array.isArray(payload.leaderboard)) {
            setRows(
              payload.leaderboard.map((r: any) => ({
                ...r,
                audience_votes: r.audience_votes ?? r.raw_audience_votes,
                final_score: r.final_score,
              }))
            );
          } else if (
            payload.type === "LEADERBOARD_UPDATED" ||
            payload.type === "SCORE_SUBMITTED" ||
            payload.type === "LIVE_SCORE_BROADCAST"
          ) {
            // Refetch provisional leaderboard
            publicApi.leaderboard(id).then((lb) => {
              if (Array.isArray(lb?.leaderboard)) {
                setRows(
                  lb.leaderboard.map((r: any) => ({
                    ...r,
                    audience_votes: r.audience_votes ?? r.raw_audience_votes,
                    final_score: r.final_score,
                  }))
                );
              }
            }).catch(() => {});
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (timer) clearTimeout(timer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [id]);

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  async function doRegister() {
    setBusy(true);
    setMsg(null);
    try {
      const el = await competeApi.eligibility(id);
      if (!el.eligible) {
        setMsg({ tone: "err", text: el.reason || "You are not eligible." });
        return;
      }

      const fee = comp.participation_fee || comp.fee || 0;
      const chosenMode = fee > 0 ? paymentMode : "ONLINE";

      const regRes = await competeApi.register(id, true, chosenMode);

      // If Cash on Spot, free registration, or confirmed without payment gateway
      if (
        chosenMode === "CASH" ||
        regRes.payment_method === "CASH" ||
        regRes.status === "CONFIRMED" ||
        !regRes.payment_info
      ) {
        const isCash = chosenMode === "CASH" || regRes.payment_method === "CASH";
        setEnrollmentInfo((s) => ({
          ...s,
          reference: regRes.reference,
          payment_method: regRes.payment_method || chosenMode,
          cash_payment: isCash,
        }));
        setStep(fields.length ? "submit" : "done");
        if (isCash) {
          setMsg({
            tone: "ok",
            text: `Registration confirmed with Cash on Spot! Please deposit ₹${fee} cash at the venue registration counter on event day.`,
          });
        } else {
          setMsg({ tone: "ok", text: "You're registered!" });
        }
        return;
      }

      // Paid registration — open Razorpay checkout
      const pInfo = regRes.payment_info;
      const checkout = pInfo.checkout_data || {};
      const keyId = checkout.key || pInfo.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!keyId) {
        setMsg({ tone: "err", text: "Payment gateway is being configured. Please try again shortly." });
        return;
      }

      const rzpLoaded = await loadRazorpay();
      if (!rzpLoaded) {
        setMsg({ tone: "err", text: "Could not reach Razorpay payment gateway. Check your connection." });
        return;
      }

      const feeAmount = comp.participation_fee || comp.fee || (checkout.amount ? checkout.amount / 100 : 0);

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount: checkout.amount || Math.round(feeAmount * 100),
        currency: checkout.currency || "INR",
        name: "Upgrade Talents India",
        description: `Entry Fee — ${comp.title || comp.name || "Competition"}`,
        order_id: checkout.order_id || pInfo.order_id,
        prefill: {
          email: user?.email || "",
          name: user?.name || "",
          contact: user?.phone_number || "",
        },
        theme: { color: "#bfff2e" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setStep("register");
            setMsg({ tone: "err", text: "Payment was cancelled. Pay entry fee to confirm registration and submit your entry." });
          },
        },
        handler: async (resp: any) => {
          try {
            setBusy(true);
            setMsg({ tone: "ok", text: "Verifying payment…" });
            await competeApi.verifyPayment(id, {
              registration_reference: regRes.reference,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setEnrollmentInfo((s) => ({ ...s, reference: regRes.reference }));
            setStep(fields.length ? "submit" : "done");
            setMsg({ tone: "ok", text: "Payment verified! You are registered. Please upload your entry below." });
          } catch (e: any) {
            setMsg({ tone: "err", text: e?.message || "Payment verification failed. Please contact support." });
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.on("payment.failed", (r: any) => {
        setMsg({ tone: "err", text: r?.error?.description || "Payment failed. Please try again." });
        setBusy(false);
      });

      rzp.open();
    } catch (e: any) {
      const m = String(e?.message || "");
      if (/already registered and confirmed/i.test(m)) {
        setStep(fields.length ? "submit" : "done");
        setMsg({ tone: "ok", text: "You're already registered. Upload your entry below." });
      } else {
        setStep("register");
        setMsg({ tone: "err", text: m || "Could not register." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function doSubmit() {
    const missing: string[] = [];
    const payloadFiles: File[] = [];
    const fieldNames: string[] = [];

    const YT_REGEX = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;

    for (const f of fields) {
      const mode = entryModes[f.name] || (f.type === "URL" || f.type === "PORTFOLIO_LINK" ? "link" : "file");
      const file = files[f.name];
      const link = (links[f.name] || "").trim();

      const isAudio = /audio|sound|singing|voice|music|song/i.test(f.name) || f.type === "AUDIO";
      const isVideo = /video|dance|film|visual|acting|performance/i.test(f.name) || f.type === "VIDEO";
      const displayName = f.name.replace(/video,\s*audio/gi, "Video/Audio");

      if (mode === "link") {
        if (!link) {
          if (f.required) missing.push(displayName);
        } else {
          if (!/^https?:\/\//i.test(link)) {
            setMsg({ tone: "err", text: `Please enter a valid link starting with http:// or https:// for ${displayName}` });
            return;
          }
          if (isVideo || isAudio) {
            if (!YT_REGEX.test(link)) {
              setMsg({ tone: "err", text: `For video entries in ${displayName}, please provide a valid YouTube link (e.g. https://youtu.be/... or https://youtube.com/watch?v=...).` });
              return;
            }
          }
          const safeName = displayName.replace(/[^a-zA-Z0-9_-]/g, "_");
          const linkFile = new File([link], `${safeName}_link.txt`, { type: "text/plain" });
          payloadFiles.push(linkFile);
          fieldNames.push(displayName);
        }
      } else {
        if (!file) {
          if (f.required) missing.push(displayName);
        } else {
          const lowerName = file.name.toLowerCase();
          const isDirectVideo = lowerName.endsWith(".mp4") || lowerName.endsWith(".mov") || lowerName.endsWith(".avi") || lowerName.endsWith(".mkv") || lowerName.endsWith(".webm") || file.type.startsWith("video/");
          if (isDirectVideo) {
            setMsg({ tone: "err", text: `Direct video file uploads are not supported for ${displayName}. Please switch to the Link tab and provide a YouTube link instead.` });
            return;
          }
          if (isAudio || isVideo) {
            if (!lowerName.endsWith(".mp3")) {
              setMsg({ tone: "err", text: `Only MP3 audio files (.mp3) are permitted for audio submissions in ${displayName}. For video performances, please switch to the Link tab.` });
              return;
            }
          }
          payloadFiles.push(file);
          fieldNames.push(displayName);
        }
      }
    }

    if (missing.length) {
      setMsg({ tone: "err", text: `Please provide a file or link for: ${missing.join(", ")}` });
      return;
    }

    if (payloadFiles.length === 0) {
      setMsg({ tone: "err", text: "Please provide at least one entry file or link to submit." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const subRes = await competeApi.submit(id, payloadFiles, fieldNames);
      setEnrollmentInfo((s) => ({
        ...s,
        submission_id: subRes?.submission_id,
        submitted_at: new Date().toISOString(),
      }));
      setStep("done");
      setMsg({ tone: "ok", text: "Entry submitted successfully! It is now being evaluated." });
    } catch (e: any) {
      setMsg({ tone: "err", text: e?.message || "Submission failed. Please check your files and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function doVote(pid?: string) {
    if (!pid || !user || voted.has(pid) || !isVotingOpen) return;

    const isSelfVote =
      Boolean(user.email) &&
      (pid.toLowerCase() === user.email.toLowerCase() ||
        rows.some(
          (r) =>
            (r.participant_id === pid || r.email === pid) &&
            r.email?.toLowerCase() === user.email.toLowerCase()
        ));

    if (isSelfVote) {
      setMsg({
        tone: "err",
        text: "Contestants cannot vote for their own submission.",
      });
      return;
    }

    if (isParticipant) {
      setMsg({
        tone: "err",
        text: "Participants of this competition are not eligible to vote. Audience voting is restricted to audience members and fans.",
      });
      return;
    }

    setVotingId(pid);
    try {
      await competeApi.vote(id, pid, "WEBSITE");
      setVoted((s) => new Set(s).add(pid));
      setRows((rs) =>
        rs.map((r) =>
          r.participant_id === pid ? { ...r, audience_votes: (r.audience_votes || 0) + 1 } : r
        )
      );
      setMsg({ tone: "ok", text: "Vote submitted successfully!" });
    } catch (e: any) {
      setMsg({
        tone: "err",
        text: e?.message || "Failed to submit vote. Audience voting is restricted to non-contestants.",
      });
    } finally {
      setVotingId(null);
    }
  }

  async function handleDownloadCert() {
    if (!userCert) return;
    const certId = userCert.certificate_id || userCert.id || userCert._id;
    setDownloadingCert(true);
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
      alert("Could not download certificate PDF. Please check your dashboard.");
    } finally {
      setDownloadingCert(false);
    }
  }

  const open = !comp.registration_deadline || new Date(comp.registration_deadline).getTime() > Date.now();

  function renderRules() {
    const r = comp.rules;
    if (!r) return null;
    if (typeof r === "string") {
      return (
        <Reveal className="mt-8">
          <SectionLabel>Rules & Guidelines</SectionLabel>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-[var(--fg-muted)]">
            {r}
          </p>
        </Reveal>
      );
    }

    const sections = [
      { label: "Eligibility Requirements", content: r.eligibility_requirements },
      { label: "Submission Guidelines", content: r.submission_guidelines },
      { label: "Disqualification Rules", content: r.disqualification_rules },
      { label: "Prize Information", content: r.prize_information },
      { label: "Terms & Conditions", content: r.terms_and_conditions },
    ].filter((s) => Boolean(s.content?.trim()));

    if (!sections.length) return null;

    return (
      <Reveal className="mt-8">
        <SectionLabel>Rules & Criteria</SectionLabel>
        <div className="mt-3 grid gap-3 max-w-2xl">
          {sections.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h4 className="font-semibold text-xs text-[var(--fg)] uppercase tracking-wider">{s.label}</h4>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[var(--fg-muted)]">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    );
  }

  return (
    <section className={cn("container-x relative pb-24 pt-10 md:pt-14", step === "done" ? "max-w-5xl mx-auto" : "grid gap-10 lg:grid-cols-[1fr_380px]")}>
      {/* ── Left / Main: info ── */}
      <div className="min-w-0">
        {/* Results Published Announcement Banner */}
        {isResultsPublished && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Trophy className="size-6" />
              </div>
              <div>
                <p className="font-display font-bold text-emerald-300 text-base">Official Final Results Published!</p>
                <p className="text-xs text-emerald-300/80">
                  Winners, certified leaderboard and judge reviews are now available.
                </p>
              </div>
            </div>
            <Link
              href={`/competitions/${id}/results`}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-[var(--on-accent)] transition-all shadow-md active:scale-95 shrink-0"
              style={{ background: "var(--grad-brand)" }}
            >
              View Certified Results →
            </Link>
          </motion.div>
        )}

        {/* Enrolled & Audition Entry Submitted Banner (Shows when user has submitted, replacing bulky right card) */}
        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-[var(--surface)] to-[var(--surface)] p-5 shadow-lg"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-sm">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-sm sm:text-base text-emerald-200">
                      Enrolled &amp; Audition Entry Submitted
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      {isResultsPublished ? "Completed & Judged" : "Under Review"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--fg-muted)]">
                    Your audition entry is securely recorded and queued for the judging panel.
                  </p>
                </div>
              </div>

              {/* Status Badges & Quick Action Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
                {enrollmentInfo?.reference && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs">
                    <span className="text-[var(--fg-subtle)] mr-1.5">Ref:</span>
                    <span className="font-mono font-bold text-[var(--fg)]">{enrollmentInfo.reference}</span>
                  </div>
                )}

                {enrollmentInfo?.cash_payment && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-amber-400" />
                      Cash on Spot (₹{comp.participation_fee || comp.fee} at Venue)
                    </span>
                  </div>
                )}

                {enrollmentInfo?.submitted_at && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs">
                    <span className="text-[var(--fg-subtle)] mr-1.5">Submitted:</span>
                    <span className="text-[var(--fg)] font-medium">{formatEventDate(enrollmentInfo.submitted_at)}</span>
                  </div>
                )}

                {enrollmentInfo?.rank && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs">
                    <span className="text-[var(--fg-subtle)] mr-1.5">Rank:</span>
                    <span className="font-display font-bold text-[var(--accent)]">#{enrollmentInfo.rank}</span>
                  </div>
                )}

                {userCert && (
                  <button
                    onClick={handleDownloadCert}
                    disabled={downloadingCert}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25"
                  >
                    {downloadingCert ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
                    Certificate
                  </button>
                )}

                {isResultsPublished ? (
                  <Link
                    href={`/competitions/${id}/results`}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-[var(--on-accent)] shadow-md"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <Trophy className="size-3.5" /> Results &amp; Feedback
                  </Link>
                ) : (
                  <Link
                    href={`/leaderboard?competition=${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--fg)] hover:border-[var(--border-strong)]"
                  >
                    Leaderboard →
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <StaggerGroup className="flex flex-wrap gap-2.5">
          {comp.prize && (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-[var(--on-accent)] shadow-sm" style={{ background: "var(--grad-brand)" }}>
                <Trophy className="size-3.5" aria-hidden /> {comp.prize}
              </span>
            </StaggerItem>
          )}
          <StaggerItem>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-semibold">
              <Calendar className="size-3.5 text-[var(--fg-subtle)]" aria-hidden />{" "}
              {comp.registration_deadline ? `Registration closes ${formatEventDate(comp.registration_deadline)}` : "Open entry"}
            </span>
          </StaggerItem>
          {comp.submission_deadline && (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-semibold text-amber-300 border-amber-500/30 bg-amber-500/10">
                <Calendar className="size-3.5 text-amber-400" aria-hidden /> Submissions due {formatEventDate(comp.submission_deadline)}
              </span>
            </StaggerItem>
          )}
          {(comp.min_age || comp.max_age) && (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-semibold">
                <ShieldCheck className="size-3.5 text-[var(--fg-subtle)]" aria-hidden /> Age {comp.min_age ?? 0}{comp.max_age ? `–${comp.max_age}` : "+"}
              </span>
            </StaggerItem>
          )}
          {isVotingOpen && (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[12px] font-bold text-rose-400">
                <Radio className="size-3.5 animate-pulse text-rose-400" /> Live Voting Active
              </span>
            </StaggerItem>
          )}
        </StaggerGroup>

        {comp.description && (
          <Reveal className="mt-8">
            <SectionLabel>About</SectionLabel>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">{comp.description}</p>
          </Reveal>
        )}

        {renderRules()}

        {!!comp.judging_criteria?.length && (
          <Reveal className="mt-8">
            <SectionLabel>Judging criteria</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {comp.judging_criteria.map((c, i) => (
                <div key={i} className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13.5px] font-medium">
                      <Gavel className="size-4 text-[var(--accent)]" aria-hidden /> {c.name}
                    </span>
                    {c.max_score != null && (
                      <span className="font-display text-sm font-bold text-[var(--accent)]">
                        /{c.max_score} pts
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {!!fields.length && (
          <Reveal className="mt-8">
            <SectionLabel>Required Submissions</SectionLabel>
            <ul className="mt-3 grid gap-2.5">
              {fields.map((f, i) => {
                const isVideo = /video|dance|film|acting|visual/i.test(f.name) || f.type === "VIDEO";
                const isAudio = /audio|sound|singing|voice|music/i.test(f.name) || f.type === "AUDIO";
                return (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-[13px]">
                    {isVideo ? (
                      <Film className="size-4 shrink-0 text-[var(--accent)] mt-0.5" />
                    ) : isAudio ? (
                      <Music className="size-4 shrink-0 text-[var(--accent)] mt-0.5" />
                    ) : (
                      <ListChecks className="size-4 shrink-0 text-[var(--accent)] mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--fg)]">{f.name}</span>
                        {f.required && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Required</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                        {isVideo
                          ? "Accepts YouTube or Google Drive performance link"
                          : isAudio
                          ? "Accepts high quality audio (.mp3, .wav, .m4a) or link"
                          : "Upload audio file or provide public web link"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        )}

        {/* ── Standings + voting ── */}
        <Reveal className="mt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SectionLabel>Leaderboard & Standings</SectionLabel>
              {isVotingOpen ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  <Radio className="size-2.5 animate-pulse" /> Live
                </span>
              ) : (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-subtle)]">
                  Provisional
                </span>
              )}
            </div>
            {isResultsPublished ? (
              <Link href={`/competitions/${id}/results`} className="text-[12.5px] font-bold text-[var(--accent)] hover:underline">
                View Certified Results →
              </Link>
            ) : (
              <Link href={`/leaderboard?competition=${id}`} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
                Full leaderboard →
              </Link>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-8 text-center text-[13px] text-[var(--fg-muted)]">
              No entries ranked yet. Be the first to compete!
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-md">
              {rows.slice(0, 8).map((r, i) => {
                const pid = r.participant_id || r.email || "";
                const top = (r.rank ?? i + 1) <= 3;
                const isSelfRow =
                  Boolean(user?.email) &&
                  (r.email?.toLowerCase() === user?.email?.toLowerCase() ||
                    r.participant_id?.toLowerCase() === user?.email?.toLowerCase());

                return (
                  <div key={pid + i} className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3 first:border-t-0">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-full text-[11.5px] font-bold tabular-nums"
                      style={top ? { background: "var(--grad-brand)", color: "var(--on-accent)" } : { background: "var(--surface-2)", color: "var(--fg-muted)" }}
                    >
                      {r.rank ?? i + 1}
                    </span>
                    <img src={imageFor(r.profile_photo, i)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13.5px] font-semibold leading-tight">
                          {r.name || "—"}{" "}
                          {top && i === 0 && <Crown className="ml-0.5 inline size-3.5 text-[var(--accent)]" aria-hidden />}
                        </p>
                        {isSelfRow && (
                          <span className="rounded-md bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                            You
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-[var(--fg-subtle)]">{nf(r.audience_votes)} votes</p>
                    </div>
                    {isVotingOpen ? (
                      isSelfRow ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)]">
                          Your Entry
                        </span>
                      ) : isParticipant ? (
                        <span
                          title="Participants of this competition cannot vote"
                          className="inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-1.5 text-[10.5px] font-medium text-[var(--fg-subtle)]"
                        >
                          Ineligible to vote
                        </span>
                      ) : (
                        <button
                          onClick={() => doVote(pid)}
                          disabled={!user || voted.has(pid) || votingId === pid}
                          aria-label={`Vote for ${r.name}`}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold transition-all enabled:hover:border-[var(--accent)] enabled:hover:text-[var(--accent)] disabled:opacity-50"
                        >
                          {votingId === pid ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Heart className={`size-3.5 ${voted.has(pid) ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} aria-hidden />
                          )}
                          {voted.has(pid) ? "Voted" : "Vote"}
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-mono text-[var(--fg-subtle)]">
                        {r.final_score != null ? `${nf(r.final_score)} pts` : `${nf(r.audience_votes)} votes`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isParticipant && isVotingOpen && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[var(--fg-subtle)]">
              <ShieldCheck className="size-3.5 text-[var(--accent)] shrink-0" />
              <span>You are an official competitor in this competition. Audience voting is restricted to fans and audience members only.</span>
            </p>
          )}
          {!user && rows.length > 0 && isVotingOpen && (
            <p className="mt-2.5 text-[12px] text-[var(--fg-subtle)]">
              <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">Sign in</Link> to vote for your favourite.
            </p>
          )}
        </Reveal>
      </div>

      {/* ── Right: action card (sticky, hidden when user has already submitted entry) ── */}
      {step !== "done" && (
        <div id="register-action" className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl" style={{ background: "var(--grad-surface), var(--surface)" }}>
            <div className="border-b border-[var(--border)] p-5">
              <p className="font-display text-lg font-bold">
                {step === "submit" ? "Submit Your Entry" : "Enter this competition"}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--fg-muted)]">
                {step === "submit"
                  ? "You are enrolled. Upload your performance entry."
                  : open
                  ? "Registration is open."
                  : "Registration has closed."}
              </p>
            </div>

          <div className="p-5">
            {loading ? (
              <div className="skeleton h-28 w-full rounded-xl" />
            ) : !user ? (
              <>
                <p className="text-[13.5px] text-[var(--fg-muted)]">Sign in to register, submit your entry and vote.</p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]"
                  style={{ background: "var(--grad-brand)" }}
                >
                  <LogIn className="size-4" aria-hidden /> Sign in to enter
                </Link>
              </>
            ) : checkingEnrollment ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[var(--fg-muted)]">
                <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
                <p className="mt-2.5">Checking enrollment status…</p>
              </div>
            ) : step === "register" ? (
              <>
                {!!(comp.participation_fee || comp.fee) && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <span className="text-[12.5px] font-medium text-[var(--fg-muted)]">Entry Fee</span>
                      <span className="font-display text-base font-bold text-[var(--accent)]">
                        ₹{comp.participation_fee || comp.fee}
                      </span>
                    </div>

                    {/* Payment Mode Selector: Online vs Cash */}
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Select Payment Mode
                      </p>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {/* Option 1: Online Mode */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setPaymentMode("ONLINE")}
                          className={cn(
                            "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition-all select-none",
                            paymentMode === "ONLINE"
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--border-strong)]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  "flex size-8 items-center justify-center rounded-xl transition-colors",
                                  paymentMode === "ONLINE"
                                    ? "bg-[var(--accent)] text-black"
                                    : "bg-[var(--surface)] text-[var(--fg-muted)]"
                                )}
                              >
                                <CreditCard className="size-4" />
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-[var(--fg)] leading-none">Online</p>
                                <span className="text-[10px] text-[var(--fg-muted)]">UPI / Cards</span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border transition-colors",
                                paymentMode === "ONLINE"
                                  ? "border-[var(--accent)] bg-[var(--accent)]"
                                  : "border-[var(--border-strong)] bg-transparent"
                              )}
                            >
                              {paymentMode === "ONLINE" && <span className="size-1.5 rounded-full bg-black" />}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)]/60 pt-2">
                            <span className="text-[10px] text-[var(--fg-subtle)]">Instant Entry</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-400">
                              <Zap className="size-2.5" /> Instant
                            </span>
                          </div>
                        </div>

                        {/* Option 2: Cash on Spot Mode */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setPaymentMode("CASH")}
                          className={cn(
                            "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition-all select-none",
                            paymentMode === "CASH"
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--border-strong)]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  "flex size-8 items-center justify-center rounded-xl transition-colors",
                                  paymentMode === "CASH"
                                    ? "bg-[var(--accent)] text-black"
                                    : "bg-[var(--surface)] text-[var(--fg-muted)]"
                                )}
                              >
                                <Banknote className="size-4" />
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-[var(--fg)] leading-none">Cash on Spot</p>
                                <span className="text-[10px] text-[var(--fg-muted)]">Pay at Venue</span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "flex size-4 items-center justify-center rounded-full border transition-colors",
                                paymentMode === "CASH"
                                  ? "border-[var(--accent)] bg-[var(--accent)]"
                                  : "border-[var(--border-strong)] bg-transparent"
                              )}
                            >
                              {paymentMode === "CASH" && <span className="size-1.5 rounded-full bg-black" />}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)]/60 pt-2">
                            <span className="text-[10px] text-[var(--fg-subtle)]">Gate Counter</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-400">
                              <Clock className="size-2.5" /> Venue
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {paymentMode === "CASH" && (
                      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-2.5 text-[11.5px] text-amber-300">
                        <p className="flex items-center gap-1.5 font-semibold text-amber-200">
                          <Banknote className="size-3.5 text-amber-400 shrink-0" />
                          Cash on Spot (Venue Payment)
                        </p>
                        <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
                          Your participation slot is reserved immediately. You can upload your audition entry now and deposit ₹{comp.participation_fee || comp.fee} cash at the venue counter on event day.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[var(--fg-muted)]">
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(e) => setRulesAccepted(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span>I have read and accept the competition rules and eligibility criteria.</span>
                </label>
                <button
                  onClick={doRegister}
                  disabled={!rulesAccepted || busy || !open}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)] transition-opacity disabled:opacity-50"
                  style={{ background: "var(--grad-brand)" }}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                  {(comp.participation_fee || comp.fee)
                    ? paymentMode === "CASH"
                      ? `Confirm Entry & Pay ₹${comp.participation_fee || comp.fee} Cash at Venue`
                      : `Pay ₹${comp.participation_fee || comp.fee} Online & Register`
                    : "Register to compete"}
                </button>
              </>
            ) : step === "submit" ? (
              <>
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="size-4 text-emerald-400" /> Enrolled &amp; Confirmed
                    </span>
                    {enrollmentInfo?.reference && (
                      <span className="font-mono text-[11px] text-emerald-400/80">{enrollmentInfo.reference}</span>
                    )}
                  </div>
                  {enrollmentInfo?.cash_payment && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-300">
                      <span className="flex items-center gap-1 font-medium">
                        <Banknote className="size-3.5 text-amber-400" /> Mode: Cash on Spot
                      </span>
                      <span className="font-semibold text-amber-300">
                        ₹{comp.participation_fee || comp.fee} Pending at Venue
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">Upload your entry</p>
                  <span className="text-[11px] text-[var(--fg-subtle)]">Audio upload or Link</span>
                </div>
                <div className="mt-3 flex flex-col gap-3.5">
                  {fields.map((f) => {
                    const displayName = f.name.replace(/video,\s*audio/gi, "Video/Audio");
                    const isAudio = /audio|sound|singing|voice|music|song/i.test(f.name) || f.type === "AUDIO";
                    const isVideo = /video|dance|film|visual|acting|performance/i.test(f.name) || f.type === "VIDEO";
                    const isAudioOrVideo = isAudio || isVideo;
                    const acceptTypes = isAudioOrVideo ? ".mp3,audio/mpeg,audio/mp3" : "image/*,.pdf";

                    // Default video fields to "link" to match AudioValidator enforcement
                    const mode = entryModes[f.name] || (isVideo || f.type === "URL" || f.type === "PORTFOLIO_LINK" ? "link" : "file");
                    const selectedFile = files[f.name];
                    const enteredLink = links[f.name] || "";

                    return (
                      <div key={f.name} className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[var(--fg)]">
                            {displayName}{f.required && <span className="text-[var(--accent)]"> *</span>}
                          </span>
                          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "file" }))}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                mode === "file"
                                  ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <Upload className="size-3" /> {isAudioOrVideo ? "Audio (MP3)" : "File"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "link" }))}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                mode === "link"
                                  ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <Link2 className="size-3" /> {isAudioOrVideo ? "YouTube Link" : "Link"}
                            </button>
                          </div>
                        </div>

                        {mode === "file" ? (
                          <div>
                            {selectedFile ? (
                              <div className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[12px]">
                                <div className="flex min-w-0 flex-1 items-center gap-2 mr-2">
                                  {selectedFile.name.toLowerCase().endsWith(".mp3") ? (
                                    <Music className="size-4 shrink-0 text-[var(--accent)]" />
                                  ) : (
                                    <FileUp className="size-4 shrink-0 text-[var(--accent)]" />
                                  )}
                                  <div className="min-w-0 truncate">
                                    <p className="truncate font-medium">{selectedFile.name}</p>
                                    <p className="text-[10px] text-[var(--fg-subtle)]">
                                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "audio/mp3"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFiles((s) => ({ ...s, [f.name]: null }))}
                                  aria-label="Remove file"
                                  className="grid size-6 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3 text-[12px] text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]">
                                {isAudioOrVideo ? (
                                  <Music className="size-4 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                                ) : (
                                  <FileUp className="size-4 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                                )}
                                <span className="truncate">{isAudioOrVideo ? "Choose MP3 audio file (.mp3)…" : "Choose file…"}</span>
                                <input
                                  type="file"
                                  accept={acceptTypes}
                                  className="hidden"
                                  onChange={(e) => {
                                    const fl = e.target.files?.[0] || null;
                                    setFiles((s) => ({ ...s, [f.name]: fl }));
                                  }}
                                />
                              </label>
                            )}
                            <p className="mt-1 text-[10.5px] text-[var(--fg-subtle)]">
                              {isAudioOrVideo
                                ? "Accepts MP3 audio files only (.mp3). For videos, use the YouTube Link tab."
                                : "Accepts image (JPG/PNG) or PDF"}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="relative">
                              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
                              <input
                                type="url"
                                value={enteredLink}
                                onChange={(e) => setLinks((s) => ({ ...s, [f.name]: e.target.value }))}
                                placeholder={isAudioOrVideo ? "https://youtu.be/... or https://youtube.com/watch?v=..." : "https://..."}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none"
                              />
                            </div>
                            <p className="mt-1 text-[10.5px] text-[var(--fg-subtle)]">
                              {isAudioOrVideo
                                ? "YouTube video link only (e.g. https://youtu.be/... or https://youtube.com/watch?v=...)"
                                : "Paste portfolio or web link"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={doSubmit}
                  disabled={busy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)] transition-opacity disabled:opacity-50"
                  style={{ background: "var(--grad-brand)" }}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                  Submit entry
                </button>
              </>
            ) : (
              /* Step === "done": Enrolled & Entry Submitted Overview */
              <div className="flex flex-col gap-4 text-xs">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                  <CheckCircle2 className="size-8 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-display text-sm font-bold text-emerald-200">Enrolled &amp; Entry Submitted</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Your audition entry has been securely stored and queued for the judging panel.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 text-[11.5px]">
                  {enrollmentInfo?.reference && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--fg-subtle)]">Registration Ref</span>
                      <span className="font-mono font-bold text-[var(--fg)]">{enrollmentInfo.reference}</span>
                    </div>
                  )}
                  {enrollmentInfo?.cash_payment && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--fg-subtle)]">Payment Mode</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <Banknote className="size-3.5 text-amber-400" />
                        Cash on Spot (₹{comp.participation_fee || comp.fee} at Venue)
                      </span>
                    </div>
                  )}
                  {enrollmentInfo?.submitted_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--fg-subtle)]">Submitted</span>
                      <span className="text-[var(--fg)]">{formatEventDate(enrollmentInfo.submitted_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--fg-subtle)]">Status</span>
                    <span className="font-semibold text-emerald-400">
                      {isResultsPublished ? "Completed & Judged" : "Under Review"}
                    </span>
                  </div>
                  {enrollmentInfo?.rank && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                      <span className="text-[var(--fg-subtle)]">Official Rank</span>
                      <span className="font-display font-bold text-[var(--accent)]">
                        Rank #{enrollmentInfo.rank}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-2 pt-2">
                  {isResultsPublished && (
                    <Link
                      href={`/competitions/${id}/results`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)] transition-transform active:scale-95"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <Trophy className="size-3.5" /> View Official Results &amp; Feedback
                    </Link>
                  )}

                  {userCert && (
                    <button
                      onClick={handleDownloadCert}
                      disabled={downloadingCert}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 py-2.5 text-xs font-bold text-yellow-300 transition-colors hover:bg-yellow-500/20"
                    >
                      {downloadingCert ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
                      Download Official Certificate
                    </button>
                  )}

                  <Link
                    href={`/leaderboard?competition=${id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] py-2.5 text-xs font-semibold hover:border-[var(--border-strong)] transition-colors"
                  >
                    <Trophy className="size-3.5 text-[var(--accent)]" /> View Competition Leaderboard
                  </Link>
                </div>
              </div>
            )}

            {msg && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] ${
                  msg.tone === "ok" ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
                style={{
                  background:
                    msg.tone === "ok"
                      ? "color-mix(in srgb, var(--success) 12%, transparent)"
                      : "color-mix(in srgb, var(--danger) 12%, transparent)",
                }}
              >
                {msg.tone === "ok" ? (
                  <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
                ) : (
                  <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                )}
                {msg.text}
              </motion.p>
            )}
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
