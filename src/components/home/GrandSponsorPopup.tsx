"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, ArrowRight, ExternalLink } from "lucide-react";
import type { GrandSponsorPopupConfig } from "@/lib/api";

export default function GrandSponsorPopup({
  popup,
}: {
  popup?: GrandSponsorPopupConfig | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!popup || !popup.is_enabled) return;

    // Check display frequency rules
    const mode = popup.show_mode || "once_per_session";
    if (mode === "once_per_session") {
      try {
        if (sessionStorage.getItem("uti_sponsor_popup_seen") === "1") {
          return;
        }
      } catch {}
    } else if (mode === "once_per_day") {
      try {
        const today = new Date().toISOString().split("T")[0];
        if (localStorage.getItem("uti_sponsor_popup_day") === today) {
          return;
        }
      } catch {}
    }

    // Delay slightly for smooth page entrance
    const openTimer = setTimeout(() => {
      setIsOpen(true);
      const autoSec = Number(popup.auto_close_seconds) || 0;
      if (autoSec > 0) {
        setTimeLeft(autoSec);
      }
    }, 700);

    return () => clearTimeout(openTimer);
  }, [popup]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (!popup) return;

    const mode = popup.show_mode || "once_per_session";
    if (mode === "once_per_session") {
      try {
        sessionStorage.setItem("uti_sponsor_popup_seen", "1");
      } catch {}
    } else if (mode === "once_per_day") {
      try {
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem("uti_sponsor_popup_day", today);
      } catch {}
    }
  }, [popup]);

  // Handle auto-close countdown
  useEffect(() => {
    if (!isOpen || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleClose();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, timeLeft, handleClose]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!popup || !popup.is_enabled) return null;

  const bannerImg = popup.banner_image_url || popup.mobile_image_url;
  const isExternalCta = popup.cta_link?.startsWith("http://") || popup.cta_link?.startsWith("https://");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-5 md:p-6 overflow-y-auto">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Luxury Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl sm:max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/40 bg-[#07090E] shadow-[0_25px_80px_-15px_rgba(245,158,11,0.35)] text-white"
            role="dialog"
            aria-modal="true"
            aria-label={popup.title || "Grand Sponsor Announcement"}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex size-8 sm:size-9 items-center justify-center rounded-full bg-black/75 hover:bg-black text-white/80 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md shadow-lg transition-all active:scale-90"
              aria-label="Close dialog"
            >
              <X className="size-4 sm:size-5" />
            </button>

            {/* Banner Media Showcase */}
            {bannerImg && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/90">
                <picture>
                  {popup.mobile_image_url && (
                    <source media="(max-width: 640px)" srcSet={popup.mobile_image_url} />
                  )}
                  <img
                    src={bannerImg}
                    alt={popup.title || popup.sponsor_name || "Sponsor Banner"}
                    className="size-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </picture>

                {/* Aesthetic gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/30 to-black/30 pointer-events-none" />

                {/* Floating Sponsor Badge Ribbon */}
                {(popup.badge_text || popup.sponsor_name) && (
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-black/85 text-amber-400 border border-amber-400/50 shadow-xl backdrop-blur-md">
                      <Sparkles className="size-3 text-amber-400 animate-spin" style={{ animationDuration: "5s" }} />
                      {popup.badge_text || popup.sponsor_name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Body & Messaging */}
            <div className="p-5 sm:p-7 flex flex-col gap-3 text-center">
              {popup.sponsor_name && (
                <div className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-amber-400 font-semibold">
                  {popup.sponsor_name}
                </div>
              )}

              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {popup.title}
              </h2>

              {popup.subtitle && (
                <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                  {popup.subtitle}
                </p>
              )}

              {/* Action Buttons */}
              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                {popup.cta_link && (
                  isExternalCta ? (
                    <a
                      href={popup.cta_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleClose}
                      className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.85)] hover:scale-105 active:scale-95 transition-all"
                    >
                      <span>{popup.cta_text || "Explore Exclusive Offer"}</span>
                      <ExternalLink className="size-4" />
                    </a>
                  ) : (
                    <Link
                      href={popup.cta_link}
                      onClick={handleClose}
                      className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.85)] hover:scale-105 active:scale-95 transition-all"
                    >
                      <span>{popup.cta_text || "Explore Exclusive Offer"}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  )
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="cursor-pointer w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Continue to Website {timeLeft !== null && `(${timeLeft}s)`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

