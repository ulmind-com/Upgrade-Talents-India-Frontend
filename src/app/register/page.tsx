"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Upload, Check, Mail, KeyRound, UserRound } from "lucide-react";
import { authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { cn, imageFor } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Email", Icon: Mail },
  { n: 2, label: "Verify", Icon: KeyRound },
  { n: 3, label: "Profile", Icon: UserRound },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // step 1
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
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
  const [govtId, setGovtId] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const govtRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

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
      setNotice(`We sent a 6-digit code to ${email}. It expires shortly.`);
      setStep(2);
    } catch (err: any) {
      setFormError(err?.message || "Could not start registration. Try again.");
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
      const res = await authApi.registerStep2(email.trim(), otp.trim());
      const regToken = res?.access_token || res?.registration_token || res?.token;
      if (regToken) tokenStore.setReg(regToken);
      setNotice("Email verified. Finish your profile to activate the account.");
      setStep(3);
    } catch (err: any) {
      setFormError(err?.message || "That code wasn't accepted. Request a new one and try again.");
    } finally { setLoading(false); }
  };

  const submitStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Enter your full name.";
    if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) errs.phone = "Enter a valid phone number.";
    if (!dob) errs.dob = "Select your date of birth.";
    if (!address.trim()) errs.address = "Enter your address.";
    if (password.length < 6) errs.password = "Use at least 6 characters.";
    if (password !== confirm) errs.confirm = "Passwords don't match.";
    if (!govtId) errs.govtId = "A government ID proof is required.";
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
      fd.append("phone_number", phone.replace(/\D/g, ""));
      fd.append("date_of_birth", dob);
      fd.append("address", address.trim());
      if (parentPhone.trim()) fd.append("parent_phone_number", parentPhone.replace(/\D/g, ""));
      if (photo) fd.append("profile_photo", photo);
      if (govtId) fd.append("govt_id_proof", govtId);

      const res = await authApi.registerStep3(fd);
      tokenStore.clearReg();
      if (res?.access_token) {
        tokenStore.set(res.access_token);
        await refresh();
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setFormError(err?.message || "Could not complete registration. Please review your details.");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell
      eyebrow={`Step 0${step} of 03`}
      title="Join the stage"
      subtitle="Create your account to book tickets, enter competitions and collect certificates."
      aside={
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]">
          <img src={imageFor(null, 3)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent, var(--bg) 92%)" }} aria-hidden />
        </div>
      }
    >
      {/* Progress */}
      <ol className="mb-9 flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border text-[12px] font-bold transition-colors duration-400",
                  done && "border-transparent bg-[var(--success)] text-white",
                  active && "border-transparent text-[var(--on-accent)]",
                  !done && !active && "border-[var(--border)] text-[var(--fg-subtle)]"
                )}
                style={active ? { background: "var(--grad-brand)" } : undefined}
              >
                {done ? <Check className="size-4" aria-hidden /> : <s.Icon className="size-4" aria-hidden />}
              </span>
              <span className={cn("hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:block", active ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1 transition-colors", done ? "bg-[var(--success)]" : "bg-[var(--border)]")} aria-hidden />}
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
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <Field label="Email address" hint="We'll send a verification code here." error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" inputMode="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="you@example.com" />
              )}
            </Field>

            <Field label="Referral code" hint="Optional — if a friend invited you.">
              {({ id }) => (
                <Input id={id} type="text" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="e.g. UTI2026" />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Send verification code <ArrowRight className="size-4" aria-hidden />
            </Button>

            <p className="text-center text-[13px] text-[var(--fg-muted)]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">Sign in</Link>
            </p>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="s2" onSubmit={submitStep2} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <Field label="Verification code" hint={`Sent to ${email}`} error={errors.otp} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  aria-describedby={describedBy} invalid={invalid} placeholder="------"
                  className="text-center font-mono text-2xl tracking-[0.5em]" />
              )}
            </Field>

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Verify email <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div className="flex items-center justify-between gap-4">
              <Button onClick={() => { setStep(1); setFormError(null); }} variant="ghost" size="sm">
                <ArrowLeft className="size-4" aria-hidden /> Change email
              </Button>
              <Button onClick={() => submitStep1(new Event("submit") as any)} variant="ghost" size="sm">
                Resend code
              </Button>
            </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form
            key="s3" onSubmit={submitStep3} noValidate
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <Field label="Full name" error={errors.name} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
                  aria-describedby={describedBy} invalid={invalid} placeholder="Your full name" />
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone number" error={errors.phone} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type="tel" inputMode="tel" autoComplete="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="9876543210" />
                )}
              </Field>
              <Field label="Parent's phone" hint="Required for minors.">
                {({ id }) => (
                  <Input id={id} type="tel" inputMode="tel" value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)} placeholder="Optional" />
                )}
              </Field>
            </div>

            <Field label="Date of birth" error={errors.dob} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="date" autoComplete="bday" value={dob}
                  onChange={(e) => setDob(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>

            <Field label="Address" error={errors.address} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} autoComplete="street-address" value={address}
                  onChange={(e) => setAddress(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="City, state, pincode" />
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Password" error={errors.password} required>
                {({ id, describedBy, invalid }) => (
                  <div className="relative">
                    <Input id={id} type={showPw ? "text" : "password"} autoComplete="new-password" value={password}
                      onChange={(e) => setPassword(e.target.value)} aria-describedby={describedBy} invalid={invalid}
                      placeholder="••••••••" className="pr-14" />
                    <button type="button" onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-1.5 grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--fg)]">
                      {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                  </div>
                )}
              </Field>
              <Field label="Confirm password" error={errors.confirm} required>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="••••••••" />
                )}
              </Field>
            </div>

            {/* Uploads */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Government ID proof" hint="Aadhaar, PAN or passport." error={errors.govtId} required>
                {({ id, describedBy, invalid }) => (
                  <>
                    <input ref={govtRef} id={id} type="file" accept="image/*,.pdf" className="sr-only"
                      aria-describedby={describedBy}
                      onChange={(e) => setGovtId(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => govtRef.current?.click()}
                      className={cn(
                        "flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 text-left text-[13px] transition-colors hover:border-[var(--accent)]",
                        invalid ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
                      )}>
                      <Upload className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                      <span className="truncate text-[var(--fg-muted)]">{govtId?.name || "Choose a file"}</span>
                    </button>
                  </>
                )}
              </Field>

              <Field label="Profile photo" hint="Optional.">
                {({ id }) => (
                  <>
                    <input ref={photoRef} id={id} type="file" accept="image/*" className="sr-only"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => photoRef.current?.click()}
                      className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-4 text-left text-[13px] transition-colors hover:border-[var(--accent)]">
                      <Upload className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                      <span className="truncate text-[var(--fg-muted)]">{photo?.name || "Choose a photo"}</span>
                    </button>
                  </>
                )}
              </Field>
            </div>

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Complete registration <ArrowRight className="size-4" aria-hidden />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
