"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  Trophy, Calendar, Clock, Users, ArrowDown, ChevronRight,
  Radio, Sparkles, CheckCircle2, ShieldCheck, Ticket
} from "lucide-react";
import { formatEventDate, formatINR, imageFor } from "@/lib/utils";

interface CompetitionHeroProps {
  comp: {
    _id?: string;
    id?: string;
    title?: string;
    name?: string;
    description?: string;
    category?: string;
    type?: string;
    prize?: string;
    participation_fee?: number;
    fee?: number;
    start_date?: string;
    end_date?: string;
    registration_deadline?: string;
    submission_deadline?: string;
    min_age?: number;
    max_age?: number;
    max_participants?: number;
    card_image_url?: string | null;
    banner_image_url?: string | null;
    banner_url?: string | null;
    image_url?: string | null;
    voting_status?: string;
    judging_status?: string;
    result_status?: string;
    results_published?: boolean;
    audience_voting_enabled?: boolean;
    judge_scoring_enabled?: boolean;
  };
}

export default function CompetitionHero({ comp }: CompetitionHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.1]);

  const title = comp.title || comp.name || "Talent Competition";
  const category = comp.category || comp.type || "Official Contest";
  const fee = comp.participation_fee ?? comp.fee ?? 0;
  const isResultsPublished = comp.result_status === "PUBLISHED" || Boolean(comp.results_published);
  const isVotingOpen = comp.audience_voting_enabled && comp.voting_status === "OPEN";

  // Dynamic 16:9 (Desktop/Card) and 9:16 (Mobile/Banner) image sources
  const desktopImg = comp.card_image_url || comp.image_url || "";
  const mobileImg = comp.banner_image_url || comp.banner_url || desktopImg;
  const fallbackImg = imageFor(desktopImg, 6);

  const compId = comp._id || comp.id;

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[58vh] sm:min-h-[64vh] lg:min-h-[70vh] flex items-end overflow-hidden noise bg-black/95 pt-28 pb-12 sm:pb-16"
    >
      {/* ── Background Media Container with Dual 16:9 & 9:16 support ── */}
      <motion.div style={{ y }} className="absolute inset-0 -z-20 size-full overflow-hidden">
        <picture className="size-full">
          {mobileImg && (
            <source media="(max-width: 640px)" srcSet={mobileImg} />
          )}
          <img
            src={desktopImg || fallbackImg}
            alt={title}
            className="size-full object-cover object-center filter brightness-[0.72] contrast-[1.08] transition-all duration-700"
          />
        </picture>
      </motion.div>

      {/* ── Ambient Gradient Glow & Vignette Scrims ── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/30"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-35 mix-blend-overlay"
        style={{ background: "var(--grad-brand)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent -z-10"
      />

      {/* ── Content Container (Ultra Pro, Elegant Scale) ── */}
      <motion.div style={{ opacity }} className="container-x relative z-10 w-full">
        <div className="max-w-4xl">
          {/* ── Badges & Live Status Row ── */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm">
              <Sparkles className="size-3 text-amber-400" />
              {category}
            </span>

            {isResultsPublished ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md">
                <CheckCircle2 className="size-3" /> Certified Results Out
              </span>
            ) : isVotingOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1 text-[11px] font-bold text-rose-300 backdrop-blur-md">
                <Radio className="size-3 animate-pulse text-rose-400" /> Live Voting Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-[11px] font-medium text-sky-200 backdrop-blur-md">
                <ShieldCheck className="size-3 text-sky-400" /> Verified Competition
              </span>
            )}

            {comp.prize && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-[var(--on-accent)] shadow-md" style={{ background: "var(--grad-brand)" }}>
                <Trophy className="size-3" /> {comp.prize}
              </span>
            )}
          </div>

          {/* ── Premium Refined Title (Not gigantic clumsy text) ── */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[clamp(1.8rem,4.5vw,3.25rem)] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
          >
            {title}
          </motion.h1>

          {/* ── Subtitle / Excerpt ── */}
          {comp.description && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 max-w-2xl text-xs sm:text-sm text-neutral-300/90 line-clamp-2 leading-relaxed"
            >
              {comp.description}
            </motion.p>
          )}

          {/* ── Glassmorphism Metadata Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-lg text-xs text-neutral-300"
          >
            {comp.start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[var(--accent)]" />
                <span>
                  Starts <strong className="font-semibold text-white">{formatEventDate(comp.start_date)}</strong>
                </span>
              </div>
            )}

            {comp.registration_deadline && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-400" />
                <span>
                  Register by <strong className="font-semibold text-white">{formatEventDate(comp.registration_deadline)}</strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Ticket className="size-4 text-emerald-400" />
              <span>
                Entry Fee: <strong className="font-semibold text-white">{fee > 0 ? formatINR(fee) : "Free Entry"}</strong>
              </span>
            </div>

            {(comp.min_age != null || comp.max_age != null) && (
              <div className="flex items-center gap-2">
                <Users className="size-4 text-sky-400" />
                <span>
                  Eligibility: <strong className="font-semibold text-white">
                    {comp.min_age && comp.max_age
                      ? `Ages ${comp.min_age}–${comp.max_age}`
                      : comp.min_age
                      ? `Min age ${comp.min_age}`
                      : `Up to age ${comp.max_age}`}
                  </strong>
                </span>
              </div>
            )}
          </motion.div>

          {/* ── Action Navigation Pills ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            {isResultsPublished ? (
              <Link
                href={`/competitions/${compId}/results`}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-[var(--on-accent)] shadow-lg transition-transform active:scale-95"
                style={{ background: "var(--grad-brand)" }}
              >
                <Trophy className="size-3.5" /> View Official Results
              </Link>
            ) : (
              <a
                href="#register-action"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-[var(--on-accent)] shadow-lg transition-transform active:scale-95"
                style={{ background: "var(--grad-brand)" }}
              >
                <span>Enter &amp; Submit Entry</span>
                <ArrowDown className="size-3.5" />
              </a>
            )}

            <Link
              href={`/leaderboard?competition=${compId}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <span>View Leaderboard</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
