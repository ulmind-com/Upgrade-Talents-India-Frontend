"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Upload,
  Check,
  Mail,
  KeyRound,
  UserRound,
  Sparkles,
  Coins,
  Gift,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Calendar,
  Users,
  Camera,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { authApi, tokenStore, rewardsApi } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input, DateInput } from "@/components/ui/Form";
import { OtpVerify } from "@/components/ui/OtpVerify";
import { Button } from "@/components/ui/Primitives";
import { cn, imageFor } from "@/lib/utils";
import { GoogleLoadingOverlay } from "@/components/ui/GoogleLoadingOverlay";

const STEPS = [
  { n: 1, label: "Email", Icon: Mail },
  { n: 2, label: "Verify", Icon: KeyRound },
  { n: 3, label: "Profile", Icon: UserRound },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ name?: string | null; email?: string | null; photo?: string | null } | null>(null);
  const [authProcessing, setAuthProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // step 1
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [referralInfo, setReferralInfo] = useState<{
    valid?: boolean;
    inviter_name?: string;
    inviter_full_name?: string;
    inviter_photo?: string | null;
    welcome_coins?: number;
    welcome_coins_value_inr?: number;
    message?: string;
    loading?: boolean;
  } | null>(null);

  // Auto-detect referral code from URL query ?ref=XYZ
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const r = p.get("ref") || p.get("referral");
      if (r) {
        setReferral(r.toUpperCase().trim());
      }
    }
  }, []);

  // Validate referral code with backend
  useEffect(() => {
    const code = referral.trim().toUpperCase();
    if (!code || code.length < 3) {
      setReferralInfo(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setReferralInfo((prev) => ({ ...prev, loading: true }));
        const res = await rewardsApi.validateReferral(code);
        if (isMounted) {
          if (res && res.valid) {
            setReferralInfo({
              valid: true,
              inviter_name: res.inviter_name,
              inviter_full_name: res.inviter_full_name,
              inviter_photo: res.inviter_photo,
              welcome_coins: res.welcome_coins || 50,
              welcome_coins_value_inr: res.welcome_coins_value_inr || 25,
              message: res.message,
              loading: false
            });
          } else {
            setReferralInfo({ valid: false, loading: false });
          }
        }
      } catch (e) {
        if (isMounted) setReferralInfo({ valid: false, loading: false });
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [referral]);

  // step 2
  const [otp, setOtp] = useState("");
  // step 3
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (file: File | null) => {
    setPhoto(file);
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const { signInWithGoogle } = await import("@/lib/firebase");
      const { idToken, name, email, photo } = await signInWithGoogle();

      // Show Ultra Pro Lottie loading overlay once Google account is selected
      setGoogleUser({ name, email, photo });
      setAuthProcessing(true);

      const res = await authApi.googleLogin(idToken, referral.trim() || undefined);
      tokenStore.set(res.access_token);
      if (res.role) tokenStore.setRole(res.role);
      await refresh();
      const role = (res.role || "").toUpperCase();
      if (role === "JUDGE") {
        router.push("/judge");
      } else if (role === "VOLUNTEER") {
        router.push("/volunteer");
      } else if (
        res.requires_profile_completion ||
        !res.is_profile_completed ||
        !res.profile_completed ||
        !res.user?.phone_number ||
        !res.user?.date_of_birth ||
        !res.user?.address ||
        !res.user?.parent_phone_number
      ) {
        router.push("/complete-profile");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setAuthProcessing(false);
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") return;
      setFormError(err?.message || "Google sign-up failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setNotice(null);
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await authApi.registerStep1(email.trim(), referral.trim() || undefined);
      setNotice("Code sent — it expires shortly.");
      setStep(2);
    } catch (err: any) {
      setFormError(err?.message || "Could not start registration. Try again.");
    } finally { setLoading(false); }
  };

  // The card drives the choreography; this just does the network bit
  // and throws, which the card reads as "wrong code".
  const verifyCode = async (otp: string) => {
    setFormError(null);
    const res = await authApi.registerStep2(email.trim(), otp);
    const regToken = res?.access_token || res?.registration_token || res?.token;
    if (regToken) tokenStore.setReg(regToken);
  };

  const submitStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanParentPhone = parentPhone.replace(/\D/g, "");

    if (!name.trim()) errs.name = "Enter your full name.";
    if (!cleanPhone || cleanPhone.length < 10) errs.phone = "Enter a valid 10-digit mobile number.";
    if (!cleanParentPhone || cleanParentPhone.length < 10) errs.parentPhone = "Enter a valid 10-digit parent/guardian phone number.";
    if (!dob) errs.dob = "Select your date of birth.";
    if (!address.trim()) errs.address = "Enter your residential address.";
    if (password.length < 6) errs.password = "Use at least 6 characters.";
    if (password !== confirm) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please fix the highlighted fields below.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("password", password);
      fd.append("confirm_password", confirm);
      fd.append("name", name.trim());
      fd.append("phone_number", cleanPhone);
      fd.append("date_of_birth", dob);
      fd.append("address", address.trim());
      fd.append("parent_phone_number", cleanParentPhone);
      if (photo) fd.append("profile_photo", photo);

      const res = await authApi.registerStep3(fd);
      tokenStore.clearReg();
      if (res?.access_token) {
        tokenStore.set(res.access_token);
        await refresh();
        if (
          res.requires_profile_completion ||
          !res.is_profile_completed ||
          !res.profile_completed
        ) {
          router.push("/complete-profile");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setFormError(err?.message || "Could not complete registration. Please review your details.");
    } finally { setLoading(false); }
  };

  if (!authLoading && user) {
    return (
      <section className="grid min-h-dvh place-items-center">
        <p className="font-mono text-xs text-[var(--fg-muted)] animate-pulse">Redirecting to dashboard...</p>
      </section>
    );
  }

  return (
    <AuthShell
      eyebrow={`Step 0${step} of 03`}
      title={step === 3 ? "Artist Profile" : "Join the stage"}
      subtitle={
        step === 3
          ? "Set up your verified artist details & password to claim your stage pass."
          : "Create your account to book tickets, enter competitions and collect certificates."
      }
      aside={
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]">
          <img src={imageFor(null, 3)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent, var(--bg) 92%)" }} aria-hidden />
        </div>
      }
    >
      {/* Progress */}
      <ol className="mb-6 sm:mb-9 flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid size-8 sm:size-9 shrink-0 place-items-center rounded-full border text-[11px] sm:text-[12px] font-bold transition-colors duration-400",
                  done && "border-transparent bg-[var(--success)] text-white",
                  active && "border-transparent text-[var(--on-accent)]",
                  !done && !active && "border-[var(--border)] text-[var(--fg-subtle)]"
                )}
                style={active ? { background: "var(--grad-brand)" } : undefined}
              >
                {done ? <Check className="size-3.5 sm:size-4" aria-hidden /> : <s.Icon className="size-3.5 sm:size-4" aria-hidden />}
              </span>
              <span className={cn("hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:block", active ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1 transition-colors", done ? "bg-[var(--success)]" : "bg-[var(--border)]")} aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="mb-4 sm:mb-5 empty:hidden">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        {!formError && notice && <FormAlert tone="success">{notice}</FormAlert>}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="s1" onSubmit={submitStep1} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-3.5 sm:gap-5"
          >
            {/* Google Sign-Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="group relative flex h-11 sm:h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-sm font-semibold text-[var(--fg)] transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_8px_30px_-8px_rgba(66,133,244,0.3)] disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-400 group-hover:opacity-100" style={{ background: "linear-gradient(115deg, rgba(66,133,244,0.12), rgba(234,67,53,0.08), rgba(251,188,5,0.08), rgba(52,168,83,0.08))" }} />
              {googleLoading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-[var(--fg-subtle)] border-t-[var(--accent)]" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span className="tracking-[0.02em]">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-0.5 sm:py-1">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-subtle)]">or with email</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Field label="Email address" hint="We'll send a verification code here." error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" inputMode="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="you@example.com" />
              )}
            </Field>

            <Field
              label="Referral code"
              hint={
                referralInfo?.valid
                  ? `✓ Invite applied from ${referralInfo.inviter_name || "a member"} • +${referralInfo.welcome_coins || 60} free coins on signup`
                  : "Optional — if a friend invited you."
              }
            >
              {({ id }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type="text"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value.toUpperCase())}
                    placeholder="e.g. EVNT6F3HFS"
                    className={referralInfo?.valid ? "border-emerald-500/50 pr-10 text-emerald-400 font-mono tracking-wider font-semibold" : ""}
                  />
                  {referralInfo?.valid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" title="Verified Referral Code">
                      <CheckCircle2 className="size-4" />
                    </span>
                  )}
                  {referralInfo?.loading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 size-4 border-2 border-gray-400 border-t-amber-400 rounded-full animate-spin" />
                  )}
                </div>
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-1 sm:mt-2 w-full">
              Send verification code <ArrowRight className="size-4" aria-hidden />
            </Button>

            <p className="text-center text-[13px] text-[var(--fg-muted)]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">Sign in</Link>
            </p>
          </motion.form>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <OtpVerify
              length={6}
              email={email}
              onVerify={verifyCode}
              onSuccess={() => {
                setNotice("Email verified. Finish your profile to activate the account.");
                setStep(3);
              }}
              successTitle="Email Verified"
              successSubtitle="Taking you to your profile details…"
              footer={
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => { setStep(1); setFormError(null); setNotice(null); }} variant="ghost" size="sm">
                    <ArrowLeft className="size-4" aria-hidden /> Change email
                  </Button>
                  <span className="size-1 rounded-full bg-[var(--border-strong)]" aria-hidden />
                  <Button onClick={() => submitStep1(new Event("submit") as any)} variant="ghost" size="sm" loading={loading}>
                    Resend code
                  </Button>
                </div>
              }
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.form
            key="s3" onSubmit={submitStep3} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4 sm:gap-5 w-full max-w-full"
          >
            {/* Top Interactive Artist Avatar Frame */}
            <div className="flex flex-col items-center justify-center text-center pt-1 pb-1">
              <div
                className="relative group cursor-pointer"
                onClick={() => photoRef.current?.click()}
                title="Tap to select profile photo"
              >
                <div className="relative size-22 sm:size-26 rounded-full p-1 border-2 border-[var(--accent)] bg-[var(--surface-2)] shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--accent-hover)]">
                  <div className="size-full overflow-hidden rounded-full grid place-items-center bg-[var(--surface)]">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <User className="size-9 sm:size-11 text-[var(--fg-muted)]" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    photoRef.current?.click();
                  }}
                  aria-label="Upload photo"
                  className="absolute bottom-0 right-0 grid size-8 sm:size-8.5 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  style={{ background: "var(--grad-brand)" }}
                >
                  <Camera className="size-3.5" />
                </button>
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
              />
              <p className="mt-2 text-xs font-semibold text-[var(--fg)] truncate max-w-[280px]">
                {photo ? photo.name : "Tap to set artist avatar"}
              </p>
              <span className="text-[10.5px] text-[var(--fg-subtle)]">
                {photo ? "Photo selected • tap to change" : "Optional — lets judges identify you"}
              </span>
            </div>

            {/* ── CARD 1: PERSONAL INFORMATION ── */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-3.5 sm:p-4.5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--border)]/70">
                <span className="grid size-6 place-items-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                  <User className="size-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)] font-mono">
                  Personal Information
                </span>
              </div>

              {/* Full Name */}
              <Field label="Full Name" error={errors.name} required>
                {({ id, describedBy, invalid }) => (
                  <div className="relative">
                    <Input
                      id={id}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      placeholder="e.g. Rahul Sharma"
                      className="pl-11"
                    />
                    <User className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                  </div>
                )}
              </Field>

              {/* Date of Birth */}
              <Field label="Date of Birth" error={errors.dob} hint="Used to verify age bracket for competition rules" required>
                {({ id, describedBy, invalid }) => (
                  <DateInput
                    id={id}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    aria-describedby={describedBy}
                    invalid={invalid}
                  />
                )}
              </Field>
            </div>

            {/* ── CARD 2: CONTACT & RESIDENCE ── */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-3.5 sm:p-4.5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--border)]/70">
                <span className="grid size-6 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Phone className="size-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)] font-mono">
                  Contact &amp; Guardian Details
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Mobile Number" error={errors.phone} required>
                  {({ id, describedBy, invalid }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        placeholder="9876543210"
                        className="pl-11"
                      />
                      <Phone className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                    </div>
                  )}
                </Field>

                <Field label="Parent / Guardian Phone" error={errors.parentPhone} hint="Emergency contact" required>
                  {({ id, describedBy, invalid }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        type="tel"
                        inputMode="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        placeholder="9876543211"
                        className="pl-11"
                      />
                      <Users className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                    </div>
                  )}
                </Field>
              </div>

              <Field label="Residential Address" error={errors.address} hint="City, State, and Pincode for certificates and prizes" required>
                {({ id, describedBy, invalid }) => (
                  <div className="relative">
                    <Input
                      id={id}
                      autoComplete="street-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      placeholder="e.g. Kolkata, West Bengal 700001"
                      className="pl-11"
                    />
                    <MapPin className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                  </div>
                )}
              </Field>
            </div>

            {/* ── CARD 3: ACCOUNT SECURITY ── */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-3.5 sm:p-4.5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-[var(--border)]/70">
                <span className="grid size-6 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                  <Lock className="size-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)] font-mono">
                  Account Password
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Create Password" error={errors.password} required>
                  {({ id, describedBy, invalid }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        placeholder="••••••••"
                        className="pl-11 pr-12"
                      />
                      <Lock className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="absolute right-2 top-2.5 grid size-7 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
                      >
                        {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      </button>
                    </div>
                  )}
                </Field>

                <Field label="Confirm Password" error={errors.confirm} required>
                  {({ id, describedBy, invalid }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        placeholder="••••••••"
                        className="pl-11"
                      />
                      <Lock className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
                    </div>
                  )}
                </Field>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="mt-2 w-full h-12 sm:h-13 text-[14.5px] sm:text-[15px] font-bold shadow-xl shadow-[var(--accent)]/15 active:scale-[0.99] transition-transform cursor-pointer"
            >
              Complete Registration &amp; Enter Stage <ArrowRight className="size-4" aria-hidden />
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--fg-subtle)]">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>256-bit Secure SSL • Official Talent Identity</span>
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Ultra Pro Lottie Loading Overlay ── */}
      <GoogleLoadingOverlay
        open={authProcessing}
        user={googleUser}
        title="Please wait..."
        subtitle="Creating your account & preparing your dashboard…"
      />
    </AuthShell>
  );
}
