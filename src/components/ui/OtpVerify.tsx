"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   OTP VERIFY
   Four acts, one card:
     1. input      — digit tiles, each one pops as it lands
     2. scatter    — the tiles break the row, orbit the centre
                     twice over, spin on their own axis and
                     collapse inward to nothing
     3. verifying  — a progress ring counts up while the
                     request is actually in flight
     4. granted    — the ring blooms into a green glow that
                     settles into a check, confetti bursts,
                     a VERIFIED pill rises underneath
   ════════════════════════════════════════════════════════════ */

type Phase = "input" | "scatter" | "verifying" | "granted" | "error";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Act 2: the orbit ───────────────────────────────────────
   Every tile gets a baked keyframe track so the orbit, the
   self-rotation and the inward collapse stay in lockstep. */
const TURNS = 2.15;
const SAMPLES = 20;
const SCATTER_MS = 1080;

function orbitTrack(slotX: number, slotY: number, index: number, count: number, radius: number) {
  const base = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const x: number[] = [];
  const y: number[] = [];
  const rotate: number[] = [];
  const scale: number[] = [];
  const opacity: number[] = [];

  for (let k = 0; k <= SAMPLES; k++) {
    const p = k / SAMPLES;
    const spin = Math.pow(p, 1.15) * TURNS * Math.PI * 2; // accelerates out of the row
    const rad = radius * (1 - Math.pow(p, 2.3)); // holds wide, then sucks inward
    const merge = Math.min(1, p / 0.22);
    const m = merge * merge * (3 - 2 * merge); // smoothstep off the row position

    x.push(slotX + (Math.cos(base + spin) * rad - slotX) * m);
    y.push(slotY + (Math.sin(base + spin) * rad - slotY) * m);
    rotate.push((spin * 180) / Math.PI * 0.85);
    scale.push(p < 0.18 ? 1 + p * 0.5 : 1.09 - (p - 0.18) * 0.95);
    opacity.push(p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.28));
  }
  return { x, y, rotate, scale, opacity };
}

/* ── Act 4: the burst ── */
const CONFETTI_COLORS = ["var(--success)", "var(--accent)", "var(--cyan)", "var(--lime)", "var(--glow-c)", "#ffffff"];

function makeConfetti(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 58 + Math.random() * 78;
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size: 4 + Math.random() * 5,
      round: Math.random() > 0.45,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.12,
      spin: (Math.random() - 0.5) * 420,
    };
  });
}

type Flyer = { digit: string; slotX: number; slotY: number };

