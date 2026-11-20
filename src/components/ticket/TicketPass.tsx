"use client";

import { useRef, useState, useEffect } from "react";
import {
  Download,
  Printer,
  Calendar,
  MapPin,
  Clock,
  User,
  Sparkles,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  TicketX,
  Mail,
  Check,
  Ban,
  ChevronRight,
} from "lucide-react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { type MyTicket, bookingsApi } from "@/lib/api";
import { formatEventDate, formatINR, cn, isUsableImageUrl, isEventExpired } from "@/lib/utils";
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

/* ── Five authentic colourways matching the Mobile App deterministically ── */
export const WAYS: {
  key: TicketVariantKey;
  name: string;
  grad: [string, string];
  stub: [string, string];
  pillBg: string;
  pillText: string;
}[] = [
  { key: "magenta", name: "Neon Magenta", grad: ["#d91a7a", "#a21caf"], stub: ["#f0407e", "#a21caf"], pillBg: "#fdf2f8", pillText: "#be185d" },
  { key: "blue", name: "Electric Blue", grad: ["#0284c7", "#1d4ed8"], stub: ["#38bdf8", "#1d4ed8"], pillBg: "#f0f9ff", pillText: "#0369a1" },
  { key: "emerald", name: "Cyber Mint", grad: ["#059669", "#0f766e"], stub: ["#34d399", "#0f766e"], pillBg: "#ecfdf5", pillText: "#047857" },
  { key: "amber", name: "Sunset Coral", grad: ["#f59e0b", "#ea580c"], stub: ["#fbbf24", "#ea580c"], pillBg: "#fff7ed", pillText: "#c2410c" },
  { key: "purple", name: "Imperial Violet", grad: ["#8b5cf6", "#6d28d9"], stub: ["#a78bfa", "#6d28d9"], pillBg: "#f5f3ff", pillText: "#6d28d9" },
];

export const ticketWay = (seed: string) =>
  WAYS[Math.abs([...String(seed)].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % WAYS.length];

export const TICKET_VARIANTS: Record<TicketVariantKey, TicketVariantConfig> = {
  magenta: {
    key: "magenta",
    name: "Neon Magenta",
    primary: "#d91a7a",
    primaryDark: "#a21caf",
    gradient: "linear-gradient(135deg, #d91a7a 0%, #a21caf 100%)",
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
    primary: "#0284c7",
    primaryDark: "#1d4ed8",
    gradient: "linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)",
    softBg: "rgba(0, 102, 204, 0.08)",
    badgeBorder: "#0284c7",
    textColor: "#0284c7",
    stubTextColor: "#ffffff",
    ringColor: "#38bdf8",
    pillBg: "#f0f9ff",
    pillText: "#0369a1",
  },
  emerald: {
    key: "emerald",
    name: "Cyber Mint",
    primary: "#059669",
    primaryDark: "#0f766e",
    gradient: "linear-gradient(135deg, #059669 0%, #0f766e 100%)",
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
    primaryDark: "#ea580c",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
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
    primary: "#8b5cf6",
    primaryDark: "#6d28d9",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    softBg: "rgba(124, 58, 237, 0.08)",
    badgeBorder: "#8b5cf6",
    textColor: "#8b5cf6",
    stubTextColor: "#ffffff",
    ringColor: "#a78bfa",
    pillBg: "#f5f3ff",
    pillText: "#6d28d9",
  },
};

export function getVariantForTicket(
  ticketRef: string,
  userEmail?: string,
  holderName?: string
): TicketVariantKey {
  return ticketWay(ticketRef || userEmail || holderName || "x").key;
}

/** Converts any image URL to a local base64 Data URL to guarantee zero canvas tainting */
async function toBase64DataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

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
  } catch {
    return url;
  }
}

interface TicketPassProps {
  ticket: MyTicket;
  qrData?: any;
  defaultVariant?: TicketVariantKey;
}

