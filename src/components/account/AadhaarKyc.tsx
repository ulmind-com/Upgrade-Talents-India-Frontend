"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Lock, Loader2, X, ArrowRight, RotateCcw,
  AlertCircle, CheckCircle2, Smartphone, FileCheck2, UserCheck, CalendarDays, MapPin,
  ExternalLink, Sparkles, RefreshCw, KeyRound
} from "lucide-react";
import { kycApi, digilockerApi, type KycStatus } from "@/lib/api";
import { usePageScrollLock } from "@/components/motion/Providers";
import { Button } from "@/components/ui/Primitives";
import { formatEventDate } from "@/lib/utils";

const OTP_LENGTH = 6;
const OTP_WINDOW_SECONDS = 10 * 60;

const digitsOnly = (v: string) => v.replace(/\D/g, "");
const groupAadhaar = (v: string) => digitsOnly(v).slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ").trim();

/* ═══════════════════════════════════════════════════════════════════
   PANEL — Lives in the dashboard profile tab
   ═══════════════════════════════════════════════════════════════════ */

export default function AadhaarKyc() {
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Check both standard KYC status and official DigiLocker OAuth status
      const [stdRes, oauthRes] = await Promise.allSettled([
        kycApi.status(),
        digilockerApi.status(),
      ]);

      const std = stdRes.status === "fulfilled" ? stdRes.value : null;
      const oauth = oauthRes.status === "fulfilled" ? oauthRes.value : null;

      if (oauth?.verified || oauth?.kyc_status === "VERIFIED") {
        setKyc({
          ...std,
          ...oauth,
          status: "VERIFIED",
          is_verified: true,
          verified: true,
          source: oauth.verification_source || "DIGILOCKER_OAUTH",
        });
      } else if (std?.is_verified || std?.status === "VERIFIED") {
        setKyc(std);
      } else {
        setKyc(oauth || std || null);
      }
    } catch {
      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for the official postMessage from DigiLocker popup callback
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "DIGILOCKER_VERIFIED" && event.data?.status === "VERIFIED") {
        setNotice("DigiLocker verification succeeded! Updating your profile…");
        load();
        setTimeout(() => setNotice(null), 4000);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [load]);

  const verified = !!kyc?.is_verified || kyc?.status === "VERIFIED" || kyc?.verified === true;

  /* ── 1-Click Official DigiLocker OAuth Window ── */
  async function launchOfficialDigiLocker() {
    setOauthLoading(true);
    setNotice(null);
    try {
      const res = await digilockerApi.getAuthorizeUrl();
      if (!res.authorization_url) {
        throw new Error(res.message || "Failed to generate authorization URL");
      }

      const w = 620;
      const h = 760;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;

      const popup = window.open(
        res.authorization_url,
        "eventora_digilocker_window",
        `width=${w},height=${h},left=${left},top=${top},status=yes,toolbar=no,menubar=no,location=yes,scrollbars=yes`
      );

      if (!popup) {
        // Popup blocked — navigate or open tab
        window.open(res.authorization_url, "_blank");
      }

      // Check for popup close & re-verify status
      const pollTimer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollTimer);
          setOauthLoading(false);
          await load();
        }
      }, 1500);
    } catch (e: any) {
      setNotice(e?.message || "Could not launch DigiLocker portal. You can enter Aadhaar number directly.");
      setOauthLoading(false);
    }
  }

  /* ── Revoke / Reset Verification (Dev / Testing) ── */
  async function handleRevoke() {
    if (!confirm("Are you sure you want to reset your DigiLocker verification status?")) return;
    setRevoking(true);
    try {
      await digilockerApi.revoke();
      await load();
    } catch (e: any) {
      alert(e?.message || "Could not reset verification status.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-lg transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            {verified ? (
              <ShieldCheck className="size-4.5 text-green-400" aria-hidden />
            ) : (
              <ShieldAlert className="size-4.5 text-[var(--accent)]" aria-hidden />
            )}
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-[var(--fg)]">
              Government ID Verification
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Official DigiLocker · MeitY, Govt. of India
            </p>
          </div>
        </div>

        {verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-semibold text-green-400">
            <CheckCircle2 className="size-3.5" aria-hidden /> Verified
          </span>
        ) : (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Not verified
          </span>
        )}
      </div>

      {notice && (
        <div className="mx-7 mt-5 flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-xs text-[var(--accent)]">
          <Sparkles className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 px-7 py-8 text-sm text-[var(--fg-muted)]">
          <Loader2 className="size-4 animate-spin text-[var(--accent)]" aria-hidden />
          Checking your DigiLocker verification status…
        </div>
      ) : verified ? (
        <>
          <dl className="divide-y divide-[var(--border)]">
            {[
              { k: "Masked Aadhaar", v: kyc?.aadhaar_masked, icon: Lock, mono: true },
              { k: "Verified Name", v: kyc?.verified_name, icon: UserCheck },
              { k: "Date of Birth", v: kyc?.verified_dob ? formatEventDate(kyc.verified_dob) : null, icon: CalendarDays },
              { k: "Address on Record", v: kyc?.verified_address, icon: MapPin },
              { k: "Verification ID", v: kyc?.verification_id, icon: KeyRound, mono: true },
              { k: "Verified On", v: kyc?.verified_at ? formatEventDate(kyc.verified_at) : null, icon: FileCheck2 },
            ]
              .filter((row) => row.v)
              .map((row) => (
                <div key={row.k} className="flex items-start justify-between gap-6 px-7 py-4.5">
                  <dt className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    <row.icon className="size-3.5 text-green-400" aria-hidden /> {row.k}
                  </dt>
                  <dd className={`text-right text-sm font-semibold [overflow-wrap:anywhere] ${row.mono ? "font-mono tracking-[0.12em]" : ""}`}>
                    {row.v}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-7 py-4 text-[11px] text-[var(--fg-subtle)]">
            <span>
              Verified via official Government of India DigiLocker integration. No raw Aadhaar number is stored.
            </span>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="ml-4 shrink-0 text-red-400 hover:underline disabled:opacity-50"
            >
              {revoking ? "Resetting…" : "Reset / Re-verify"}
            </button>
          </div>
        </>
      ) : (
        <div className="px-7 py-6">
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Verify once through official DigiLocker to unlock prize payouts, verified certificates, and access to all competitions. Zero physical document scans or manual file uploads needed.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {[
              { icon: Smartphone, text: "DigiLocker & UIDAI dispatch the official OTP directly to your registered mobile" },
              { icon: FileCheck2, text: "Your legal name, date of birth and address are extracted and verified automatically" },
              { icon: Lock, text: "Only a permanently masked identity (XXXX-XXXX-1234) is retained for duplicate prevention" },
            ].map((row) => (
              <li key={row.text} className="flex items-start gap-2.5 text-[13px] text-[var(--fg-muted)]">
                <row.icon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                {row.text}
              </li>
            ))}
          </ul>

          {/* Action buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={launchOfficialDigiLocker}
              disabled={oauthLoading}
              className="flex-1 shadow-lg shadow-[var(--accent)]/15"
            >
              {oauthLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="size-4" aria-hidden />
              )}
              {oauthLoading ? "Opening DigiLocker Portal…" : "Verify with DigiLocker"}
              <ExternalLink className="size-3.5 ml-1 opacity-70" />
            </Button>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs font-semibold text-[var(--fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <KeyRound className="size-3.5" />
              Enter Aadhaar Number Directly
            </button>
          </div>
        </div>
      )}

      {/* Portal-rendered Modal to prevent any ancestor transform / navbar clipping bug */}
      <KycModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onVerified={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL — Portaled directly to document.body (Zero Navbar Overlap!)
   ═══════════════════════════════════════════════════════════════════ */

type Step = "aadhaar" | "otp" | "done";

function KycModal({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("aadhaar");
  const [aadhaar, setAadhaar] = useState("");
  const [reference, setReference] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_WINDOW_SECONDS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; duplicate?: boolean } | null>(null);
  const [details, setDetails] = useState<{ name?: string; date_of_birth?: string; address?: string } | null>(null);
  const [maskedAadhaar, setMaskedAadhaar] = useState("");

  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  usePageScrollLock(open, onClose);

  useEffect(() => {
    if (!open) return;
    setStep("aadhaar");
    setAadhaar("");
    setReference("");
    setMaskedMobile("");
    setSandboxOtp(null);
    setMode(null);
    setOtp(Array(OTP_LENGTH).fill(""));
    setErr(null);
    setDetails(null);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (step !== "otp") return;
    setSecondsLeft(OTP_WINDOW_SECONDS);
    const t = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, reference]);

  const rawAadhaar = digitsOnly(aadhaar);
  const otpValue = otp.join("");

  async function sendOtp(resend = false) {
    setBusy(true);
    setErr(null);
    try {
      const res = await kycApi.sendOtp(rawAadhaar);
      setReference(res.reference_id);
      setMaskedMobile(res.masked_mobile || "");
      setMode(res.mode || null);

      // If backend is in sandbox mode, capture the test OTP so user is never stuck
      if (res.sandbox_otp) {
        setSandboxOtp(res.sandbox_otp);
      } else if (res.mode === "sandbox") {
        setSandboxOtp("123456");
      } else {
        setSandboxOtp(null);
      }

      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      if (resend) setSecondsLeft(OTP_WINDOW_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 80);
    } catch (e: any) {
      const text = e?.message || "Could not send the OTP. Please check the Aadhaar number.";
      setErr({ text, duplicate: /already registered/i.test(text) });
    } finally {
      setBusy(false);
    }
  }

  function autofillSandboxOtp() {
    const code = sandboxOtp || "123456";
    const digits = code.split("").slice(0, OTP_LENGTH);
    setOtp(digits);
    boxes.current[OTP_LENGTH - 1]?.focus();
  }

  async function verify() {
    setBusy(true);
    setErr(null);
    try {
      const res = await kycApi.verifyOtp(reference, otpValue);
      setDetails(res.verified_details || null);
      setMaskedAadhaar(res.aadhaar_masked || "");
      setStep("done");
    } catch (e: any) {
      const text = e?.message || "Verification failed. Please try again.";
      setErr({ text, duplicate: /already registered/i.test(text) });
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 80);
    } finally {
      setBusy(false);
    }
  }

  function setOtpAt(i: number, value: string) {
    const v = digitsOnly(value);
    if (!v) {
      setOtp((prev) => prev.map((c, idx) => (idx === i ? "" : c)));
      return;
    }
    setOtp((prev) => {
      const next = [...prev];
      v.split("").slice(0, OTP_LENGTH - i).forEach((d, k) => {
        next[i + k] = d;
      });
      return next;
    });
    const landed = Math.min(i + v.length, OTP_LENGTH - 1);
    boxes.current[landed]?.focus();
  }

  function onOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft === 0;

  if (!open || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md transition-opacity"
        style={{ background: "rgba(0, 0, 0, 0.75)" }}
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        role="dialog"
        aria-modal="true"
        aria-label="Verify your government ID"
        className="relative flex max-h-[min(90dvh,760px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl z-10"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase text-[var(--fg)]">
              <ShieldCheck className="size-4.5 text-[var(--accent)]" aria-hidden /> DigiLocker Verification
            </h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              {step === "done" ? "Complete" : step === "otp" ? "Step 2 of 2 — Enter OTP" : "Step 1 of 2 — Aadhaar number"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Progress rail */}
        <div className="flex shrink-0 gap-1.5 px-6 pt-5">
          {["aadhaar", "otp", "done"].map((s, i) => {
            const active = ["aadhaar", "otp", "done"].indexOf(step) >= i;
            return (
              <span
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  active ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]"
                }`}
              />
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6" data-lenis-prevent>
          {err && (
            <div
              className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                err.duplicate
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{err.text}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "aadhaar" && (
              <motion.div
                key="aadhaar"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex flex-col gap-5"
              >
                <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  Enter your 12-digit Aadhaar number. DigiLocker will dispatch a one-time verification password to the mobile number registered with UIDAI.
                </p>

                <div>
                  <label htmlFor="aadhaar" className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
                    12-Digit Aadhaar Number
                  </label>
                  <input
                    id="aadhaar"
                    inputMode="numeric"
                    autoComplete="off"
                    value={groupAadhaar(aadhaar)}
                    onChange={(e) => setAadhaar(digitsOnly(e.target.value).slice(0, 12))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && rawAadhaar.length === 12 && !busy) sendOtp();
                    }}
                    placeholder="0000 0000 0000"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center font-mono text-lg font-semibold tracking-[0.18em] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
                    {rawAadhaar.length}/12 digits · Verified against official UIDAI Verhoeff algorithm
                  </p>
                </div>

                <Button onClick={() => sendOtp()} disabled={rawAadhaar.length !== 12 || busy} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                  {busy ? "Requesting OTP…" : "Send OTP"}
                </Button>

                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Your full Aadhaar number is never stored on any server — only a masked reference (XXXX-XXXX-1234).
                </p>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex flex-col gap-5"
              >
                <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  We sent a 6-digit code{maskedMobile ? <> to <span className="font-semibold text-[var(--fg)]">{maskedMobile}</span></> : " to your Aadhaar-linked mobile"}.
                </p>

                {/* Sandbox / Development Helper Callout */}
                {sandboxOtp && (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs text-sky-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-sky-300" /> Test Mode Active
                      </span>
                      <button
                        type="button"
                        onClick={autofillSandboxOtp}
                        className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition-colors hover:bg-sky-500/30 active:scale-95"
                      >
                        Autofill OTP ({sandboxOtp})
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-sky-300/80">
                      Live SMS gateway is running in sandbox mode. Enter OTP <strong>{sandboxOtp}</strong> or <strong>123456</strong>.
                    </p>
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        boxes.current[i] = el;
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={OTP_LENGTH}
                      value={digit}
                      onChange={(e) => setOtpAt(i, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(i, e)}
                      aria-label={`Digit ${i + 1}`}
                      className="size-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center font-mono text-lg font-bold text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent)]"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className={expired ? "text-red-400" : "text-[var(--fg-subtle)]"}>
                    {expired ? "Code expired" : `Expires in ${mm}:${ss}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => sendOtp(true)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> Resend OTP
                  </button>
                </div>

                <Button onClick={verify} disabled={otpValue.length !== OTP_LENGTH || busy || expired} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                  {busy ? "Verifying with DigiLocker…" : "Verify & Finish"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("aadhaar");
                    setErr(null);
                  }}
                  className="text-center text-[11px] font-semibold text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors"
                >
                  Use a different Aadhaar number
                </button>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-5 py-4 text-center"
              >
                <span className="grid size-16 place-items-center rounded-full border border-green-500/40 bg-green-500/10">
                  <ShieldCheck className="size-8 text-green-400" aria-hidden />
                </span>
                <div>
                  <h4 className="font-display text-xl font-bold uppercase text-[var(--fg)]">Identity Verified</h4>
                  <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
                    Successfully verified through Government of India DigiLocker integration.
                  </p>
                </div>

                <dl className="w-full divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left">
                  {[
                    { k: "Masked Aadhaar", v: maskedAadhaar },
                    { k: "Name", v: details?.name },
                    { k: "Date of Birth", v: details?.date_of_birth },
                    { k: "Address", v: details?.address },
                  ]
                    .filter((r) => r.v)
                    .map((r) => (
                      <div key={r.k} className="flex items-start justify-between gap-5 px-4 py-3">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">{r.k}</dt>
                        <dd className="text-right text-[13px] font-semibold text-[var(--fg)] [overflow-wrap:anywhere]">{r.v}</dd>
                      </div>
                    ))}
                </dl>

                <Button onClick={onVerified} className="w-full">
                  <CheckCircle2 className="size-4" aria-hidden /> Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
