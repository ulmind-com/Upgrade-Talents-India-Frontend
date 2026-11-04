"use client";

import { useEffect, useState, useRef } from "react";
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
  ExternalLink,
  MessageCircle,
  Send,
  Twitter,
  Linkedin
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
  };
}

export default function ShareReferralModal({
  isOpen,
  onClose,
  referralCode = "UTI-TALENT",
  referralLink,
  userName,
  stats
}: ShareReferralModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Compute absolute share link dynamically based on browser origin if relative
  const rawComputedLink =
    referralLink ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `https://upgradetalentsindia.in/register?ref=${referralCode}`);
  const actualLink = rawComputedLink.replace(/https?:\/\/(?:www\.)?eventora\.com/gi, "https://upgradetalentsindia.in");

  const referrerCoins = stats?.referrerBonus ?? 100;
  const welcomeCoins = stats?.welcomeBonus ?? 50;

  // Check if native sharing is available (mostly mobile/tablets)
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Generate QR Code when modal opens
  useEffect(() => {
    if (isOpen && actualLink) {
      QRCode.toDataURL(actualLink, {
        width: 300,
        margin: 2,
        color: {
          dark: "#0b0f19",
          light: "#ffffff"
        }
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

  const shareText = `Hey! 🌟 Join me on Upgrade Talents India! Sign up with my invite link to get ${welcomeCoins} FREE UTI Coins (instant discounts on events, workshops & courses):\n\n${actualLink}\n\nInvite Code: ${referralCode}`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Upgrade Talents India",
          text: `Use my invite link to get ${welcomeCoins} FREE Coins on Upgrade Talents India!`,
          url: actualLink
        });
      } catch (err) {
        // User cancelled or share failed
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
    a.download = `UTI-Invite-QR-${referralCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#161922] via-[#0d1017] to-[#07090e] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] text-white z-10 my-auto"
          >
            {/* Ambient Gold Glow Corner */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {/* Header Badge & Title */}
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
                <Sparkles className="size-3 text-amber-400 animate-pulse" />
                UTI Ambassador Program
              </span>

              <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Share Profile & Earn Coins
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-sm leading-relaxed">
                Invite fellow artists & friends. When they register with your link,{" "}
                <span className="font-bold text-amber-300">you get +{referrerCoins} Coins (₹{referrerCoins * 0.5})</span> and{" "}
                <span className="font-bold text-emerald-300">they get +{welcomeCoins} Coins (₹{welcomeCoins * 0.5})</span> instantly!
              </p>
            </div>

            {/* Reward Value Cards Banner */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-transparent p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-400">
                  <Coins className="size-4" />
                  <span className="font-mono text-xs uppercase font-bold">You Receive</span>
                </div>
                <div className="mt-1 font-display text-2xl font-black text-amber-300 tabular-nums">
                  +{referrerCoins}
                </div>
                <span className="text-[11px] text-amber-200/70">UTI Coins per friend</span>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                  <Gift className="size-4" />
                  <span className="font-mono text-xs uppercase font-bold">Friend Receives</span>
                </div>
                <div className="mt-1 font-display text-2xl font-black text-emerald-300 tabular-nums">
                  +{welcomeCoins}
                </div>
                <span className="text-[11px] text-emerald-200/70">Welcome bonus coins</span>
              </div>
            </div>

            {/* Main Referral Code & Link Box */}
            <div className="mt-6 space-y-3">
              {/* Unique Code */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                    Your Personal Invite Code
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-amber-400 truncate block">
                    {referralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer active:scale-95"
                >
                  {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              {/* Direct Invite Link */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                    Direct Registration Link
                  </span>
                  <span className="font-mono text-xs text-gray-300 truncate block mt-0.5">
                    {actualLink}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer active:scale-95"
                >
                  {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Social Share Grid */}
            <div className="mt-5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5 text-center">
                Share directly via
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer group"
                >
                  <MessageCircle className="size-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold">WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={openTelegram}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer group"
                >
                  <Send className="size-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold">Telegram</span>
                </button>

                {/* X / Twitter */}
                <button
                  type="button"
                  onClick={openTwitter}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer group"
                >
                  <Twitter className="size-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold">X (Twitter)</span>
                </button>

                {/* QR Code / Native Share */}
                {canNativeShare ? (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer group"
                  >
                    <Share2 className="size-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">More Apps</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer group"
                  >
                    <QrCode className="size-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">Show QR</span>
                  </button>
                )}
              </div>
            </div>

            {/* In-Person QR Code Section */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <QrCode className="size-4 text-amber-400" /> In-Person Event QR Code
                </span>
                <span className="text-[11px] text-amber-400 font-bold">{showQr ? "Hide QR" : "Show QR"}</span>
              </button>

              <AnimatePresence>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                      <p className="text-xs text-gray-300 mb-3">
                        Friends can scan this directly with their phone camera to open your registration invite!
                      </p>
                      {qrDataUrl ? (
                        <div className="rounded-xl bg-white p-3 shadow-lg">
                          <img src={qrDataUrl} alt="Invite QR Code" className="size-40 sm:size-48" />
                        </div>
                      ) : (
                        <div className="size-40 grid place-items-center text-xs text-gray-500">Generating QR…</div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={downloadQr}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                        >
                          <Download className="size-3.5" /> Download QR Image
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Summary */}
            <div className="mt-5 text-center">
              <p className="text-[11px] text-gray-400">
                Reward coins are automatically credited upon successful email verification and profile setup.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
