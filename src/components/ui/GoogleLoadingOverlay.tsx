"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import loadingAnimationData from "@/assets/lottie/loading.json";

interface GoogleLoadingOverlayProps {
  open: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    photo?: string | null;
  } | null;
  title?: string;
  subtitle?: string;
}

export function GoogleLoadingOverlay({
  open,
  user,
  title = "Please wait...",
  subtitle = "Verifying your Google account and securing your session…",
}: GoogleLoadingOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!open) {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
      return;
    }

    let active = true;

    // Load lottie-web on client
    import("lottie-web")
      .then((lottieModule) => {
        if (!active || !containerRef.current) return;
        const lottie = lottieModule.default || lottieModule;

        if (animRef.current) {
          animRef.current.destroy();
        }

        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: loadingAnimationData,
        });
      })
      .catch((err) => {
        console.warn("Failed to load Lottie animation, using fallback:", err);
      });

    return () => {
      active = false;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl transition-opacity duration-300"
    >
      {/* Ambient background glow matching brand palette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.18),transparent_65%)] pointer-events-none animate-pulse" />

      {/* Ultra Pro Glass Card */}
      <div className="relative flex flex-col items-center text-center p-7 sm:p-9 rounded-3xl bg-[#0d0e15]/90 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(245,158,11,0.15)] max-w-sm sm:max-w-md w-full overflow-hidden">
        {/* Sleek top accent highlight line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* User Pill Badge (if available from Google account selection) */}
        {user?.email && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name || "Google profile"}
                className="size-4.5 rounded-full object-cover border border-amber-400/40"
              />
            ) : (
              <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.761l-9.426 0z" />
              </svg>
            )}
            <span className="truncate max-w-[200px] font-medium">
              {user.name || user.email}
            </span>
          </div>
        )}

        {/* Lottie Animation Display Area */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center my-1">
          {/* Subtle warm halo behind the animation */}
          <div className="absolute inset-2 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
          <div ref={containerRef} className="w-full h-full relative z-10 flex items-center justify-center" />
        </div>

        {/* Ultra Pro Heading */}
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
          {title}
        </h3>

        {/* Informative Submessage */}
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed font-sans">
          {subtitle}
        </p>

        {/* Micro status ticker */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/5 px-3 py-1 text-[11px] text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono tracking-wide text-zinc-300">Synchronizing session…</span>
        </div>

        {/* Brand watermark */}
        <p className="mt-6 text-[10px] tracking-[0.2em] uppercase font-mono text-zinc-500/80">
          Upgrade Talents India • Secure Auth
        </p>
      </div>
    </div>
  );
}
