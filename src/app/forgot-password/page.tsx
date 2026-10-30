"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, KeyRound, Lock, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthShell, Field, FormAlert, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const formV: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.3, ease: EASE } },
};

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  // Step 2
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; otp?: string; password?: string; confirm?: string }>({});

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Please enter your registered email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await authApi.forgotPasswordRequest(email.trim().toLowerCase());
      setNotice(res.message || "A 6-digit password reset passcode has been dispatched to your email.");
      setStep(2);
    } catch (err: any) {
      setFormError(err?.message || "Could not find an account associated with this email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanOtp = otp.trim().replace(/\D/g, "");
    const errs: typeof errors = {};
    if (!cleanOtp || cleanOtp.length !== 6) errs.otp = "Enter the 6-digit passcode sent to your email.";
    if (!newPassword) errs.password = "Enter your new password.";
    else if (newPassword.length < 8) errs.password = "Password must be at least 8 characters long.";
    if (newPassword !== confirmPassword) errs.confirm = "Passwords do not match.";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await authApi.forgotPasswordConfirm(
        email.trim().toLowerCase(),
        cleanOtp,
        newPassword,
        confirmPassword
      );
      setNotice(null);
      setStep(3);
    } catch (err: any) {
      setFormError(err?.message || "Failed to reset password. Please verify your OTP code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={step === 3 ? "All done" : `Step 0${step} of 02`}
      title={step === 3 ? "Password updated" : "Reset your password"}
      subtitle={
        step === 1
          ? "Enter your email address and we'll send a 6-digit passcode to reset your password."
          : step === 2
          ? `Enter the 6-digit passcode sent to ${email} and create your new password.`
          : "Your password has been changed successfully. You can now log in."
      }
      aside={
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]"
        >
          <img src={imageFor(null, 2)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent, var(--bg) 92%)" }} aria-hidden />
          <ul className="absolute inset-x-8 bottom-8 flex flex-col gap-4">
            {[
              { Icon: Lock, t: "End-to-end encrypted password recovery" },
              { Icon: KeyRound, t: "Single-use 10-minute security passcodes" },
              { Icon: ShieldCheck, t: "Instant fraud and takeover protection" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--grad-brand)" }}>
                  <f.Icon className="size-4 text-white" aria-hidden />
                </span>
                {f.t}
              </li>
            ))}
          </ul>
        </motion.div>
      }
    >
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step1"
            onSubmit={handleRequestOtp}
            noValidate
            variants={formV}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col gap-5"
          >
            {formError && <FormAlert tone="error">{formError}</FormAlert>}

            <Field label="Registered email address" error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="you@example.com"
                    className="pl-11"
                  />
                  <Mail className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                </div>
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Send verification code <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <ArrowLeft className="size-3.5" aria-hidden /> Return to sign in
              </Link>
            </div>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="step2"
            onSubmit={handleResetPassword}
            noValidate
            variants={formV}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col gap-5"
          >
            {formError && <FormAlert tone="error">{formError}</FormAlert>}
            {notice && <FormAlert tone="success">{notice}</FormAlert>}

            {/* 6-digit OTP code */}
            <Field
              label="6-Digit Reset Passcode"
              error={errors.otp}
              hint="Check your inbox or spam folder for the 6-digit security code."
              required
            >
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="123456"
                    className="font-mono text-center tracking-[0.3em] text-lg font-bold"
                  />
                  <KeyRound className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                </div>
              )}
            </Field>

            {/* New Password */}
            <Field label="New password" error={errors.password} hint="At least 8 characters." required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="••••••••"
                    className="pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
                  >
                    {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>

            {/* Confirm New Password */}
            <Field label="Re-type new password" error={errors.confirm} required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="••••••••"
                    className="pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
                  >
                    {showConfirm ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Save new password <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div className="flex items-center justify-between text-[12.5px]">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFormError(null);
                  setNotice(null);
                  setOtp("");
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <ArrowLeft className="size-3.5" /> Re-enter email
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            variants={formV}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center text-center py-4 space-y-5"
          >
            <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="size-9" />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-[var(--fg)]">
                Password Saved Successfully
              </h3>
              <p className="mt-2 text-sm text-[var(--fg-muted)] max-w-sm leading-relaxed">
                Your password for <strong className="text-[var(--fg)]">{email}</strong> has been updated. You can now log in using your new credentials.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => router.push("/login")}
              className="w-full mt-4"
            >
              Sign in now <ArrowRight className="size-4" aria-hidden />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
