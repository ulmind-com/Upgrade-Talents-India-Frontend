"use client";

import React, { useId } from "react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { imageFor } from "@/lib/utils";
import s from "./Podium3D.module.css";

/* ──────────────────────────────────────────────────────────────────────────
   Podium + laurel rank badges — a 1:1 port of the mobile app's
   src/components/Podium.tsx.

   Three perspective blocks seen from slightly above: a gold-lit champion block
   in front, dark glass #2 and #3 behind it with their wreaths cut into the
   face, contestants standing on top. All geometry lives in one 360 × 232 box
   (plus room above for the faces) and scales with the podium's width.
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

const BG = "#07080e";
const GOLD = "#F5C542";

const useSvgId = (p: string) => p + useId().replace(/[^a-zA-Z0-9]/g, "");

/* ── Laurel wreath ─────────────────────────────────────────────────────── */

export type LaurelTone = "gold" | "silver" | "steel" | "ghost";

const TONES: Record<
  LaurelTone,
  { leaf: [string, string, string, string]; num: [string, string, string]; disc: [string, string, string]; discNum: string; stem: string }
> = {
  gold: {
    leaf: ["#FFF4BF", "#FFD24D", "#EFA21A", "#B06C06"],
    num: ["#FFFBE8", "#FFD75A", "#E39A12"],
    disc: ["#FFE680", "#F2B42A", "#A9690A"],
    discNum: "#3B2300",
    stem: "#C98A12",
  },
  silver: {
    leaf: ["#FFFFFF", "#E3E8EF", "#B3BDCB", "#7B8597"],
    num: ["#FFFFFF", "#E2E7EE", "#A9B3C2"],
    disc: ["#FFFFFF", "#DDE3EB", "#98A2B3"],
    discNum: "#151823",
    stem: "#9AA4B4",
  },
  steel: {
    leaf: ["#BFC6D2", "#8D95A6", "#687083", "#434A5A"],
    num: ["#E5E8EE", "#B5BCC8", "#7D8597"],
    disc: ["#3B4152", "#262A36", "#161922"],
    discNum: "#FFFFFF",
    stem: "#5E6677",
  },
  ghost: {
    leaf: ["#525872", "#3F4459", "#33384A", "#262A39"],
    num: ["#6F7590", "#535970", "#3D4255"],
    disc: ["#2A2E3D", "#1E212C", "#14161E"],
    discNum: "#8A90A6",
    stem: "#34394B",
  },
};

const leafPath = (L: number, W: number) =>
  `M0 0 C ${L * 0.26} ${-W} ${L * 0.7} ${-W} ${L} 0 C ${L * 0.7} ${W} ${L * 0.26} ${W} 0 0 Z`;

/** One branch in a 100×100 box; the other is its mirror, so they never drift. */
const BRANCH = (() => {
  const cx = 50;
  const cy = 53;
  const r = 34;
  const P = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const START = 262;
  const END = 118;
  const N = 7;
  const stem: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const [x, y] = P(START - ((START - END) * i) / 24);
    stem.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const leaves: { d: string; t: string }[] = [];
  for (let i = 0; i < N; i++) {
    const a = START - ((START - END) * (i + 0.55)) / N;
    const [x, y] = P(a);
    const [nx, ny] = P(a - 1);
    const dir = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
    const L = 17.5 - i * 1.05;
    const W = 5.6 - i * 0.32;
    leaves.push({ d: leafPath(L, W), t: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(dir - 44).toFixed(1)})` });
    leaves.push({ d: leafPath(L * 0.86, W * 0.88), t: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(dir + 40).toFixed(1)})` });
  }
  const [tx, ty] = P(END);
  const [ux, uy] = P(END - 1);
  const tipDir = (Math.atan2(uy - ty, ux - tx) * 180) / Math.PI;
  leaves.push({ d: leafPath(11, 3.8), t: `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${(tipDir - 6).toFixed(1)})` });
  return { stem: "M " + stem.join(" L "), leaves };
})();

const DISPLAY = "var(--font-lb-display, 'Poppins'), 'Inter', system-ui, sans-serif";

/**
 * Laurel wreath with the rank inside it.
 * `medal` puts the number on a coin (table rows); otherwise a big numeral (podium).
 */
