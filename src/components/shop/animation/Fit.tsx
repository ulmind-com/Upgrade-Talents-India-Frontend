"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { IMG, FIT, SIZES } from "./content";
import { isStatic } from "./lib/motion";

const ROWS: { k: "chest" | "length" | "sleeve"; label: string }[] = [
  { k: "chest", label: "Chest" },
  { k: "length", label: "Length" },
  { k: "sleeve", label: "Sleeve" },
];

export default function Fit() {
  const root = useRef<HTMLElement>(null);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [seen, setSeen] = useState(false);
  const hl = useRef<HTMLSpanElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (isStatic() || !root.current) {
      setSeen(true);
      return;
    }
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 60%",
      end: "bottom 20%",
      onEnter: () => setSeen(true),
      onEnterBack: () => setSeen(true),
      onLeave: () => setSeen(false),
      onLeaveBack: () => setSeen(false),
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    ROWS.forEach(({ k }) => {
      const bar = el.querySelector<HTMLElement>(`[data-bar="${k}"]`);
      const num = el.querySelector<HTMLElement>(`[data-fit-num="${k}"]`);
      if (!bar || !num) return;

      const v = FIT[size][k];
      const target = seen ? v : 0;

      if (isStatic()) {
        bar.style.width = `${(v / 80) * 100}%`;
        num.textContent = String(v);
        return;
      }

      const o = { n: +num.textContent! || 0 };
      gsap.to(bar, {
        width: `${(target / 80) * 100}%`,
        duration: first.current ? 1.4 : 0.9,
        ease: "power3.out",
        overwrite: true,
      });
      gsap.to(o, {
        n: target,
        duration: first.current ? 1.4 : 0.9,
        ease: "power3.out",
        onUpdate: () => {
          num.textContent = String(Math.round(o.n));
        },
      });
    });

    if (seen) first.current = false;
  }, [size, seen]);

  useEffect(() => {
    if (!chips.current || !hl.current) return;
    const c = chips.current.querySelector<HTMLElement>(`[data-s="${size}"]`);
    if (c) {
      gsap.to(hl.current, {
        x: c.offsetLeft,
        width: c.offsetWidth,
        duration: isStatic() ? 0 : 0.45,
        ease: "power3.out",
      });
    }
  }, [size]);

  return (
    <section ref={root} id="fit" data-nav="light" className="fit">
      <div className="container-x ft-in">
        <div className="ft-pic">
          <img src={IMG("hoodie-front")} alt="Drop 07 hoodie, size guide" />
        </div>

        <div className="ft-body">
          <p className="k-eyebrow">Size & Silhouette</p>
          <h2 className="k-h2">
            Boxy,
            <br />
            by design
          </h2>

          <div ref={chips} className="ft-chips">
            <span ref={hl} className="ft-hl" />
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                data-s={s}
                className={s === size ? "on" : ""}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ft-rows">
            {ROWS.map(({ k, label }) => (
              <div key={k} className="ft-row">
                <span>{label}</span>
                <div className="ft-track">
                  <i data-bar={k} />
                </div>
                <b>
                  <em data-fit-num={k}>0</em> cm
                </b>
              </div>
            ))}
          </div>

          <p className="ft-note">
            Sample measurements, laid flat. Relaxed streetwear fit: size up for exaggerated drape.
          </p>
        </div>
      </div>
    </section>
  );
}
