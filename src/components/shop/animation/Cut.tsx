"use client";

const CUT_METAS: Record<string, { cx: number; bt: number; bw: number }> = {
  "cap-front": { cx: 0.5, bt: 0.94, bw: 0.9 },
  "cargo-back": { cx: 0.5, bt: 0.94, bw: 0.618 },
  "cargo-front": { cx: 0.5, bt: 0.94, bw: 0.617 },
  "hoodie-back": { cx: 0.5, bt: 0.94, bw: 0.842 },
  "hoodie-chalk": { cx: 0.5, bt: 0.94, bw: 0.843 },
  "hoodie-ember": { cx: 0.5, bt: 0.94, bw: 0.842 },
  "hoodie-front": { cx: 0.5, bt: 0.94, bw: 0.842 },
  "hoodie-navy": { cx: 0.5, bt: 0.94, bw: 0.842 },
  "hoodie-teal": { cx: 0.5, bt: 0.94, bw: 0.842 },
  "puffer-back": { cx: 0.5, bt: 0.94, bw: 0.89 },
  "puffer-front": { cx: 0.5, bt: 0.94, bw: 0.89 },
  "socks-front": { cx: 0.5, bt: 0.94, bw: 0.715 },
  "tee-back": { cx: 0.5, bt: 0.94, bw: 0.9 },
  "tee-chalk": { cx: 0.5, bt: 0.94, bw: 0.9 },
  "tee-front": { cx: 0.5, bt: 0.94, bw: 0.9 },
};

export const CUT = (n: string) => {
  if (n.startsWith("http") || n.startsWith("/")) return n;
  return `/images/kerbcode/${n}-cut.webp`;
};

type M = { cx: number; bt: number; bw: number };
export const cutMeta = (n: string): M =>
  CUT_METAS[n] ?? { cx: 0.5, bt: 0.82, bw: 0.5 };

/** A cut-out garment with a soft contact shadow under it. */
export default function Cut({
  n,
  alt = "",
  className = "",
}: {
  n: string;
  alt?: string;
  className?: string;
}) {
  const m = cutMeta(n);
  return (
    <span
      className={`cut ${className}`}
      style={{
        ["--cx" as string]: `${m.cx * 100}%`,
        ["--bt" as string]: `${m.bt * 100}%`,
        ["--bw" as string]: `${m.bw * 100}%`,
      }}
    >
      <img src={CUT(n)} alt={alt} draggable={false} />
    </span>
  );
}
