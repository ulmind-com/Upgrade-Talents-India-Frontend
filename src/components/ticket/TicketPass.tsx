"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download, Printer, Calendar, MapPin,
  Clock, User, Sparkles, ShieldCheck, Loader2, CheckCircle2, TicketX
} from "lucide-react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { type MyTicket } from "@/lib/api";
import { formatEventDate, formatINR, cn, imageFor, isUsableImageUrl, isEventExpired } from "@/lib/utils";
import { Button } from "@/components/ui/Primitives";

import { TICKET_DANCER_BASE64 } from "./ticketDancerBase64";

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

  // Method 1: Try proxy route if remote
  const targetUrl = url.startsWith("http")
    ? `/api/proxy-image?url=${encodeURIComponent(url)}`
    : url;

  try {
    const res = await fetch(targetUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else resolve(url);
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return url;
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
  const [printing, setPrinting] = useState(false);
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

  // Priority: 1) local base64 if fetched, 2) event_cover if valid, 3) guaranteed embedded dancer base64
  const defaultCover = TICKET_DANCER_BASE64;
  const rawCover = isUsableImageUrl(ticket.event_cover) ? ticket.event_cover : defaultCover;
  useEffect(() => {
    let cancelled = false;
    if (rawCover.startsWith("data:")) {
      setCoverBase64(rawCover);
      return;
    }
    toBase64DataUrl(rawCover).then((b64) => {
      if (!cancelled && b64) setCoverBase64(b64);
    });
    return () => {
      cancelled = true;
    };
  }, [rawCover]);

  // ── Exact ticket geometry (must stay in sync with the ticket box below) ──
  const TICKET_W = 920;
  const TICKET_H = 290;

  /**
   * Render ONLY the ticket node to a transparent PNG data URL.
   * Uses html-to-image (SVG foreignObject) so the browser itself paints the
   * node — modern CSS used by Tailwind v4 (oklch colours, gradients, backdrop
   * filters) comes out exactly as it looks on screen, at the exact 920×290 box.
   */
  const renderTicketPng = async (pixelRatio = 3): Promise<string> => {
    const node = ticketRef.current;
    if (!node) throw new Error("Ticket node not mounted");

    // 1. Make sure the QR code exists as a local data URL
    if (!qrDataUrl) {
      const token = qrData?.qr_token || qrData?.token || ticket.qr_token || ticket.ticket_ref;
      const url = await QRCode.toDataURL(String(token), {
        width: 450,
        margin: 1,
        color: { dark: "#0b0f19", light: "#ffffff" },
      });
      setQrDataUrl(url);
    }

    // 2. Make sure the cover image in the DOM is a data URL (never taint the canvas)
    const imgEl = node.querySelector("img") as HTMLImageElement | null;
    if (imgEl && imgEl.src && !imgEl.src.startsWith("data:")) {
      try {
        const b64 = await toBase64DataUrl(imgEl.src);
        imgEl.src = b64 && b64.startsWith("data:") ? b64 : TICKET_DANCER_BASE64;
      } catch {
        imgEl.src = TICKET_DANCER_BASE64;
      }
    }

    // 3. Wait for webfonts + a paint tick so the capture matches the screen 1:1
    try {
      await (document as any).fonts?.ready;
    } catch {
      /* fonts API unavailable — carry on */
    }
    await new Promise((r) => setTimeout(r, 80));

    const options = {
      width: TICKET_W,
      height: TICKET_H,
      pixelRatio,
      cacheBust: true,
      backgroundColor: undefined, // fully transparent outside the ticket
      style: { margin: "0", transform: "none", transformOrigin: "top left" },
    };

    // The first pass warms the embedded fonts/images cache; the second is clean.
    await toPng(node, options as any);
    return await toPng(node, options as any);
  };

  // Download the ticket — and nothing but the ticket — as a PNG
  const handleDownload = async () => {
    if (!ticketRef.current || downloading) return;
    setDownloading(true);
    setDownloadSuccess(false);

    const filename = `ticket-${(ticket.event_title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${ticket.ticket_ref.toLowerCase()}.png`;

    try {
      triggerDataUrlDownload(await renderTicketPng(3), filename);
    } catch (err) {
      console.error("Failed to export ticket PNG:", err);
      try {
        triggerDataUrlDownload(await renderTicketPng(2), filename);
      } catch (fallbackErr) {
        console.error("Fallback export failed:", fallbackErr);
      }
    } finally {
      setDownloading(false);
    }
  };

  const triggerDataUrlDownload = (dataUrl: string, filename: string) => {
    // Blob URLs keep working for large PNGs where a data: href can be refused
    let href = dataUrl;
    let blobUrl: string | null = null;
    try {
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      href = blobUrl;
    } catch {
      /* fall back to the data URL as-is */
    }

    const link = document.createElement("a");
    link.download = filename;
    link.href = href;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }, 1500);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Print EXACTLY one page: a page sized to the ticket, holding the ticket image
  const handlePrint = async () => {
    if (printing || !ticketRef.current) return;
    setPrinting(true);

    try {
      const dataUrl = await renderTicketPng(3);

      const old = document.getElementById("eventora-ticket-print-iframe");
      if (old) old.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "eventora-ticket-print-iframe";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        setPrinting(false);
        return;
      }

      // Paper is the ticket: 920×290 CSS px at 96dpi → 243.42mm × 76.73mm
      const pageW = ((TICKET_W / 96) * 25.4).toFixed(2);
      const pageH = ((TICKET_H / 96) * 25.4).toFixed(2);

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Ticket - ${ticket.ticket_ref}</title><style>
        @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
        html, body {
          margin: 0; padding: 0;
          width: ${pageW}mm; height: ${pageH}mm;
          overflow: hidden; background: #ffffff;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        img {
          display: block; width: 100%; height: 100%; object-fit: contain;
          page-break-inside: avoid; break-inside: avoid;
          page-break-after: avoid; break-after: avoid;
        }
      </style></head><body><img id="eventora-ticket-img" src="${dataUrl}" alt="Ticket ${ticket.ticket_ref}" /></body></html>`);
      doc.close();

      const fire = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setPrinting(false);
        setTimeout(() => iframe.remove(), 3000);
      };

      const img = doc.getElementById("eventora-ticket-img") as HTMLImageElement | null;
      if (img && !img.complete) {
        img.onload = () => setTimeout(fire, 120);
        img.onerror = () => fire();
      } else {
        setTimeout(fire, 180);
      }
    } catch (err) {
      console.error("Failed to prepare ticket for printing:", err);
      setPrinting(false);
    }
  };
  const eventTitle = ticket.event_title || "Neon Night Battle";
  const dateFormatted = ticket.event_date ? formatEventDate(ticket.event_date) : formatEventDate(ticket.issued_at);
  const time = ticket.event_time || "10:00 PM";
  const venue = ticket.event_venue || "Kolkata";
  const tierName = ticket.ticket_type || "General Access";
  const priceAmount = ticket.price ?? ticket.base_price ?? 500;
  const coverImage = coverBase64 || rawCover;


  const isExpired = isEventExpired(ticket.event_date || ticket.issued_at, ticket.event_time);

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── TOOLBAR: Official Pass Indicator & Actions (Print / Download) ── */}
      <div className="w-full max-w-[920px] mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {isExpired ? (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-rose-400">
                <Clock className="size-3 text-rose-400" />
                Expired Pass • Event Ended
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full animate-pulse"
                style={{ background: v.primary }}
              />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Official Pass • {v.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={printing}
            variant="outline"
            size="sm"
            className={cn("gap-2 text-xs", isExpired && "opacity-75")}
          >
            {printing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Printer className="size-3.5" />
            )}
            <span>{printing ? "Preparing…" : isExpired ? "Print (Expired)" : "Print"}</span>
          </Button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer",
              isExpired && "opacity-85"
            )}
            style={{
              background: isExpired ? "linear-gradient(145deg, #4b5563 0%, #1f2937 100%)" : v.gradient,
              boxShadow: isExpired ? "0 4px 14px rgba(0,0,0,0.3)" : `0 8px 24px ${v.primary}40`,
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
                <span>{isExpired ? "Download Pass (Expired)" : "Download Ticket (PNG)"}</span>
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
            className="relative flex text-zinc-900 select-none overflow-hidden rounded-[26px]"
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
            {/* ── INNER WRAPPER: BLURRED WHEN EXPIRED ── */}
            <div
              className={cn(
                "relative flex size-full transition-all duration-300",
                isExpired && "filter blur-[2.5px] opacity-60 grayscale-[30%]"
              )}
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
                      style={{
                        background: isExpired ? "#fee2e2" : v.pillBg,
                        color: isExpired ? "#dc2626" : v.pillText,
                      }}
                    >
                      {isExpired ? "Expired" : ticket.is_checked_in ? "Used Pass" : "Verified Ticket"}
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
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[8.5px] font-bold text-white shadow-sm",
                      isExpired ? "bg-red-950/80 text-red-200 border border-red-500/40" : "bg-black/25"
                    )}
                  >
                    {isExpired ? (
                      <>
                        <TicketX className="size-2.5 text-red-400" />
                        <span>Pass expired</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-2.5 text-emerald-300" />
                        <span>Scan for gate check-in</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* ── END INNER WRAPPER ── */}
            </div>

            {/* ── EXPIRED BADGE / WATERMARK OVERLAY (CAPTURED IN DOWNLOAD PNG) ── */}
            {isExpired && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 pointer-events-none select-none">
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-red-500/90 bg-zinc-950/92 px-8 py-4 shadow-[0_0_50px_rgba(239,68,68,0.55)] backdrop-blur-md transform -rotate-2">
                  <div className="flex items-center gap-2.5">
                    <TicketX className="size-6 text-red-500" />
                    <span className="font-display text-3xl md:text-4xl font-black uppercase tracking-[0.28em] text-red-500 drop-shadow">
                      EXPIRED
                    </span>
                  </div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-200">
                    Event Concluded ({dateFormatted})
                  </p>
                  <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-red-300">
                    Void for gate admission
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

