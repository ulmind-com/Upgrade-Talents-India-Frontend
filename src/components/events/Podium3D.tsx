"use client";

import React, { useMemo } from "react";
import { Crown, Heart, Loader2, Sparkles, Trophy } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { imageFor, cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
   Laurel Wreath with Rank Badge — Classic Olympic High-Contrast Edition
   Ported 1:1 from mobile app (LaurelWreath.tsx):
   - Open horseshoe laurel wreath with leaves curving outward
   - Center area open for crystal-clear readability
   - Numbers and suffixes rendered in crisp solid WHITE (#FFFFFF)
   - Gold (#FBBF24), Silver (#CBD5E1), Bronze (#F59E0B) support
   ────────────────────────────────────────────────────────────────────────── */

export function LaurelWreath({
  rank,
  size = 52,
  color,
}: {
  rank: number;
  size?: number;
  color?: string;
}) {
  const defaultColor =
    rank === 1
      ? "#FBBF24" // Bright Champion Gold
      : rank === 2
      ? "#CBD5E1" // Elegant Silver
      : rank === 3
      ? "#F59E0B" // Warm Bronze
      : "#D97706";
  const c = color || defaultColor;
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";

  // Stem: curves from bottom center (30, 56) outward to (10, 30) and up to (26, 6)
  const stemD = "M 30 56 C 16 53 10 39 10 27 C 10 16 18 8 26 6";

  const leafPairs = [
    "M 26 53 C 21 55 17 53 15 50 C 18 48 23 50 26 53 Z M 27 48 C 23 48 19 44 20 40 C 23 43 27 45 27 48 Z",
    "M 19 42 C 14 42 10 39 9 36 C 13 35 17 37 19 42 Z M 19 36 C 15 34 12 30 13 26 C 16 28 19 32 19 36 Z",
    "M 13 28 C 8 27 6 23 6 19 C 10 19 13 22 13 28 Z M 15 24 C 12 21 12 16 14 12 C 17 15 17 20 15 24 Z",
    "M 16 16 C 13 12 14 7 17 4 C 19 8 18 13 16 16 Z M 21 12 C 18 9 20 4 23 2 C 24 6 23 10 21 12 Z",
    "M 26 6 C 25 2 27 0 29 0 C 30 3 29 6 26 6 Z",
  ].join(" ");

  const ribbonD = "M 29 55 Q 32 53 35 55 Q 32 57 29 55 Z";
  const isDoubleDigit = rank >= 10;
  const numSize = isDoubleDigit ? Math.round(size * 0.28) : Math.round(size * 0.34);
  const sufSize = isDoubleDigit ? Math.round(size * 0.15) : Math.round(size * 0.18);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Rank ${rank}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className="absolute inset-0 size-full pointer-events-none"
      >
        <g fill={c}>
          <path d={stemD} stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
          <path d={leafPairs} />
        </g>
        <g transform="translate(64, 0) scale(-1, 1)" fill={c}>
          <path d={stemD} stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
          <path d={leafPairs} />
        </g>
        <path d={ribbonD} fill={c} />
      </svg>
      <div className="relative z-10 flex items-start justify-center leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        <span
          className="font-extrabold tracking-tight font-display"
          style={{ fontSize: numSize, lineHeight: 1 }}
        >
          {rank}
        </span>
        <span
          className="font-bold -mt-0.5 tracking-tighter"
          style={{ fontSize: sufSize, lineHeight: 1 }}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Podium3D — 3D Glass Pedestal Blocks & Championship Hero
   Matched 1:1 with the mobile reference:
   - 1st Place (Center): Elevated tall block, glowing golden neon wireframe rim,
     Gold Laurel Wreath on pedestal front face, floating champion avatar with crown.
   - 2nd Place (Left): Silver Laurel Wreath, cyan/silver ring.
   - 3rd Place (Right): Bronze Laurel Wreath, amber/bronze ring.
   - Interactive Voting button on each block for instant audience support!
   ────────────────────────────────────────────────────────────────────────── */

export type PodiumContestant = {
  rank?: number;
  name?: string;
  participant_id?: string;
  email?: string;
  profile_photo?: string;
  audience_votes?: number;
  judge_score?: number;
  final_score?: number;
  points?: number;
  category?: string;
  is_verified?: boolean;
  verified_badge?: boolean;
};

interface Podium3DProps {
  first?: PodiumContestant | null;
  second?: PodiumContestant | null;
  third?: PodiumContestant | null;
  onVote?: (contestant: PodiumContestant) => void;
  votedIds?: Set<string>;
  votingId?: string | null;
  isVotingOpen?: boolean;
}

export function Podium3D({
  first,
  second,
  third,
  onVote,
  votedIds = new Set(),
  votingId,
  isVotingOpen = true,
}: Podium3DProps) {
  const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));
  const pidOf = (r?: PodiumContestant | null) => r?.participant_id || r?.email || "";

  const renderContestant = (
    c: PodiumContestant | null | undefined,
    place: 1 | 2 | 3
  ) => {
    if (!c) {
      return (
        <div className="flex flex-col items-center justify-end h-full py-6 text-center text-xs text-[var(--fg-subtle)]">
          <div className="size-16 rounded-full border-2 border-dashed border-[var(--border)] mb-3 grid place-items-center bg-[var(--surface-2)]/30">
            <LaurelWreath rank={place} size={38} />
          </div>
          <span className="font-semibold">Awaiting Rank {place}</span>
        </div>
      );
    }

    const pid = pidOf(c);
    const hasVoted = votedIds.has(pid);
    const isVotingThis = votingId === pid;
    const isFirst = place === 1;
    const isSecond = place === 2;

    const ringGradient = isFirst
      ? "from-amber-300 via-yellow-400 to-amber-600 ring-4 ring-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.5)]"
      : isSecond
      ? "from-cyan-300 via-slate-200 to-cyan-500 ring-4 ring-cyan-400/30 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
      : "from-amber-600 via-orange-500 to-amber-800 ring-4 ring-orange-500/30 shadow-[0_0_25px_rgba(249,115,22,0.35)]";

    const avatarSize = isFirst ? "size-24 sm:size-28" : "size-20 sm:size-24";

    return (
      <div className="relative flex flex-col items-center w-full z-10">
        {/* Floating Crown for Rank 1 */}
        {isFirst && (
          <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-20 animate-bounce" style={{ animationDuration: "2.4s" }}>
            <div className="relative">
              <Crown className="size-8 sm:size-9 text-amber-400 fill-amber-300 drop-shadow-[0_0_14px_rgba(245,158,11,0.9)]" />
              <Sparkles className="absolute -right-2 -top-1 size-3.5 text-yellow-200 animate-pulse" />
            </div>
          </div>
        )}

        {/* Floating Avatar with glowing ring */}
        <div className={cn("relative grid place-items-center rounded-full p-[3px] bg-gradient-to-tr", ringGradient, avatarSize)}>
          <img
            src={imageFor(c.profile_photo, place)}
            alt={c.name || "Contestant"}
            className="size-full rounded-full object-cover bg-[var(--surface-2)]"
            loading="lazy"
          />
          {/* Subtle Laurel Badge on Avatar Corner */}
          <div className="absolute -bottom-2.5 -right-1 z-10">
            <LaurelWreath rank={place} size={36} />
          </div>
        </div>

        {/* Name & Division */}
        <div className="mt-3.5 text-center max-w-[170px] sm:max-w-[210px] px-1">
          <p className="font-display font-bold text-base sm:text-lg leading-tight flex items-center justify-center gap-1.5 text-[var(--fg)] truncate">
            <span>{c.name || "Contestant"}</span>
            {(c.is_verified || c.verified_badge) && <VerifiedBadge size="xs" />}
          </p>
          {c.category && (
            <span className="inline-block mt-0.5 rounded-full px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] border border-[var(--border)] text-[var(--fg-muted)]">
              {c.category}
            </span>
          )}
        </div>

        {/* Points Display */}
        <div className="mt-2 text-center">
          <span className={cn(
            "font-display font-black text-2xl sm:text-3xl leading-none tabular-nums",
            isFirst
              ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 drop-shadow-sm"
              : isSecond
              ? "text-slate-800 dark:text-slate-100"
              : "text-amber-700 dark:text-amber-300"
          )}>
            {nf(c.points ?? c.final_score ?? c.audience_votes)}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--fg-subtle)] mt-0.5">
            Total Score
          </span>
        </div>

        {/* Votes & Judge marks breakdown */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-emerald-800 dark:text-emerald-300">
            {nf(c.audience_votes)} votes
          </span>
          {c.judge_score != null && Number(c.judge_score) > 0 && (
            <span className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-amber-800 dark:text-amber-300">
              ★ {nf(c.judge_score)}
            </span>
          )}
        </div>

        {/* Interactive Vote Button */}
        {isVotingOpen && onVote && (
          <button
            type="button"
            onClick={() => onVote(c)}
            disabled={hasVoted || isVotingThis}
            className={cn(
              "mt-3.5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer",
              hasVoted
                ? "bg-rose-500/20 border border-rose-500/40 text-rose-300 cursor-default"
                : isFirst
                ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 ring-2 ring-amber-400/40 font-black"
                : "border border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-white"
            )}
          >
            {isVotingThis ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Heart className={cn("size-3.5", hasVoted ? "fill-rose-500 text-rose-500" : "")} />
            )}
            <span>{hasVoted ? "Voted" : "Vote"}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto pt-10 pb-6 px-2 sm:px-4">
      {/* 3D Glass Pedestal Framework (Rank 2, Rank 1 Champion, Rank 3) */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 lg:gap-6">
        {/* ── 2nd Place Block (Left) ── */}
        <div className="relative flex flex-col items-center">
          {renderContestant(second, 2)}
          {/* Pedestal Block 2 */}
          <div className="w-full mt-4 h-32 sm:h-36 rounded-t-2xl sm:rounded-t-3xl border-t-2 border-x border-cyan-400/40 bg-gradient-to-b from-cyan-500/15 via-slate-800/40 to-[var(--surface)] p-3 flex flex-col items-center justify-between shadow-[0_-8px_25px_-5px_rgba(6,182,212,0.2)] backdrop-blur-md">
            <LaurelWreath rank={2} size={48} />
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Runner-Up
            </span>
          </div>
        </div>

        {/* ── 1st Place Champion Block (Center - Elevated & Glowing) ── */}
        <div className="relative flex flex-col items-center -translate-y-4 sm:-translate-y-6 z-20">
          {renderContestant(first, 1)}
          {/* Champion Pedestal Block 1 */}
          <div className="w-full mt-4 h-40 sm:h-48 rounded-t-2xl sm:rounded-t-3xl border-t-3 border-x-2 border-amber-400 bg-gradient-to-b from-amber-500/25 via-amber-950/30 to-[var(--surface)] p-3 sm:p-4 flex flex-col items-center justify-between shadow-[0_-12px_40px_-5px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/30 backdrop-blur-md">
            <div className="flex flex-col items-center">
              <LaurelWreath rank={1} size={58} />
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
                Champion
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              Grand Winner
            </span>
          </div>
        </div>

        {/* ── 3rd Place Block (Right) ── */}
        <div className="relative flex flex-col items-center">
          {renderContestant(third, 3)}
          {/* Pedestal Block 3 */}
          <div className="w-full mt-4 h-28 sm:h-32 rounded-t-2xl sm:rounded-t-3xl border-t-2 border-x border-orange-500/40 bg-gradient-to-b from-orange-600/15 via-orange-950/40 to-[var(--surface)] p-3 flex flex-col items-center justify-between shadow-[0_-8px_25px_-5px_rgba(249,115,22,0.2)] backdrop-blur-md">
            <LaurelWreath rank={3} size={46} />
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-800 dark:text-amber-400">
              2nd Runner-Up
            </span>
          </div>
        </div>
      </div>

      {/* Base Floor Glow Platform */}
      <div className="w-full h-3 rounded-full bg-gradient-to-r from-cyan-500/30 via-amber-400/60 to-orange-500/30 blur-xs -mt-1" />
    </div>
  );
}
