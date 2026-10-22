"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { IMG, FABRIC } from "./content";
import { isStatic } from "./lib/motion";

export default function Fabric() {
  const root = useRef<HTMLElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!root.current) return;
    const lines = root.current.querySelectorAll<SVGPathElement>(".fb-line");
    const dots = root.current.querySelectorAll<HTMLElement>(".fb-dot");
    const labs = root.current.querySelectorAll<HTMLElement>(".fb-lab");

    if (isStatic()) return;

    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set([dots, labs], { opacity: 0 });

    const tl = gsap
      .timeline({ paused: true })
      .to(dots, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.15, ease: "back.out(3)" })
      .to(lines, { strokeDashoffset: 0, duration: 0.9, stagger: 0.15, ease: "power2.inOut" }, 0.1)
      .to(labs, { opacity: 1, x: 0, duration: 0.5, stagger: 0.15, ease: "power3.out" }, 0.55);

    gsap.set(labs, { x: (i) => (FABRIC[i].side === "l" ? -16 : 16) });

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 55%",
      end: "bottom 30%",
      onEnter: () => tl.play(),
      onEnterBack: () => tl.play(),
      onLeave: () => tl.pause(0),
      onLeaveBack: () => tl.pause(0),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  useEffect(() => {
    const el = img.current;
    if (!el) return;
    const z = FABRIC.find((f) => f.id === zoom);
    gsap.to(el, {
      scale: z ? 1.55 : 1,
      transformOrigin: z ? `${z.x * 100}% ${z.y * 100}%` : "50% 50%",
      duration: 0.8,
      ease: "power3.out",
    });
  }, [zoom]);

  return (
    <section ref={root} id="fabric" data-nav="light" className="fabric">
      <div className="container-x fb-in">
        <div className="fb-head">
          <p className="k-eyebrow">Built heavy</p>
          <h2 className="k-h2">
            480 GSM.
            <br />
            No shortcuts.
          </h2>
        </div>

        <div className="fb-fig">
          <div className="fb-img">
            <div ref={img} className="fb-zoom">
              <img
                src={IMG("fabric-macro")}
                alt="Close-up of brushed fleece and rib cuff"
              />
            </div>
          </div>

          <svg
            className="fb-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {FABRIC.map((f) => {
              const lx = f.side === "l" ? -6 : 106;
              const ly = f.y * 100;
              return (
                <path
                  key={f.id}
                  className="fb-line"
                  pathLength={1}
                  d={`M${f.x * 100} ${f.y * 100} L${f.side === "l" ? 6 : 94} ${ly} L${lx} ${ly}`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {FABRIC.map((f) => (
            <span
              key={f.id}
              className="fb-dot"
              style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
              aria-hidden
            />
          ))}

          {FABRIC.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`fb-lab ${f.side}`}
              style={{ top: `${f.y * 100}%` }}
              onMouseEnter={() => setZoom(f.id)}
              onMouseLeave={() => setZoom(null)}
              onFocus={() => setZoom(f.id)}
              onBlur={() => setZoom(null)}
            >
              <b>{f.label}</b>
              <em>{f.sub}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
