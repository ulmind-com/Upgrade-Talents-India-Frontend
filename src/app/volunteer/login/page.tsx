"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, KeyRound, ScanLine, ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { volunteerAuthApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input } from "@/components/ui/Form";
import { OtpVerify } from "@/components/ui/OtpVerify";
import { Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function VolunteerLoginPage() {
  const router = useRouter();
  const { refresh, isVolunteer } = useAuth();

  // Mode: "password" vs "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // OTP Steps: 1 = Email, 2 = Verify OTP, 3 = First-time Set Password
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Set password inputs for Step 3
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (isVolunteer) router.replace("/volunteer");
  }, [isVolunteer, router]);

  // ── Password Direct Login ──
  const submitPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Enter a valid registered volunteer email.";
    }
    if (!password) {
      errs.password = "Enter your password.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await volunteerAuthApi.loginPassword(email.trim(), password);
      tokenStore.set(res.access_token);
      tokenStore.setRole("VOLUNTEER");
      await refresh();
      router.replace("/volunteer");
    } catch (err: any) {
      const msg = err?.message || "Sign in failed. Check your email and password.";
      setFormError(msg);
      // If password hasn't been set yet, prompt switching to OTP
      if (msg.toLowerCase().includes("not been set")) {
        setNotice("Tip: Switch to 'Sign in with OTP' below to verify and create your permanent password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Step 1: Send Code ──
  const submitOtpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Enter the email your administration registered you with.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await volunteerAuthApi.loginStep1(email.trim());
      setNotice("Verification code sent — valid for 10 minutes.");
      setStep(2);
    } catch (err: any) {
      setFormError(err?.message || "Could not send verification code. Make sure your email is registered as a Volunteer.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Step 2: Verify Code ──
  const verifyCode = async (otp: string) => {
    setFormError(null);
    const res = await volunteerAuthApi.loginStep2(email.trim(), otp);
    tokenStore.set(res.access_token);
    tokenStore.setRole("VOLUNTEER");

    // Check if password has been set previously
    if (!res.has_password) {
      setNotice("OTP verified successfully! Please set your permanent password for future direct logins.");
      setStep(3);
    } else {
      await refresh();
      router.replace("/volunteer");
    }
  };

  // ── OTP Step 3: Set Permanent Password ──
  const submitSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const errs: Record<string, string> = {};
    if (newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters long.";
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await volunteerAuthApi.setPassword(newPassword, confirmPassword);
      setNotice("Password set successfully! Opening gate scanner terminal…");
      await refresh();
      setTimeout(() => {
        router.replace("/volunteer");
      }, 1000);
    } catch (err: any) {
      setFormError(err?.message || "Could not set password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={
        authMode === "password"
          ? "Volunteer Check-In — Direct Access"
          : `Volunteer Check-In — OTP Step ${step} of ${step === 3 ? "3" : "2"}`
      }
      title="Volunteer Sign‑In"
      subtitle="Access the gate scanner to verify tickets and admit attendees."
      aside={
        <motion.div
          initial={{ opacity: 0, scale: 0.92, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]"
        >
          <img src={imageFor(null, 2)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent 20%, var(--bg) 92%)" }} aria-hidden />

          {/* Floating badge */}
          <div className="absolute left-6 top-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[color-mix(in_srgb,var(--cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--cyan)_12%,transparent)] px-4 py-2 backdrop-blur-md"
            >
              <ScanLine className="size-4 text-[var(--cyan)]" />
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--cyan)]">Gate Control</span>
            </motion.div>
          </div>

          <ul className="absolute inset-x-8 bottom-8 flex flex-col gap-4">
            {[
              { Icon: KeyRound, t: "Instant password or secure OTP login" },
              { Icon: ScanLine, t: "High-speed camera & laser QR scanner" },
              { Icon: ShieldCheck, t: "Multi-person group admission verification" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-500/20 text-cyan-300">
                  <f.Icon className="size-4 text-cyan-400" aria-hidden />
                </span>
                {f.t}
              </li>
            ))}
          </ul>
        </motion.div>
      }
    >
      {/* ── Mode Switcher Tab (Password vs OTP) ── */}
      {step !== 3 && (
        <div className="mb-7 flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setFormError(null);
              setNotice(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              authMode === "password"
                ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            <Lock className="size-3.5" /> Password Sign‑In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setStep(1);
              setFormError(null);
              setNotice(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              authMode === "otp"
                ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            <Mail className="size-3.5" /> OTP / Set Password
          </button>
        </div>
      )}

      <div aria-live="polite" className="mb-5 empty:hidden">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        {!formError && notice && <FormAlert tone="success">{notice}</FormAlert>}
      </div>

      <AnimatePresence mode="wait">
        {/* ══════════ 1. PASSWORD LOGIN FORM ══════════ */}
        {authMode === "password" && step !== 3 && (
          <motion.form
            key="password-mode"
            onSubmit={submitPasswordLogin}
            noValidate
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col gap-4"
          >
            <Field label="Registered Email" hint="Your registered volunteer account email." error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="volunteer@upgradetalentsindia.in"
                />
              )}
            </Field>

            <Field label="Permanent Password" error={errors.password} required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Sign In to Gate Scanner <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div className="mt-2 flex flex-col items-center gap-2 text-center text-[12.5px] text-[var(--fg-muted)]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("otp");
                  setStep(1);
                  setFormError(null);
                  setNotice(null);
                }}
                className="font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                First time logging in or forgot password? Sign in with OTP
              </button>
              <p>
                Not a volunteer?{" "}
                <Link href="/login" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                  Sign in as participant
                </Link>
              </p>
            </div>
          </motion.form>
        )}

        {/* ══════════ 2. OTP STEP 1: EMAIL ══════════ */}
        {authMode === "otp" && step === 1 && (
          <motion.form
            key="otp-s1"
            onSubmit={submitOtpStep1}
            noValidate
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <Field label="Registered Email" hint="The email your administration registered you with." error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="volunteer@upgradetalentsindia.in"
                />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Send Verification Code <ArrowRight className="size-4" aria-hidden />
            </Button>

            <p className="text-center text-[13px] text-[var(--fg-muted)]">
              Already have a password?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline cursor-pointer"
              >
                Sign in with Password
              </button>
            </p>
          </motion.form>
        )}

        {/* ══════════ 3. OTP STEP 2: VERIFY CODE ══════════ */}
        {authMode === "otp" && step === 2 && (
          <motion.div
            key="otp-s2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <OtpVerify
              length={6}
              email={email}
              onVerify={verifyCode}
              onSuccess={() => {}}
              successTitle="Access Granted"
              successSubtitle="Opening gate scanner terminal…"
              footer={
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setStep(1);
                      setFormError(null);
                      setNotice(null);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <ArrowLeft className="size-4" aria-hidden /> Change email
                  </Button>
                  <span className="size-1 rounded-full bg-[var(--border-strong)]" aria-hidden />
                  <Button onClick={() => submitOtpStep1(new Event("submit") as any)} variant="ghost" size="sm" loading={loading}>
                    Resend code
                  </Button>
                </div>
              }
            />
          </motion.div>
        )}

        {/* ══════════ 4. STEP 3: SET PERMANENT PASSWORD (FIRST TIME) ══════════ */}
        {step === 3 && (
          <motion.form
            key="set-pwd-s3"
            onSubmit={submitSetPassword}
            noValidate
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
              <span className="grid size-10 place-items-center rounded-xl bg-cyan-500 text-black">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[var(--fg)]">Set Your Permanent Password</h3>
                <p className="text-[12px] text-[var(--fg-muted)]">
                  Next time you sign in, you can log in directly using your email and password.
                </p>
              </div>
            </div>

            <Field label="New Password" hint="Minimum 8 characters" error={errors.newPassword} required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="Create a strong password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Field>

            <Field label="Confirm Password" error={errors.confirmPassword} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="Re-enter your new password"
                />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Save Password & Enter Scanner <CheckCircle2 className="size-4" />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
