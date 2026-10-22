"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

export const isStatic = prefersReducedMotion;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Per-frame callback with dt in seconds; returns a remover. Paused when the tab is hidden by GSAP. */
export function tick(fn: (dt: number, t: number) => void) {
  let t = 0;
  const f = (_: number, delta: number) => {
    const dt = Math.min(delta, 100) / 1000;
    t += dt;
    fn(dt, t);
  };
  gsap.ticker.add(f);
  return () => gsap.ticker.remove(f);
}

/** Scroll progress 0..1 of an element between two ScrollTrigger positions. */
export function onProgress(
  trigger: Element,
  start: string,
  end: string,
  cb: (p: number, self: ScrollTrigger) => void
) {
  const st = ScrollTrigger.create({
    trigger,
    start,
    end,
    onUpdate: (s) => cb(s.progress, s),
    onRefresh: (s) => cb(s.progress, s),
  });
  return () => st.kill();
}

/** Is the element on screen (with margin)? Cheap flag for idle loops. */
export function watchVisible(el: Element, set: (v: boolean) => void, margin = "20%") {
  if (typeof IntersectionObserver === "undefined") {
    set(true);
    return () => {};
  }
  const io = new IntersectionObserver(([e]) => set(e.isIntersecting), {
    rootMargin: `${margin} 0px`,
  });
  io.observe(el);
  return () => io.disconnect();
}

export function lenisVelocity() {
  if (typeof window === "undefined") return 0;
  return (window as any).__lenis?.velocity || 0;
}

/** Progress of a tall wrapper (sticky pin) 0..1. */
export function usePinProgress(
  ref: RefObject<HTMLElement | null>,
  cb: (p: number) => void,
  staticP = 1,
  start = "top top",
  end = "bottom bottom"
) {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (!ref.current) return;
    if (isStatic()) {
      cbRef.current(staticP);
      return;
    }
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start,
      end,
      onUpdate: (s) => cbRef.current(s.progress),
      onRefresh: (s) => cbRef.current(s.progress),
    });
    cbRef.current(st.progress);
    return () => st.kill();
  }, [ref, staticP, start, end]);
}
