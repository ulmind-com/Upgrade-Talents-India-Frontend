"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    new URLSearchParams(window.location.search).has("static"));

export const isRecording = () =>
  typeof window !== "undefined" &&
  (document.documentElement.classList.contains("is-recording") ||
    new URLSearchParams(window.location.search).has("record"));

export { gsap, ScrollTrigger };
