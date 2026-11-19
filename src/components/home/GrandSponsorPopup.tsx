"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import type { GrandSponsorPopupConfig, SponsorBannerCard } from "@/lib/api";

export default function GrandSponsorPopup({
  popup,
}: {
  popup?: GrandSponsorPopupConfig | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize all active banners
  const activeBanners: SponsorBannerCard[] = useMemo(() => {
    if (!popup) return [];

    let list: SponsorBannerCard[] = [];
    if (Array.isArray(popup.banners) && popup.banners.length > 0) {
      list = popup.banners
        .filter((b) => b.is_active !== false && Boolean(b.banner_image_url || b.title))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }

    // Fallback to legacy single banner if no list provided
    if (list.length === 0 && (popup.banner_image_url || popup.title)) {
      list.push({
        id: "legacy_single",
        sponsor_name: popup.sponsor_name || "Official Partner",
        badge_text: popup.badge_text || "GRAND TITLE SPONSOR",
        title: popup.title || "Grand National Championship 2026",
        subtitle: popup.subtitle || "",
        banner_image_url: popup.banner_image_url || "",
        mobile_image_url: popup.mobile_image_url || "",
        cta_text: popup.cta_text || "Explore Exclusive Offer",
        cta_link: popup.cta_link || "/competitions",
      });
    }

    return list;
  }, [popup]);

  // Handle open on landing
  useEffect(() => {
    if (!popup || !popup.is_enabled || activeBanners.length === 0) return;

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

    // Open after a brief delay for smooth page entrance
    const openTimer = setTimeout(() => {
      setIsOpen(true);
      const autoSec = Number(popup.auto_close_seconds) || 0;
      if (autoSec > 0) {
        setTimeLeft(autoSec);
      }
    }, 600);

    return () => clearTimeout(openTimer);
  }, [popup, activeBanners.length]);

  // Handle close
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

  // Automatic carousel rotation
  useEffect(() => {
    if (!isOpen || isPaused || activeBanners.length <= 1) return;

    const intervalSeconds = Math.max(3, Number(popup?.auto_scroll_interval) || 4);
    autoScrollRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
    }, intervalSeconds * 1000);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [isOpen, isPaused, activeBanners.length, popup?.auto_scroll_interval]);

  // Handle auto-close countdown if configured
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

  if (!popup || !popup.is_enabled || activeBanners.length === 0) return null;

  const currentBanner = activeBanners[currentIdx] || activeBanners[0];
  const bannerImg = currentBanner.banner_image_url || currentBanner.mobile_image_url;
  const isExternalCta =
    currentBanner.cta_link?.startsWith("http://") || currentBanner.cta_link?.startsWith("https://");

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
          {/* ── Backdrop Blur Overlay ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            aria-hidden="true"
          />

          {/* ── Visual Sponsor Banner Modal ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="relative z-10 w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/35 bg-[#07090E] shadow-[0_25px_80px_-10px_rgba(245,158,11,0.4)]"
            role="dialog"
            aria-modal="true"
            aria-label={currentBanner.sponsor_name || "Sponsor Banner"}
          >
            {/* ── Top Floating Close Button (Cross Icon) ── */}
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer absolute top-3 right-3 sm:top-4 sm:right-4 z-40 flex size-9 sm:size-10 items-center justify-center rounded-full bg-black/80 hover:bg-black text-white/90 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md shadow-2xl transition-all active:scale-90"
              aria-label="Close dialog"
            >
              <X className="size-4 sm:size-5" />
            </button>

            {/* ── Multi-banner Slide Counter (if > 1) ── */}
            {activeBanners.length > 1 && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 px-3 py-1 rounded-full bg-black/75 border border-white/15 text-[11px] font-mono font-bold text-amber-400 backdrop-blur-md shadow-lg">
                {currentIdx + 1} / {activeBanners.length}
              </div>
            )}

            {/* ── Sponsor Banner Image Stage ── */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[16/8.5] md:aspect-[16/8] overflow-hidden bg-black flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner.id || currentIdx}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="size-full"
                >
                  {currentBanner.cta_link ? (
                    isExternalCta ? (
                      <a
                        href={currentBanner.cta_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClose}
                        className="block size-full cursor-pointer group"
                      >
                        <picture>
                          {currentBanner.mobile_image_url && (
                            <source media="(max-width: 640px)" srcSet={currentBanner.mobile_image_url} />
                          )}
                          <img
                            src={bannerImg}
                            alt={currentBanner.sponsor_name || "Sponsor Banner"}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        </picture>
                      </a>
                    ) : (
                      <Link
                        href={currentBanner.cta_link}
                        onClick={handleClose}
                        className="block size-full cursor-pointer group"
                      >
                        <picture>
                          {currentBanner.mobile_image_url && (
                            <source media="(max-width: 640px)" srcSet={currentBanner.mobile_image_url} />
                          )}
                          <img
                            src={bannerImg}
                            alt={currentBanner.sponsor_name || "Sponsor Banner"}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        </picture>
                      </Link>
                    )
                  ) : (
                    <picture>
                      {currentBanner.mobile_image_url && (
                        <source media="(max-width: 640px)" srcSet={currentBanner.mobile_image_url} />
                      )}
                      <img
                        src={bannerImg}
                        alt={currentBanner.sponsor_name || "Sponsor Banner"}
                        className="size-full object-cover"
                      />
                    </picture>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows for Multiple Banners */}
              {activeBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous Sponsor"
                    className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 z-30 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md transition-all active:scale-90"
                  >
                    <ChevronLeft className="size-5 sm:size-6" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next Sponsor"
                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 z-30 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/70 hover:bg-black text-white/90 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md transition-all active:scale-90"
                  >
                    <ChevronRight className="size-5 sm:size-6" />
                  </button>

                  {/* Clean Pagination Dots Floating at the bottom */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                    {activeBanners.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => setCurrentIdx(dotIdx)}
                        aria-label={`Go to sponsor banner ${dotIdx + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          currentIdx === dotIdx
                            ? "w-7 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                            : "w-2 bg-white/40 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
