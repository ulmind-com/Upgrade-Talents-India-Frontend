"use client";

import { useRef, useState } from "react";
import { IMG, LOOKS, inrS } from "./content";
import { usePinProgress, seg, smooth, lerp } from "./lib/motion";

const PILE = [
  [-14, 6, -9],
  [10, -8, 5],
  [0, 14, -2],
];

export default function Looks() {
  const outer = useRef<HTMLElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const [look, setLook] = useState(0);
  const last = useRef(0);

  usePinProgress(
    outer,
    (p) => {
      const a = smooth(seg(p, 0.02, 0.3)) - smooth(seg(p, 0.46, 0.58));
      const b = smooth(seg(p, 0.62, 0.88));

      LOOKS.forEach((lk, li) => {
        const v = li === 0 ? a : b;
        lk.pieces.forEach((pc, pi) => {
          const el = els.current[li * 3 + pi];
          if (!el) return;
          const [x, y, r] = pc.look.split(",").map(Number);
          const [px, py, pr] = PILE[pi];

          el.style.transform = `translate(${lerp(px, x, v).toFixed(1)}px, ${lerp(
            py,
            y,
            v
          ).toFixed(1)}px) rotate(${lerp(pr, r, v).toFixed(2)}deg)`;
          el.style.opacity =
            li === 0 ? (p > 0.55 ? "0" : "1") : v > 0.001 ? "1" : "0";
          el.style.zIndex = String(v > 0.02 ? 5 + pi : 1 + pi);
          el.style.pointerEvents = v > 0.9 ? "auto" : "none";
        });
      });

      const nl = p > 0.54 ? 1 : 0;
      if (nl !== last.current) {
        last.current = nl;
        setLook(nl);
      }
    },
    1
  );

  return (
    <section
      ref={outer}
      id="looks"
      data-nav="dark"
      className="pin looks"
      style={{ ["--pin" as string]: "300vh" }}
    >
      <div className="pin-in">
        <div className="lk-head">
          <p className="k-eyebrow">Curated Outfits</p>
          <h2 className="k-h2" key={look}>
            {LOOKS[look].name}
          </h2>
          <p className="lk-sub">
            {look + 1} / {LOOKS.length} · Three pieces styled as one look
          </p>
        </div>

        <div className="lk-board">
          {LOOKS.map((lk, li) =>
            lk.pieces.map((pc, pi) => (
              <figure
                key={li + pc.id}
                ref={(n) => {
                  els.current[li * 3 + pi] = n;
                }}
                className="lk-piece"
                data-look={pc.look}
              >
                <img src={IMG(pc.img)} alt={pc.name} />
                <figcaption>
                  <b>{pc.name}</b>
                  <em>{inrS(pc.price)}</em>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
