"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download, Printer, Calendar, MapPin,
  Clock, User, Sparkles, ShieldCheck, Loader2, CheckCircle2
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

export function getVariantForTicket(
  ticketRef: string,
  userEmail?: string,
  holderName?: string
): TicketVariantKey {
  const str = (userEmail || holderName || ticketRef || "").toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 37 + str.charCodeAt(i)) >>> 0;
  }
  const keys: TicketVariantKey[] = ["magenta", "emerald", "blue", "purple", "amber"];
  return keys[hash % keys.length];
}

/** Converts any image URL to a local base64 Data URL to guarantee zero canvas tainting */
async function toBase64DataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  // Method 1: fetch blob with cors
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to read blob as data URL"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    // Method 2: in-memory HTMLImageElement draw
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 600;
          canvas.height = img.naturalHeight || 800;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
            return;
          }
        } catch {
          // ignore
        }
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }
}

interface TicketPassProps {
  ticket: MyTicket;
  qrData?: any;
  defaultVariant?: TicketVariantKey;
}

export function TicketPass({ ticket, qrData, defaultVariant }: TicketPassProps) {
  const variant = defaultVariant || getVariantForTicket(ticket.ticket_ref, ticket.holder_email, ticket.holder_name);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const v = TICKET_VARIANTS[variant] || TICKET_VARIANTS.magenta;

  // Generate CORS-safe local QR code data URL
  useEffect(() => {
    let cancelled = false;
    const token = qrData?.qr_token || qrData?.token || ticket.qr_token || ticket.ticket_ref;
    QRCode.toDataURL(String(token), {
      width: 450,
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

  // Pre-fetch cover image as base64 so html2canvas never encounters CORS issues
  const defaultCover = "/images/ticket-dancer.jpg";
  const rawCover = isUsableImageUrl(ticket.event_cover) ? ticket.event_cover : defaultCover;
  useEffect(() => {
    let cancelled = false;
    toBase64DataUrl(rawCover).then((b64) => {
      if (!cancelled && b64) setCoverBase64(b64);
    });
    return () => {
      cancelled = true;
    };
  }, [rawCover]);

  // Download ticket with 100% transparent background (ONLY ticket is exported)
  const handleDownload = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      // 1. Ensure cover image in DOM is already base64
      const imgEl = ticketRef.current.querySelector("img") as HTMLImageElement | null;
      if (imgEl && imgEl.src && !imgEl.src.startsWith("data:")) {
        try {
          const b64 = await toBase64DataUrl(imgEl.src);
          if (b64 && b64.startsWith("data:")) {
            imgEl.src = b64;
          }
        } catch (e) {
          console.warn("Could not inline cover before canvas capture:", e);
        }
      }

      // 2. Ensure QR data URL is present
      if (!qrDataUrl) {
        const token = qrData?.qr_token || qrData?.token || ticket.qr_token || ticket.ticket_ref;
        const generated = await QRCode.toDataURL(String(token), {
          width: 450,
          margin: 1,
          color: { dark: "#0b0f19", light: "#ffffff" },
        });
        setQrDataUrl(generated);
      }

      // Small delay for painted DOM
      await new Promise((r) => setTimeout(r, 60));

      // 3. Render high-resolution canvas with html2canvas (transparent background, exact 920x290 box)
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null, // 100% transparent background outside ticket!
        scale: 2, // 2x ultra-sharp resolution (~1840px width)
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 920,
        height: 290,
        windowWidth: 920,
        windowHeight: 290,
      } as any);

      // 4. Download file using Blob & URL.createObjectURL for universal browser support
      const filename = `ticket-${(ticket.event_title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${ticket.ticket_ref.toLowerCase()}.png`;

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            triggerDataUrlDownload(canvas.toDataURL("image/png"), filename);
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = filename;
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(blobUrl);
          }, 1000);
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 3000);
        }, "image/png");
      } else {
        triggerDataUrlDownload(canvas.toDataURL("image/png"), filename);
      }
    } catch (err) {
      console.error("Failed to export ticket PNG:", err);
      // Never trigger window.print() on download failure
    } finally {
      setDownloading(false);
    }
  };

  const triggerDataUrlDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 200);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
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
  const coverImage = coverBase64 || rawCover;

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── TOOLBAR: Official Pass Indicator & Actions (Print / Download) ── */}
      <div className="w-full max-w-[920px] mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full animate-pulse"
            style={{ background: v.primary }}
          />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Official Pass • {v.name}
          </span>
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
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Generating PNG…</span>
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

      {/* ── SCROLL WRAPPER FOR MOBILE / DESKTOP PREVIEW ── */}
      <div className="w-full overflow-x-auto pb-4 pt-1 flex justify-center">
        {/* Outer UI Card Container: provides the shadow & border for the web page dashboard ONLY */}
        <div className="relative rounded-[26px] shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/10 shrink-0">
          {/* ── THE TICKET CARD ITSELF (CAPTURED FOR DOWNLOAD) ── */}
          <div
            ref={ticketRef}
            id="printable-ticket"
            className="relative flex text-zinc-900 select-none"
            style={{
              width: "920px",
              height: "290px",
              minWidth: "920px",
              maxWidth: "920px",
              minHeight: "290px",
              maxHeight: "290px",
              background: "transparent",
              boxShadow: "none",
              border: "none",
            }}
          >
            {/* ══════════ LEFT SECTION: EVENT PHOTO WITH ORGANIC WAVE ══════════ */}
            <div className="relative w-[280px] h-[290px] shrink-0 rounded-l-[26px] overflow-hidden bg-zinc-900">
              <img
                src={coverImage}
                alt={eventTitle}
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackApplied) {
                    target.dataset.fallbackApplied = "1";
                    target.src = "/images/ticket-dancer.jpg";
                  }
                }}
                className="size-full object-cover brightness-95 saturate-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

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

              {/* ── ORGANIC SVG WAVE SEAM (Single crisp curve with primary color stroke) ── */}
              <svg
                viewBox="0 0 60 290"
                preserveAspectRatio="none"
                className="pointer-events-none absolute right-0 top-0 h-full w-[60px] z-20"
              >
                <path
                  d="M 15,0 C 55,70 55,220 15,290 L 60,290 L 60,0 Z"
                  fill="#ffffff"
                />
                <path
                  d="M 15,0 C 55,70 55,220 15,290"
                  fill="none"
                  stroke={v.primary}
                  strokeWidth="3.5"
                />
              </svg>
            </div>

            {/* ── FLOATING CIRCULAR PRICE BADGE (DOUBLE RING, 100% UNCUT) ── */}
            <div
              className="absolute z-30 pointer-events-none"
              style={{ left: "280px", top: "145px", transform: "translate(-50%, -50%)" }}
            >
              <div
                className="size-20 rounded-full p-[3px] flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.22)]"
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
                      className="font-black tracking-tight text-lg leading-tight"
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

            {/* ══════════ MIDDLE SECTION: MAIN EVENT DETAILS WITH 45° CHAMFER NOTCHES ══════════ */}
            <div className="relative w-[430px] h-[290px] shrink-0">
              {/* White background path with 45° chamfer cutouts at top-right & bottom-right */}
              <svg
                viewBox="0 0 430 290"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full pointer-events-none"
              >
                <path
                  d="M 0,0 L 416,0 L 430,14 L 430,276 L 416,290 L 0,290 Z"
                  fill="#ffffff"
                />
              </svg>

              {/* Content sitting above the background */}
              <div className="relative z-10 size-full flex flex-col justify-between pl-14 pr-6 py-5">
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
                    className="mt-1 font-display text-2xl font-black uppercase leading-tight tracking-tight line-clamp-1"
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
                <div className="border-t border-zinc-100 pt-2.5">
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
            </div>

            {/* ── VERTICAL DASHED TEAR LINE ── */}
            <div
              className="absolute top-[14px] bottom-[14px] z-20 pointer-events-none border-l-2 border-dashed border-zinc-200"
              style={{ left: "710px" }}
            />

            {/* ══════════ RIGHT SECTION: STUB WITH 45° CHAMFER NOTCHES & REAL QR CODE ══════════ */}
            <div className="relative w-[210px] h-[290px] shrink-0">
              {/* Gradient background with 45° chamfers and rounded right corners */}
              <svg
                viewBox="0 0 210 290"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full pointer-events-none"
              >
                <defs>
                  <linearGradient id={`stub-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={v.primary} />
                    <stop offset="100%" stopColor={v.primaryDark || v.primary} />
                  </linearGradient>
                </defs>
                <path
                  d="M 14,0 L 184,0 A 26 26 0 0 1 210,26 L 210,264 A 26 26 0 0 1 184,290 L 14,290 L 0,276 L 0,14 Z"
                  fill={`url(#stub-grad-${variant})`}
                />
              </svg>

              {/* Stub Content */}
              <div className="relative z-10 size-full p-4 flex flex-col items-center justify-between text-center">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/90">
                    Gate Entry Pass
                  </span>
                  <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-white truncate px-1">
                    {tierName}
                  </p>
                </div>

                {/* ── THE CRISP QR CODE CONTAINER (NO OVERLAP, CORS-SAFE) ── */}
                <div className="my-1 rounded-2xl bg-white p-2 shadow-sm flex flex-col items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR for ${ticket.ticket_ref}`}
                      className="size-24 object-contain block"
                    />
                  ) : (
                    <div className="size-24 grid place-items-center bg-zinc-50">
                      <Loader2 className="size-6 animate-spin text-zinc-400" />
                    </div>
                  )}
                  <span className="mt-1 font-mono text-[9px] font-black tracking-wider text-zinc-800">
                    {ticket.ticket_ref}
                  </span>
                </div>

                {/* Stub Footer */}
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-[8.5px] font-bold text-white shadow-sm">
                    <ShieldCheck className="size-2.5 text-emerald-300" />
                    <span>Scan for gate check-in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

