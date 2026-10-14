"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
  return (
    <section className="relative min-h-dvh overflow-hidden pb-20 pt-32 noise md:pt-40">
      <div
        aria-hidden
        className="spotlight float-y"
        style={{ background: "var(--spot-1)", width: "min(60vw,640px)", height: "min(60vw,640px)", top: "-18%", left: "-10%" }}
      />
      <div
        aria-hidden
        className="spotlight float-y"
        style={{ background: "var(--spot-2)", width: "min(50vw,520px)", height: "min(50vw,520px)", bottom: "-20%", right: "-8%", animationDelay: "1.8s" }}
      />
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-lg">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">{eyebrow}</span>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,6vw,3.6rem)] font-bold uppercase leading-[0.92]">{title}</h1>
          {subtitle && <p className="mt-4 text-[15px] text-[var(--fg-muted)]">{subtitle}</p>}
          <div className="mt-10">{children}</div>
        </div>
        <div className="hidden lg:block">{aside}</div>
      </div>
    </section>
  );
}
