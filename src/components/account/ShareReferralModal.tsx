"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Share2,
  Sparkles,
  Coins,
  QrCode,
  Download,
  Gift,
  ArrowRight,
  Send,
  MessageCircle,
  Twitter,
  ShieldCheck,
  Zap,
} from "lucide-react";
import QRCode from "qrcode";

interface ShareReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
  referralLink?: string;
  userName?: string;
  stats?: {
    totalReferrals?: number;
    coinsEarned?: number;
    welcomeBonus?: number;
    referrerBonus?: number;
    coinValuation?: number;
  };
}

export default function ShareReferralModal({
  isOpen,
  onClose,
  referralCode = "UTI-TALENT",
  referralLink,
  userName,
  stats,
}: ShareReferralModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Compute absolute share link dynamically based on browser origin if relative
  const rawComputedLink =
    referralLink ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `https://upgradetalentsindia.in/register?ref=${referralCode}`);
  const actualLink = rawComputedLink.replace(/https?:\/\/(?:www\.)?eventora\.com/gi, "https://upgradetalentsindia.in");

  const referrerCoins = stats?.referrerBonus ?? 120;
  const welcomeCoins = stats?.welcomeBonus ?? 60;
  const coinVal = stats?.coinValuation ?? 0.5;

  const referrerInr = (referrerCoins * coinVal).toFixed(0);
  const welcomeInr = (welcomeCoins * coinVal).toFixed(0);

  // Check if native sharing is available
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Generate QR Code when modal opens
  useEffect(() => {
    if (isOpen && actualLink) {
      QRCode.toDataURL(actualLink, {
        width: 380,
        margin: 2,
        color: {
          dark: "#0a0d14",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [isOpen, actualLink]);

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

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(actualLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareText = `Hey! 🌟 Join me on Upgrade Talents India! Sign up with my invite link to get ${welcomeCoins} FREE UTI Coins (₹${welcomeInr} instant discount on events & courses):\n\n${actualLink}\n\nInvite Code: ${referralCode}`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Upgrade Talents India",
          text: `Use my invite link to get ${welcomeCoins} FREE Coins on Upgrade Talents India!`,
          url: actualLink,
        });
      } catch (err) {
        // cancelled
      }
    } else {
      copyLink();
    }
  };

  const openWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(actualLink)}&text=${encodeURIComponent(
      `Join me on Upgrade Talents India! Use code ${referralCode} to get ${welcomeCoins} free coins.`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Join me on Upgrade Talents India! Use my invite code ${referralCode} to get ${welcomeCoins} bonus coins:\n${actualLink}\n#UpgradeTalentsIndia #TalentRewards`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `UTI-VIP-Pass-${referralCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Container — Wide, Balanced 2-Column Desktop Grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e17] text-white shadow-[0_30px_90px_rgba(0,0,0,0.85)] z-10 my-auto"
          >
            {/* Ambient Multi-Glow Background */}
            <div className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -bottom-28 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white transition-all cursor-pointer active:scale-95 shadow-md"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {/* Main Content Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10">
              {/* ── LEFT COLUMN: Invitation Hub & Sharing (7 cols) ── */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      <Sparkles className="size-3 text-amber-400 animate-pulse" />
                      Talent Ambassador Hub
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <ShieldCheck className="size-3 text-emerald-400" /> Auto-Credited
                    </span>
                  </div>

                  {/* Heading */}
                  <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                    Share Your Link,{" "}
                    <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      Earn UTI Coins
                    </span>
                  </h2>

                  <p className="mt-2 text-xs sm:text-[13px] text-gray-300 leading-relaxed font-sans">
                    Invite fellow artists, dancers & creators. Both of you receive instant coin discounts for events, competitions & masterclasses!
                  </p>

                  {/* Dual Reward Cards */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {/* Referrer Reward */}
                    <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 font-mono">
                          You Earn
                        </span>
                        <Coins className="size-4 text-amber-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-amber-300 font-sans tracking-tight">
                          +{referrerCoins}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-200/80">Coins</span>
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                        ≈ ₹{referrerInr} Real Value
                      </div>
                    </div>

                    {/* Friend Reward */}
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-4">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90 font-mono">
                          Friend Gets
                        </span>
                        <Gift className="size-4 text-emerald-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-sans tracking-tight">
                          +{welcomeCoins}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-200/80">Coins</span>
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                        ≈ ₹{welcomeInr} Welcome Gift
                      </div>
                    </div>
                  </div>

                  {/* Personal Invite Code Box */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
                      Your Unique Referral Code
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-amber-300 select-all">
                        {referralCode}
                      </span>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                        <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Link Box */}
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">
                      Direct Registration Link
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-gray-300 truncate select-all">
                        {actualLink}
                      </span>
                      <button
                        type="button"
                        onClick={copyLink}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-black hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                      >
                        {copiedLink ? <Check className="size-3.5 text-black" /> : <Copy className="size-3.5 text-black" />}
                        <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Social Sharing Buttons */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-2.5">
                    1-Tap Instant Sharing
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={openWhatsApp}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 px-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="size-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={openTelegram}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 px-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer active:scale-95"
                      title="Share to Telegram"
                    >
                      <Send className="size-4" />
                      <span className="hidden sm:inline">Telegram</span>
                    </button>

                    <button
                      type="button"
                      onClick={openTwitter}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 px-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 transition-all cursor-pointer active:scale-95"
                      title="Share to X (Twitter)"
                    >
                      <Twitter className="size-4" />
                      <span className="hidden sm:inline">X</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 px-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer active:scale-95"
                      title="Share via device menu"
                    >
                      <Share2 className="size-4" />
                      <span className="hidden sm:inline">More</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: VIP Holographic QR Pass (5 cols) ── */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#141926] via-[#0d101a] to-[#080a10] p-5 sm:p-6 text-center shadow-2xl relative overflow-hidden group">
                  {/* Holographic Header Bar */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2 text-left">
                      <div className="grid size-8 place-items-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <QrCode className="size-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                          VIP ACCESS PASS
                        </span>
                        <span className="text-xs font-bold text-white truncate block max-w-[140px]">
                          {userName || "Talent Member"}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                      LIVE
                    </span>
                  </div>

                  {/* QR Code Container */}
                  <div className="relative mx-auto size-52 sm:size-56 rounded-2xl bg-white p-3 shadow-inner flex items-center justify-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code for ${referralCode}`}
                        className="size-full object-contain"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-gray-500 text-xs">
                        Generating QR…
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <p className="mt-4 text-xs font-medium text-gray-300">
                    Scan with any smartphone camera to open your invite link & auto-apply your bonus.
                  </p>

                  {/* Download QR Pass Button */}
                  <button
                    type="button"
                    onClick={downloadQr}
                    disabled={!qrDataUrl}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Download className="size-3.5 text-amber-400" />
                    <span>Download QR Image</span>
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400">
                    <span>UPGRADE TALENTS INDIA</span>
                    <span>•</span>
                    <span>2026 EDITION</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