export function TicketPass({ ticket, qrData, defaultVariant }: TicketPassProps) {
  const seed = ticket.ticket_ref || ticket.event_id || ticket.holder_name || "x";
  const way = defaultVariant ? (WAYS.find((w) => w.key === defaultVariant) || WAYS[0]) : ticketWay(seed);

  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

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

  // Image source resolution
  const defaultCover = TICKET_DANCER_BASE64;
  const candidateCover =
    ticket.event_cover ||
    ticket.event_image ||
    (ticket as any).card_image_url ||
    (ticket as any).image_url ||
    (ticket as any).banner_url ||
    (ticket as any).banner_image_url ||
    (ticket as any).cover_image;
  const rawCover = isUsableImageUrl(candidateCover) ? candidateCover : defaultCover;

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

  // ── Exact Boarding Pass Geometry (synced with mobile layout proportions) ──
  const TICKET_W = 860;
  const TICKET_H = 260;
  const STUB_W = 210;

  const renderTicketPng = async (pixelRatio = 3): Promise<string> => {
    const node = ticketRef.current;
    if (!node) throw new Error("Ticket node not mounted");

    if (!qrDataUrl) {
      const token = qrData?.qr_token || qrData?.token || ticket.qr_token || ticket.ticket_ref;
      const url = await QRCode.toDataURL(String(token), {
        width: 450,
        margin: 1,
        color: { dark: "#0b0f19", light: "#ffffff" },
      });
      setQrDataUrl(url);
    }

    const imgEl = node.querySelector("img") as HTMLImageElement | null;
    if (imgEl && imgEl.src && !imgEl.src.startsWith("data:")) {
      try {
        const b64 = await toBase64DataUrl(imgEl.src);
        imgEl.src = b64 && b64.startsWith("data:") ? b64 : TICKET_DANCER_BASE64;
      } catch {
        imgEl.src = TICKET_DANCER_BASE64;
      }
    }

    try {
      await (document as any).fonts?.ready;
    } catch {
      /* fonts API unavailable */
    }
    await new Promise((r) => setTimeout(r, 80));

    const options = {
      width: TICKET_W,
      height: TICKET_H,
      pixelRatio,
      cacheBust: true,
      backgroundColor: undefined,
      style: { margin: "0", transform: "none", transformOrigin: "top left" },
    };

    await toPng(node, options as any);
    return await toPng(node, options as any);
  };

  const handleDownload = async () => {
    if (!ticketRef.current || downloading || isUsed) return;
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
      /* fall back to data URL */
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

  const handlePrint = async () => {
    if (printing || !ticketRef.current) return;
    setPrinting(true);

    try {
      const dataUrl = await renderTicketPng(3);

      const old = document.getElementById("uti-ticket-print-iframe");
      if (old) old.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "uti-ticket-print-iframe";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        setPrinting(false);
        return;
      }

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
      </style></head><body><img id="uti-ticket-img" src="${dataUrl}" alt="Ticket ${ticket.ticket_ref}" /></body></html>`);
      doc.close();

      const fire = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setPrinting(false);
        setTimeout(() => iframe.remove(), 3000);
      };

      const img = doc.getElementById("uti-ticket-img") as HTMLImageElement | null;
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

  const handleEmailTicket = async () => {
    if (emailing) return;
    setEmailing(true);
    setEmailSuccess(false);
    setEmailError(null);
    try {
      await bookingsApi.sendTicketEmail(ticket.ticket_ref);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000);
    } catch (err: any) {
      setEmailError(err?.message || "Failed to dispatch email");
      setTimeout(() => setEmailError(null), 5000);
    } finally {
      setEmailing(false);
    }
  };

  const eventTitle = ticket.event_title || "Official Live Event";
  const dateFormatted = ticket.event_date ? formatEventDate(ticket.event_date) : formatEventDate(ticket.issued_at);
  const time = ticket.event_time || "10:00 PM";
  const venue = ticket.event_venue || "Kolkata";
  const tierName = ticket.category || ticket.ticket_type || "Pass";
  const quantity = Number(ticket.quantity || 1);
  const totalAmount =
    ticket.total_booking_amount ??
    ticket.total_price ??
    ticket.total_amount ??
    (quantity > 1 && ticket.price ? ticket.price * quantity : ticket.price) ??
    ticket.base_price ??
    0;
  const priceAmount = totalAmount;
  const coverImage = coverBase64 || rawCover;

  const admittedCount = Number(ticket.admitted_count || (ticket.is_checked_in ? quantity : 0));
  const isUsed = Boolean(
    ticket.is_checked_in ||
    ticket.status === "USED" ||
    (ticket as any).is_fully_used ||
    (ticket as any).status_display === "ALREADY_USED" ||
    (ticket as any).can_download === false ||
    (quantity > 0 && admittedCount >= quantity && admittedCount > 0)
  );
  const isExpired = !isUsed && isEventExpired(ticket.event_date || ticket.issued_at, ticket.event_time);
  const isVoid = isUsed || isExpired;

  return (
    <div className="w-full flex flex-col items-center">
      {/* ── TOOLBAR: Status Indicator & Action Buttons ── */}
      <div className="w-full max-w-[860px] mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {isUsed ? (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-emerald-400">
                <CheckCircle2 className="size-3 text-emerald-400" />
                Gate Entry Completed ({admittedCount}/{quantity} Admitted)
              </span>
            </div>
          ) : isExpired ? (
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
                style={{ background: way.grad[0] }}
              />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Official Boarding Pass • {way.name} • {quantity > 1 ? `Group (${quantity}P)` : "Admit 1"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isUsed ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 font-mono text-xs font-bold text-emerald-300 shadow-md">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Gate Checked In</span>
            </div>
          ) : (
            <>
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

              <Button
                onClick={handleEmailTicket}
                disabled={emailing}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 text-xs transition-colors",
                  emailSuccess && "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
                  emailError && "border-rose-500/50 text-rose-400 bg-rose-500/10"
                )}
              >
                {emailing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : emailSuccess ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Mail className="size-3.5" />
                )}
                <span>
                  {emailing
                    ? "Sending…"
                    : emailSuccess
                    ? "Pass Emailed!"
                    : emailError
                    ? "Failed to send"
                    : "Email Pass"}
                </span>
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
                  background: isExpired
                    ? "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)"
                    : `linear-gradient(135deg, ${way.grad[0]} 0%, ${way.grad[1]} 100%)`,
                  boxShadow: isExpired ? "0 4px 14px rgba(0,0,0,0.3)" : `0 8px 24px ${way.grad[1]}50`,
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
            </>
          )}
        </div>
      </div>

      {/* ── SCROLL WRAPPER FOR PREVIEW ── */}
      <div className="w-full overflow-x-auto pb-4 pt-1 flex justify-center">
        {/* Outer UI Card Container */}
        <div
          className="relative rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.55)] border border-white/10 shrink-0"
          style={{
            boxShadow: `0 20px 60px ${isExpired ? "rgba(0,0,0,0.6)" : way.grad[1] + "40"}`,
          }}
        >
          {/* ── THE TICKET CARD ITSELF (CAPTURED FOR DOWNLOAD & PRINT) ── */}
          <div
            ref={ticketRef}
            id="printable-ticket"
            className="relative flex select-none overflow-hidden rounded-[24px]"
            style={{
              width: `${TICKET_W}px`,
              height: `${TICKET_H}px`,
              minWidth: `${TICKET_W}px`,
              maxWidth: `${TICKET_W}px`,
              minHeight: `${TICKET_H}px`,
              maxHeight: `${TICKET_H}px`,
              background: "transparent",
            }}
          >
            {/* ══════════ MAIN PASS BODY (LEFT) ══════════ */}
            <div
              className="relative h-full rounded-l-[24px] overflow-hidden"
              style={{
                width: `${TICKET_W - STUB_W}px`,
                background: `linear-gradient(135deg, ${way.grad[0]} 0%, ${way.grad[1]} 100%)`,
              }}
            >
              {/* Background Cover Image Overlay */}
              <img
                src={coverImage}
                alt={eventTitle}
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackApplied) {
                    target.dataset.fallbackApplied = "1";
                    target.src = TICKET_DANCER_BASE64;
                  }
                }}
                className="absolute inset-0 size-full object-cover opacity-35 mix-blend-overlay pointer-events-none"
              />

              {/* Scrim Gradient */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%)",
                }}
              />

              {/* Main Pass Content */}
              <div className="relative z-10 flex flex-col justify-between size-full p-6 text-white">
                {/* Top Row: Pass Type & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/25 backdrop-blur-md px-3 py-1 text-[10.5px] font-black uppercase tracking-wider text-white shadow-sm border border-white/15">
                      {tierName}
                    </span>
                    {quantity > 1 && (
                      <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30">
                        {quantity} Persons Group
                      </span>
                    )}
                  </div>

                  {isUsed ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 border border-emerald-400/40 text-emerald-400 shadow-sm">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">USED</span>
                    </div>
                  ) : isExpired ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 border border-rose-400/40 text-rose-300 shadow-sm">
                      <Clock className="size-3.5 text-rose-400" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">EXPIRED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 border border-white/25 text-white shadow-sm">
                      <ShieldCheck className="size-3.5 text-emerald-300" />
                      <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest">VALID PASS</span>
                    </div>
                  )}
                </div>

                {/* Middle: Event Title & Subtitle */}
                <div>
                  <h2 className="font-display text-2xl sm:text-[28px] font-black uppercase text-white tracking-tight leading-[1.1] line-clamp-2 drop-shadow-md">
                    {eventTitle}
                  </h2>
                  <p className="mt-1 text-xs sm:text-[13px] font-medium text-white/90 truncate drop-shadow-sm flex items-center gap-2">
                    <span className="font-semibold">{dateFormatted}</span>
                    {time && <span>• {time}</span>}
                    {venue && <span className="opacity-90">• {venue}</span>}
                  </p>
                </div>

                {/* Bottom Row: Holder & Floating Price Pill */}
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
                      HOLDER
                    </span>
                    <span className="font-display text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate block max-w-[340px]">
                      {ticket.holder_name || "Guest Attendee"}
                    </span>
                  </div>

                  <div className="rounded-full bg-white px-4 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.25)] flex items-center justify-center shrink-0">
                    <span
                      className="font-display text-sm sm:text-base font-black tracking-tight"
                      style={{ color: way.grad[1] }}
                    >
                      {priceAmount === 0 ? "FREE" : formatINR(priceAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════ PERFORATION NOTCHES & VERTICAL SEAM ══════════ */}
            {/* Top Cutout Notch */}
            <div
              className="absolute top-[-11px] size-[22px] rounded-full z-20 pointer-events-none"
              style={{
                right: `${STUB_W - 11}px`,
                backgroundColor: "var(--bg, #080c18)",
              }}
            />
            {/* Bottom Cutout Notch */}
            <div
              className="absolute bottom-[-11px] size-[22px] rounded-full z-20 pointer-events-none"
              style={{
                right: `${STUB_W - 11}px`,
                backgroundColor: "var(--bg, #080c18)",
              }}
            />
            {/* Vertical Perforation Dashed Line */}
            <div
              className="absolute top-[14px] bottom-[14px] w-[2px] z-20 pointer-events-none flex flex-col justify-between"
              style={{ right: `${STUB_W - 1}px` }}
            >
              {Array.from({ length: 13 }).map((_, i) => (
                <span
                  key={i}
                  className="w-[2px] h-[8px] rounded-full bg-white/75"
                />
              ))}
            </div>

            {/* ══════════ STUB SECTION (RIGHT) ══════════ */}
            <div
              className="relative h-full rounded-r-[24px] overflow-hidden"
              style={{
                width: `${STUB_W}px`,
                background: `linear-gradient(135deg, ${way.stub[0]} 0%, ${way.stub[1]} 100%)`,
              }}
            >
              <div className="relative z-10 flex flex-col items-center justify-between size-full p-4 text-center">
                {/* Stub Header */}
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-white/90">
                    UPGRADE TALENTS
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-white truncate max-w-[170px]">
                    {tierName}
                  </span>
                </div>

                {/* Crisp White QR Card */}
                <div className="relative my-auto rounded-2xl bg-white p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.22)] flex flex-col items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR ${ticket.ticket_ref}`}
                      className={cn(
                        "size-24 object-contain block transition-all",
                        isVoid && "opacity-25 grayscale"
                      )}
                    />
                  ) : (
                    <div className="size-24 grid place-items-center bg-zinc-50">
                      <Loader2 className="size-6 animate-spin text-zinc-400" />
                    </div>
                  )}

                  {isUsed && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-rose-950/70 rounded-2xl p-1 backdrop-blur-[1px]">
                      <div className="rotate-[-12deg] rounded border border-rose-500 bg-rose-600 px-2 py-0.5 shadow-md">
                        <span className="font-display text-[9px] font-black uppercase tracking-wider text-white">
                          ALREADY USED
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-[8px] font-extrabold text-rose-200 bg-rose-900/80 px-1.5 py-0.2 rounded">
                        {admittedCount}/{quantity} Admitted
                      </span>
                    </div>
                  )}

                  {isExpired && !isUsed && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 rounded-2xl p-1 backdrop-blur-[1px]">
                      <Ban className="size-7 text-rose-400 mb-0.5" />
                      <span className="font-display text-[9px] font-black uppercase tracking-wider text-rose-300">
                        EXPIRED
                      </span>
                    </div>
                  )}
                </div>

                {/* Stub Footer */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[10.5px] font-black tracking-widest text-white/95 uppercase">
                    {ticket.ticket_ref}
                  </span>
                  <span className="text-[8.5px] font-semibold text-white/80 uppercase tracking-wider">
                    {isExpired ? "Pass Concluded" : "Scan at Gate • One Pass"}
                  </span>
                </div>
              </div>
            </div>

            {/* ══════════ EXPIRED WATERMARK STAMP OVERLAY ══════════ */}
            {!isUsed && isExpired && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/45 backdrop-blur-[0.5px]">
                <div className="rotate-[-7deg] rounded-full border-2 border-red-500/80 bg-black/85 px-6 py-2 shadow-[0_0_40px_rgba(239,68,68,0.5)]">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-red-400" />
                    <span className="font-display text-base font-black uppercase tracking-[0.25em] text-red-400">
                      EXPIRED PASS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ ALREADY USED INK STAMP OVERLAY ══════════ */}
            {isUsed && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-[0.5px]">
                <div className="rotate-[-6deg] rounded-2xl border-4 border-dashed border-red-600 bg-zinc-950/95 px-8 py-4 shadow-[0_0_50px_rgba(239,68,68,0.7)] text-center">
                  <div className="flex items-center justify-center gap-2.5">
                    <TicketX className="size-6 text-red-500" />
                    <span className="font-display text-2xl font-black uppercase tracking-[0.25em] text-red-500">
                      ALREADY USED
                    </span>
                  </div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-200 mt-1">
                    Gate Entry Completed • {admittedCount} of {quantity} Admitted
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