export function RankLaurel({
  rank,
  size = 40,
  tone,
  medal = false,
  glow = false,
  style,
}: {
  rank: number;
  size?: number | string;
  tone?: LaurelTone;
  medal?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  const id = useSvgId("lw");
  const t = TONES[tone ?? (rank === 1 ? "gold" : rank === 2 ? "silver" : "steel")];
  const leaves = (
    <g>
      <path d={BRANCH.stem} stroke={t.stem} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {BRANCH.leaves.map((l, i) => (
        <path key={i} d={l.d} transform={l.t} fill={`url(#${id}l)`} />
      ))}
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible", ...style }} aria-label={`Rank ${rank}`} role="img">
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.leaf[0]} />
          <stop offset="0.48" stopColor={t.leaf[1]} />
          <stop offset="0.52" stopColor={t.leaf[2]} />
          <stop offset="1" stopColor={t.leaf[3]} />
        </linearGradient>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.num[0]} />
          <stop offset="0.5" stopColor={t.num[1]} />
          <stop offset="1" stopColor={t.num[2]} />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.disc[0]} />
          <stop offset="0.55" stopColor={t.disc[1]} />
          <stop offset="1" stopColor={t.disc[2]} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="50" cy="52" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={GOLD} stopOpacity="0.16" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow ? <circle cx="50" cy="52" r="50" fill={`url(#${id}g)`} /> : null}
      {leaves}
      <g transform="translate(100 0) scale(-1 1)">{leaves}</g>
      <path d="M44 87.5 Q50 84 56 87.5 Q50 91 44 87.5 Z" fill={t.stem} />
      {medal ? (
        <>
          <circle cx="50" cy="51" r="21" fill="rgba(0,0,0,0.35)" />
          <circle cx="50" cy="50" r="20" fill={`url(#${id}d)`} />
          <circle cx="50" cy="50" r="17.2" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
          <text x="50" y="59.5" textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize="26" fill={t.discNum}>
            {rank}
          </text>
        </>
      ) : (
        <>
          <text x="50" y="70" textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize="46" fill="rgba(0,0,0,0.45)">
            {rank}
          </text>
          <text x="50" y="68" textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize="46" fill={`url(#${id}n)`}>
            {rank}
          </text>
        </>
      )}
      {glow ? (
        <g fill="#FFF3C4">
          <Sparkle x={66} y={25} r={3.4} />
          <Sparkle x={34} y={33} r={2.2} />
          <circle cx="62" cy="36" r="0.9" opacity={0.8} />
          <circle cx="40" cy="22" r="0.8" opacity={0.6} />
        </g>
      ) : null}
    </svg>
  );
}

/** Kept for older imports: the table-row medal. */
export function LaurelWreath({ rank, size = 42 }: { rank: number; size?: number; color?: string }) {
  return <RankLaurel rank={rank} size={size} medal />;
}

