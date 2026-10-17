"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Ticket, ShieldCheck, Sparkles } from "lucide-react";
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

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      await refresh();
      router.push(next);
    } catch (err: any) {
      setFormError(err?.message || "Could not sign you in. Check your details and try again.");
    } finally {
      setLoading(false);
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
        <Field label="Password" error={errors.password} required>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
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
          )}
        </Field>
        </motion.div>

        <motion.div variants={itemV}>
          <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
            Sign in <ArrowRight className="size-4" aria-hidden />
          </Button>
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