export function OtpVerify({
  length = 6,
  email,
  onVerify,
  onSuccess,
  title = "Enter verification code",
  verifyingTitle = "Verifying…",
  verifyingSubtitle = "Securely checking your credentials.",
  successTitle = "Access Granted",
  successSubtitle = "Welcome back. Redirecting you now…",
  successHoldMs = 1500,
  footer,
}: {
  length?: number;
  email: string;
  /** Must reject (throw) when the code is wrong. */
  onVerify: (code: string) => Promise<void>;
  onSuccess: () => void;
  title?: string;
  verifyingTitle?: string;
  verifyingSubtitle?: string;
  successTitle?: string;
  successSubtitle?: string;
  successHoldMs?: number;
  /** Resend / change-email controls, shown while the tiles are up. */
  footer?: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const [phase, setPhase] = useState<Phase>("input");
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [pct, setPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef<number | null>(null);
  /** 90 while the request is in flight, 101 once it has resolved. */
  const target = useRef(90);
  const minUntil = useRef(0);
  const busy = useRef(false);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const confetti = useMemo(() => makeConfetti(24), []);
  const code = digits.join("");
  const complete = code.length === length && !digits.includes("");
  const locked = phase !== "input" && phase !== "error";

  const resetTiles = useCallback(() => {
    setDigits(Array(length).fill(""));
    setFlyers([]);
    setPct(0);
    setPhase("input");
    after(40, () => inputRefs.current[0]?.focus());
  }, [after, length]);

  /* ── Act 3: ring + counter, paced by the real request ── */
  const runRing = useCallback(() => {
    let cur = 0;
    const tick = () => {
      const k = target.current > 100 ? 0.11 : 0.034;
      cur += (target.current - cur) * k;
      if (cur >= 99.4) {
        setPct(100);
        raf.current = null;
        return;
      }
      setPct(Math.round(cur));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    async (value: string) => {
      if (busy.current || value.length !== length) return;
      busy.current = true;
      setErrorMsg(null);

      /* Freeze each tile's live position so the flying layer can
         pick the row up exactly where the user left it. */
      const stage = stageRef.current?.getBoundingClientRect();
      if (stage && !reduced) {
        const cx = stage.left + stage.width / 2;
        const cy = stage.top + stage.height / 2;
        setFlyers(
          value.split("").map((digit, i) => {
            const r = tileRefs.current[i]?.getBoundingClientRect();
            return {
              digit,
              slotX: r ? r.left + r.width / 2 - cx : 0,
              slotY: r ? r.top + r.height / 2 - cy : 0,
            };
          })
        );
      }

      setPhase(reduced ? "verifying" : "scatter");
      if (!reduced) after(SCATTER_MS - 60, () => setPhase("verifying"));

      target.current = 90;
      minUntil.current = Date.now() + (reduced ? 400 : SCATTER_MS + 1500);
      after(reduced ? 0 : SCATTER_MS - 60, runRing);

      try {
        await onVerify(value);
        const wait = Math.max(0, minUntil.current - Date.now());
        after(wait, () => {
          target.current = 101;
          after(420, () => {
            setPct(100);
            setPhase("granted");
            after(successHoldMs, onSuccess);
          });
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "That code wasn't accepted. Request a new one and try again.";
        const wait = Math.max(0, minUntil.current - Date.now() - 900);
        after(wait, () => {
          if (raf.current) {
            cancelAnimationFrame(raf.current);
            raf.current = null;
          }
          setErrorMsg(message || "That code wasn't accepted. Request a new one and try again.");
          setPhase("error");
          after(1050, () => {
            busy.current = false;
            resetTiles();
          });
        });
      }
    },
    [after, length, onSuccess, onVerify, reduced, resetTiles, runRing, successHoldMs]
  );

  /* ── Act 1: typing ── */
  const write = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((v, k) => (k === i ? "" : v)));
      return;
    }
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < length; k++) next[i + k] = clean[k];
    setDigits(next);

    const landed = Math.min(i + clean.length, length - 1);
    inputRefs.current[landed]?.focus();
    inputRefs.current[landed]?.select();

    const joined = next.join("");
    if (joined.length === length && !next.includes("")) after(140, () => start(joined));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) setDigits((d) => d.map((v, k) => (k === i ? "" : v)));
      else if (i > 0) {
        setDigits((d) => d.map((v, k) => (k === i - 1 ? "" : v)));
        inputRefs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    } else if (e.key === "Enter" && complete) {
      e.preventDefault();
      start(code);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const clean = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!clean) return;
    e.preventDefault();
    const next = Array(length).fill("");
    clean.split("").forEach((c, k) => (next[k] = c));
    setDigits(next);
    inputRefs.current[Math.min(clean.length, length - 1)]?.focus();
    if (clean.length === length) after(140, () => start(clean));
  };

  /* ── Ring geometry ── */
  const R = 34;
  const C = 2 * Math.PI * R;
  const headline = phase === "granted" ? successTitle : locked ? verifyingTitle : title;
  const sub =
    phase === "granted"
      ? successSubtitle
      : locked
        ? verifyingSubtitle
        : `A ${length}-digit code has been sent to ${email}.`;

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border p-7 text-center transition-colors duration-700 sm:p-9",
        phase === "granted"
          ? "border-[color-mix(in_srgb,var(--success)_45%,transparent)] shadow-[0_0_60px_-20px_var(--success)]"
          : phase === "error"
            ? "border-[color-mix(in_srgb,var(--danger)_45%,transparent)]"
            : "border-[var(--border)]"
      )}
      style={{ background: "var(--grad-surface), var(--bg-elevated)" }}
    >
      {/* Ambient wash — turns green the moment access is granted */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        animate={{ opacity: phase === "granted" ? 1 : 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{ background: "radial-gradient(circle at 50% 58%, color-mix(in srgb, var(--success) 22%, transparent), transparent 62%)" }}
      />

      {/* ── Heading ── */}
      <div className="min-h-[72px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase === "granted" ? "granted" : locked ? "verifying" : "input"}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <h2
              className={cn(
                "font-display text-[1.6rem] font-bold leading-tight",
                phase === "granted" && "text-[var(--success)]"
              )}
            >
              {headline}
            </h2>
            <p className="mt-1.5 break-words text-[13px] text-[var(--fg-muted)]">{sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Stage ── */}
      <div ref={stageRef} className="relative mt-7 grid min-h-[132px] place-items-center">
        <AnimatePresence>
          {/* Act 1 — the tiles */}
          {phase === "input" && (
            <motion.div
              key="tiles"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="col-start-1 row-start-1 flex items-center justify-center gap-2 sm:gap-2.5"
              onPaste={onPaste}
            >
              {digits.map((d, i) => (
                <motion.div
                  key={i}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                  animate={d ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                  transition={{ duration: 0.34, ease: EASE }}
                  className={cn(
                    "relative h-14 w-11 rounded-[14px] border transition-colors duration-300 sm:w-12",
                    d
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] shadow-[0_0_24px_-6px_var(--accent)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)]"
                  )}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => write(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={length}
                    aria-label={`Digit ${i + 1} of ${length}`}
                    className="size-full rounded-[14px] bg-transparent text-center font-mono text-[20px] font-bold text-[var(--fg)] caret-[var(--accent)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Act 2 — the orbit */}
          {phase === "scatter" &&
            flyers.map((f, i) => {
              const track = orbitTrack(f.slotX, f.slotY, i, flyers.length, 74);
              return (
                <motion.div
                  key={`fly-${i}`}
                  className="pointer-events-none col-start-1 row-start-1 grid h-14 w-11 place-items-center rounded-[14px] border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] font-mono text-[20px] font-bold shadow-[0_0_24px_-6px_var(--accent)] sm:w-12"
                  initial={{ x: f.slotX, y: f.slotY, rotate: 0, scale: 1, opacity: 1 }}
                  animate={track}
                  transition={{ duration: SCATTER_MS / 1000, ease: "linear" }}
                >
                  {f.digit}
                </motion.div>
              );
            })}

          {/* Act 3 — the ring */}
          {(phase === "verifying" || phase === "error") && (
            <motion.div
              key="ring"
              className="col-start-1 row-start-1 grid place-items-center"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={
                phase === "error"
                  ? { opacity: 1, scale: 1, x: [0, -11, 10, -7, 5, 0] }
                  : { opacity: 1, scale: 1 }
              }
              exit={{ opacity: 0, scale: 1.9, filter: "blur(10px)" }}
              transition={{ duration: phase === "error" ? 0.5 : 0.45, ease: EASE }}
            >
              <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden className="-rotate-90">
                <defs>
                  <linearGradient id="otpRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--glow-c)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
                <circle cx="48" cy="48" r={R} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
                <circle
                  cx="48"
                  cy="48"
                  r={R}
                  fill="none"
                  stroke={phase === "error" ? "var(--danger)" : "url(#otpRing)"}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - (phase === "error" ? 1 : pct) / 100)}
                  style={{ transition: "stroke-dashoffset 120ms linear" }}
                />
              </svg>
              <span
                className={cn(
                  "absolute font-mono text-[15px] font-bold tabular-nums",
                  phase === "error" ? "text-[var(--danger)]" : "text-[var(--accent)]"
                )}
              >
                {phase === "error" ? <AlertCircle className="size-5" aria-hidden /> : pct}
              </span>
              {phase === "verifying" && (
                <motion.span
                  aria-hidden
                  className="absolute size-[96px] rounded-full"
                  animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.92, 1.12, 0.92] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 28%, transparent), transparent 68%)" }}
                />
              )}
            </motion.div>
          )}

          {/* Act 4 — access granted */}
          {phase === "granted" && (
            <motion.div key="granted" className="col-start-1 row-start-1 grid place-items-center">
              {/* the bloom */}
              <motion.span
                aria-hidden
                className="absolute size-28 rounded-full"
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: [0.3, 2.3, 1], opacity: [0.9, 0.75, 0] }}
                transition={{ duration: 1, ease: EASE, times: [0, 0.4, 1] }}
                style={{ background: "radial-gradient(circle, var(--success), transparent 66%)", filter: "blur(14px)" }}
              />

              {/* the burst */}
              {!reduced &&
                confetti.map((c) => (
                  <motion.span
                    key={c.id}
                    aria-hidden
                    className="absolute"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: c.x, y: c.y, scale: [0, 1, 0.4], opacity: [1, 1, 0], rotate: c.spin }}
                    transition={{ duration: 1.15, delay: 0.14 + c.delay, ease: EASE }}
                    style={{
                      width: c.size,
                      height: c.size,
                      background: c.color,
                      borderRadius: c.round ? "999px" : "2px",
                    }}
                  />
                ))}

              {/* the check */}
              <motion.span
                className="relative grid size-16 place-items-center rounded-full bg-[var(--success)] shadow-[0_12px_40px_-10px_var(--success)]"
                initial={{ scale: 0, rotate: -35 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.3 }}
              >
                <Check className="size-8 text-white" strokeWidth={3} aria-hidden />
              </motion.span>

              {/* the pill */}
              <motion.span
                className="absolute -bottom-2 rounded-full bg-[var(--success)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white"
                initial={{ opacity: 0, y: 14, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.62 }}
              >
                Verified
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Live region + footer ── */}
      <p aria-live="polite" className="sr-only">
        {phase === "granted" ? successTitle : locked ? verifyingTitle : errorMsg || ""}
      </p>

      <AnimatePresence mode="wait">
        {phase === "error" && errorMsg && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6 text-[13px] font-medium text-[var(--danger)]"
          >
            {errorMsg}
          </motion.p>
        )}
        {phase === "input" && footer && (
          <motion.div
            key="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}
            className="mt-7 text-[13px] text-[var(--fg-muted)]"
          >
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
