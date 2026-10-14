"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/* ─────────────── BUTTON ─────────────── */

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "accent" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  "aria-label"?: string;
};

const sizes = {
  sm: "h-10 px-5 text-[13px]",
  md: "h-12 px-7 text-sm",
  lg: "h-14 px-9 text-[15px]",
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className,
  loading,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold uppercase tracking-[0.1em]",
    "transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "cursor-pointer select-none whitespace-nowrap",
    sizes[size],
    isDisabled && "pointer-events-none opacity-50",
    className
  );

  const styles: Record<string, string> = {
    primary: "text-[var(--on-accent)] shadow-[0_10px_40px_-12px_var(--accent)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    accent: "bg-[var(--surface-2)] text-[var(--fg)] border border-[var(--border-strong)] hover:border-transparent hover:-translate-y-0.5",
    outline: "border border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--surface-2)] hover:-translate-y-0.5",
    ghost: "text-[var(--fg-muted)] hover:text-[var(--fg)]",
  };

  const inner = (
    <>
      {variant === "primary" && (
        <>
          <span className="absolute inset-0 -z-10" style={{ background: "var(--grad-brand)" }} />
          <span
            className="absolute inset-0 -z-10 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
            style={{ background: "linear-gradient(115deg,#ffab52,#ff7a33 55%,#f0471e)" }}
          />
        </>
      )}
      {variant === "accent" && (
        <span
          className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          style={{ background: "var(--grad-brand)" }}
        />
      )}
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link href={href} className={cn(base, styles[variant])} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(base, styles[variant])}
      {...rest}
    >
      {inner}
    </button>
  );
}

/* ─────────────── MAGNETIC WRAPPER ─────────────── */

export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.3 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.3 });

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─────────────── 3D TILT CARD ─────────────── */

export function TiltCard({
  children,
  className,
  intensity = 9,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 180, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 180, damping: 20 });
  const glareX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "100%"]);

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1200 }}
      className={cn("relative", className)}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) => `radial-gradient(420px circle at ${gx} ${gy}, rgba(255,255,255,0.14), transparent 65%)`
            ) as any,
          }}
        />
      )}
    </motion.div>
  );
}

/* ─────────────── SECTION LABEL ─────────────── */

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <span className="size-2 rounded-full pulse-glow" style={{ background: "var(--accent)" }} />
      <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--fg-muted)]">{children}</span>
    </div>
  );
}

/* ─────────────── BADGE ─────────────── */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "live" | "success" | "warning" | "danger" | "brand";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-2)] text-[var(--fg-muted)] border-[var(--border)]",
    live: "bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_40%,transparent)]",
    success: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_38%,transparent)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_38%,transparent)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_38%,transparent)]",
    brand: "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_38%,transparent)]",
  };
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        tones[tone],
        className
      )}
    >
      {tone === "live" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* ─────────────── AMBIENT SPOTLIGHTS ─────────────── */

export function Spotlights({ variant = "a" }: { variant?: "a" | "b" | "c" }) {
  const sets = {
    a: [
      { c: "var(--spot-1)", s: "min(46vw,560px)", t: "-12%", l: "-8%" },
      { c: "var(--spot-2)", s: "min(40vw,480px)", t: "32%", l: "68%" },
    ],
    b: [
      { c: "var(--spot-2)", s: "min(42vw,520px)", t: "4%", l: "62%" },
      { c: "var(--spot-3)", s: "min(34vw,420px)", t: "58%", l: "-6%" },
    ],
    c: [{ c: "var(--spot-3)", s: "min(50vw,620px)", t: "-18%", l: "28%" }],
  };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {sets[variant].map((s, i) => (
        <div
          key={i}
          className="spotlight float-y"
          style={{ background: s.c, width: s.s, height: s.s, top: s.t, left: s.l, animationDelay: `${i * 1.6}s` }}
        />
      ))}
    </div>
  );
}
