"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DROP_DATE } from "./content";
import { isStatic } from "./lib/motion";

function Digit({ d, delay = 0, armed }: { d: number; delay?: number; armed: boolean }) {
  const col = useRef<HTMLDivElement>(null);
  const row = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    const el = col.current;
    if (!el) return;
    const target = 9 - d;

    if (isStatic()) {
      row.current = target;
      gsap.set(el, { yPercent: -(target / 11) * 100 });
      return;
    }

    if (!armed) {
      gsap.set(el, { yPercent: 0 });
      row.current = 0;
      return;
    }

    if (first.current) {
      first.current = false;
      gsap.to(el, {
        yPercent: -(target / 11) * 100,
        duration: 1.4 + delay * 0.12,
        ease: "power3.out",
        delay: 0.1 + delay * 0.08,
      });
      row.current = target;
      return;
    }

    const wrap = d === 9 && row.current === 9;
    const to = wrap ? 10 : target;
    gsap.to(el, {
      yPercent: -(to / 11) * 100,
      duration: 0.6,
      ease: "power3.inOut",
      onComplete: () => {
        if (wrap) gsap.set(el, { yPercent: -(0 / 11) * 100 });
      },
    });
    row.current = wrap ? 0 : target;
  }, [d, armed, delay]);

  return (
    <span className="ck-digit">
      <div ref={col} className="ck-col">
        {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 9].map((n, i) => (
          <i key={i}>{n}</i>
        ))}
      </div>
    </span>
  );
}

const left = () => {
  const ms = Math.max(0, DROP_DATE.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor(s / 3600) % 24,
    m: Math.floor(s / 60) % 60,
    s: s % 60,
  };
};

export default function Clock() {
  const root = useRef<HTMLElement>(null);
  const [t, setT] = useState<ReturnType<typeof left> | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setT(left());
    const iv = setInterval(() => setT(left()), 1000);

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 75%",
      end: "bottom top",
      onToggle: (s) => {
        if (s.isActive) setArmed(true);
      },
    });

    if (isStatic()) setArmed(true);

    return () => {
      clearInterval(iv);
      st.kill();
    };
  }, []);

  const units: [string, number | undefined, number][] = [
    ["Days", t?.d, 3],
    ["Hours", t?.h, 2],
    ["Minutes", t?.m, 2],
    ["Seconds", t?.s, 2],
  ];

  return (
    <section ref={root} id="clock" data-nav="light" className="clock">
      <div className="container-x ck-in">
        <div className="ck-head">
          <p className="k-eyebrow">Limited drop · opens 05 Dec 2026 · 8 pm IST</p>
          <h2 className="k-h2">The doors open in</h2>
        </div>

        <div className="ck-row">
          {units.map(([label, v, n], gi) => {
            const str = String(v ?? 0).padStart(n, "0");
            return (
              <div key={label} className="ck-group">
                <div className="ck-digits">
                  {str.split("").map((c, i) => (
                    <Digit
                      key={i}
                      d={+c}
                      delay={gi * 2 + i}
                      armed={armed && v !== undefined}
                    />
                  ))}
                </div>
                <span className="ck-label">{label}</span>
              </div>
            );
          })}
        </div>

        <p className="ck-note">
          One drop. Exclusive pieces. When the clock hits zero the line-up is gone for good.
        </p>
      </div>
    </section>
  );
}
