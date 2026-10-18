"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Lock, Loader2, X, ArrowRight, RotateCcw,
  AlertCircle, CheckCircle2, Smartphone, FileCheck2, UserCheck, CalendarDays, MapPin,
} from "lucide-react";
import { kycApi, type KycStatus } from "@/lib/api";
import { usePageScrollLock } from "@/components/motion/Providers";
import { Button } from "@/components/ui/Primitives";
import { formatEventDate } from "@/lib/utils";

const OTP_LENGTH = 6;
const OTP_WINDOW_SECONDS = 10 * 60;

const digitsOnly = (v: string) => v.replace(/\D/g, "");
const groupAadhaar = (v: string) => digitsOnly(v).slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ").trim();

/* ═══════════════════════════════════════════════════════════════════
   PANEL — lives in the dashboard profile tab
   ═══════════════════════════════════════════════════════════════════ */

export default function AadhaarKyc() {
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setKyc(await kycApi.status());
    } catch {
      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const verified = !!kyc?.is_verified || kyc?.status === "VERIFIED";

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-[var(--fg)]">
          {verified ? (
            <ShieldCheck className="size-4.5 text-green-400" aria-hidden />
          ) : (
            <ShieldAlert className="size-4.5 text-[var(--accent)]" aria-hidden />
          )}
          Government ID
        </h3>
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

      {loading ? (
        <div className="flex items-center gap-3 px-7 py-8 text-sm text-[var(--fg-muted)]">
          <Loader2 className="size-4 animate-spin text-[var(--accent)]" aria-hidden />
          Checking your verification status…
        </div>
      ) : verified ? (
        <>
          <dl className="divide-y divide-[var(--border)]">
            {[
              { k: "Aadhaar", v: kyc?.aadhaar_masked, icon: Lock, mono: true },
              { k: "Verified Name", v: kyc?.verified_name, icon: UserCheck },
              { k: "Date of Birth", v: kyc?.verified_dob ? formatEventDate(kyc.verified_dob) : null, icon: CalendarDays },
              { k: "Address on Record", v: kyc?.verified_address, icon: MapPin },
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
          <p className="border-t border-[var(--border)] px-7 py-4 text-[11px] text-[var(--fg-subtle)]">
            Pulled straight from {kyc?.source === "DIGILOCKER" ? "DigiLocker" : kyc?.source || "DigiLocker"} — we never store your full Aadhaar number.
          </p>
        </>
      ) : (
        <div className="px-7 py-6">
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Verify once with DigiLocker to unlock prize payouts, official certificates and age-restricted competitions.
            No documents to scan or upload.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {[
              { icon: Smartphone, text: "An OTP goes to the mobile linked to your Aadhaar" },
              { icon: FileCheck2, text: "Your name, date of birth and address come back verified" },
              { icon: Lock, text: "Only a masked number (XXXX XXXX 1234) is kept on record" },
            ].map((row) => (
              <li key={row.text} className="flex items-start gap-2.5 text-[13px] text-[var(--fg-muted)]">
                <row.icon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                {row.text}
              </li>
            ))}
          </ul>

          <Button onClick={() => setOpen(true)} className="mt-7 w-full">
            <ShieldCheck className="size-4" aria-hidden /> Verify with DigiLocker
          </Button>
        </div>
      )}

      <KycModal
        open={open}
        onClose={() => setOpen(false)}
        onVerified={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL — Aadhaar number, then the OTP
   ═══════════════════════════════════════════════════════════════════ */

type Step = "aadhaar" | "otp" | "done";

function KycModal({
  open, onClose, onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<Step>("aadhaar");
  const [aadhaar, setAadhaar] = useState("");
  const [reference, setReference] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_WINDOW_SECONDS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; duplicate?: boolean } | null>(null);
  const [details, setDetails] = useState<{ name?: string; date_of_birth?: string; address?: string } | null>(null);
  const [maskedAadhaar, setMaskedAadhaar] = useState("");

  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  usePageScrollLock(open, onClose);

  useEffect(() => {
    if (!open) return;
    setStep("aadhaar");
    setAadhaar("");
    setReference("");
    setMaskedMobile("");
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
      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      if (resend) setSecondsLeft(OTP_WINDOW_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 80);
    } catch (e: any) {
      const text = e?.message || "Could not send the OTP. Please try again.";
      setErr({ text, duplicate: /already registered/i.test(text) });
    } finally {
      setBusy(false);
    }
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
    // A paste of the whole code lands in one box — spread it across the row.
    setOtp((prev) => {
      const next = [...prev];
      v.split("").slice(0, OTP_LENGTH - i).forEach((d, k) => { next[i + k] = d; });
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "var(--scrim)" }} onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Verify your government ID"
        className="relative flex max-h-[min(90dvh,760px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase">
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
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${active ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]"}`}
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
                  Enter your 12-digit Aadhaar number. DigiLocker will send a one-time password to the mobile
                  number linked to it.
                </p>

                <div>
                  <label htmlFor="aadhaar" className="block font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1.5">
                    Aadhaar Number
                  </label>
                  <input
                    id="aadhaar"
                    inputMode="numeric"
                    autoComplete="off"
                    value={groupAadhaar(aadhaar)}
                    onChange={(e) => setAadhaar(digitsOnly(e.target.value).slice(0, 12))}
                    onKeyDown={(e) => { if (e.key === "Enter" && rawAadhaar.length === 12 && !busy) sendOtp(); }}
                    placeholder="0000 0000 0000"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center font-mono text-lg font-semibold tracking-[0.18em] outline-none focus:border-[var(--accent)]"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
                    {rawAadhaar.length}/12 digits · checked against the UIDAI checksum
                  </p>
                </div>

                <Button onClick={() => sendOtp()} disabled={rawAadhaar.length !== 12 || busy} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
                  {busy ? "Sending OTP…" : "Send OTP"}
                </Button>

                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Your full Aadhaar number is never stored — only a masked form such as XXXX XXXX 1234.
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

                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxes.current[i] = el; }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={OTP_LENGTH}
                      value={digit}
                      onChange={(e) => setOtpAt(i, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(i, e)}
                      aria-label={`Digit ${i + 1}`}
                      className="size-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center font-mono text-lg font-bold outline-none transition-colors focus:border-[var(--accent)]"
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
                  {busy ? "Verifying…" : "Verify & Finish"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("aadhaar"); setErr(null); }}
                  className="text-center text-[11px] font-semibold text-[var(--fg-subtle)] hover:text-[var(--accent)]"
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
                  <h4 className="font-display text-xl font-bold uppercase">Identity Verified</h4>
                  <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
                    Straight from DigiLocker — nothing to upload.
                  </p>
                </div>

                <dl className="w-full divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left">
                  {[
                    { k: "Aadhaar", v: maskedAadhaar },
                    { k: "Name", v: details?.name },
                    { k: "Date of Birth", v: details?.date_of_birth },
                    { k: "Address", v: details?.address },
                  ]
                    .filter((r) => r.v)
                    .map((r) => (
                      <div key={r.k} className="flex items-start justify-between gap-5 px-4 py-3">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">{r.k}</dt>
                        <dd className="text-right text-[13px] font-semibold [overflow-wrap:anywhere]">{r.v}</dd>
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
}
