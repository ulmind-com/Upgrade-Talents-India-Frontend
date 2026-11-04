"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Coins, Gift, ArrowRight, ShieldCheck, Users, Trophy, GraduationCap, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/motion/Providers";

export default function RewardsLandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard?tab=rewards");
    }
  }, [user, loading, router]);

  return (
    <div className="relative min-h-screen bg-[#07090e] text-white selection:bg-amber-500 selection:text-black">
      {/* Background Lighting Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-amber-500/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 size-[450px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        {/* Top Eyebrow */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300"
          >
            <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
            UTI Creator &amp; Referral Rewards
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 font-display text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight"
          >
            Share Your Talent. <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              Earn Real Rewards.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 max-w-2xl text-base sm:text-lg text-gray-300 leading-relaxed"
          >
            Invite friends to Upgrade Talents India. When they register with your personal invite link,{" "}
            <span className="font-bold text-amber-300">you receive +100 UTI Coins (₹50 value)</span> and{" "}
            <span className="font-bold text-emerald-400">they get +50 Coins (₹25 value)</span> instantly!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-4 flex-wrap"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-8 py-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_10px_35px_-5px_rgba(245,158,11,0.4)] hover:from-amber-300 hover:to-amber-500 transition-all active:scale-95"
            >
              <Gift className="size-4" />
              Sign Up &amp; Claim 50 Coins
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/login?redirect=/dashboard?tab=rewards"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all"
            >
              Sign In to Your Wallet
            </Link>
          </motion.div>
        </div>

        {/* 2-Side Highlight Grid */}
        <div className="mt-16 sm:mt-24 grid gap-6 md:grid-cols-2">
          {/* Inviter Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#12151f] to-[#07090e] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Coins className="size-6" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold block">
                  For You (Referrer)
                </span>
                <h3 className="font-display text-2xl font-bold uppercase text-white">Earn +100 Coins</h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-300 leading-relaxed">
              Every time a verified friend registers through your profile or referral link, you receive 100 UTI Coins (₹50 discount power) directly in your wallet.
            </p>
            <ul className="mt-5 space-y-2.5 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" /> No limits on how many friends you can invite
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" /> Unlock higher VIP Ambassador tier perks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" /> 1-click sharing via WhatsApp, QR Code &amp; SMS
              </li>
            </ul>
          </div>

          {/* New User Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#12151f] to-[#07090e] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Gift className="size-6" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                  For Your Friend (Invitee)
                </span>
                <h3 className="font-display text-2xl font-bold uppercase text-white">Get +50 Coins</h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-300 leading-relaxed">
              When joining via an invitation link or entering a valid referral code during sign-up, your friend receives 50 free coins (₹25 discount power) immediately!
            </p>
            <ul className="mt-5 space-y-2.5 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" /> Instant welcome bonus upon registration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" /> Apply coins toward workshop &amp; course fees
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" /> Valid for state &amp; national talent events
              </li>
            </ul>
          </div>
        </div>

        {/* 3 Step Visual */}
        <div className="mt-16 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase">
            Simple 3-Step Earning Engine
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3 text-left">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="font-mono text-xl font-black text-amber-400">01</div>
              <h4 className="mt-2 font-display text-lg font-bold uppercase">Grab Your Invite Link</h4>
              <p className="mt-1 text-xs text-gray-300">
                Log into your dashboard, copy your unique referral link or open your in-person QR code.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="font-mono text-xl font-black text-sky-400">02</div>
              <h4 className="mt-2 font-display text-lg font-bold uppercase">Share With Friends</h4>
              <p className="mt-1 text-xs text-gray-300">
                Share via WhatsApp, Telegram, or social media. Friend signs up &amp; completes their profile.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="font-mono text-xl font-black text-emerald-400">03</div>
              <h4 className="mt-2 font-display text-lg font-bold uppercase">Instant Coin Rewards</h4>
              <p className="mt-1 text-xs text-gray-300">
                Both of you get credited instantly. Use coins for fee waivers and checkout discounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
