"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download, Printer, CheckCircle2, Calendar, MapPin,
  Clock, User, Sparkles, ShieldCheck, Loader2
} from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { type MyTicket } from "@/lib/api";
import { formatEventDate, formatINR, cn, imageFor } from "@/lib/utils";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Automatically assign distinct color variant per ticket / user, or allow user override
  const autoVariant = defaultVariant || getVariantForTicket(ticket.ticket_ref, ticket.holder_email);
  const [activeVariantKey, setActiveVariantKey] = useState<TicketVariantKey>(autoVariant);
  const v = TICKET_VARIANTS[activeVariantKey];

  // 100% CORS-Safe Local QR Code Generation via data: URI
  useEffect(() => {
    // If backend already provided base64 data URL, use it directly
    const direct = qrData?.qr_image || qrData?.qr_code || qrData?.image;
    if (typeof direct === "string" && direct.startsWith("data:image")) {
      setQrDataUrl(direct);
      return;
    }

    const raw = ticket.qr_token || ticket.ticket_ref;
    QRCode.toDataURL(raw, {
      margin: 1,
      width: 320,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error("QR generation error:", err);
        setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(raw)}`);
      });
  }, [ticket.qr_token, ticket.ticket_ref, qrData]);

  // Download high-res PNG (Ticket Only, Transparent Background)
  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const canvas = await (html2canvas as any)(cardRef.current, {
        scale: 3, // 3x ultra-crisp resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: null, // Transparent background outside the ticket card
        logging: false,
        imageTimeout: 6000,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Eventora-Ticket-${ticket.ticket_ref}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.warn("Direct html2canvas export error, attempting fallback:", err);
      try {
        // Fallback: ignore external untrusted images if any failed CORS
        const fallbackCanvas = await (html2canvas as any)(cardRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          ignoreElements: (el: HTMLElement) =>
            el.tagName === "IMG" && !el.getAttribute("src")?.startsWith("data:"),
        });
        const fallbackUrl = fallbackCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = fallbackUrl;
        a.download = `Eventora-Ticket-${ticket.ticket_ref}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      } catch (fallbackErr) {
        console.error("Download fallback error:", fallbackErr);
        alert("Could not export image directly. Please use the Print button to save as PDF.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const priceAmount = ticket.price ?? ticket.base_price ?? 500;
  const eventTitle = ticket.event_title || "Grand Tech Festival 2026";
  const venue = ticket.event_venue || "Salt Lake Stadium, Kolkata";
  const time = ticket.event_time || "07:00 PM";
  const dateFormatted = ticket.event_date ? formatEventDate(ticket.event_date) : formatEventDate(ticket.issued_at);
  const tierName = (ticket.ticket_type || "VIP Pass").toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {/* ── Action Bar / Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Color Palette Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
            Colorway:
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {Object.values(TICKET_VARIANTS).map((variant) => (
              <button
                key={variant.key}
                type="button"
                onClick={() => setActiveVariantKey(variant.key)}
                title={variant.name}
                className={cn(
                  "size-4 rounded-full transition-transform hover:scale-125 cursor-pointer",
                  activeVariantKey === variant.key && "ring-2 ring-white scale-110 shadow-sm"
                )}
                style={{ background: variant.gradient }}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-semibold"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-xs font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ background: v.gradient }}
          >
            {downloading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Generating…</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="size-3.5 text-white" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>Download Ticket (PNG)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── THE PHYSICAL TICKET VOUCHER (PRINTABLE & DOWNLOADABLE) ── */}
      <div className="overflow-x-auto pb-4">
        <div
          ref={cardRef}
          className="relative mx-auto flex w-full min-w-[720px] max-w-[880px] min-h-[250px] overflow-hidden rounded-3xl bg-white text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.35)] select-none"
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
          }}
        >
          {/* ══════════ LEFT SECTION: EVENT ARTWORK & WAVY CURVE ══════════ */}
          {/* NOTICE: Parent here does NOT have overflow-hidden so circular badge is NEVER cut off! */}
          <div className="relative w-[30%] shrink-0 flex items-center justify-center bg-zinc-950">
            {/* Inner container with overflow-hidden for the image & wave */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={ticket.event_cover || imageFor(null, 3)}
                alt=""
                crossOrigin="anonymous"
                className="size-full object-cover object-center filter saturate-125"
              />
              {/* Overlay matching variant */}
              <div
                className="absolute inset-0 opacity-40 mix-blend-multiply"
                style={{ background: v.gradient }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {/* Eventora watermark badge top left */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                <Sparkles className="size-3 text-amber-300" />
                <span>Eventora 2026</span>
              </div>

              {/* Bottom Tag */}
              <div className="absolute bottom-4 left-4 z-10 text-[11px] font-semibold text-white/90 drop-shadow">
                Official Entry Voucher
              </div>

              {/* ── ORGANIC SVG WAVE SEPARATOR ── */}
              <svg
                viewBox="0 0 100 200"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -right-0.5 top-0 h-full w-14 text-white fill-current z-10 drop-shadow-[-4px_0_12px_rgba(0,0,0,0.15)]"
              >
                <path d="M 0,0 C 60,35 60,165 0,200 L 100,200 L 100,0 Z" />
              </svg>
            </div>

            {/* ── FLOATING CIRCULAR PRICE BADGE (100% UNCUT, FLOATING ON WAVE SEAM) ── */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30 pointer-events-none">
              <div
                className="flex size-20 sm:size-22 flex-col items-center justify-center rounded-full bg-white border-4 border-white"
                style={{ boxShadow: `0 0 0 3px ${v.primary}, 0 10px 30px rgba(0,0,0,0.25)` }}
              >
                <span
                  className="font-black tracking-tight text-base sm:text-lg leading-tight"
                  style={{ color: v.primary }}
                >
                  {priceAmount === 0 ? "FREE" : formatINR(priceAmount)}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                  Price
                </span>
              </div>
            </div>
          </div>

          {/* ══════════ MIDDLE SECTION: MAIN EVENT DETAILS ══════════ */}
          {/* pl-14 sm:pl-16 ensures text NEVER collides with circular price badge */}
          <div className="relative flex flex-1 flex-col justify-between p-6 pl-14 sm:pl-16 bg-white min-w-0">
            <div>
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
            <div className="mt-3 border-t border-zinc-100 pt-2.5">
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

          {/* ══════════ TEAR PERFORATION DIVIDER ══════════ */}
          <div className="relative w-0 shrink-0 flex items-center justify-center">
            {/* Vertical dashed line */}
            <div className="absolute top-0 bottom-0 left-0 border-l-2 border-dashed border-zinc-200 z-20" />
          </div>

          {/* ══════════ RIGHT SECTION: STUB WITH REAL QR CODE ══════════ */}
          {/* Well-proportioned: never overlaps, clean padding */}
          <div
            className="relative w-[205px] sm:w-[220px] shrink-0 p-4 flex flex-col items-center justify-between shadow-inner"
            style={{ background: v.gradient }}
          >
            {/* Rotated Stub Header */}
            <div className="w-full text-center">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">
                Gate Entry Pass
              </span>
              <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-white truncate px-1">
                {tierName}
              </p>
            </div>

            {/* ── THE CRISP QR CODE CONTAINER (NO OVERLAP) ── */}
            <div className="my-1.5 rounded-2xl bg-white p-2 shadow-lg flex flex-col items-center justify-center">
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
            <div className="w-full text-center">
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
