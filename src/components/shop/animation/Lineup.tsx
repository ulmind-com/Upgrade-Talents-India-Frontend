"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { IMG, DEFAULT_PIECES, inrNote, type PieceItem } from "./content";
import { usePinProgress, isStatic, pad2 } from "./lib/motion";

export default function Lineup({ pieces = DEFAULT_PIECES }: { pieces?: PieceItem[] }) {
  const outer = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const cur = useRef(0);
  const front = useRef(0);
  const lastScroll = useRef({ idx: 0, at: 0 });
  const vis = useRef(false);
  const ghost = useRef<HTMLDivElement>(null);

  const show = (i: number) => {
    if (i === cur.current) return;
    cur.current = i;
    setIdx(i);
    const L = stage.current?.querySelectorAll<HTMLImageElement>(".ls-l");
    if (!L || L.length < 2) return;

    if (isStatic()) {
      L[0].src = IMG(pieces[i].front);
      return;
    }

    const from = L[front.current];
    const to = L[1 - front.current];
    front.current = 1 - front.current;

    gsap.killTweensOf([from, to]);
    to.src = IMG(pieces[i].front);
    gsap.fromTo(
      to,
      { opacity: 0, x: 36, scale: 0.96 },
      { opacity: 1, x: 0, scale: 1, duration: 0.5, delay: 0.18, ease: "power2.out" }
    );
    gsap.to(from, { opacity: 0, x: -36, scale: 0.96, duration: 0.3, ease: "power2.in" });
  };

  usePinProgress(
    outer,
    (p) => {
      if (ghost.current) gsap.set(ghost.current, { x: -p * 420 });
      const i = Math.min(pieces.length - 1, Math.floor(p * pieces.length));
      if (i !== lastScroll.current.idx) {
        lastScroll.current = { idx: i, at: performance.now() };
        show(i);
      }
    },
    0
  );

  useEffect(() => {
    if (isStatic() || !outer.current) return;
    const io = new IntersectionObserver(([e]) => (vis.current = e.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(outer.current);

    const iv = setInterval(() => {
      if (!vis.current || performance.now() - lastScroll.current.at < 3000) return;
      lastScroll.current.at = performance.now();
      show((cur.current + 1) % pieces.length);
    }, 3200);

    return () => {
      io.disconnect();
      clearInterval(iv);
    };
  }, [pieces.length]);

  const p = pieces[idx] || pieces[0];

  return (
    <section
      ref={outer}
      id="lineup"
      data-nav="light"
      className="pin lineup"
      style={{ ["--pin" as string]: "480vh" }}
    >
      <div className="pin-in">
        <div ref={ghost} className="ls-ghost" aria-hidden>
          LINE-UP · DROP 07 · UPGRADE MERCH
        </div>

        <ol className="ls-list">
          {pieces.map((x, i) => (
            <li
              key={x.id || i}
              className={i === idx ? "on" : ""}
              onMouseEnter={() => {
                lastScroll.current.at = performance.now();
                show(i);
              }}
            >
              <span>{pad2(i + 1)}</span>
              <b>{x.name}</b>
              <em>{inrNote(x.price)}</em>
            </li>
          ))}
        </ol>

        <div ref={stage} className="ls-stage" role="img" aria-label={`${p.name}, front`}>
          {[0, 1].map((l) => (
            <img
              key={l}
              className="ls-l"
              src={IMG(pieces[0]?.front || "")}
              alt=""
              draggable={false}
              style={{ opacity: l === 0 ? 1 : 0 }}
            />
          ))}
        </div>

        <div className="ls-info">
          <i className="ls-tag">ORIGINAL</i>
          <div key={p.id} className="ls-word">
            {p.word}
          </div>
          <p>{p.note}</p>
          <a href="#shop" className="ls-more">
            <span>View all</span>
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>

        <p className="ls-count">
          {pad2(idx + 1)} / {pad2(pieces.length)}
        </p>
      </div>
    </section>
  );
}
