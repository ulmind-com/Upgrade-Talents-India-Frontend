"use client";

import { useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { useTheme } from "@/components/motion/Providers";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  id?: string;
}) {
  const auto = useId();
  const fieldId = id || auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-[13px] font-semibold">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]" aria-hidden>*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <p id={hintId} className="text-[12px] text-[var(--fg-subtle)]">{hint}</p>}
      {children({ id: fieldId, describedBy, invalid: !!error })}
      {error && (
        <p id={errId} className="flex items-start gap-1.5 text-[12px] text-[var(--danger)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-12 w-full rounded-xl border bg-[var(--bg-elevated)] px-4 text-[15px] text-[var(--fg)] outline-none transition-colors",
        "placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]",
        invalid ? "border-[var(--danger)]" : "border-[var(--border)]",
        className
      )}
    />
  );
}

export function DateInput({
  invalid,
  className,
  value,
  onChange,
  max,
  min,
  id,
  autoComplete = "bday",
  placeholder,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        max={max || new Date().toISOString().slice(0, 10)}
        min={min || "1930-01-01"}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        onClick={triggerPicker}
        className={cn(
          "h-12 w-full rounded-xl border bg-[var(--bg-elevated)] pl-4 pr-12 text-[15px] text-[var(--fg)] outline-none transition-all cursor-pointer font-medium",
          "placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30",
          "uti-date-input",
          invalid ? "border-[var(--danger)]" : "border-[var(--border)]",
          className
        )}
        {...props}
      />
      {/* Visual calendar button: highly visible in both dark & day mode */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerPicker();
        }}
        aria-label="Open calendar to pick date"
        title="Open calendar"
        className="absolute right-2.5 z-[2] grid size-8 place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface-2)] text-[var(--accent)] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Calendar className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const isError = tone === "error";
  return (
    <p
      role={isError ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-4 text-[13px]",
        isError
          ? "border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
          : "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
      )}
    >
      {isError ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
      {children}
    </p>
  );
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { theme } = useTheme();
  const isLight = theme === "blue";
  const logoSrc = isLight ? "/logo-dark-mode.png" : "/logo-white-mode.png";

  return (
    <section className="relative min-h-dvh overflow-x-hidden pt-26 sm:pt-28 md:pt-36 pb-16 sm:pb-24 noise">
      <div
        aria-hidden
        className="spotlight float-y pointer-events-none"
        style={{ background: "var(--spot-1)", width: "min(60vw,640px)", height: "min(60vw,640px)", top: "-18%", left: "-10%" }}
      />
      <div
        aria-hidden
        className="spotlight float-y pointer-events-none"
        style={{ background: "var(--spot-2)", width: "min(50vw,520px)", height: "min(50vw,520px)", bottom: "-20%", right: "-8%", animationDelay: "1.8s" }}
      />
      <div className="container-x relative grid items-center gap-6 sm:gap-10 lg:gap-14 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-lg px-0.5 sm:px-0">
          <Link href="/" className="hidden sm:inline-block mb-3 sm:mb-6 transition-opacity hover:opacity-85" aria-label="Upgrade Talents India home">
            <img src={logoSrc} alt="Upgrade Talents India" className="h-7 sm:h-9 w-auto object-contain" />
          </Link>
          <span className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[var(--accent)]">{eyebrow}</span>
          <h1 className="mt-1.5 sm:mt-3 font-display text-[clamp(1.75rem,5.5vw,3.6rem)] font-bold uppercase leading-[0.98]">{title}</h1>
          {subtitle && <p className="mt-1.5 sm:mt-2.5 text-[13px] sm:text-[15px] text-[var(--fg-muted)] leading-relaxed">{subtitle}</p>}
          <div className="mt-4 sm:mt-8 md:mt-10">{children}</div>
        </div>
        <div className="hidden lg:block">{aside}</div>
      </div>
    </section>
  );
}
