"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download, Printer, Calendar, MapPin,
  Clock, User, Sparkles, ShieldCheck, Loader2
} from "lucide-react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { type MyTicket } from "@/lib/api";
import { formatEventDate, formatINR, cn, imageFor, isUsableImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Primitives";

export type TicketVariantKey = "magenta" | "blue" | "emerald" | "amber" | "purple";

export interface TicketVariantConfig {
  key: TicketVariantKey;
  name: string;
  primary: string;
  primaryDark: string;
  gradient: string;
  softBg: string;
  badgeBorder: string;
  textColor: string;
  stubTextColor: string;
  ringColor: string;
  pillBg: string;
  pillText: string;
}

export const TICKET_VARIANTS: Record<TicketVariantKey, TicketVariantConfig> = {
  magenta: {
    key: "magenta",
    name: "Neon Magenta",
    primary: "#d91a7a",
    primaryDark: "#9d1154",
    gradient: "linear-gradient(145deg, #d91a7a 0%, #a21caf 100%)",
    softBg: "rgba(217, 26, 122, 0.08)",
    badgeBorder: "#d91a7a",
    textColor: "#d91a7a",
    stubTextColor: "#ffffff",
    ringColor: "#f472b6",
    pillBg: "#fdf2f8",
    pillText: "#be185d",
  },
  blue: {
    key: "blue",
    name: "Electric Blue",
    primary: "#0066cc",
    primaryDark: "#0047ab",
    gradient: "linear-gradient(145deg, #0284c7 0%, #1d4ed8 100%)",
    softBg: "rgba(0, 102, 204, 0.08)",
    badgeBorder: "#0066cc",
    textColor: "#0066cc",
    stubTextColor: "#ffffff",
    ringColor: "#38bdf8",
    pillBg: "#f0f9ff",
    pillText: "#0369a1",
  },
  emerald: {
    key: "emerald",
    name: "Cyber Mint",
    primary: "#059669",
    primaryDark: "#047857",
    gradient: "linear-gradient(145deg, #059669 0%, #0f766e 100%)",
    softBg: "rgba(5, 150, 105, 0.08)",
    badgeBorder: "#059669",
    textColor: "#059669",
    stubTextColor: "#ffffff",
    ringColor: "#34d399",
    pillBg: "#ecfdf5",
    pillText: "#047857",
  },
  amber: {
    key: "amber",
    name: "Sunset Coral",
    primary: "#ea580c",
    primaryDark: "#c2410c",
    gradient: "linear-gradient(145deg, #f59e0b 0%, #ea580c 100%)",
    softBg: "rgba(234, 88, 12, 0.08)",
    badgeBorder: "#ea580c",
    textColor: "#ea580c",
    stubTextColor: "#ffffff",
    ringColor: "#fbbf24",
    pillBg: "#fff7ed",
    pillText: "#c2410c",
  },
  purple: {
    key: "purple",
    name: "Imperial Violet",
    primary: "#7c3aed",
    primaryDark: "#5b21b6",
    gradient: "linear-gradient(145deg, #8b5cf6 0%, #6d28d9 100%)",
    softBg: "rgba(124, 58, 237, 0.08)",
    badgeBorder: "#7c3aed",
    textColor: "#7c3aed",
    stubTextColor: "#ffffff",
    ringColor: "#c084fc",
    pillBg: "#f5f3ff",
    pillText: "#6d28d9",
  },
};

export function getVariantForTicket(ticketRef: string, userEmail?: string): TicketVariantKey {
  const str = (ticketRef || "") + (userEmail || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const keys: TicketVariantKey[] = ["magenta", "blue", "emerald", "amber", "purple"];
  return keys[Math.abs(hash) % keys.length];
}

interface TicketPassProps {
  ticket: MyTicket;
  qrData?: any;
  defaultVariant?: TicketVariantKey;
}

export function TicketPass({ ticket, qrData, defaultVariant }: TicketPassProps) {
  const autoVariant = defaultVariant || getVariantForTicket(ticket.ticket_ref, ticket.holder_email);
  const [variant, setVariant] = useState<TicketVariantKey>(autoVariant);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const v = TICKET_VARIANTS[variant] || TICKET_VARIANTS.magenta;

  // Generate CORS-safe local QR code data URL
  useEffect(() => {
    let cancelled = false;
    const token = qrData?.qr_token || qrData?.token || ticket.qr_token || ticket.ticket_ref;
    QRCode.toDataURL(String(token), {
      width: 400,
      margin: 1,
      color: { dark: "#0b0f19", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR data URL:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket, qrData]);

  // Download ticket with 100% transparent background (ticket only)
  const handleDownload = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null, // Pure transparent background, no dark overlay
        scale: 3, // Crisp high-DPI output
        useCORS: true,
        logging: false,
      } as any);

      const link = document.createElement("a");
      link.download = `eventora-ticket-${ticket.ticket_ref.toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export ticket PNG:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const eventTitle = ticket.event_title || "Neon Night Battle";
  const dateFormatted = ticket.event_date ? formatEventDate(ticket.event_date) : formatEventDate(ticket.issued_at);
  const time = ticket.event_time || "10:00 PM";
  const venue = ticket.event_venue || "Kolkata";
  const tierName = ticket.ticket_type || "General Access";
  const priceAmount = ticket.price ?? ticket.base_price ?? 500;
  const coverImage = isUsableImageUrl(ticket.event_cover) ? ticket.event_cover : imageFor(null, 0);

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── TOOLBAR: Colorway switcher & Download / Print actions ── */}
      <div className="w-full max-w-[920px] mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Colorway:
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-md">
            {(Object.keys(TICKET_VARIANTS) as TicketVariantKey[]).map((key) => {
              const cfg = TICKET_VARIANTS[key];
              const active = variant === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVariant(key)}
                  title={cfg.name}
                  aria-label={`Switch color to ${cfg.name}`}
                  className={cn(
                    "relative size-5 rounded-full transition-all duration-300 cursor-pointer",
                    active ? "scale-115 ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-70 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ background: cfg.gradient }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <Printer className="size-3.5" />
            <span>Print</span>
          </Button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{
              background: v.gradient,
              boxShadow: `0 8px 24px ${v.primary}40`,
            }}
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>Download Ticket (PNG)</span>
          </button>
        </div>
      </div>

      {/* ── SCROLL WRAPPER FOR MOBILE ── */}
      <div className="w-full overflow-x-auto pb-4 pt-1 flex justify-center">
        {/* ── THE TICKET CARD ITSELF ── */}
        <div
          ref={ticketRef}
          className="relative flex w-full max-w-[920px] shrink-0 rounded-[26px] bg-transparent text-zinc-900 shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-white/10"
          style={{ minHeight: "290px", width: "920px" }}
        >
          {/* ══════════ LEFT SECTION: EVENT PHOTO WITH ORGANIC WAVE ══════════ */}
          <div className="relative w-[34%] min-w-[240px] max-w-[290px] shrink-0 bg-zinc-900 rounded-l-[26px]">
            {/* Inner image container */}
            <div className="absolute inset-0 overflow-hidden rounded-l-[26px]">
              <img
                src={coverImage}
                alt={eventTitle}
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackApplied) {
                    target.dataset.fallbackApplied = "1";
                    target.src = "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1400&q=80";
                  }
                }}
                className="size-full object-cover brightness-95 saturate-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

              {/* Badge overlay on top-left of image */}
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 backdrop-blur-md border border-white/10">
                <Sparkles className="size-3 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  Eventora 2026
                </span>
              </div>

              {/* Bottom-left branding on image */}
              <div className="absolute bottom-4 left-4 z-10">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/90 drop-shadow">
                  Official Entry Voucher
                </p>
              </div>
            </div>

            {/* ── ORGANIC SVG ACCENT WAVE (Peeks out behind white curve) ── */}
            <svg
              viewBox="0 0 100 200"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -right-3 top-0 h-full w-20 fill-current z-10 opacity-95"
              style={{ color: v.primary }}
            >
              <path d="M 0,0 C 70,30 70,170 0,200 L 100,200 L 100,0 Z" />
            </svg>

            {/* ── ORGANIC SVG WHITE WAVE SEAM ── */}
            <svg
              viewBox="0 0 100 200"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -right-0.5 top-0 h-full w-16 text-white fill-current z-15 drop-shadow-[-6px_0_15px_rgba(0,0,0,0.15)]"
            >
              <path d="M 0,0 C 55,38 55,162 0,200 L 100,200 L 100,0 Z" />
            </svg>

            {/* ── FLOATING CIRCULAR PRICE BADGE (DOUBLE RING, 100% UNCUT) ── */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30 pointer-events-none">
              <div
                className="size-20 sm:size-22 rounded-full p-[3px] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
                style={{ background: v.primary }}
              >
                {/* White spacer */}
                <div className="size-full rounded-full bg-white p-[2.5px] flex items-center justify-center">
                  {/* Inner colored ring & white core */}
                  <div
                    className="size-full rounded-full border-2 bg-white flex flex-col items-center justify-center"
                    style={{ borderColor: v.primary }}
                  >
                    <span
                      className="font-black tracking-tight text-base sm:text-lg leading-tight"
                      style={{ color: v.primary }}
                    >
                      {priceAmount === 0 ? "FREE" : formatINR(priceAmount)}
                    </span>
                    <span className="text-[8.5px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                      Price
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════ MIDDLE SECTION: MAIN EVENT DETAILS WITH 45° CHAMFER NOTCHES ══════════ */}
          <div className="relative flex flex-1 flex-col justify-between p-6 pl-14 sm:pl-16 min-w-0 mr-[2px]">
            {/* Background layer with 45° angled chamfers at top-right & bottom-right */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Main white block (all the way to 14px before the right edge) */}
              <div className="absolute inset-y-0 left-0 right-[14px] bg-white" />
              {/* Right vertical strip between the two notches */}
              <div className="absolute top-[14px] bottom-[14px] right-0 w-[14px] bg-white" />
              {/* Top-right 45-degree filled triangle */}
              <svg viewBox="0 0 14 14" className="absolute top-0 right-0 size-[14px] fill-white block">
                <polygon points="0,0 0,14 14,14" />
              </svg>
              {/* Bottom-right 45-degree filled triangle */}
              <svg viewBox="0 0 14 14" className="absolute bottom-0 right-0 size-[14px] fill-white block">
                <polygon points="0,0 14,0 0,14" />
              </svg>
            </div>

            {/* Content sitting above the background */}
            <div className="relative z-10">
              {/* Header Eyebrow */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-zinc-400">
                  2026 Special Live Event
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"
                  style={{ background: v.pillBg, color: v.pillText }}
                >
                  {ticket.is_checked_in ? "Used Pass" : "Verified Ticket"}
                </span>
              </div>

              {/* Event Name */}
              <h2
                className="mt-1 font-display text-2xl sm:text-3xl font-black uppercase leading-tight tracking-tight line-clamp-1"
                style={{ color: v.primary }}
              >
                {eventTitle}
              </h2>

              {/* Key metadata grid */}
              <div className="mt-3.5 grid grid-cols-2 gap-y-2.5 gap-x-4 border-t border-zinc-100 pt-3">
                {/* Holder */}
                <div>
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Attendee / Holder
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-zinc-900 truncate flex items-center gap-1">
                    <User className="size-3 text-zinc-400 shrink-0" />
                    {ticket.holder_name || "Guest Attendee"}
                  </p>
                </div>

                {/* Tier */}
                <div>
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Access Tier
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-zinc-900 truncate">
                    {tierName}
                  </p>
                </div>

                {/* Date */}
                <div>
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Event Date
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-zinc-900 flex items-center gap-1">
                    <Calendar className="size-3 text-zinc-400 shrink-0" />
                    {dateFormatted}
                  </p>
                </div>

                {/* Time */}
                <div>
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Gate Time
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-zinc-900 flex items-center gap-1">
                    <Clock className="size-3 text-zinc-400 shrink-0" />
                    {time}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Venue & Pills Bar */}
            <div className="relative z-10 mt-3 border-t border-zinc-100 pt-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 truncate">
                <MapPin className="size-3 text-zinc-400 shrink-0" />
                <span className="truncate">{venue}</span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: v.pillBg, color: v.pillText }}
                >
                  Admit One
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                  Non-Transferable
                </span>
                <span className="ml-auto font-mono text-[10px] font-bold text-zinc-400">
                  {ticket.ticket_ref}
                </span>
              </div>
            </div>
          </div>

          {/* ══════════ RIGHT SECTION: STUB WITH 45° CHAMFER NOTCHES & REAL QR CODE ══════════ */}
          <div className="relative w-[210px] shrink-0 p-4 flex flex-col items-center justify-between shadow-inner">
            {/* Background layer with 45° angled chamfers at top-left & bottom-left */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Main stub block (from 14px to the right edge with rounded-r-[26px]) */}
              <div
                className="absolute inset-y-0 left-[14px] right-0 rounded-r-[26px]"
                style={{ background: v.gradient }}
              />
              {/* Left vertical strip between top and bottom notches */}
              <div
                className="absolute top-[14px] bottom-[14px] left-0 w-[14px]"
                style={{ background: v.primary }}
              />
              {/* Top-left 45-degree filled triangle */}
              <svg viewBox="0 0 14 14" className="absolute top-0 left-0 size-[14px] block" style={{ fill: v.primary }}>
                <polygon points="14,0 14,14 0,14" />
              </svg>
              {/* Bottom-left 45-degree filled triangle */}
              <svg viewBox="0 0 14 14" className="absolute bottom-0 left-0 size-[14px] block" style={{ fill: v.primaryDark || v.primary }}>
                <polygon points="0,0 14,0 14,14" />
              </svg>
            </div>

            {/* Vertical dashed tear perforation line */}
            <div className="absolute top-[14px] bottom-[14px] -left-[2px] border-l-2 border-dashed border-zinc-200/90 z-20 pointer-events-none" />

            {/* Stub Content */}
            <div className="relative z-10 w-full text-center">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/85">
                Gate Entry Pass
              </span>
              <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-white truncate px-1">
                {tierName}
              </p>
            </div>

            {/* ── THE CRISP QR CODE CONTAINER (NO OVERLAP, CORS-SAFE) ── */}
            <div className="relative z-10 my-1.5 rounded-2xl bg-white p-2 shadow-lg flex flex-col items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR for ${ticket.ticket_ref}`}
                  className="size-24 sm:size-26 object-contain block"
                />
              ) : (
                <div className="size-24 sm:size-26 grid place-items-center bg-zinc-50">
                  <Loader2 className="size-6 animate-spin text-zinc-400" />
                </div>
              )}
              <span className="mt-1 font-mono text-[9px] font-black tracking-wider text-zinc-800">
                {ticket.ticket_ref}
              </span>
            </div>

            {/* Stub Footer */}
            <div className="relative z-10 w-full text-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-[8.5px] font-bold text-white shadow-sm">
                <ShieldCheck className="size-2.5 text-emerald-300" />
                <span>Scan for gate check-in</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