function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const q = r * 0.18;
  return <path d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z`} />;
}

/* ── Podium ────────────────────────────────────────────────────────────── */

const VB_W = 360;
const VB_H = 232;
const TOP = 112; // room above the champion block for avatar + a two-line name
const TOTAL = TOP + VB_H;
const C_L = 118;
const C_R = 242;
const C_TOP = 64;
const C_BACK = 34;
const C_INSET = 16;
const S_OUT = 6;
const S_TOP = 114;
const S_BACK = 88;
const S_INSET = 24;
const R = VB_W - S_OUT;
const LEFT_CX = (S_OUT + C_L) / 2 + 6;
const RIGHT_CX = VB_W - LEFT_CX;

const pctX = (x: number) => `${(x / VB_W) * 100}%`;
const pctY = (y: number) => `${((TOP + y) / TOTAL) * 100}%`;
const cqw = (u: number) => `${(u / VB_W) * 100}cqw`;

function BlockDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}sf`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1D2134" />
        <stop offset="0.5" stopColor="#11131E" />
        <stop offset="1" stopColor={BG} />
      </linearGradient>
      <linearGradient id={`${id}st`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#23273B" />
        <stop offset="1" stopColor="#363C57" />
      </linearGradient>
      <linearGradient id={`${id}shL`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id={`${id}shR`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id={`${id}ef`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}gf`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4A370F" />
        <stop offset="0.45" stopColor="#1C150A" />
        <stop offset="1" stopColor={BG} />
      </linearGradient>
      <linearGradient id={`${id}gt`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={GOLD} stopOpacity="0.06" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0.24" />
      </linearGradient>
      <linearGradient id={`${id}ge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={GOLD} stopOpacity="1" />
        <stop offset="0.55" stopColor={GOLD} stopOpacity="0.25" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${id}gg`} cx="180" cy="128" r="74" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={GOLD} stopOpacity="0.36" />
        <stop offset="0.6" stopColor={GOLD} stopOpacity="0.1" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}halo`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor={GOLD} stopOpacity="0.15" />
        <stop offset="0.6" stopColor={GOLD} stopOpacity="0.05" />
        <stop offset="1" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg className={s.svg} style={{ top: pctY(0), height: `${(VB_H / TOTAL) * 100}%` }} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
      {children}
    </svg>
  );
}

const fmt = (n?: number) => {
  const v = Number(n ?? 0);
  return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(1);
};

function Face({ c, cx, bottomY, avatar, width, delay }: { c: PodiumContestant | null; cx: number; bottomY: number; avatar: number; width: number; delay: number }) {
  if (!c) return null;
  return (
    <div
      className={s.face}
      style={{
        left: pctX(cx - width / 2),
        width: pctX(width),
        bottom: `${((TOTAL - (TOP + bottomY)) / TOTAL) * 100}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className={s.avatar} style={{ width: cqw(avatar), height: cqw(avatar) }}>
        <img src={imageFor(c.profile_photo, c.rank ?? 0)} alt="" loading="lazy" />
      </div>
      <div className={s.name}>
        <span className={s.nameText}>{c.name || "Contestant"}</span>
        {c.is_verified || c.verified_badge ? <VerifiedBadge size="xs" /> : null}
      </div>
      <div className={s.pill}>
        <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2L22 12L12 22L2 12Z" fill="#22C37A" />
          <path d="M12 2L22 12H2Z" fill="#5BE3A4" />
        </svg>
        {fmt(c.final_score ?? c.points ?? c.audience_votes)}
      </div>
    </div>
  );
}

/**
 * The 1-2-3 podium. Change `replayKey` to replay the entrance (new
 * competition / round / category) — not after a vote.
 */
export function Podium3D({
  first,
  second,
  third,
  replayKey,
  maxWidth = 520,
}: {
  first: PodiumContestant | null;
  second: PodiumContestant | null;
  third: PodiumContestant | null;
  replayKey?: string;
  maxWidth?: number;
}) {
  const id = useSvgId("pd");
  return (
    <div style={{ maxWidth, margin: "0 auto" }}>
      <div key={replayKey} className={s.stage} style={{ aspectRatio: `${VB_W} / ${TOTAL}` }}>
        {/* soft light behind the champion */}
        <div className={`${s.layer} ${s.halo}`}>
          <Svg>
            <BlockDefs id={`${id}h`} />
            <ellipse cx="180" cy="66" rx="150" ry="66" fill={`url(#${id}hhalo)`} />
          </Svg>
        </div>

        {/* #2 (left) */}
        <div className={`${s.layer} ${s.rise}`} style={{ animationDelay: "140ms" }}>
          <Svg>
            <BlockDefs id={`${id}l`} />
            <polygon points={`${S_OUT},${S_TOP} ${C_L},${S_TOP} ${C_L},${S_BACK} ${S_OUT + S_INSET},${S_BACK}`} fill={`url(#${id}lst)`} />
            <rect x={S_OUT} y={S_TOP} width={C_L - S_OUT} height={VB_H - S_TOP} fill={`url(#${id}lsf)`} />
            <rect x={S_OUT} y={S_TOP} width={C_L - S_OUT} height={VB_H - S_TOP} fill={`url(#${id}lshL)`} />
            <path d={`M${S_OUT} ${S_TOP} L${C_L} ${S_TOP}`} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
            <path d={`M${S_OUT} ${S_TOP} L${S_OUT + S_INSET} ${S_BACK} L${C_L} ${S_BACK}`} stroke="rgba(255,255,255,0.09)" strokeWidth={1} fill="none" />
            <rect x={S_OUT} y={S_TOP} width={1} height={96} fill={`url(#${id}lef)`} />
          </Svg>
          <div className={s.wreath} style={{ left: pctX(LEFT_CX - 35), top: pctY(166 - 35), width: cqw(70) }}>
            <RankLaurel rank={2} size="100%" tone="ghost" />
          </div>
        </div>

        {/* #3 (right) */}
        <div className={`${s.layer} ${s.rise}`} style={{ animationDelay: "0ms" }}>
          <Svg>
            <BlockDefs id={`${id}r`} />
            <polygon points={`${R},${S_TOP} ${C_R},${S_TOP} ${C_R},${S_BACK} ${R - S_INSET},${S_BACK}`} fill={`url(#${id}rst)`} />
            <rect x={C_R} y={S_TOP} width={R - C_R} height={VB_H - S_TOP} fill={`url(#${id}rsf)`} />
            <rect x={C_R} y={S_TOP} width={R - C_R} height={VB_H - S_TOP} fill={`url(#${id}rshR)`} />
            <path d={`M${C_R} ${S_TOP} L${R} ${S_TOP}`} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
            <path d={`M${R} ${S_TOP} L${R - S_INSET} ${S_BACK} L${C_R} ${S_BACK}`} stroke="rgba(255,255,255,0.09)" strokeWidth={1} fill="none" />
            <rect x={R - 1} y={S_TOP} width={1} height={96} fill={`url(#${id}ref)`} />
          </Svg>
          <div className={s.wreath} style={{ left: pctX(RIGHT_CX - 35), top: pctY(166 - 35), width: cqw(70) }}>
            <RankLaurel rank={3} size="100%" tone="ghost" />
          </div>
        </div>

        {/* #1 (centre, in front) */}
        <div className={`${s.layer} ${s.rise}`} style={{ animationDelay: "280ms" }}>
          <Svg>
            <BlockDefs id={`${id}c`} />
            <rect x={C_L} y={C_TOP} width={C_R - C_L} height={VB_H - C_TOP} fill={`url(#${id}cgf)`} />
            <rect x={C_L} y={C_TOP} width={C_R - C_L} height={VB_H - C_TOP} fill={`url(#${id}cgg)`} />
            <polygon points={`${C_L},${C_TOP} ${C_R},${C_TOP} ${C_R - C_INSET},${C_BACK} ${C_L + C_INSET},${C_BACK}`} fill={`url(#${id}cgt)`} />
            {[
              { w: 7, o: 0.1 },
              { w: 3.6, o: 0.28 },
              { w: 1.5, o: 1 },
            ].map((p) => (
              <polygon
                key={p.w}
                points={`${C_L},${C_TOP} ${C_R},${C_TOP} ${C_R - C_INSET},${C_BACK} ${C_L + C_INSET},${C_BACK}`}
                fill="none"
                stroke={GOLD}
                strokeOpacity={p.o}
                strokeWidth={p.w}
                strokeLinejoin="round"
              />
            ))}
            <rect x={C_L - 0.7} y={C_TOP} width={1.5} height={140} fill={`url(#${id}cge)`} />
            <rect x={C_R - 0.8} y={C_TOP} width={1.5} height={140} fill={`url(#${id}cge)`} />
            <rect x={C_L - 3} y={C_TOP} width={6} height={60} fill={`url(#${id}cge)`} opacity={0.12} />
            <rect x={C_R - 3} y={C_TOP} width={6} height={60} fill={`url(#${id}cge)`} opacity={0.12} />
          </Svg>
          <div className={s.wreath} style={{ left: pctX(180 - 48), top: pctY(126 - 48), width: cqw(96) }}>
            <RankLaurel rank={1} size="100%" tone="gold" glow />
          </div>
        </div>

        {/* contestants standing on their blocks */}
        <Face c={second} cx={LEFT_CX} bottomY={S_BACK + 12} avatar={54} width={C_L - S_OUT + 4} delay={760} />
        <Face c={third} cx={RIGHT_CX} bottomY={S_BACK + 12} avatar={54} width={C_L - S_OUT + 4} delay={620} />
        <Face c={first} cx={180} bottomY={C_BACK + 14} avatar={66} width={C_R - C_L + 8} delay={900} />
      </div>
    </div>
  );
}
