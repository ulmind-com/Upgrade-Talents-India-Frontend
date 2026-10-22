"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { isStatic } from "./lib/motion";

export type SeamKind = "diag" | "diagR" | "curve" | "wash" | "stairs" | "notch" | "panel";

const clampv = (v: number) => Math.min(1, Math.max(0, v));

function shape(kind: SeamKind, p: number): string {
  const q = 1 - p;
  const pc = (v: number) => (clampv(v) * 100).toFixed(2) + "%";

  switch (kind) {
    case "diag":
      return `polygon(0 0, 100% 0, 100% ${pc(1 - p * 1.7)}, 0 ${pc(1 - p)})`;
    case "diagR":
      return `polygon(0 0, 100% 0, 100% ${pc(1 - p)}, 0 ${pc(1 - p * 1.7)})`;
    case "curve": {
      const pts: string[] = ["0 0", "100% 0"];
      for (let i = 20; i >= 0; i--) {
        const x = i / 20;
        const y = q - 0.5 * Math.sin(Math.PI * x) * 4 * p * q;
        pts.push(`${(x * 100).toFixed(1)}% ${pc(y)}`);
      }
      return `polygon(${pts.join(",")})`;
    }
    case "notch": {
      const pts: string[] = ["0 0", "100% 0"];
      for (let i = 10; i >= 0; i--) {
        const x = i / 10;
        const y = q + 0.45 * (1 - Math.abs(2 * x - 1)) * 4 * p * q * 0.9;
        pts.push(`${(x * 100).toFixed(1)}% ${pc(y)}`);
      }
      return `polygon(${pts.join(",")})`;
    }
    case "stairs": {
      const n = 7;
      const pts: string[] = ["0 0", "100% 0"];
      for (let i = n - 1; i >= 0; i--) {
        const y = pc(1 - clampv((p * 1.5 - i * 0.09) / 0.55));
        pts.push(
          `${(((i + 1) / n) * 100).toFixed(2)}% ${y}`,
          `${((i / n) * 100).toFixed(2)}% ${y}`
        );
      }
      return `polygon(${pts.join(",")})`;
    }
    default:
      return `polygon(0 0, 100% 0, 100% ${pc(q)}, 0 ${pc(q)})`;
  }
}

export default function Seam({
  kind,
  from,
  to,
  h = 24,
}: {
  kind: SeamKind;
  from: string;
  to?: string;
  h?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !el.current) return;
    if (isStatic()) {
      el.current.style.display = "none";
      return;
    }

    const set = (p: number) => {
      const s = el.current;
      if (!s) return;
      if (kind === "wash") s.style.opacity = String(1 - p);
      else s.style.clipPath = shape(kind, p);
    };

    set(0);
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 96%",
      end: "top 28%",
      onUpdate: (s) => set(s.progress),
      onRefresh: (s) => set(s.progress),
    });

    return () => st.kill();
  }, [kind]);

  const bg =
    kind === "wash"
      ? `linear-gradient(to bottom, ${from} 0%, ${from} 25%, ${to ?? "transparent"} 100%)`
      : from;

  return (
    <div ref={ref} className="seam" aria-hidden>
      <div
        ref={el}
        className="seam-shape"
        style={{ height: `${h}vh`, background: bg }}
      />
    </div>
  );
}
