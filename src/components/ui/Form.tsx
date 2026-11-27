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
    <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-[var(--fg)]">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]" aria-hidden>*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <p id={hintId} className="text-[11.5px] sm:text-[12px] leading-snug text-[var(--fg-subtle)]">{hint}</p>}
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
        "h-12 w-full min-w-0 max-w-full rounded-xl border bg-[var(--bg-elevated)] px-4 text-[16px] sm:text-[15px] text-[var(--fg)] outline-none transition-all scroll-mt-28 scroll-mb-48",
        "placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
        invalid ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20" : "border-[var(--border)]",
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
    <div className="relative flex w-full min-w-0 max-w-full items-center">
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
          "h-12 w-full min-w-0 max-w-full appearance-none rounded-xl border bg-[var(--bg-elevated)] pl-4 pr-12 text-[16px] sm:text-[15px] text-[var(--fg)] outline-none transition-all cursor-pointer font-medium scroll-mt-28 scroll-mb-48",
          "placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          "uti-date-input",
          invalid ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20" : "border-[var(--border)]",
          className
        )}
        {...props}
      />
      {!value && (
        <span className="pointer-events-none absolute right-12 text-[11px] font-medium text-[var(--fg-subtle)]">
          Tap to pick
        </span>
      )}
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
        className="absolute right-2 z-[2] grid size-8 place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface-2)] text-[var(--accent)] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Calendar className="size-4" aria-hidden />
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
        "flex items-start gap-2.5 rounded-xl border p-3.5 sm:p-4 text-[13px] min-w-0 break-words",
        isError
          ? "border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
          : "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
      )}
    >
      {isError ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">{children}</span>
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
  const isLight = theme === "blue" || theme === "light";
  const logoSrc = isLight ? "/logo-dark-mode.png" : "/logo-white-mode.png";

  return (
    <section className="relative min-h-svh md:min-h-dvh w-full max-w-[100vw] overflow-x-clip pt-24 sm:pt-28 md:pt-36 pb-16 sm:pb-24 noise">
      <div
        aria-hidden
        className="spotlight md:float-y pointer-events-none"
        style={{ background: "var(--spot-1)", width: "min(60vw,640px)", height: "min(60vw,640px)", top: "-18%", left: "-10%" }}
      />
      <div
        aria-hidden
        className="spotlight md:float-y pointer-events-none"
        style={{ background: "var(--spot-2)", width: "min(50vw,520px)", height: "min(50vw,520px)", bottom: "-20%", right: "-8%", animationDelay: "1.8s" }}
      />
      <div className="container-x relative grid min-w-0 items-start lg:items-center gap-6 sm:gap-10 lg:gap-14 lg:grid-cols-2">
        <div className="mx-auto w-full min-w-0 max-w-lg">
          <Link href="/" className="hidden sm:inline-block mb-3 sm:mb-6 transition-opacity hover:opacity-85" aria-label="Upgrade Talents India home">
            <img src={logoSrc} alt="Upgrade Talents India" className="h-7 sm:h-9 w-auto object-contain" />
          </Link>
          <span className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-[var(--accent)]">{eyebrow}</span>
          <h1 className="mt-1.5 sm:mt-3 font-display text-[clamp(1.55rem,6.4vw,3.4rem)] font-bold uppercase leading-[0.98] break-words">{title}</h1>
          {subtitle && <p className="mt-2 sm:mt-2.5 text-[13px] sm:text-[15px] text-[var(--fg-muted)] leading-relaxed break-words">{subtitle}</p>}
          <div className="mt-5 sm:mt-8 md:mt-10 min-w-0">{children}</div>
        </div>
        <div className="hidden lg:block min-w-0">{aside}</div>
      </div>
    </section>
  );
}
