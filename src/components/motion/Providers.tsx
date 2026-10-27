"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { authApi, tokenStore } from "@/lib/api";

/* ─────────────── THEME ─────────────── */

type Theme = "dark" | "blue";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    let stored: Theme | null = null;
    try { stored = localStorage.getItem("uti_theme") as Theme | null; } catch {}
    const next: Theme = stored === "blue" || stored === "dark" ? stored : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "blue" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("uti_theme", next); } catch {}
      return next;
    });
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

/* ─────────────── SMOOTH SCROLL (Lenis) ─────────────── */

/**
 * The live Lenis instance. Lenis drives the page scroll itself, so CSS like
 * `overflow: hidden` on <body> does not hold it back — overlays have to stop it.
 */
let lenisInstance: Lenis | null = null;

/** Freezes (or releases) the page scroll behind a modal or drawer. */
export function setPageScrollLocked(locked: boolean) {
  if (locked) lenisInstance?.stop();
  else lenisInstance?.start();
}

/**
 * Freezes the page behind an open overlay and, when `onEscape` is given,
 * closes it on Escape. Covers both Lenis and the native scrollbars.
 */
export function usePageScrollLock(active: boolean, onEscape?: () => void) {
  // Callers usually pass an inline arrow, so keep it out of the effect's deps:
  // re-locking on every render would thrash Lenis.
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setPageScrollLocked(true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") escapeRef.current?.();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      setPageScrollLocked(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.11,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenisInstance = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -100 });
    };
    document.addEventListener("click", onAnchor);

    return () => {
      document.removeEventListener("click", onAnchor);
      cancelAnimationFrame(frame);
      lenis.destroy();
      if (lenisInstance === lenis) lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}

/* ─────────────── AUTH ─────────────── */

type AuthState = {
  user: any | null;
  loading: boolean;
  role: string | null;
  isJudge: boolean;
  isVolunteer: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};
const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  role: null,
  isJudge: false,
  isVolunteer: false,
  refresh: async () => {},
  logout: () => {},
});
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      tokenStore.clear();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
      if (me?.role) tokenStore.setRole(me.role);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rawRole = (user?.role || (typeof window !== "undefined" ? tokenStore.getRole() : null) || "").toUpperCase();
  const isJudge = rawRole === "JUDGE";
  const isVolunteer = rawRole === "VOLUNTEER";

  return (
    <AuthCtx.Provider value={{ user, loading, role: rawRole || null, isJudge, isVolunteer, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
