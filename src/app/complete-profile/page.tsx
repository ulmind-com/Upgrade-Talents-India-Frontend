"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Phone, MapPin, Users, Camera, ArrowRight,
  ShieldCheck, CheckCircle2, Sparkles, LogOut, CalendarCheck2
} from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input, DateInput } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { cn, imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

function formatReadableDob(iso: string): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh: refreshAuth, logout } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboardInset, setKeyboardInset] = useState(0);

  // Track mobile virtual keyboard height so lower fields & submit button never get buried behind it
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const syncViewport = () => {
      const obscured = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKeyboardInset(obscured > 90 ? obscured + 24 : 0);
    };
    syncViewport();
    vv.addEventListener("resize", syncViewport);
    vv.addEventListener("scroll", syncViewport);
    return () => {
      vv.removeEventListener("resize", syncViewport);
      vv.removeEventListener("scroll", syncViewport);
    };
  }, []);

  // Keep whichever input is being typed centered comfortably between top navbar and mobile keyboard
  const handleFormFocusCapture = (e: React.FocusEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target || !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    window.setTimeout(() => {
      const container = target.closest("[data-field-row]") || target;
      container.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      if (
        user.is_profile_completed &&
        user.profile_completed &&
        user.phone_number &&
        user.date_of_birth &&
        user.address &&
        user.parent_phone_number
      ) {
        router.replace("/dashboard");
        return;
      }

      setName(user.name || "");
      if (user.phone_number) setPhone(String(user.phone_number));
      if (user.date_of_birth) setDob(user.date_of_birth.slice(0, 10));
      if (user.address) setAddress(user.address);
      if (user.parent_phone_number) setParentPhone(String(user.parent_phone_number));
      if (user.profile_photo) setPhotoPreview(user.profile_photo);
    }
  }, [authLoading, user, router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const cleanPhone = phone.replace(/\D/g, "");
  const cleanParentPhone = parentPhone.replace(/\D/g, "");

  const completion = useMemo(() => {
    const checks = [
      Boolean(name.trim()),
      Boolean(dob),
      cleanPhone.length >= 10,
      cleanParentPhone.length >= 10,
      Boolean(address.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: 5, pct: Math.round((done / 5) * 100) };
  }, [name, dob, cleanPhone, cleanParentPhone, address]);

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Enter your full name.";
    if (!cleanPhone || cleanPhone.length < 10) errs.phone = "Enter a valid 10-digit mobile number.";
    if (!dob) errs.dob = "Select your date of birth.";
    if (!address.trim()) errs.address = "Enter your complete residential address.";
    if (!cleanParentPhone || cleanParentPhone.length < 10) {
      errs.parentPhone = "Enter a valid 10-digit parent or guardian phone number.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError("Please fill out all mandatory fields below.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone_number", cleanPhone);
      fd.append("date_of_birth", dob);
      fd.append("address", address.trim());
      fd.append("parent_phone_number", cleanParentPhone);
      if (photoFile) fd.append("profile_photo", photoFile);

      await authApi.completeProfile(fd);
      await refreshAuth();
      router.push("/dashboard");
    } catch (err: any) {
      setFormError(err?.message || "Could not save your profile details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  const readableDob = formatReadableDob(dob);
  const avatarInitial = (name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <AuthShell
      eyebrow="Onboarding Step"
      title="Complete Your Profile"
      subtitle="Finish setting up your artist profile to unlock instant registrations, passes, and official certificates."
      aside={
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)]"
        >
          <img src={imageFor(null, 3)} alt="" className="size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(200deg, transparent, var(--bg) 92%)" }} aria-hidden />
          <ul className="absolute inset-x-8 bottom-8 flex flex-col gap-4">
            {[
              { Icon: ShieldCheck, t: "Verified identity for all contests & prizes" },
              { Icon: Sparkles, t: "Official certificates issued in your name" },
              { Icon: Users, t: "Guardian emergency safety contact record" },
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
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onFocusCapture={handleFormFocusCapture}
        noValidate
        style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
        className="flex w-full min-w-0 max-w-full flex-col gap-4 sm:gap-5 transition-[padding] duration-200"
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        {/* ── ARTIST HEADER + COMPLETION METER CARD ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)]/90 p-4 sm:p-5 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full opacity-20 blur-2xl"
            style={{ background: "var(--grad-brand)" }}
          />
          <div className="relative flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div
              className="relative shrink-0 group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Tap to select profile photo"
            >
              <div
                className="size-[68px] sm:size-20 rounded-full p-[2.5px] shadow-lg transition-transform duration-300 group-hover:scale-105"
                style={{ background: "var(--grad-brand)" }}
              >
                <div className="size-full overflow-hidden rounded-full grid place-items-center bg-[var(--surface-2)] text-[var(--fg)] font-display text-2xl font-bold">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="size-full object-cover" />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                aria-label="Upload photo"
                className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full border-2 border-[var(--surface)] text-white shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                style={{ background: "var(--grad-brand)" }}
              >
                <Camera className="size-3.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--success)]">
                <CheckCircle2 className="size-3 shrink-0" />
                <span className="truncate">Google Account Verified</span>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-[var(--fg)]">
                {user?.email || "Artist Profile"}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-0.5 text-[11.5px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                {photoPreview ? "Change profile photo" : "Add artist photo"}
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {/* Live progress bar */}
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em]">
              <span className="text-[var(--fg-muted)]">
                Profile Readiness • {completion.done}/{completion.total}
              </span>
              <span className={cn("font-bold", completion.done === 5 ? "text-[var(--success)]" : "text-[var(--accent)]")}>
                {completion.pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${completion.pct}%`,
                  background: completion.done === 5 ? "var(--success)" : "var(--grad-brand)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── CARD 1: PERSONAL IDENTITY ── */}
        <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-4 sm:p-5 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="grid size-6.5 shrink-0 place-items-center rounded-lg text-[11px] font-mono font-bold text-white"
                style={{ background: "var(--grad-brand)" }}
              >
                01
              </span>
              <span className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[var(--fg)] font-mono">
                Personal Identity
              </span>
            </div>
            {name.trim() && dob && (
              <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" aria-hidden />
            )}
          </div>

          {/* Full Name */}
          <div data-field-row>
            <Field label="Full Name" error={errors.name} required>
              {({ id, describedBy, invalid }) => (
                <div className="group relative min-w-0">
                  <Input
                    id={id}
                    autoComplete="name"
                    enterKeyHint="next"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError("name");
                    }}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="Enter your full name"
                    className="pl-11 pr-10"
                  />
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--fg-subtle)] transition-colors group-focus-within:text-[var(--accent)]"
                    aria-hidden
                  />
                  {name.trim().length >= 2 && (
                    <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--success)]" aria-hidden />
                  )}
                </div>
              )}
            </Field>
          </div>

          {/* Date of Birth */}
          <div data-field-row>
            <Field label="Date of Birth" error={errors.dob} hint="Used to verify age category for competitions" required>
              {({ id, describedBy, invalid }) => (
                <div className="space-y-1.5 min-w-0">
                  <DateInput
                    id={id}
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      clearFieldError("dob");
                    }}
                    aria-describedby={describedBy}
                    invalid={invalid}
                  />
                  {readableDob && (
                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--fg-muted)]">
                      <CalendarCheck2 className="size-3.5 text-[var(--success)]" aria-hidden />
                      Selected: <span className="font-semibold text-[var(--fg)]">{readableDob}</span>
                    </p>
                  )}
                </div>
              )}
            </Field>
          </div>
        </div>

        {/* ── CARD 2: CONTACT & GUARDIAN SAFETY ── */}
        <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-4 sm:p-5 shadow-sm backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid size-6.5 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[11px] font-mono font-bold text-[var(--success)]">
                02
              </span>
              <span className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[var(--fg)] font-mono">
                Contact &amp; Guardian
              </span>
            </div>
            {cleanPhone.length >= 10 && cleanParentPhone.length >= 10 && (
              <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" aria-hidden />
            )}
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div data-field-row className="min-w-0">
              <Field label="Mobile Number" error={errors.phone} hint="10-digit WhatsApp / active number" required>
                {({ id, describedBy, invalid }) => (
                  <div className="group relative min-w-0">
                    <Input
                      id={id}
                      type="tel"
                      inputMode="numeric"
                      enterKeyHint="next"
                      autoComplete="tel-national"
                      maxLength={14}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError("phone");
                      }}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      placeholder="98765 43210"
                      className="pl-11 pr-11"
                    />
                    <Phone
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--fg-subtle)] transition-colors group-focus-within:text-[var(--accent)]"
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold",
                        cleanPhone.length >= 10 ? "text-[var(--success)]" : "text-[var(--fg-subtle)]"
                      )}
                    >
                      {Math.min(cleanPhone.length, 10)}/10
                    </span>
                  </div>
                )}
              </Field>
            </div>

            <div data-field-row className="min-w-0">
              <Field label="Guardian Phone" error={errors.parentPhone} hint="Emergency parent/guardian number" required>
                {({ id, describedBy, invalid }) => (
                  <div className="group relative min-w-0">
                    <Input
                      id={id}
                      type="tel"
                      inputMode="numeric"
                      enterKeyHint="next"
                      maxLength={14}
                      value={parentPhone}
                      onChange={(e) => {
                        setParentPhone(e.target.value);
                        clearFieldError("parentPhone");
                      }}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      placeholder="98765 43211"
                      className="pl-11 pr-11"
                    />
                    <Users
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--fg-subtle)] transition-colors group-focus-within:text-[var(--accent)]"
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold",
                        cleanParentPhone.length >= 10 ? "text-[var(--success)]" : "text-[var(--fg-subtle)]"
                      )}
                    >
                      {Math.min(cleanParentPhone.length, 10)}/10
                    </span>
                  </div>
                )}
              </Field>
            </div>
          </div>

          <div data-field-row className="min-w-0">
            <Field label="Residential Address" error={errors.address} hint="City, State & Pincode for certificates and prizes" required>
              {({ id, describedBy, invalid }) => (
                <div className="group relative min-w-0">
                  <Input
                    id={id}
                    autoComplete="street-address"
                    enterKeyHint="done"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      clearFieldError("address");
                    }}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="House / Street, City, State, Pincode"
                    className="pl-11 pr-10"
                  />
                  <MapPin
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--fg-subtle)] transition-colors group-focus-within:text-[var(--accent)]"
                    aria-hidden
                  />
                  {address.trim().length >= 5 && (
                    <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--success)]" aria-hidden />
                  )}
                </div>
              )}
            </Field>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="mt-1 w-full min-h-12.5 h-auto py-3.5 px-5 sm:px-8 !whitespace-normal text-center text-[13.5px] sm:text-[15px] font-bold shadow-xl shadow-[var(--accent)]/20 active:scale-[0.99] transition-transform cursor-pointer"
        >
          Save Details &amp; Continue <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--fg-subtle)]">
          <ShieldCheck className="size-3.5 shrink-0 text-[var(--success)]" />
          <span>256-bit Secure SSL • Official Talent Identity</span>
        </p>

        <div className="flex items-center justify-center pt-0.5">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 py-2 text-xs font-medium text-[var(--fg-subtle)] hover:text-[var(--danger)] transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" /> Sign out and finish later
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

