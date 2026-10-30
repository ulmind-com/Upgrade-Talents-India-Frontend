"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Ticket, ShieldCheck, Sparkles, Gavel, ScanLine, AlertCircle } from "lucide-react";
import { authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
// Form is "pushed" into place with a spring, its fields cascade in after.
const formV: Variants = {
  hidden: { opacity: 0, x: 64 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 16, mass: 0.9, staggerChildren: 0.08, delayChildren: 0.18 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* ─── Google SVG Icon ─── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh, isJudge, isVolunteer } = useAuth();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isJudge) router.replace("/judge");
    else if (isVolunteer) router.replace("/volunteer");
  }, [isJudge, isVolunteer, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const next_errors: typeof errors = {};
    if (!email.trim()) next_errors.email = "Enter the email you registered with.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next_errors.email = "That doesn't look like a valid email address.";
    if (!password) next_errors.password = "Enter your password.";
    setErrors(next_errors);
    if (Object.keys(next_errors).length) return;

    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      tokenStore.set(res.access_token);
      const me = await authApi.me().catch(() => null);
      if (me?.role) tokenStore.setRole(me.role);
      await refresh();
      const role = (me?.role || "").toUpperCase();
      if (role === "JUDGE") {
        router.push("/judge");
      } else if (role === "VOLUNTEER") {
        router.push("/volunteer");
      } else if (
        res.requires_profile_completion ||
        !res.is_profile_completed ||
        !res.profile_completed ||
        me?.requires_profile_completion ||
        !me?.is_profile_completed ||
        !me?.profile_completed ||
        !me?.phone_number ||
        !me?.date_of_birth ||
        !me?.address ||
        !me?.parent_phone_number
      ) {
        router.push("/complete-profile");
      } else {
        router.push(next);
      }
    } catch (err: any) {
      setFormError(err?.message || "Could not sign you in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const { signInWithGoogle } = await import("@/lib/firebase");
      const { idToken } = await signInWithGoogle();
      const res = await authApi.googleLogin(idToken);
      tokenStore.set(res.access_token);
      const me = await authApi.me().catch(() => null);
      if (me?.role) tokenStore.setRole(me.role);
      await refresh();
      const role = (me?.role || "").toUpperCase();
      if (role === "JUDGE") {
        router.push("/judge");
      } else if (role === "VOLUNTEER") {
        router.push("/volunteer");
      } else if (
        res.requires_profile_completion ||
        !res.is_profile_completed ||
        !res.profile_completed ||
        me?.requires_profile_completion ||
        !me?.is_profile_completed ||
        !me?.profile_completed ||
        !me?.phone_number ||
        !me?.date_of_birth ||
        !me?.address ||
        !me?.parent_phone_number
      ) {
        router.push("/complete-profile");
      } else {
        router.push(next);
      }
    } catch (err: any) {
      // Don't show error if user just closed the popup
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") return;
      setFormError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Access your tickets, bookings and certificates."
      aside={
        <motion.div
          initial={{ opacity: 0, scale: 0.92, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]"
        >
          <img src={imageFor(null, 1)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent, var(--bg) 92%)" }} aria-hidden />
          <ul className="absolute inset-x-8 bottom-8 flex flex-col gap-4">
            {[
              { Icon: Ticket, t: "All your QR passes in one place" },
              { Icon: ShieldCheck, t: "Secure, verified bookings" },
              { Icon: Sparkles, t: "Early access to new drops" },
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
      <motion.form onSubmit={submit} noValidate variants={formV} initial="hidden" animate="show" className="flex flex-col gap-5">
        {formError && <motion.div variants={itemV}><FormAlert tone="error">{formError}</FormAlert></motion.div>}

        <motion.div variants={itemV}>
        <Field label="Email address" error={errors.email} required>
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
              placeholder="you@example.com"
            />
          )}
        </Field>
        </motion.div>

        <motion.div variants={itemV}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-[13px] font-semibold text-[var(--fg)]">
                Password <span className="text-[var(--accent)]" aria-hidden>*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] font-semibold text-[var(--accent)] transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!errors.password}
                placeholder="••••••••"
                className="pr-14"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
              >
                {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-start gap-1.5 text-[12px] text-[var(--danger)]">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {errors.password}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemV} className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
            />
            <span>Remember this device</span>
          </label>
        </motion.div>

        <motion.div variants={itemV}>
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Sign in <ArrowRight className="size-4" aria-hidden />
          </Button>
        </motion.div>

        {/* ── Divider ── */}
        <motion.div variants={itemV} className="flex items-center gap-4">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-subtle)]">or</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </motion.div>

        {/* ── Google Sign-In Button ── */}
        <motion.div variants={itemV}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="group relative flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-sm font-semibold text-[var(--fg)] transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_8px_30px_-8px_rgba(66,133,244,0.3)] disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-400 group-hover:opacity-100" style={{ background: "linear-gradient(115deg, rgba(66,133,244,0.12), rgba(234,67,53,0.08), rgba(251,188,5,0.08), rgba(52,168,83,0.08))" }} />
            {googleLoading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-[var(--fg-subtle)] border-t-[var(--accent)]" />
            ) : (
              <GoogleIcon className="size-5" />
            )}
            <span className="tracking-[0.04em]">Continue with Google</span>
          </button>
        </motion.div>

        {/* ── Role Links ── */}
        <motion.div variants={itemV} className="flex items-center justify-center gap-5">
          <Link href="/judge/login" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--fg-subtle)] transition-colors hover:text-[var(--accent)]">
            <Gavel className="size-3.5" aria-hidden />
            Judge Panel
          </Link>
          <span className="size-1 rounded-full bg-[var(--border-strong)]" aria-hidden />
          <Link href="/volunteer/login" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--fg-subtle)] transition-colors hover:text-[var(--cyan)]">
            <ScanLine className="size-3.5" aria-hidden />
            Volunteer Gate
          </Link>
        </motion.div>

        <motion.p variants={itemV} className="text-center text-[13px] text-[var(--fg-muted)]">
          New here?{" "}
          <Link href="/register" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            Create an account
          </Link>
        </motion.p>
      </motion.form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  );
}
