"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { BannerItem } from "@/lib/api";

// Fallback high-impact banners for Upgrade Talents India if no custom banners are active yet
const DEFAULT_BANNERS: BannerItem[] = [
  {
    _id: "default-1",
    title: "Grand Dance Championship 2026",
    description: "Official Nationwide Talent Auditions — Register & Perform on India's Biggest Stage",
    sponsor_name: "Upgrade Talents India",
    // 16:9 ratio high-res desktop banner
    image_url: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1920&auto=format&fit=crop",
    image_url_desktop: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1920&auto=format&fit=crop",
    // 9:16 ratio vertical mobile banner
    image_url_mobile: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1080&auto=format&fit=crop",
    target_url: "/competitions",
  },
  {
    _id: "default-2",
    title: "Voice of India — Live Singing Auditions",
    description: "Evaluated by Celebrity Accreditation Judges — Win National Recognition & Cash Prizes",
    sponsor_name: "Star Arena",
    // 16:9 ratio high-res desktop banner
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1920&auto=format&fit=crop",
    image_url_desktop: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1920&auto=format&fit=crop",
    // 9:16 ratio vertical mobile banner
    image_url_mobile: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1080&auto=format&fit=crop",
    target_url: "/events",
  },
  {
    _id: "default-3",
    title: "Masterclass & Workshop Series",
    description: "Learn Directly from Master Choreographers & Industry Performing Artists",
    sponsor_name: "UTI Academy",
    // 16:9 ratio high-res desktop banner
    image_url: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?q=80&w=1920&auto=format&fit=crop",
    image_url_desktop: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?q=80&w=1920&auto=format&fit=crop",
    // 9:16 ratio vertical mobile banner
    image_url_mobile: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1080&auto=format&fit=crop",
    target_url: "/courses",
  },
];

const AUTO_SLIDE_INTERVAL = 5000; // 5 seconds per slide

function SlideLink({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  if (!href || href === "#") return <div className="size-full">{children}</div>;
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block size-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#BFFF2E]"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="block size-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#BFFF2E]"
    >
      {children}
    </Link>
  );
}

export default function BannerSlider({
  banners = [],
  isHero = true,
}: {
  banners?: BannerItem[];
  isHero?: boolean;
}) {
  // Use admin uploaded banners if available; otherwise use default UTI banners
  const slides = useMemo(() => {
    const valid = (banners || []).filter((b) => b && (b.image_url || b.image_url_desktop || b.image_url_mobile));
    return valid.length > 0 ? valid : DEFAULT_BANNERS;
  }, [banners]);

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = slides.length;

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrent(idx);
  };

  // Auto-slide timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(nextSlide, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      className={`relative w-full select-none ${
        isHero
          ? "w-full max-w-none px-0 py-0"
          : "max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 py-3 sm:py-5 md:py-6"
      }`}
      aria-label="Featured Promotions Banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Outer Banner Card Container */}
      <div
        className={`relative w-full overflow-hidden bg-[#090B10] group ${
          isHero
            ? "border-b border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]"
            : "rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/10 shadow-[0_16px_40px_-15px_rgba(0,0,0,0.7)]"
        }`}
      >
        
        {/* Banner Images Carousel View - Desktop */}
        <div
          className={`relative w-full hidden md:block overflow-hidden bg-[#0A0D14] ${
            isHero
              ? "h-[100svh]"
              : "h-[240px] sm:h-[270px] md:h-[295px] lg:h-[320px]"
          }`}
        >
          {slides.map((slide, idx) => {
            const isActive = idx === current;
            const desktopSrc = slide.image_url_desktop || slide.image_url;

            return (
              <div
                key={slide._id ? `desktop-${slide._id}` : `desktop-slide-${idx}`}
                className={`absolute inset-0 size-full transition-opacity duration-700 ease-in-out will-change-[opacity] ${
                  isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                }`}
                aria-hidden={!isActive}
              >
                <SlideLink href={slide.target_url}>
                  <div className="relative size-full overflow-hidden">
                    <img
                      src={desktopSrc}
                      alt={slide.title || "Featured Banner"}
                      className="size-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.015]"
                      decoding="async"
                    />

                    {/* Gradient overlay for contrast and depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15 pointer-events-none" />

                    {/* Overlay Tag / Sponsor Pill & Title Info */}
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10 flex flex-col gap-2 pointer-events-none max-w-3xl">
                      {(slide.sponsor_name || slide.title) && (
                        <div className="flex items-center gap-2">
                          {slide.sponsor_name && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-black/75 text-[#BFFF2E] border border-[#BFFF2E]/50 backdrop-blur-md shadow-xl">
                              <Sparkles className="size-3" />
                              {slide.sponsor_name}
                            </span>
                          )}
                        </div>
                      )}
                      {slide.title && (
                        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight drop-shadow-md">
                          {slide.title}
                        </h2>
                      )}
                      {slide.description && (
                        <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 drop-shadow">
                          {slide.description}
                        </p>
                      )}
                    </div>
                  </div>
                </SlideLink>
              </div>
            );
          })}
        </div>

        {/* MOBILE VIEW */}
        <div
          className={`relative w-full block md:hidden overflow-hidden bg-[#0A0D14] ${
            isHero ? "h-[100svh]" : "h-[180px] sm:h-[210px]"
          }`}
        >
          {slides.map((slide, idx) => {
            const isActive = idx === current;
            const mobileSrc = slide.image_url_mobile || slide.mobile_image_url || slide.image_url_desktop || slide.image_url;

            return (
              <div
                key={slide._id ? `mobile-${slide._id}` : `mobile-slide-${idx}`}
                className={`absolute inset-0 size-full transition-opacity duration-700 ease-in-out will-change-[opacity] ${
                  isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                }`}
                aria-hidden={!isActive}
              >
                <SlideLink href={slide.target_url}>
                  <div className="relative size-full overflow-hidden">
                    <img
                      src={mobileSrc}
                      alt={slide.title || "Mobile Banner"}
                      className="size-full object-cover object-center"
                      decoding="async"
                    />

                    {/* Subtle mobile gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                    {/* Mobile Title & Tag */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col gap-1 pointer-events-none">
                      {slide.sponsor_name && (
                        <span className="w-fit inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-black/75 text-[#BFFF2E] border border-[#BFFF2E]/40 backdrop-blur-md">
                          {slide.sponsor_name}
                        </span>
                      )}
                      {slide.title && (
                        <h3 className="font-display text-sm sm:text-base font-bold text-white line-clamp-1">
                          {slide.title}
                        </h3>
                      )}
                    </div>
                  </div>
                </SlideLink>
              </div>
            );
          })}
        </div>

        {/* PREV / NEXT ARROWS */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/55 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 hover:border-[#BFFF2E]/70 shadow-lg flex items-center justify-center transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105 focus:outline-none"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/55 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 hover:border-[#BFFF2E]/70 shadow-lg flex items-center justify-center transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105 focus:outline-none"
              aria-label="Next Slide"
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          </>
        )}

        {/* BOTTOM INDICATORS */}
        {total > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-md">
            {slides.map((_, idx) => {
              const isActive = idx === current;
              return (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`transition-all duration-300 rounded-full focus:outline-none ${
                    isActive
                      ? "w-6 sm:w-7 h-1.5 sm:h-2 bg-[#BFFF2E] shadow-[0_0_8px_rgba(191,255,46,0.7)]"
                      : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/80"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive}
                />
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
