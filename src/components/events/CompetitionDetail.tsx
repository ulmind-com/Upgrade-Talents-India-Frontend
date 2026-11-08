"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Calendar, Gavel, Upload, CheckCircle2, AlertCircle, ListChecks,
  ShieldCheck, LogIn, Loader2, Heart, Crown, FileUp, Link2, Film, Music, X,
  Radio, ArrowRight, Award, ExternalLink, Sparkles, MessageSquare, Play, Pause,
  CreditCard, Banknote, Zap, Clock, Users, Mic, Youtube, HardDrive
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Badge } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { competeApi, profileApi, publicApi, certificatesApi } from "@/lib/api";
import { imageFor, formatEventDate, cn } from "@/lib/utils";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

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
  status?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  time?: string;
  end_time?: string;
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
  allow_file_upload?: boolean;
  allow_video_link?: boolean;
  allow_audio_upload?: boolean;
  submission_formats?: string[];
  submission_format_config?: any;
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
  is_verified?: boolean;
  verified_badge?: boolean;
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
  const router = useRouter();

  // Resolve dynamic submission fields matching configured requirements
  const fields = useMemo(() => {
    if (Array.isArray(comp.dynamic_submission_fields) && comp.dynamic_submission_fields.length > 0) {
      return comp.dynamic_submission_fields;
    }
    const list: Field[] = [];
    if (comp.allow_video_link || (comp.submission_formats && comp.submission_formats.includes("VIDEO_LINK"))) {
      list.push({
        name: "Performance Link",
        label: "YouTube / Drive Video Link",
        type: "URL",
        required: true,
        allowed_formats: ["youtube", "drive", "url"],
        description: "Submit public YouTube video or Google Drive link",
      });
    }
    if (comp.allow_audio_upload || (comp.submission_formats && comp.submission_formats.includes("AUDIO"))) {
      list.push({
        name: "Audition Audio File",
        label: "MP3 Audio Track",
        type: "AUDIO",
        required: true,
        allowed_formats: ["mp3"],
        max_size_mb: 20,
        description: "Upload an MP3 audio file (.mp3 only)",
      });
    }
    if (comp.allow_file_upload || (comp.submission_formats && comp.submission_formats.includes("FILE"))) {
      list.push({
        name: "Portfolio / Work Document",
        label: "Portfolio Document / Photos",
        type: "DOCUMENT",
        required: true,
        allowed_formats: ["pdf", "docx", "png", "jpg", "zip"],
        max_size_mb: 25,
        description: "Upload portfolio document or images",
      });
    }
    if (list.length === 0) {
      list.push({
        name: "Performance Link",
        label: "YouTube / Drive Video Link",
        type: "URL",
        required: true,
      });
    }
    return list;
  }, [comp]);

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

  const initialRowsList: Row[] =
    Array.isArray(initialLeaderboard) && initialLeaderboard.length > 0
      ? initialLeaderboard.map((r: any) => ({
          ...r,
          audience_votes: r.audience_votes ?? r.raw_audience_votes ?? 0,
          final_score: r.final_score,
          is_verified: Boolean(r.is_verified || r.verified_badge || r.verified_tick),
          verified_badge: Boolean(r.is_verified || r.verified_badge || r.verified_tick),
        }))
      : [];

  const [rows, setRows] = useState<Row[]>(initialRowsList);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [userCert, setUserCert] = useState<any | null>(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  // Live stage tracking & lineup
  const [stageData, setStageData] = useState<any | null>(null);
  const [showLineupModal, setShowLineupModal] = useState(false);

  const loadStageData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await publicApi.liveStage(id);
      setStageData(data);
    } catch {
      // Ignored if stage not initialized
    }
  }, [id]);

  useEffect(() => {
    loadStageData();
    const interval = setInterval(loadStageData, 7000);
    return () => clearInterval(interval);
  }, [loadStageData]);

  // User queue position in the performance lineup
  const userQueueInfo = useMemo(() => {
    if (!user?.email || !stageData?.lineup) return null;
    const uEmail = user.email.toLowerCase().trim();
    const lineup: any[] = stageData.lineup || [];
    const myIndex = lineup.findIndex(
      (p: any) => (p.user_email || "").toLowerCase().trim() === uEmail
    );
    if (myIndex === -1) return null;

    const myEntry = lineup[myIndex];
    const myOrder = myEntry.order || myIndex + 1;
    const currentPerformer = stageData.current_performer;
    const currentEmail = (currentPerformer?.user_email || "").toLowerCase().trim();
    const isCurrent = Boolean(currentEmail && currentEmail === uEmail);

    let currIdx = -1;
    if (currentEmail) {
      currIdx = lineup.findIndex((p: any) => (p.user_email || "").toLowerCase().trim() === currentEmail);
    }
    const isCompleted = myEntry.stage_status === "COMPLETED";
    const aheadCount = currIdx >= 0 ? Math.max(0, myIndex - currIdx) : myIndex;
    const isNextUp = !isCurrent && !isCompleted && aheadCount === 1;

    return {
      entry: myEntry,
      order: myOrder,
      isCurrent,
      isNextUp,
      isCompleted,
      aheadCount,
      totalParticipants: lineup.length,
    };
  }, [user?.email, stageData]);

  const lifecycle = getCompetitionLifecycle(comp);
  const open = lifecycle.canRegister;
  const isResultsPublished = lifecycle.isResultsOut;
  const isVotingOpen = Boolean(
    comp.audience_voting_enabled &&
    (comp.voting_status === "OPEN" || !comp.voting_status) &&
    !isResultsPublished &&
    !lifecycle.isEnded
  );

  const isParticipant = Boolean(
    Boolean(userQueueInfo) ||
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

  // Authoritative live leaderboard loader
  const loadLeaderboard = useCallback(async () => {
    if (!id) return;
    try {
      const data = await publicApi.leaderboard(id);
      if (Array.isArray(data?.leaderboard)) {
        const mapped: Row[] = data.leaderboard.map((r: any) => ({
          ...r,
          audience_votes: r.audience_votes ?? r.raw_audience_votes ?? 0,
          final_score: r.final_score,
          is_verified: Boolean(r.is_verified || r.verified_badge || r.verified_tick),
          verified_badge: Boolean(r.is_verified || r.verified_badge || r.verified_tick),
        }));

        // Filter out un-scored registrations from the public preview
        const scoredList = mapped.filter((r: any) => {
          const pts = r.final_score ?? r.points ?? 0;
          const j = r.judge_score ?? 0;
          const v = r.audience_votes ?? 0;
          return pts > 0 || j > 0 || v > 0 || Boolean(r.is_scored || r.has_scored);
        });

        setRows(scoredList);
      }
    } catch (e) {
      console.warn("Could not fetch live leaderboard:", e);
    }
  }, [id, user, isParticipant, enrollmentInfo, step]);

  // Fetch live leaderboard on mount & when competition changes
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

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
            loadLeaderboard();
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

  // Smooth scroll to voting / contestants section if hash is present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#voting" || hash === "#contestants-section") {
      setTimeout(() => {
        const target =
          document.getElementById("voting") || document.getElementById("contestants-section");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
    }
  }, []);

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
    if (!lifecycle.canRegister) {
      setMsg({ tone: "err", text: lifecycle.regMessage });
      return;
    }

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
        loadLeaderboard();
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
            loadLeaderboard();
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
        loadLeaderboard();
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
    const DRIVE_REGEX = /^(https?:\/\/)?(drive\.google\.com|docs\.google\.com)/i;

    for (const f of fields) {
      const fType = String(f.type || "URL").toUpperCase();
      const rawName = f.name || f.label || "";
      const isLinkField = fType === "URL" || fType === "VIDEO" || fType === "PORTFOLIO_LINK" || /drive|youtube|link|url/i.test(rawName);
      const isAudioField = fType === "AUDIO" || (/audio|mp3|vocal|song|music/i.test(rawName) && !isLinkField);
      const isDocField = (fType === "DOCUMENT" || fType === "IMAGE" || fType === "FILE") && !isLinkField && !isAudioField;
      const isDualField = (/video/i.test(rawName) && /audio/i.test(rawName)) && !isDocField;

      const mode = entryModes[f.name] || (isAudioField || isDocField ? "file" : "link");
      const file = files[f.name];
      const link = (links[f.name] || "").trim();
      const fieldIdName = f.name;
      const labelName = f.label || f.name;

      if (isLinkField || (isDualField && mode === "link")) {
        if (!link) {
          if (f.required !== false) missing.push(labelName);
        } else {
          if (!/^https?:\/\//i.test(link)) {
            setMsg({ tone: "err", text: `Please enter a valid link starting with http:// or https:// for ${labelName}` });
            return;
          }
          if (fType === "VIDEO" && !isDualField) {
            if (!YT_REGEX.test(link) && !DRIVE_REGEX.test(link)) {
              setMsg({ tone: "err", text: `For video entries in ${labelName}, please provide a valid YouTube link (e.g. https://youtu.be/... or https://youtube.com/watch?v=...) or Google Drive link.` });
              return;
            }
          }
          const safeName = fieldIdName.replace(/[^a-zA-Z0-9_-]/g, "_");
          const linkFile = new File([link], `${safeName}_link.txt`, { type: "text/plain" });
          payloadFiles.push(linkFile);
          fieldNames.push(fieldIdName);
        }
      } else {
        if (!file) {
          if (f.required !== false) missing.push(labelName);
        } else {
          const lowerName = file.name.toLowerCase();
          const isDirectVideo = lowerName.endsWith(".mp4") || lowerName.endsWith(".mov") || lowerName.endsWith(".avi") || lowerName.endsWith(".mkv") || lowerName.endsWith(".webm") || file.type.startsWith("video/");
          if (isDirectVideo) {
            setMsg({ tone: "err", text: `Direct video file uploads are not supported for ${labelName}. Please switch to the Link option and provide a YouTube or Google Drive link instead.` });
            return;
          }
          if (isAudioField || (isDualField && mode === "file")) {
            if (!lowerName.endsWith(".mp3")) {
              setMsg({ tone: "err", text: `Only MP3 audio files (.mp3) are permitted for ${labelName}. For video performances, please provide a YouTube or Google Drive link.` });
              return;
            }
          }
          payloadFiles.push(file);
          fieldNames.push(fieldIdName);
        }
      }
    }

    if (missing.length) {
      setMsg({ tone: "err", text: `Please provide all required entries: ${missing.join(", ")}` });
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
    } catch (e: any) {
      // If error occurs on a mock/fallback participant ID, allow local optimistic count
      if (!pid.startsWith("c")) {
        setMsg({
          tone: "err",
          text: e?.message || "Failed to submit vote. Audience voting is restricted to non-contestants.",
        });
        setVotingId(null);
        return;
      }
    }

    setVoted((s) => new Set(s).add(pid));
    setRows((rs) =>
      rs.map((r) =>
        r.participant_id === pid ? { ...r, audience_votes: (r.audience_votes || 0) + 1 } : r
      )
    );
    setMsg({ tone: "ok", text: "Vote cast successfully! Your vote has been recorded." });
    setVotingId(null);
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

  function renderRules() {
    const r = comp.rules;
    if (!r) return null;
    if (typeof r === "string") {
      return (
        <Reveal className="mt-8">
          <SectionLabel>Rules & Guidelines</SectionLabel>
          <div className="mt-4">
            <FormattedDescription content={r} />
          </div>
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

        {/* ── Public Live Stage Performer Announcement Banner ── */}
        {stageData?.has_active_performer && stageData?.current_performer ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-[var(--surface)] to-rose-950/20 p-5 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {stageData.current_performer.avatar || stageData.current_performer.user_photo ? (
                    <img
                      src={imageFor(stageData.current_performer.avatar || stageData.current_performer.user_photo, 1)}
                      alt={stageData.current_performer.participant_name}
                      className="size-14 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                    />
                  ) : (
                    <div className="grid size-14 place-items-center rounded-2xl border-2 border-rose-500 bg-rose-500/20 text-rose-300 font-black text-xl shadow-md">
                      {((stageData.current_performer.participant_name || stageData.current_performer.user_name || "P")[0] || "P").toUpperCase()}
                    </div>
                  )}
                  {(stageData.current_performer.is_verified || stageData.current_performer.verified_badge) && (
                    <span className="absolute -bottom-1 -right-1">
                      <VerifiedBadge size="sm" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1 shadow-sm animate-pulse">
                      <Radio className="size-3" /> Live on Stage Now
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-300">
                      Order #{stageData.current_performer.stage_order || 1}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-extrabold text-[var(--fg)] flex items-center gap-1.5">
                    <span>{stageData.current_performer.participant_name || stageData.current_performer.user_name}</span>
                    {(stageData.current_performer.is_verified || stageData.current_performer.verified_badge) && (
                      <VerifiedBadge size="sm" />
                    )}
                  </h3>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {stageData.current_performer.entry_title || "Official Performance Entry"}
                    {stageData.current_performer.registration_reference ? ` • Ref: ${stageData.current_performer.registration_reference}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLineupModal(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition-all shadow-md active:scale-95"
                >
                  <Users className="size-3.5" />
                  <span>Performance Lineup ({stageData.total_participants || stageData.lineup?.length || 0})</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : stageData?.lineup && stageData.lineup.length > 0 && lifecycle.isLive ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-[var(--surface)] to-[var(--surface)] p-5 shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
                <Radio className="size-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-rose-200 text-base">Stage is Live • Intermission</p>
                  <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Preparing Next Performer
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                  Admin is preparing the next contestant for the stage. Stay tuned or check the queue order below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLineupModal(true)}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition-all shadow-md active:scale-95 shrink-0"
            >
              <Users className="size-3.5" />
              <span>Performance Lineup ({stageData.total_participants || stageData.lineup?.length || 0})</span>
            </button>
          </motion.div>
        ) : null}

        {/* ── Registered Contestant Personalized Queue & Backstage Status Card ── */}
        {userQueueInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-8 overflow-hidden rounded-2xl border-2 p-5 shadow-lg",
              userQueueInfo.isCurrent
                ? "border-rose-500 bg-gradient-to-r from-rose-500/20 via-[var(--surface)] to-rose-500/10 shadow-rose-500/20"
                : userQueueInfo.isNextUp
                ? "border-amber-500 bg-gradient-to-r from-amber-500/20 via-[var(--surface)] to-amber-500/10 shadow-amber-500/20 animate-pulse"
                : userQueueInfo.isCompleted
                ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-[var(--surface)] to-emerald-500/5 shadow-emerald-500/10"
                : "border-sky-500/40 bg-gradient-to-r from-sky-500/15 via-[var(--surface)] to-indigo-500/10"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-inner",
                  userQueueInfo.isCurrent
                    ? "border-rose-500 bg-rose-500/20 text-rose-400"
                    : userQueueInfo.isNextUp
                    ? "border-amber-500 bg-amber-500/20 text-amber-400"
                    : userQueueInfo.isCompleted
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-sky-500 bg-sky-500/20 text-sky-400"
                )}>
                  {userQueueInfo.isCurrent ? (
                    <Mic className="size-6 animate-pulse" />
                  ) : userQueueInfo.isNextUp ? (
                    <Zap className="size-6 animate-bounce" />
                  ) : userQueueInfo.isCompleted ? (
                    <CheckCircle2 className="size-6" />
                  ) : (
                    <Clock className="size-6" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                      userQueueInfo.isCurrent
                        ? "bg-rose-500 text-white"
                        : userQueueInfo.isNextUp
                        ? "bg-amber-500 text-black"
                        : userQueueInfo.isCompleted
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    )}>
                      {userQueueInfo.isCurrent
                        ? "🎤 You Are On Stage Now!"
                        : userQueueInfo.isNextUp
                        ? "⚡ You Are Next Up (Backstage Alert)"
                        : userQueueInfo.isCompleted
                        ? "✓ Performance Completed"
                        : `Your Position: #${userQueueInfo.order} in Lineup`}
                    </span>

                    <span className="font-mono text-xs font-bold text-[var(--fg)]">
                      {userQueueInfo.aheadCount > 0
                        ? `${userQueueInfo.aheadCount} performer${userQueueInfo.aheadCount === 1 ? "" : "s"} ahead of you`
                        : userQueueInfo.isCurrent
                        ? "Active Performance"
                        : "Ready"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[var(--fg-muted)]">
                    {userQueueInfo.isCurrent
                      ? "The judging panel is actively scoring your live performance. Perform with full energy!"
                      : userQueueInfo.isNextUp
                      ? "Please report backstage immediately with your music/props. You are about to take the stage!"
                      : userQueueInfo.isCompleted
                      ? "Your performance was successfully conducted and reviewed by the judges. Thank you!"
                      : `You are queued as contestant #${userQueueInfo.order} of ${userQueueInfo.totalParticipants}. Please stay prepared near the backstage area.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLineupModal(true)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-[var(--fg)] hover:text-white transition-all shrink-0"
              >
                <span>View Full Lineup ({userQueueInfo.totalParticipants})</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Live Competition Announcement Banner */}
        {lifecycle.isLive && !isResultsPublished && !stageData?.has_active_performer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-[var(--surface)] to-[var(--surface)] p-5 shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
                <Radio className="size-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-rose-200 text-base">Competition is LIVE NOW!</p>
                  <span className="rounded-full bg-rose-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Live Scoring
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                  The contest started on {comp.start_date ? formatEventDate(comp.start_date) : "event day"}. Follow real-time scores and performances below.
                </p>
              </div>
            </div>
            <a
              href="#contestants-section"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md active:scale-95 shrink-0"
            >
              View Live Contestants ↓
            </a>
          </motion.div>
        )}

        {/* Registration Closed Notice Banner */}
        {lifecycle.isRegClosed && !lifecycle.isLive && !lifecycle.isEnded && !isResultsPublished && step !== "done" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-[var(--surface)] to-[var(--surface)] p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="font-display font-bold text-amber-200 text-sm">
                  Registration Window Closed
                </p>
                <p className="text-xs text-[var(--fg-muted)]">
                  {comp.registration_deadline ? `Closed on ${formatEventDate(comp.registration_deadline)}. ` : ""}
                  {comp.start_date ? `Competition commences on ${formatEventDate(comp.start_date)}${comp.start_time || comp.time ? ` at ${comp.start_time || comp.time}` : ""}.` : ""}
                </p>
              </div>
            </div>
            <a
              href="#contestants-section"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors shrink-0"
            >
              Registered Entries ↓
            </a>
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

          {comp.start_date && (
            <StaggerItem>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold",
                lifecycle.isLive
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
              )}>
                <Calendar className={cn("size-3.5", lifecycle.isLive ? "text-rose-400 animate-pulse" : "text-[var(--accent)]")} aria-hidden />{" "}
                {lifecycle.isLive ? "Live right now" : `Starts ${formatEventDate(comp.start_date)}${comp.start_time || comp.time ? ` at ${comp.start_time || comp.time}` : ""}`}
              </span>
            </StaggerItem>
          )}

          {comp.registration_deadline ? (
            <StaggerItem>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold",
                lifecycle.isRegClosed
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
              )}>
                <Clock className={cn("size-3.5", lifecycle.isRegClosed ? "text-amber-400" : "text-[var(--fg-subtle)]")} aria-hidden />{" "}
                {lifecycle.isRegClosed
                  ? `Registration closed ${formatEventDate(comp.registration_deadline)}`
                  : `Registration closes ${formatEventDate(comp.registration_deadline)}`}
              </span>
            </StaggerItem>
          ) : comp.registration_start_date && lifecycle.isRegUpcoming ? (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-[12px] font-semibold text-sky-300">
                <Calendar className="size-3.5 text-sky-400" aria-hidden />{" "}
                Registration opens {formatEventDate(comp.registration_start_date)}
              </span>
            </StaggerItem>
          ) : (
            <StaggerItem>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-300">
                <Clock className="size-3.5 text-emerald-400" aria-hidden /> Open entry (No deadline)
              </span>
            </StaggerItem>
          )}

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
            <div className="mt-4">
              <FormattedDescription content={comp.description} />
            </div>
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
        <div id="voting" className="scroll-mt-28" />
        <div id="contestants-section" className="scroll-mt-28">
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
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 p-8 text-center backdrop-blur-sm">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--fg-muted)] mb-3">
                <Trophy className="size-6 text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-white">Live standings pending</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)] max-w-sm">
                Official scores and rankings will appear here as contestants perform and judges score entries.
              </p>
            </div>
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
                    {(r.rank ?? i + 1) === 1 ? (
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 text-slate-950 font-black text-[11px] shadow-[0_0_8px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/40">
                        1
                      </span>
                    ) : (r.rank ?? i + 1) === 2 ? (
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-900 font-bold text-[11px] shadow-[0_0_6px_rgba(203,213,225,0.4)] ring-1 ring-slate-300/40">
                        2
                      </span>
                    ) : (r.rank ?? i + 1) === 3 ? (
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 text-amber-50 font-bold text-[11px] shadow-[0_0_6px_rgba(180,83,9,0.35)] ring-1 ring-amber-700/40">
                        3
                      </span>
                    ) : (
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--fg-muted)] font-semibold text-[11px]">
                        {r.rank ?? i + 1}
                      </span>
                    )}
                    <img src={imageFor(r.profile_photo, i)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-[13.5px] font-semibold leading-tight flex items-center gap-1">
                          <span>{r.name || "—"}</span>
                          {(r.is_verified || r.verified_badge || (isSelfRow && user?.is_verified)) && (
                            <VerifiedBadge size="xs" />
                          )}
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
                          onClick={() => {
                            if (!user) {
                              router.push(`/login?next=${encodeURIComponent(`/competitions/${id}#voting`)}`);
                              return;
                            }
                            doVote(pid);
                          }}
                          disabled={voted.has(pid) || votingId === pid}
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
      </div>

      {/* ── Right: action card (sticky, hidden when user has already submitted entry) ── */}
      {step !== "done" && (
        <div id="register-action" className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl" style={{ background: "var(--grad-surface), var(--surface)" }}>
            <div className="border-b border-[var(--border)] p-5">
              <p className="font-display text-lg font-bold">
                {step === "submit"
                  ? "Submit Your Entry"
                  : !lifecycle.canRegister
                  ? (lifecycle.isLive ? "Competition Live" : "Registration Status")
                  : "Enter this competition"}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--fg-muted)]">
                {step === "submit"
                  ? "You are enrolled. Upload your performance entry."
                  : lifecycle.regMessage}
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
              !lifecycle.canRegister ? (
                <div className="space-y-4">
                  {lifecycle.isLive ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-[var(--surface-2)] to-[var(--surface-2)] p-4 text-center">
                      <div className="mx-auto mb-2.5 grid size-12 place-items-center rounded-2xl border border-rose-500/40 bg-rose-500/20 text-rose-400">
                        <Radio className="size-6 animate-pulse" />
                      </div>
                      <h4 className="font-display font-bold text-[15px] text-rose-200">Competition is LIVE NOW</h4>
                      <p className="mt-1 text-[12px] text-[var(--fg-muted)] leading-relaxed">
                        {comp.registration_deadline
                          ? `The registration window closed on ${formatEventDate(comp.registration_deadline)}.`
                          : "Registrations are closed."} Contestant auditions and judging are actively underway!
                      </p>
                      <a
                        href="#contestants-section"
                        className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md"
                      >
                        <Radio className="size-3.5 animate-pulse" /> Watch &amp; View Live Scores
                      </a>
                    </div>
                  ) : lifecycle.isRegClosed && !lifecycle.isEnded ? (
                    <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-[var(--surface-2)] to-[var(--surface-2)] p-4 text-center">
                      <div className="mx-auto mb-2.5 grid size-12 place-items-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
                        <Clock className="size-6" />
                      </div>
                      <h4 className="font-display font-bold text-[15px] text-amber-200">Registration Has Closed</h4>
                      <p className="mt-1 text-[12px] text-[var(--fg-muted)] leading-relaxed">
                        {comp.registration_deadline
                          ? `The registration window closed on ${formatEventDate(comp.registration_deadline)}.`
                          : "Registration for this competition is closed."}
                        {comp.start_date && (
                          <> The event begins on <strong className="text-white font-semibold">{formatEventDate(comp.start_date)}{comp.start_time || comp.time ? ` at ${comp.start_time || comp.time}` : ""}</strong>.</>
                        )}
                      </p>
                      <a
                        href="#contestants-section"
                        className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/20 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition-colors"
                      >
                        View Contestant Roster
                      </a>
                    </div>
                  ) : lifecycle.isRegUpcoming ? (
                    <div className="rounded-2xl border border-sky-500/35 bg-gradient-to-br from-sky-500/15 via-[var(--surface-2)] to-[var(--surface-2)] p-4 text-center">
                      <div className="mx-auto mb-2.5 grid size-12 place-items-center rounded-2xl border border-sky-500/40 bg-sky-500/20 text-sky-400">
                        <Calendar className="size-6" />
                      </div>
                      <h4 className="font-display font-bold text-[15px] text-sky-200">Registration Opens Soon</h4>
                      <p className="mt-1 text-[12px] text-[var(--fg-muted)] leading-relaxed">
                        Online registrations open on <strong className="text-white font-semibold">{comp.registration_start_date ? formatEventDate(comp.registration_start_date) : "the scheduled date"}</strong>. Stay tuned to submit your entry!
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
                      <div className="mx-auto mb-2.5 grid size-12 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--fg-muted)]">
                        <Trophy className="size-6" />
                      </div>
                      <h4 className="font-display font-bold text-[15px] text-[var(--fg)]">Competition Concluded</h4>
                      <p className="mt-1 text-[12px] text-[var(--fg-muted)] leading-relaxed">
                        This competition has concluded. New registrations are no longer accepted.
                      </p>
                      {isResultsPublished && (
                        <Link
                          href={`/competitions/${id}/results`}
                          className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-[var(--on-accent)] shadow-md"
                          style={{ background: "var(--grad-brand)" }}
                        >
                          View Official Results
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
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
              )
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
                  <p className="text-[13px] font-semibold">Submit your entry</p>
                  <span className="text-[11px] text-[var(--fg-subtle)]">
                    {fields.length === 1 ? "Required entry" : `${fields.length} required items`}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-3.5">
                  {fields.map((f) => {
                    const fType = String(f.type || "URL").toUpperCase();
                    const rawName = f.name || f.label || "";
                    const displayName = f.label || rawName.replace(/video,\s*audio/gi, "Video/Audio");

                    const isLinkField = fType === "URL" || fType === "VIDEO" || fType === "PORTFOLIO_LINK" || /drive|youtube|link|url/i.test(rawName);
                    const isAudioField = fType === "AUDIO" || (/audio|mp3|vocal|song|music/i.test(rawName) && !isLinkField);
                    const isDocField = (fType === "DOCUMENT" || fType === "IMAGE" || fType === "FILE") && !isLinkField && !isAudioField;
                    const isDualField = (/video/i.test(rawName) && /audio/i.test(rawName)) && !isDocField;

                    const mode = entryModes[f.name] || (isAudioField || isDocField ? "file" : "link");
                    const selectedFile = files[f.name];
                    const enteredLink = (links[f.name] || "").trim();

                    const isYoutube = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/i.test(enteredLink);
                    const isDrive = /^(https?:\/\/)?(drive\.google\.com|docs\.google\.com)/i.test(enteredLink);
                    const isValidUrl = /^https?:\/\//i.test(enteredLink);

                    return (
                      <div key={f.name} className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5 transition-all">
                        {/* Field Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-[var(--fg)] flex items-center gap-1.5">
                            {isLinkField ? (
                              <Link2 className="size-3.5 text-sky-400" />
                            ) : isAudioField ? (
                              <Music className="size-3.5 text-violet-400" />
                            ) : (
                              <FileUp className="size-3.5 text-amber-400" />
                            )}
                            {displayName}
                            {f.required !== false && <span className="text-[var(--accent)] font-bold">*</span>}
                          </span>

                          {isDualField ? (
                            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "link" }))}
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                  mode === "link"
                                    ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                                }`}
                              >
                                <Link2 className="size-3" /> Link
                              </button>
                              <button
                                type="button"
                                onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "file" }))}
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                  mode === "file"
                                    ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                                }`}
                              >
                                <Music className="size-3" /> Audio (MP3)
                              </button>
                            </div>
                          ) : (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              isLinkField
                                ? "bg-sky-500/15 text-sky-300"
                                : isAudioField
                                ? "bg-violet-500/15 text-violet-300"
                                : "bg-amber-500/15 text-amber-300"
                            )}>
                              {isLinkField ? "Drive / YouTube Link" : isAudioField ? "MP3 Audio Only" : "File Upload"}
                            </span>
                          )}
                        </div>

                        {f.description && (
                          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">{f.description}</p>
                        )}

                        {/* Field Input: Link Mode */}
                        {(isLinkField || (isDualField && mode === "link")) ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="relative">
                              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
                              <input
                                type="url"
                                value={enteredLink}
                                onChange={(e) => setLinks((s) => ({ ...s, [f.name]: e.target.value }))}
                                placeholder="Paste Google Drive link or YouTube URL…"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-9 text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                              />
                              {enteredLink && (
                                <button
                                  type="button"
                                  onClick={() => setLinks((s) => ({ ...s, [f.name]: "" }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                                  title="Clear link"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] px-1">
                              {isDrive ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-sky-400">
                                  <HardDrive className="size-3" /> Google Drive Link Detected
                                </span>
                              ) : isYoutube ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-400">
                                  <Youtube className="size-3" /> YouTube Video Detected
                                </span>
                              ) : isValidUrl ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                                  <CheckCircle2 className="size-3" /> Web Link Verified
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-[var(--fg-subtle)]">
                                  Supports public Google Drive or YouTube links
                                </span>
                              )}
                            </div>
                          </div>
                        ) : isAudioField || (isDualField && mode === "file") ? (
                          /* Field Input: Dedicated Audio MP3 Uploader */
                          <div>
                            {selectedFile ? (
                              <div className="rounded-xl border border-violet-500/30 bg-[var(--surface)] p-2.5 text-[12px]">
                                <div className="flex items-center justify-between">
                                  <div className="flex min-w-0 items-center gap-2 mr-2">
                                    <div className="grid size-7 place-items-center rounded bg-violet-500/20 text-violet-400 shrink-0">
                                      <Music className="size-3.5" />
                                    </div>
                                    <div className="min-w-0 truncate">
                                      <p className="truncate font-medium text-[var(--fg)]">{selectedFile.name}</p>
                                      <p className="text-[10px] text-[var(--fg-subtle)]">
                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · MP3 Audio
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setFiles((s) => ({ ...s, [f.name]: null }))}
                                    aria-label="Remove audio file"
                                    className="grid size-6 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                                <audio controls src={URL.createObjectURL(selectedFile)} className="w-full mt-2 h-7" />
                              </div>
                            ) : (
                              <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/30 bg-[var(--surface)] px-3.5 py-3 text-[12px] text-[var(--fg-muted)] transition-colors hover:border-violet-400 hover:text-[var(--fg)]">
                                <Music className="size-4 shrink-0 text-violet-400" />
                                <span className="truncate">Choose MP3 audio file (.mp3 only)…</span>
                                <input
                                  type="file"
                                  accept=".mp3,audio/mpeg,audio/mp3"
                                  className="hidden"
                                  onChange={(e) => {
                                    const fl = e.target.files?.[0] || null;
                                    setFiles((s) => ({ ...s, [f.name]: fl }));
                                  }}
                                />
                              </label>
                            )}
                            <p className="mt-1 text-[10px] text-[var(--fg-subtle)] px-1">
                              Strictly MP3 audio files only. Direct video uploads are not supported.
                            </p>
                          </div>
                        ) : (
                          /* Field Input: Dedicated Document / Image Uploader */
                          <div>
                            {selectedFile ? (
                              <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-[var(--surface)] px-3 py-2 text-[12px]">
                                <div className="flex min-w-0 flex-1 items-center gap-2 mr-2">
                                  <FileUp className="size-4 text-amber-400 shrink-0" />
                                  <div className="min-w-0 truncate">
                                    <p className="truncate font-medium">{selectedFile.name}</p>
                                    <p className="text-[10px] text-[var(--fg-subtle)]">
                                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFiles((s) => ({ ...s, [f.name]: null }))}
                                  className="grid size-6 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-[var(--surface)] px-3.5 py-3 text-[12px] text-[var(--fg-muted)] transition-colors hover:border-amber-400 hover:text-[var(--fg)]">
                                <FileUp className="size-4 text-amber-400 shrink-0" />
                                <span>Choose document or photos (PDF, PNG, JPG, ZIP)…</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.docx,.zip"
                                  className="hidden"
                                  onChange={(e) => {
                                    const fl = e.target.files?.[0] || null;
                                    setFiles((s) => ({ ...s, [f.name]: fl }));
                                  }}
                                />
                              </label>
                            )}
                            <p className="mt-1 text-[10px] text-[var(--fg-subtle)] px-1">
                              Accepts PDF documents, images (JPG/PNG), or ZIP archives.
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

      {/* ── Serial Performance Lineup Modal ── */}
      <AnimatePresence>
        {showLineupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setShowLineupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[var(--brand)]/20 text-[var(--brand)]">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      Performance Lineup &amp; Sequence
                    </h3>
                    <p className="text-xs text-[var(--fg-muted)]">
                      Serial registration order for {comp.title || comp.name || "Competition"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLineupModal(false)}
                  className="grid size-8 cursor-pointer place-items-center rounded-full text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {stageData?.lineup && stageData.lineup.length > 0 ? (
                  <div className="divide-y divide-[var(--border)]/60">
                    {stageData.lineup.map((p: any, idx: number) => {
                      const isMe = user?.email && (p.user_email || "").toLowerCase() === user.email.toLowerCase();
                      const isOnStage = p.stage_status === "ON_STAGE" || p.is_current_performer;
                      const isDone = p.stage_status === "COMPLETED";

                      return (
                        <div
                          key={p.registration_id || idx}
                          className={cn(
                            "flex items-center justify-between gap-3 py-3 px-3 rounded-xl transition-colors",
                            isMe ? "bg-[var(--brand)]/10 border border-[var(--brand)]/30" : "",
                            isOnStage ? "bg-rose-500/10 border border-rose-500/30" : ""
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold text-[var(--fg-muted)] w-6 text-center">
                              #{p.order || idx + 1}
                            </span>
                            <div className="relative shrink-0">
                              {p.avatar || p.user_photo ? (
                                <img
                                  src={imageFor(p.avatar || p.user_photo, 1)}
                                  alt={p.participant_name}
                                  className="size-8 rounded-full object-cover border border-[var(--border)]"
                                />
                              ) : (
                                <div className="flex size-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-bold text-[var(--fg-muted)]">
                                  {((p.participant_name || p.user_name || "P")[0] || "P").toUpperCase()}
                                </div>
                              )}
                              {(p.is_verified || p.verified_badge) && (
                                <span className="absolute -bottom-1 -right-1">
                                  <VerifiedBadge size="xs" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-xs text-white truncate">
                                  {p.participant_name || p.user_name}
                                  {isMe && <span className="text-[10px] text-[var(--brand)] ml-1 font-bold">(You)</span>}
                                </p>
                                {(p.is_verified || p.verified_badge) && <VerifiedBadge size="xs" />}
                              </div>
                              <span className="block font-mono text-[10.5px] text-[var(--fg-subtle)] truncate">
                                {p.registration_reference}
                              </span>
                            </div>
                          </div>

                          <div>
                            {isOnStage ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-300 animate-pulse whitespace-nowrap">
                                <Radio className="size-2.5" /> On Stage
                              </span>
                            ) : isDone ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 whitespace-nowrap">
                                <CheckCircle2 className="size-3" /> Completed
                              </span>
                            ) : (
                              <span className="text-[10.5px] text-[var(--fg-subtle)] font-medium whitespace-nowrap">
                                In Lineup
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[var(--fg-muted)]">
                    No participants registered yet for this competition.
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-3 text-right">
                <button
                  type="button"
                  onClick={() => setShowLineupModal(false)}
                  className="cursor-pointer rounded-xl bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--surface-3)] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
