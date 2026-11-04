"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Phone, MapPin, Calendar, Users, Camera, ArrowRight,
  ShieldCheck, AlertCircle, CheckCircle2, Sparkles, LogOut
} from "lucide-react";
import { authApi, profileApi } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { AuthShell, Field, FormAlert, Input, DateInput } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh: refreshAuth, logout } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errs: Record<string, string> = {};
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanParentPhone = parentPhone.replace(/\D/g, "");

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

  return (
    <AuthShell
      eyebrow="Onboarding Step"
      title="Complete Your Profile"
      subtitle="Welcome to Upgrade Talents India! Please provide your personal information to activate your account and access all competitions."
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
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 sm:gap-5 w-full max-w-full">
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        {/* Top Interactive Artist Avatar Frame */}
        <div className="flex flex-col items-center justify-center text-center pt-1 pb-1">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
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
                fileInputRef.current?.click();
              }}
              aria-label="Upload photo"
              className="absolute bottom-0 right-0 grid size-8 sm:size-8.5 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              style={{ background: "var(--grad-brand)" }}
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <p className="mt-2 text-xs font-semibold text-[var(--fg)] truncate max-w-[280px]">
            {user?.email || "Artist Profile"}
          </p>
          <span className="text-[10.5px] text-[var(--fg-subtle)]">
            {photoPreview ? "Photo attached • tap to change" : "Tap camera to set artist avatar"}
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
                  placeholder="Rahul Sharma"
                  className="pl-11"
                />
                <User className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
              </div>
            )}
          </Field>

          {/* Date of Birth */}
          <Field label="Date of Birth" error={errors.dob} hint="Used to verify age category for competition rules" required>
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
            <Field label="Mobile Number" error={errors.phone} hint="10-digit mobile" required>
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
                  placeholder="Flat / Street, City, State, Pincode"
                  className="pl-11"
                />
                <MapPin className="absolute left-3.5 top-3.5 size-4 text-[var(--fg-subtle)]" aria-hidden />
              </div>
            )}
          </Field>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="mt-2 w-full h-12 sm:h-13 text-[14.5px] sm:text-[15px] font-bold shadow-xl shadow-[var(--accent)]/15 active:scale-[0.99] transition-transform cursor-pointer"
        >
          Save Details &amp; Go to Dashboard <ArrowRight className="size-4" aria-hidden />
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--fg-subtle)]">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>256-bit Secure SSL • Official Talent Identity</span>
        </p>

        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-subtle)] hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" /> Sign out and finish later
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

