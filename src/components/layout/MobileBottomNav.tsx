"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Ticket, Trophy, Search, User } from "lucide-react";

import { useAuth } from "@/components/motion/Providers";
import { cn } from "@/lib/utils";

/**
 * Liquid Glass bottom navigation for Upgrade Talents India
 * Features:
 * - 4 core platform tabs: Home (/), Events (/events), Competitions (/competitions), Profile (/dashboard)
 * - Elevated circular Search button (/search)
 * - Liquid glass refraction and optical layered highlights
 * - Fluid drag gesture with haptic feedback (10ms)
 * - iOS-style liquid stretch active capsule
 */

const NAV_ITEMS = [
  { id: "home", label: "Home", path: "/" },
  { id: "events", label: "Events", path: "/events" },
  { id: "competitions", label: "Competitions", path: "/competitions" },
  { id: "profile", label: "Profile", path: "/dashboard" },
];

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserAuthenticated = mounted ? isAuthenticated : false;
  const currentUser = mounted ? user : null;

  const activeId = useMemo(() => {
    if (pathname.startsWith("/events")) return "events";
    if (pathname.startsWith("/competitions") || pathname.startsWith("/leaderboard")) return "competitions";
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/complete-profile") ||
      pathname.startsWith("/account")
    ) {
      return "profile";
    }
    if (pathname.startsWith("/search")) return "search";
    if (pathname === "/" || pathname === "") return "home";
    return null;
  }, [pathname]);

  const activeIndex = NAV_ITEMS.findIndex((i) => i.id === activeId);
  const isSearchActive = activeId === "search";

  // ── Drag-to-move the liquid capsule (finger follows, snaps on release) ──
  const navRef = useRef<HTMLElement | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; active: boolean; pointerId: number | null }>({
    startX: 0,
    active: false,
    pointerId: null,
  });
  const justDragged = useRef(false);

  // Once navigation settles onto the new tab, drop the manual offset so the
  // capsule rests on its slot (position is identical, so no visual jump).
  useEffect(() => {
    setDragX(null);
  }, [activeIndex]);

  const slotMetrics = () => {
    const el = navRef.current;
    if (!el) return { rect: { left: 0, width: 0 } as DOMRect, contentW: 0, slotW: 0 };
    const rect = el.getBoundingClientRect();
    const contentW = rect.width - 8; // minus the 4px padding on each side
    const slotW = contentW / 4;
    return { rect, contentW, slotW };
  };

  const moveTo = (clientX: number) => {
    const { rect, contentW, slotW } = slotMetrics();
    if (!contentW || !slotW) return;
    const left = clientX - rect.left - 4 - slotW / 2;
    setDragX(Math.max(0, Math.min(contentW - slotW, left)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    justDragged.current = false;
    dragState.current = { startX: e.clientX, active: true, pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st.active) return;
    if (!dragging) {
      if (Math.abs(e.clientX - st.startX) < 6) return; // still a tap, not a drag
      setDragging(true);
      try {
        navRef.current?.setPointerCapture(st.pointerId!);
      } catch {
        /* noop */
      }
    }
    moveTo(e.clientX);
  };

  const triggerHaptic = () => {
    try {
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    } catch {
      /* noop */
    }
  };

  const endDrag = () => {
    const st = dragState.current;
    dragState.current = { startX: 0, active: false, pointerId: null };
    if (!dragging) {
      setDragX(null);
      return; // plain tap → the button's onClick handles navigation
    }
    setDragging(false);
    const { slotW } = slotMetrics();
    const idx = Math.max(0, Math.min(3, Math.round((dragX ?? 0) / (slotW || 1))));
    justDragged.current = true;
    triggerHaptic();
    const item = NAV_ITEMS[idx];
    if (item?.id === "profile") {
      router.push(isUserAuthenticated ? "/dashboard" : "/login");
    } else if (item?.path) {
      router.push(item.path);
    }
    if (idx === activeIndex) setDragX(null); // no route change → snap back now
  };

  const userAvatar = currentUser?.profile_photo || currentUser?.avatar || currentUser?.image_url;
  const userInitial = (currentUser?.name || currentUser?.full_name || currentUser?.email || "U")[0].toUpperCase();

  return (
    <div className="lg-bottom-wrapper md:hidden" role="navigation" aria-label="Mobile Bottom Navigation">
      {/* 
        SVG Filters for Liquid Refraction 
        Used by the CSS url(#liquid-glass) and url(#liquid-toggler) 
      */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="liquid-toggler" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 4-item liquid glass pill */}
      <nav
        className="lg-bottom-nav"
        ref={navRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Active glass capsule — slides to active item, or follows the finger */}
        {(activeIndex >= 0 || dragX != null) && (
          <span
            className={cn("lg-bottom-active-capsule", dragging && "dragging")}
            aria-hidden
            style={{
              transform:
                dragX != null
                  ? `translateX(${dragX}px)`
                  : `translateX(${activeIndex * 100}%)`,
            }}
          >
            {/* Keyed inner glass — restarts the liquid stretch on each switch */}
            <span key={activeIndex} className="lg-bottom-active-glass" />
          </span>
        )}

        {NAV_ITEMS.map((item, index) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cn("lg-bottom-item", isActive && "active")}
              data-index={index}
              onClick={() => {
                if (justDragged.current) {
                  justDragged.current = false;
                  return; // this "click" is the tail of a drag — ignore it
                }
                triggerHaptic();
                if (item.id === "profile") {
                  router.push(isUserAuthenticated ? "/dashboard" : "/login");
                } else if (item.path) {
                  router.push(item.path);
                }
              }}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn("lg-bottom-icon", isActive && "active")}>
                {item.id === "home" && <Home />}
                {item.id === "events" && <Ticket />}
                {item.id === "competitions" && <Trophy />}
                {item.id === "profile" &&
                  (isUserAuthenticated ? (
                    userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={currentUser?.name || "User"}
                        className={cn(
                          "lg-bottom-avatar",
                          isActive && "active"
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          "lg-bottom-initials",
                          isActive && "active"
                        )}
                      >
                        {userInitial || <User />}
                      </span>
                    )
                  ) : (
                    <User />
                  ))}
              </span>
              <span className={cn("lg-bottom-label", isActive && "active")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Separate circular search button */}
      <button
        type="button"
        className={cn("lg-bottom-search", isSearchActive && "active")}
        onClick={() => {
          triggerHaptic();
          router.push("/search");
        }}
        aria-label="Search"
        aria-current={isSearchActive ? "page" : undefined}
      >
        <Search />
      </button>
    </div>
  );
}
