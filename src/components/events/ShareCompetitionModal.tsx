"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Share2,
  Sparkles,
  QrCode,
  Download,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Ticket,
  Radio,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Twitter,
  Send,
  Linkedin,
  Facebook,
  Mail,
  Smartphone,
  Eye,
  ArrowRight
} from "lucide-react";
import QRCode from "qrcode";
import { formatEventDate, formatINR, imageFor, cn } from "@/lib/utils";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";

export interface ShareCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  comp: {
    _id?: string;
    id?: string;
    title?: string;
    name?: string;
    description?: string;
    category?: string;
    categories?: any[];
    type?: string;
    prize?: string;
    participation_fee?: number;
    fee?: number;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    time?: string;
    registration_deadline?: string;
    venue?: string;
    event_mode?: string;
    card_image_url?: string | null;
    banner_image_url?: string | null;
    image_url?: string | null;
    status?: string;
    voting_status?: string;
    judging_status?: string;
    result_status?: string;
    results_published?: boolean;
    share_url?: string;
    [key: string]: any;
  } | null;
}

export default function ShareCompetitionModal({
  isOpen,
  onClose,
  comp,
}: ShareCompetitionModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareMode, setShareMode] = useState<"details" | "register">("details");
  const [activeTab, setActiveTab] = useState<"share" | "qr">("share");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  const compId = comp?._id || comp?.id || "";
  const title = comp?.title || comp?.name || "Official Talent Competition";
  const category = comp?.category || comp?.type || "Competition";
  const fee = comp?.participation_fee ?? comp?.fee ?? 0;
  const prize = comp?.prize || "";
  const venue = comp?.venue || (comp?.event_mode === "OFFLINE" ? "Main Stage Venue" : "Virtual / Online Live Stage");
  const startDate = comp?.start_date ? formatEventDate(comp.start_date) : "";
  const startTime = comp?.start_time || comp?.time || "";
  const dateTimeStr = [startDate, startTime].filter(Boolean).join(" at ");

  const desktopImg = comp?.card_image_url || comp?.image_url || "";
  const posterImg = comp?.banner_image_url || desktopImg || imageFor(desktopImg, 6);

  const lifecycle = comp ? getCompetitionLifecycle(comp) : ({} as any);

  // Canonical URLs
  const siteBase = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_SITE_URL || "https://upgradetalentsindia.in";
  }, []);

  const detailsUrl = `${siteBase}/competitions/${compId}`;
  const registerUrl = `${siteBase}/competitions/${compId}?action=register#register`;
  const activeUrl = shareMode === "register" ? registerUrl : detailsUrl;

  // Pre-formatted viral text for WhatsApp, Telegram, SMS
  const shareMessage = useMemo(() => {
    const lines = [
      `🏆 *${title}*`,
      `✨ *Category:* ${category}`,
    ];
    if (dateTimeStr) {
      lines.push(`📅 *Date & Time:* ${dateTimeStr}`);
    }
    if (venue) {
      lines.push(`📍 *Venue:* ${venue}`);
    }
    if (prize) {
      lines.push(`💰 *Prize Pool:* ${prize}`);
    }
    lines.push(`🎟️ *Entry Fee:* ${fee > 0 ? `₹${fee}` : "FREE Entry"}`);
    lines.push("");
    lines.push(
      shareMode === "register"
        ? `👉 *Direct Entry & Registration:* ${registerUrl}`
        : `👉 *View Details & Participate:* ${detailsUrl}`
    );
    lines.push("");
    lines.push("_Upgrade Talents India — Where Talents Meet Opportunities_");
    return lines.join("\n");
  }, [title, category, dateTimeStr, venue, prize, fee, shareMode, registerUrl, detailsUrl]);

  // Check if native sharing is available
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Generate high-resolution QR code
  useEffect(() => {
    if (isOpen && activeUrl) {
      QRCode.toDataURL(activeUrl, {
        width: 420,
        margin: 2,
        color: {
          dark: "#050811",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating competition QR code:", err));
    }
  }, [isOpen, activeUrl]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !comp) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // Fallback
    }
  };

  const copyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2400);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out '${title}' on Upgrade Talents India!`,
          url: activeUrl,
        });
      } catch {
        // User dismissed sheet
      }
    } else {
      copyLink();
    }
  };

  const openWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(activeUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openTwitter = () => {
    const tweetText = `🏆 Participate in '${title}' on Upgrade Talents India!\n\n#UpgradeTalentsIndia #TalentContest #${category.replace(/\s+/g, "")}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(activeUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openEmail = () => {
    const subject = encodeURIComponent(`Invitation to participate in ${title}`);
    const body = encodeURIComponent(
      `Hi,\n\nI wanted to share this exciting competition with you:\n\n${shareMessage}\n\nCheck out full details at: ${activeUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const cleanName = (comp.title || "competition").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    a.download = `UTI-Competition-QR-${cleanName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Ambient Darkened Backdrop with Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#111420] via-[#0b0e17] to-[#070a10] shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(245,158,11,0.1)] text-white z-10 my-auto"
        >
          {/* Top Decorative Amber/Cyan Ambient Glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 blur-3xl opacity-70" />

          {/* Header Bar */}
          <div className="relative flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300 shadow-inner">
                <Share2 className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Share Competition</span>
                  <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.2 text-[10px] font-bold text-amber-300">
                    VIP Invite
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Send invite with rich preview, image &amp; direct link
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
            {/* ── Ultra Pro Visual Competition Card Preview ── */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent p-3.5 sm:p-4 shadow-xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start">
                {/* Poster / Cover Thumbnail */}
                <div className="relative w-full sm:w-36 h-36 sm:h-32 shrink-0 rounded-xl overflow-hidden border border-white/15 shadow-md bg-neutral-900">
                  <img
                    src={posterImg}
                    alt={title}
                    className="size-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  
                  {/* Category Pill on Image */}
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/75 border border-white/20 px-2 py-0.5 text-[9.5px] font-extrabold text-white backdrop-blur-md uppercase tracking-wider">
                    <Sparkles className="size-2.5 text-amber-400" />
                    {category}
                  </span>

                  {/* Status Indicator */}
                  {lifecycle.isLive ? (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase animate-pulse">
                      <Radio className="size-2.5" /> LIVE
                    </span>
                  ) : lifecycle.isResultsOut ? (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                      <CheckCircle2 className="size-2.5" /> Results Out
                    </span>
                  ) : (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-500/90 text-black px-1.5 py-0.5 text-[9px] font-black uppercase">
                      Open
                    </span>
                  )}
                </div>

                {/* Details Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-white line-clamp-2 leading-snug">
                      {title}
                    </h4>

                    {/* Metadata Strip */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                      {dateTimeStr && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="size-3 text-amber-400 shrink-0" />
                          <span className="truncate">{dateTimeStr}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-sky-400 shrink-0" />
                        <span className="truncate">{venue}</span>
                      </div>
                      {prize && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Trophy className="size-3 text-amber-300 shrink-0" />
                          <span className="truncate font-semibold text-amber-300">{prize}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 truncate">
                        <Ticket className="size-3 text-emerald-400 shrink-0" />
                        <span className="truncate font-bold text-emerald-300">
                          {fee > 0 ? formatINR(fee) : "Free Entry"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Destination Info Pill */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 text-[10.5px]">
                      <Eye className="size-3 text-amber-400" />
                      Recipient lands on: <strong className="text-white font-semibold">{shareMode === "register" ? "Registration Form" : "Details & Media"}</strong>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Direct Link Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Mode Selection Pill (Details Page vs Direct Register) ── */}
            <div className="flex items-center gap-2 p-1 rounded-2xl border border-white/10 bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setShareMode("details")}
                className={cn(
                  "cursor-pointer flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
                  shareMode === "details"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <span>Competition Details Page</span>
              </button>
              <button
                type="button"
                onClick={() => setShareMode("register")}
                className={cn(
                  "cursor-pointer flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
                  shareMode === "register"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <span>Direct Registration Link</span>
                <span className="rounded bg-black/30 px-1.5 py-0.2 text-[9px] uppercase font-mono">Fast</span>
              </button>
            </div>

            {/* ── View Tab Selector (Quick Share vs QR Code) ── */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <button
                  type="button"
                  onClick={() => setActiveTab("share")}
                  className={cn(
                    "cursor-pointer pb-1.5 px-2 border-b-2 font-bold transition-all flex items-center gap-1.5",
                    activeTab === "share"
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-neutral-400 hover:text-white"
                  )}
                >
                  <Share2 className="size-3.5" />
                  <span>Instant Social Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("qr")}
                  className={cn(
                    "cursor-pointer pb-1.5 px-2 border-b-2 font-bold transition-all flex items-center gap-1.5",
                    activeTab === "qr"
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-neutral-400 hover:text-white"
                  )}
                >
                  <QrCode className="size-3.5" />
                  <span>Scan QR Code</span>
                </button>
              </div>

              <button
                type="button"
                onClick={copyFullMessage}
                className="cursor-pointer text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 hover:underline"
              >
                {copiedText ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-300">Copied invite text!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy Full Invite Text</span>
                  </>
                )}
              </button>
            </div>

            {activeTab === "share" ? (
              <div className="space-y-4">
                {/* ── One-Click Social Share Grid (Ultra Pro Badges) ── */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                    Share directly with contacts &amp; apps:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={openWhatsApp}
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-[#25D366]/15 hover:bg-[#25D366]/25 p-3 text-emerald-300 transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
                    >
                      <div className="size-9 rounded-xl bg-[#25D366] text-white grid place-items-center shadow-md shadow-[#25D366]/30 group-hover:rotate-6 transition-transform">
                        <MessageCircle className="size-5 fill-current" />
                      </div>
                      <span className="text-xs font-bold text-white">WhatsApp</span>
                      <span className="text-[9.5px] text-emerald-300/80 font-mono">Image &amp; text</span>
                    </button>

                    {/* Telegram */}
                    <button
                      type="button"
                      onClick={openTelegram}
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-sky-500/30 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 p-3 text-sky-300 transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
                    >
                      <div className="size-9 rounded-xl bg-[#229ED9] text-white grid place-items-center shadow-md shadow-[#229ED9]/30 group-hover:-rotate-6 transition-transform">
                        <Send className="size-4.5" />
                      </div>
                      <span className="text-xs font-bold text-white">Telegram</span>
                      <span className="text-[9.5px] text-sky-300/80 font-mono">Instant forward</span>
                    </button>

                    {/* Facebook */}
                    <button
                      type="button"
                      onClick={openFacebook}
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-500/30 bg-[#1877F2]/15 hover:bg-[#1877F2]/25 p-3 text-blue-300 transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
                    >
                      <div className="size-9 rounded-xl bg-[#1877F2] text-white grid place-items-center shadow-md shadow-[#1877F2]/30 group-hover:rotate-6 transition-transform">
                        <Facebook className="size-5 fill-current" />
                      </div>
                      <span className="text-xs font-bold text-white">Facebook</span>
                      <span className="text-[9.5px] text-blue-300/80 font-mono">Feed &amp; Groups</span>
                    </button>

                    {/* Twitter / X */}
                    <button
                      type="button"
                      onClick={openTwitter}
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-neutral-800/60 hover:bg-neutral-800 p-3 text-white transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
                    >
                      <div className="size-9 rounded-xl bg-black text-white grid place-items-center border border-white/20 shadow-md group-hover:-rotate-6 transition-transform">
                        <Twitter className="size-4.5" />
                      </div>
                      <span className="text-xs font-bold text-white">X / Twitter</span>
                      <span className="text-[9.5px] text-neutral-400 font-mono">Post tweet</span>
                    </button>
                  </div>
                </div>

                {/* Additional Platform Buttons (LinkedIn, Email, Device Share) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={openLinkedIn}
                    className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-600/30 bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 py-2.5 px-3 text-xs font-bold text-sky-200 transition-all active:scale-95"
                  >
                    <Linkedin className="size-3.5 fill-current text-[#0A66C2]" />
                    <span>LinkedIn</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEmail}
                    className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2.5 px-3 text-xs font-bold text-neutral-300 hover:text-white transition-all active:scale-95"
                  >
                    <Mail className="size-3.5 text-neutral-400" />
                    <span>Email Invite</span>
                  </button>

                  {canNativeShare && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 py-2.5 px-3 text-xs font-extrabold text-amber-200 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      <Smartphone className="size-3.5 text-amber-400" />
                      <span>Device Share Sheet</span>
                    </button>
                  )}
                </div>

                {/* ── Direct URL Copy Box ── */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block">
                    Direct Competition Link:
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/50 p-1.5 focus-within:border-amber-400 transition-colors shadow-inner">
                    <input
                      type="text"
                      readOnly
                      value={activeUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-transparent px-3 text-xs font-mono text-neutral-200 outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className={cn(
                        "cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all shadow-md active:scale-95 shrink-0",
                        copiedLink
                          ? "bg-emerald-500 text-white shadow-emerald-500/25"
                          : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-amber-500/25"
                      )}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── QR Code Tab (Scan on mobile or download poster) ── */
              <div className="flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                <div className="relative p-3.5 bg-white rounded-2xl shadow-2xl border-4 border-amber-400/40">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${title}`}
                      className="size-48 sm:size-56 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="size-48 sm:size-56 grid place-items-center text-black font-mono text-xs">
                      Generating QR...
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-black/10" />
                </div>

                <div className="max-w-sm space-y-1">
                  <p className="text-xs font-extrabold text-white">
                    Scan with Phone Camera to Open Competition
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Works on all Android &amp; iOS devices. Point camera to open details page instantly.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!qrDataUrl}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Download className="size-3.5" />
                    <span>Download QR Poster (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyLink}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95"
                  >
                    {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{copiedLink ? "Link Copied!" : "Copy Page URL"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-white/10 bg-black/40 px-5 sm:px-6 py-3 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-amber-400" />
              <span>Official event poster preview automatically attaches on WhatsApp</span>
            </span>
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <span>Visit Page</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
