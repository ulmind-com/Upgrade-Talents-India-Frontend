"use client";

import { useEffect, useRef } from "react";
import { PLINTH, DEFAULT_NIGHT_SLOTS } from "./content";
import Cut, { CUT } from "./Cut";
import { usePinProgress, tick, isStatic, seg, clamp, lenisVelocity, watchVisible } from "./lib/motion";

const PIECES = DEFAULT_NIGHT_SLOTS.slice(0, 6);
const N = PIECES.length;
const GAP = 30;
const WIN = 46;
const RX = 880;

export default function Night() {
  const outer = useRef<HTMLElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const peaks = useRef<HTMLDivElement>(null);
  const red = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const finale = useRef<HTMLDivElement>(null);
  const hood = useRef<HTMLDivElement>(null);
  const st = useRef({ p: 0, c: -0.6, t: 0, vis: false, tilt: 0 });
  const pcs = useRef<(HTMLElement | null)[]>([]);

  const layout = (dt = 0.016) => {
    const s = st.current;
    const p = s.p;
    const sta = isStatic();
    if (sta) s.c = (N - 1) / 2;

    const target = -0.7 + seg(p, 0, 0.74) * (N - 1 + 1.4);
    s.c += (target - s.c) * Math.min(1, dt * 7);
    s.tilt += (clamp(lenisVelocity() * 0.012, -14, 14) - s.tilt) * Math.min(1, dt * 6);
    const sway = Math.sin(s.t * 0.5) * 0.06;

    pcs.current.forEach((el, i) => {
      if (!el) return;
      const th = (i - s.c - sway) * (sta ? 17 : GAP);
      const a = Math.abs(th);
      const k = clamp(a / WIN);
      const x = Math.sin((th * Math.PI) / 180) * RX * 0.86;
      const y = (1 - Math.cos((th * Math.PI) / 180)) * 250 + Math.sin(s.t * 1.3 + i * 1.7) * 7 - 20;
      const sc = 0.74 + 0.22 * k;
      const flip = sta ? 0 : seg(-th, 14, 46);
      const ry = th * 0.45 - 180 * flip;
      const op = sta ? 1 : 1 - seg(a, WIN - 12, WIN + 8);

      el.style.opacity = String(op);
      el.style.visibility = op < 0.01 ? "hidden" : "visible";
      el.style.zIndex = String(Math.round(a));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(3)}) rotateY(${ry.toFixed(1)}deg) rotateZ(${(s.tilt * (th > 0 ? 1 : -1) * 0.3).toFixed(2)}deg)`;
    });

    const lift = seg(p, 0.8, 1);
    if (title.current) {
      title.current.style.transform = `translateX(${(-p * 40).toFixed(1)}px)`;
      title.current.style.opacity = String(1 - seg(p, 0.74, 0.84));
    }
    if (clouds.current) clouds.current.style.transform = `translateX(${(-p * 260 - s.t * 6).toFixed(1)}px)`;
    if (peaks.current) peaks.current.style.transform = `translateX(${(-p * 90).toFixed(1)}px)`;
    if (red.current) red.current.style.transform = `translateX(${(p * 200).toFixed(1)}px)`;
    if (row.current) row.current.style.opacity = String(1 - seg(p, 0.76, 0.86));
    if (finale.current) {
      finale.current.style.opacity = String(seg(p, 0.76, 0.86));
      finale.current.style.transform = `translateY(${(1 - seg(p, 0.76, 0.9)) * 220}px)`;
    }
    if (hood.current) {
      hood.current.style.transform = `translateY(${(-lift * 70).toFixed(1)}px) rotate(${(Math.sin(lift * 5) * 1.2).toFixed(2)}deg)`;
    }
  };

  usePinProgress(
    outer,
    (p) => {
      st.current.p = p;
      if (!st.current.vis || isStatic()) {
        st.current.c = -0.7 + seg(p, 0, 0.74) * (N - 1 + 1.4);
        layout(0);
      }
    },
    0
  );

  useEffect(() => {
    if (isStatic() || !outer.current) return;
    const off = watchVisible(outer.current, (v) => (st.current.vis = v));
    const t = tick((dt) => {
      if (!st.current.vis) return;
      st.current.t += dt;
      layout(dt);
    });
    return () => {
      off();
      t();
    };
  }, []);

  return (
    <section
      ref={outer}
      id="night"
      data-nav="dark"
      className="pin night"
      style={{ ["--pin" as string]: "460vh" }}
    >
      <div className="pin-in">
        <div className="nt-sky" aria-hidden />

        <div ref={clouds} className="nt-clouds" aria-hidden>
          <svg viewBox="0 0 2400 300" preserveAspectRatio="none">
            {[
              [160, 90, 1],
              [620, 180, 0.7],
              [1080, 70, 1.2],
              [1560, 150, 0.8],
              [2040, 100, 1],
            ].map(([x, y, s], i) => (
              <g
                key={i}
                transform={`translate(${x} ${y}) scale(${s})`}
                fill="#fff"
                opacity=".13"
              >
                <ellipse rx="140" ry="34" />
                <ellipse cx="-70" cy="-18" rx="70" ry="30" />
                <ellipse cx="50" cy="-26" rx="86" ry="36" />
              </g>
            ))}
          </svg>
        </div>

        <div ref={peaks} className="nt-peaks" aria-hidden>
          <svg viewBox="0 0 1800 330" preserveAspectRatio="none">
            <path
              d="M0 330 L0 190 L200 90 L380 200 L560 70 L760 210 L960 100 L1160 220 L1360 80 L1560 200 L1800 110 L1800 330Z"
              fill="#0F3647"
              opacity=".85"
            />
            <path
              d="M0 330 L0 250 L260 170 L460 260 L700 160 L940 270 L1180 180 L1440 270 L1800 190 L1800 330Z"
              fill="#0A222D"
            />
          </svg>
        </div>

        <div ref={red} className="nt-red" aria-hidden>
          ORIGINALS
        </div>

        <div ref={title} className="nt-title">
          <h2 className="k-h2">NIGHT DROP</h2>
          <span className="nt-pill">New Arrival</span>
        </div>

        <div ref={row} className="nt-row">
          {PIECES.map((s, i) => (
            <figure
              key={s.name + i}
              ref={(n) => {
                pcs.current[i] = n;
              }}
              className="nt-piece"
            >
              <div className="nt-flip">
                <div className="nt-face nt-front">
                  <Cut n={s.front} alt={s.name} />
                </div>
                <div className="nt-face nt-back">
                  {s.back ? (
                    <Cut n={s.back} alt={`${s.name}, back`} />
                  ) : (
                    <span
                      className="nt-flat"
                      style={{
                        background: s.flat,
                        WebkitMaskImage: `url(${CUT(s.front)})`,
                        maskImage: `url(${CUT(s.front)})`,
                      }}
                      aria-label={`${s.name}, inside`}
                    />
                  )}
                </div>
              </div>
              <figcaption className="nt-tag">{s.name}</figcaption>
            </figure>
          ))}
        </div>

        <div ref={finale} className="nt-finale">
          <div ref={hood} className="nt-hood">
            <Cut n="hoodie-front" alt="Drop 07 hoodie lifting off a plinth" />
          </div>
          <img className="nt-plinth" src={PLINTH} alt="" aria-hidden />
        </div>
      </div>
    </section>
  );
}
