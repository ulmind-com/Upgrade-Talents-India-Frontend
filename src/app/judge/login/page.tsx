"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, KeyRound, Gavel, ShieldCheck, Star, Award } from "lucide-react";
import { judgeAuthApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const formV: Variants = {
  hidden: { opacity: 0, x: 64 },
  show: {
    opacity: 1, x: 0,
    transition: { type: "spring", stiffness: 120, damping: 16, mass: 0.9, staggerChildren: 0.08, delayChildren: 0.18 },
  },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const STEPS = [
  { n: 1, label: "Email", Icon: Mail },
  { n: 2, label: "Verify", Icon: KeyRound },
];

export default function JudgeLoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setNotice(null);
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter the email your administration registered you with.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await judgeAuthApi.loginStep1(email.trim());
      setNotice(`A 6-digit verification code was sent to ${email}. It expires in 10 minutes.`);
      setStep(2);
    } catch (err: any) {
      setFormError(err?.message || "Could not send verification code. Make sure your email is registered as a Judge.");
    } finally { setLoading(false); }
  };

  const submitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!/^\d{4,8}$/.test(otp.trim())) errs.otp = "Enter the code exactly as it appears in your email.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await judgeAuthApi.loginStep2(email.trim(), otp.trim());
      tokenStore.set(res.access_token);
      await refresh();
      setNotice("Welcome, Judge! Redirecting to your panel…");
      setTimeout(() => router.push("/judge"), 800);
    } catch (err: any) {
      setFormError(err?.message || "Invalid verification code. Please request a new one and try again.");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      eyebrow={`Judges Panel — Step ${step} of 2`}
      title="Judge Sign\u2011In"
      subtitle="Secure, passwordless access to your private scoring panel."
      aside={
        <motion.div
          initial={{ opacity: 0, scale: 0.92, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]"
        >
          <img src={imageFor(null, 5)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent 20%, var(--bg) 92%)" }} aria-hidden />

          {/* Floating badge */}
          <div className="absolute left-6 top-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-4 py-2 backdrop-blur-md"
            >
              <Gavel className="size-4 text-[var(--accent)]" />
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Judges Only</span>
            </motion.div>
          </div>

          <ul className="absolute inset-x-8 bottom-8 flex flex-col gap-4">
            {[
              { Icon: ShieldCheck, t: "Passwordless OTP authentication" },
              { Icon: Star, t: "Private scoring dashboard" },
              { Icon: Award, t: "Live competition judging" },
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
      {/* Progress */}
      <ol className="mb-9 flex items-center gap-2" aria-label="Login progress">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={[
                  "grid size-9 shrink-0 place-items-center rounded-full border text-[12px] font-bold transition-colors duration-400",
                  done && "border-transparent bg-[var(--success)] text-white",
                  active && "border-transparent text-[var(--on-accent)]",
                  !done && !active && "border-[var(--border)] text-[var(--fg-subtle)]",
                ].filter(Boolean).join(" ")}
                style={active ? { background: "var(--grad-brand)" } : undefined}
              >
                {done ? <ShieldCheck className="size-4" aria-hidden /> : <s.Icon className="size-4" aria-hidden />}
              </span>
              <span className={`hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:block ${active ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className={`h-px flex-1 transition-colors ${done ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="mb-5 empty:hidden">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        {!formError && notice && <FormAlert tone="success">{notice}</FormAlert>}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="s1" onSubmit={submitStep1} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Field label="Registered email" hint="The email your administration assigned to you." error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id} type="email" inputMode="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-describedby={describedBy} invalid={invalid}
                  placeholder="judge@eventora.com"
                />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Send verification code <ArrowRight className="size-4" aria-hidden />
            </Button>

            <p className="text-center text-[13px] text-[var(--fg-muted)]">
              Not a judge?{" "}
              <Link href="/login" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">Sign in as participant</Link>
            </p>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="s2" onSubmit={submitStep2} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Field label="Verification code" hint={`Sent to ${email}`} error={errors.otp} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  aria-describedby={describedBy} invalid={invalid} placeholder="------"
                  className="text-center font-mono text-2xl tracking-[0.5em]"
                />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Verify & sign in <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div className="flex items-center justify-between gap-4">
              <Button onClick={() => { setStep(1); setFormError(null); setNotice(null); }} variant="ghost" size="sm">
                <ArrowLeft className="size-4" aria-hidden /> Change email
              </Button>
              <Button onClick={() => submitStep1(new Event("submit") as any)} variant="ghost" size="sm">
                Resend code
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
