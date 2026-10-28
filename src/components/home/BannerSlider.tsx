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
}: {
  banners?: BannerItem[];
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
      className="relative w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-14 select-none"
      aria-label="Featured Promotions Banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Outer Banner Card Container */}
      <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#090B10] border border-white/10 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] group">
        
        {/* Banner Images Carousel View - Desktop (16:9) */}
        <div className="relative w-full aspect-[16/9] max-h-[560px] hidden md:block overflow-hidden bg-[#0A0D14]">
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
                      className="size-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.01]"
                      decoding="async"
                    />

                    {/* Subtle aesthetic gradient overlay at bottom for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                    {/* Overlay Tag / Sponsor Pill */}
                    {(slide.sponsor_name || slide.title) && (
                      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 pointer-events-none">
                        {slide.sponsor_name && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-black/65 text-[#BFFF2E] border border-[#BFFF2E]/40 backdrop-blur-md shadow-lg">
                            <Sparkles className="size-3" />
                            {slide.sponsor_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SlideLink>
              </div>
            );
          })}
        </div>

        {/* MOBILE VIEW */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] block md:hidden overflow-hidden bg-[#0A0D14]">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

                    {/* Mobile Sponsor Tag */}
                    {slide.sponsor_name && (
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-black/70 text-[#BFFF2E] border border-[#BFFF2E]/40 backdrop-blur-md">
                          {slide.sponsor_name}
                        </span>
                      </div>
                    )}
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
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-11 rounded-full bg-black/50 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 hover:border-[#BFFF2E]/70 shadow-xl flex items-center justify-center transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 focus:outline-none"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="size-5 sm:size-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-11 rounded-full bg-black/50 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 hover:border-[#BFFF2E]/70 shadow-xl flex items-center justify-center transition-all duration-200 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 focus:outline-none"
              aria-label="Next Slide"
            >
              <ChevronRight className="size-5 sm:size-6" />
            </button>
          </>
        )}

        {/* BOTTOM INDICATORS */}
        {total > 1 && (
          <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
            {slides.map((_, idx) => {
              const isActive = idx === current;
              return (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`transition-all duration-300 rounded-full focus:outline-none ${
                    isActive
                      ? "w-8 sm:w-10 h-2 sm:h-2.5 bg-[#BFFF2E] shadow-[0_0_10px_rgba(191,255,46,0.7)]"
                      : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/80"
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
