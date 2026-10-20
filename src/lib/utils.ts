import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SyntheticEvent } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(value?: number | null) {
  const n = Number(value ?? 0);
  if (!n) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function parseDate(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatEventDate(input?: string | null) {
  const d = parseDate(input);
  if (!d) return input || "TBA";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Checks whether an event date (and optional time) has passed.
 * Returns true if the event has concluded.
 * If only a date is provided without a specific time, it expires after 23:59:59.999 of that day.
 * If a time is provided, it incorporates a buffer or end of day, whichever is later.
 */
export function isEventExpired(dateInput?: string | Date | null, timeInput?: string | null): boolean {
  if (!dateInput) return false;

  let eventYear: number;
  let eventMonth: number;
  let eventDay: number;
  let eventHours = 23;
  let eventMinutes = 59;
  let hasSpecificTime = false;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return false;
    eventYear = dateInput.getFullYear();
    eventMonth = dateInput.getMonth();
    eventDay = dateInput.getDate();
    eventHours = dateInput.getHours();
    eventMinutes = dateInput.getMinutes();
    hasSpecificTime = eventHours !== 0 || eventMinutes !== 0;
  } else if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return false;

    // Matches YYYY-MM-DD
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      eventYear = parseInt(ymdMatch[1], 10);
      eventMonth = parseInt(ymdMatch[2], 10) - 1;
      eventDay = parseInt(ymdMatch[3], 10);
      // Check if there was also an inline time in the ISO string
      const isoTimeMatch = trimmed.match(/T(\d{1,2}):(\d{2})/);
      if (isoTimeMatch) {
        eventHours = parseInt(isoTimeMatch[1], 10);
        eventMinutes = parseInt(isoTimeMatch[2], 10);
        hasSpecificTime = true;
      }
    } else {
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return false;
      eventYear = parsed.getFullYear();
      eventMonth = parsed.getMonth();
      eventDay = parsed.getDate();
      eventHours = parsed.getHours();
      eventMinutes = parsed.getMinutes();
      hasSpecificTime = eventHours !== 0 || eventMinutes !== 0;
    }
  } else {
    return false;
  }

  // Parse timeInput if supplied separately (e.g. "10:00 PM", "6:30 PM", "18:00")
  if (timeInput && typeof timeInput === "string") {
    const timeMatch = timeInput.match(/(\d{1,2}):(\d{2})(?:\s*([aApP][mM]))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const mer = timeMatch[3]?.toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      else if (mer === "AM" && h === 12) h = 0;
      eventHours = h;
      eventMinutes = m;
      hasSpecificTime = true;
    }
  }

  // End of that calendar day
  const endOfDay = new Date(eventYear, eventMonth, eventDay, 23, 59, 59, 999).getTime();

  let expiryTime = endOfDay;
  if (hasSpecificTime) {
    const startDateTime = new Date(eventYear, eventMonth, eventDay, eventHours, eventMinutes, 0, 0).getTime();
    // 4 hours buffer after start time
    const bufferTime = startDateTime + (4 * 60 * 60 * 1000);
    expiryTime = Math.max(bufferTime, endOfDay);
  }

  return Date.now() > expiryTime;
}

export function splitDate(input?: string | null) {
  const d = parseDate(input);
  if (!d) return { day: "--", month: "TBA", weekday: "", year: "" };
  return {
    day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
    weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
    year: String(d.getFullYear()),
  };
}

export function countdownParts(target?: string | null) {
  const d = parseDate(target);
  if (!d) return null;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  };
}

/** Curated fallback imagery (royalty-free Unsplash) used only when CMS has no image. */
export const FALLBACK_IMAGES = [
  // Verified dance / stage imagery. Index 0 is the hero backdrop.
  "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1545959570-a94084071b5d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1400&q=80",
];

/** Hosts/values that are placeholder data from the CMS and will never resolve to a real image. */
const BAD_IMAGE_PATTERNS = [/(^|\/\/)(www\.)?example\.(com|org|net)/i, /placeholder/i, /your-?domain/i];

export function isUsableImageUrl(url: string | undefined | null): url is string {
  if (!url || typeof url !== "string" || !url.trim()) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/") && !trimmed.startsWith("data:")) {
    return false;
  }
  return !BAD_IMAGE_PATTERNS.some((re) => re.test(trimmed));
}

function fallbackImage(seed: string | number) {
  const i = typeof seed === "number" ? seed : seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[Math.abs(i) % FALLBACK_IMAGES.length];
}

export function imageFor(url: string | undefined | null, seed: string | number = 0) {
  if (isUsableImageUrl(url)) return url;
  return fallbackImage(seed);
}

/**
 * onError handler for <img>: swaps a failed image to a deterministic fallback once.
 * Guards against infinite loops if the fallback itself fails.
 */
export function onImageError(seed: string | number = 0) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = "1";
    img.src = fallbackImage(seed);
  };
}

export function truncate(text = "", max = 140) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
