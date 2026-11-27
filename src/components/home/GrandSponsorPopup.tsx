"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GrandSponsorPopupConfig, SponsorBannerCard } from "@/lib/api";

/**
 * Optimizes banner URLs:
 * 1. Cloudinary URLs: injects f_auto,q_auto,e_trim to auto-trim solid white/black/transparent
 *    canvas margins (such as 1920x1080 design artboards with centered graphics) and deliver high quality.
 * 2. Fallback: returns trimmed URL.
 */
function getOptimizedBannerUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.includes("res.cloudinary.com") && trimmed.includes("/image/upload/")) {
    if (!trimmed.includes("e_trim")) {
      return trimmed.replace("/image/upload/", "/image/upload/f_auto,q_auto,e_trim/");
    }
  }
  return trimmed;
}

/**
 * Normalizes CTA link:
 * - External links (http, https, instagram.com, facebook.com, domains)
 * - Internal paths (/competitions, /events)
 */
function normalizeCtaLink(link?: string | null): { href: string; isExternal: boolean } {
  if (!link || typeof link !== "string") return { href: "", isExternal: false };
  const trimmed = link.trim();
  if (!trimmed) return { href: "", isExternal: false };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { href: trimmed, isExternal: true };
  }
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return { href: trimmed, isExternal: true };
  }
  if (
    trimmed.includes("instagram.com") ||
    trimmed.includes("facebook.com") ||
    trimmed.includes(".com") ||
    trimmed.includes(".in") ||
    trimmed.includes(".org") ||
    trimmed.includes(".co")
  ) {
    return { href: `https://${trimmed.replace(/^\/+/, "")}`, isExternal: true };
  }
  if (trimmed.startsWith("/")) {
    return { href: trimmed, isExternal: false };
  }
  return { href: `/${trimmed}`, isExternal: false };
}

export default function GrandSponsorPopup({
  popup,
}: {
  popup?: GrandSponsorPopupConfig | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Normalize all active banners
  const activeBanners: SponsorBannerCard[] = useMemo(() => {
    if (!popup) return [];

    let list: SponsorBannerCard[] = [];
    if (Array.isArray(popup.banners) && popup.banners.length > 0) {
      list = popup.banners
        .filter((b) => b.is_active !== false && Boolean(b.banner_image_url || b.mobile_image_url))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }

    // Fallback to legacy single banner if no list provided
    if (list.length === 0 && (popup.banner_image_url || popup.mobile_image_url)) {
      list.push({
        id: "legacy_single",
        sponsor_name: popup.sponsor_name || "",
        badge_text: popup.badge_text || "",
        title: popup.title || "",
        subtitle: popup.subtitle || "",
        banner_image_url: popup.banner_image_url || "",
        mobile_image_url: popup.mobile_image_url || "",
        cta_text: popup.cta_text || "",
        cta_link: popup.cta_link || "",
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

  // Touch Swipe for Mobile Gesture Support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40 && activeBanners.length > 1) {
      if (diff > 0) {
        setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
      } else {
        setCurrentIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

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
  const desktopImg = getOptimizedBannerUrl(currentBanner.banner_image_url || currentBanner.mobile_image_url);
  const mobileImg = getOptimizedBannerUrl(currentBanner.mobile_image_url);

  const normalizedCta = normalizeCtaLink(currentBanner.cta_link);
  const hasClickLink = Boolean(normalizedCta.href.length > 0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % activeBanners.length);
  };

  const renderBannerMedia = () => (
    <picture className="block">
      {mobileImg && (
        <source media="(max-width: 640px)" srcSet={mobileImg} />
      )}
      <img
        src={desktopImg}
        alt={currentBanner.sponsor_name || "Sponsor Banner"}
        className={`block w-auto h-auto max-w-[82vw] sm:max-w-[420px] md:max-w-[460px] max-h-[50vh] sm:max-h-[54vh] object-contain select-none transition-transform duration-500 ${
          hasClickLink ? "group-hover:scale-[1.015]" : ""
        }`}
      />
    </picture>
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pt-14 sm:p-6 sm:pt-14 overflow-y-auto"
        >
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            aria-hidden="true"
          />

          {/* Outer Dialog Wrapper (No overflow-hidden so Close X sits cleanly OUTSIDE the popup card) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 380 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 inline-flex flex-col items-center justify-center select-none"
            role="dialog"
            aria-modal="true"
            aria-label={currentBanner.sponsor_name || "Sponsor Banner"}
          >
            {/* Floating Close Button — positioned cleanly OUTSIDE above the top-right corner */}
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer absolute bottom-full right-0 mb-2.5 z-40 flex size-8 sm:size-9 items-center justify-center rounded-full bg-black/85 hover:bg-amber-500 text-white hover:text-black border border-white/25 hover:border-amber-400 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.65)] transition-all duration-200 active:scale-90"
              aria-label="Close dialog"
            >
              <X className="size-4 sm:size-4.5" />
            </button>

            {/* Compact Centered Banner Card */}
            <div className="group/popup relative w-fit max-w-[82vw] sm:max-w-[420px] md:max-w-[460px] max-h-[54vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/40 bg-black shadow-[0_25px_80px_-10px_rgba(245,158,11,0.45)] inline-flex flex-col items-center justify-center">
              {/* Banner Image Stage (Auto-resizes strictly to compact banner dimensions) */}
              <div className="relative overflow-hidden flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentBanner.id || currentIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="relative flex items-center justify-center"
                  >
                    {hasClickLink ? (
                      normalizedCta.isExternal ? (
                        <a
                          href={normalizedCta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleClose}
                          className="block cursor-pointer group"
                        >
                          {renderBannerMedia()}
                        </a>
                      ) : (
                        <Link
                          href={normalizedCta.href}
                          onClick={handleClose}
                          className="block cursor-pointer group"
                        >
                          {renderBannerMedia()}
                        </Link>
                      )
                    ) : (
                      renderBannerMedia()
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows for Multiple Banners (Visible on hover only) */}
                {activeBanners.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Previous Sponsor"
                      className="cursor-pointer absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-30 flex size-7 sm:size-8 items-center justify-center rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md shadow-lg opacity-0 pointer-events-none group-hover/popup:opacity-100 group-hover/popup:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto transition-all duration-200 active:scale-90"
                    >
                      <ChevronLeft className="size-3.5 sm:size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next Sponsor"
                      className="cursor-pointer absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-30 flex size-7 sm:size-8 items-center justify-center rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white border border-white/20 hover:border-amber-400 backdrop-blur-md shadow-lg opacity-0 pointer-events-none group-hover/popup:opacity-100 group-hover/popup:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto transition-all duration-200 active:scale-90"
                    >
                      <ChevronRight className="size-3.5 sm:size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Clean Pagination Dots positioned cleanly below the card */}
            {activeBanners.length > 1 && (
              <div className="mt-2.5 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15">
                {activeBanners.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setCurrentIdx(dotIdx)}
                    aria-label={`Go to sponsor banner ${dotIdx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      currentIdx === dotIdx
                        ? "w-4 sm:w-5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                        : "w-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
