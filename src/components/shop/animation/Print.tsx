"use client";

import { useRef, useState } from "react";
import { IMG } from "./content";
import { usePinProgress, seg, pad2 } from "./lib/motion";

const STEPS = [
  { t: "Burn the screen", s: "Photo-emulsion mesh, one screen per colour.", ink: "#F6F6F4", name: "Chalk white" },
  { t: "Lay the ink", s: "Plastisol, thick and matte, flooded edge to edge.", ink: "#EC6A2C", name: "Ember orange" },
  { t: "Pull the print", s: "One firm pass of the squeegee presses ink through the mesh.", ink: "#8C8260", name: "Khaki" },
  { t: "Flash and cure", s: "Heat sets the ink so it survives a hundred washes.", ink: "#0E0F11", name: "Cure black" },
];

const VB = { w: 400, h: 230 };
const CHEST = { x: 0.22, y: 0.27, w: 0.56, h: 0.257 };

export default function Print() {
  const outer = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const blade = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const last = useRef(-1);

  usePinProgress(
    outer,
    (p) => {
      const root = svg.current;
      if (!root) return;

      const passes = [0, 1, 2, 3].map((i) =>
        seg(p, 0.06 + i * 0.22, 0.06 + i * 0.22 + 0.2)
      );

      passes.forEach((q, i) => {
        const r = root.querySelector<SVGRectElement>(`#kp-clip${i} rect`);
        if (!r) return;
        const w = VB.w * q;
        r.setAttribute("x", String(i % 2 === 0 ? 0 : VB.w - w));
        r.setAttribute("width", String(w));
      });

      let act = passes.findIndex((q) => q > 0 && q < 1);
      const b = blade.current;
      if (b) {
        if (act === -1) {
          const done = passes.filter((q) => q >= 1).length;
          act = Math.max(0, Math.min(3, done === 0 ? 0 : done - 1));
          const x = done === 0 ? 0 : act % 2 === 0 ? 1 : 0;
          b.style.opacity = "0";
          b.style.transform = `translateX(${x * 100}%)`;
          b.style.left = `${x * 100}%`;
        } else {
          const q = passes[act];
          const x = act % 2 === 0 ? q : 1 - q;
          b.style.opacity = "1";
          b.style.left = `${x * 100}%`;
          b.style.transform = "translateX(-50%)";
          b.style.setProperty("--tilt", act % 2 === 0 ? "-8deg" : "8deg");
          b.style.setProperty("--ink", STEPS[act].ink);
        }
      }

      const s = Math.min(3, Math.floor(p * 4.2));
      if (s !== last.current) {
        last.current = s;
        setStep(s);
      }
    },
    1
  );

  return (
    <section
      ref={outer}
      id="print"
      data-nav="light"
      className="pin print"
      style={{ ["--pin" as string]: "400vh" }}
    >
      <div className="pin-in">
        <div className="pr-left">
          <p className="k-eyebrow">The signature · screen print</p>
          <h2 className="k-h2">
            Pull
            <br />
            the print
          </h2>
          <ol className="pr-steps">
            {STEPS.map((s, i) => (
              <li key={s.t} className={i === step ? "on" : ""}>
                <span>{pad2(i + 1)}</span>
                <div>
                  <b>{s.t}</b>
                  <p>{s.s}</p>
                </div>
                <i className="pr-sw" style={{ background: s.ink }} title={s.name} />
              </li>
            ))}
          </ol>
        </div>

        <div className="pr-right">
          <div className="pr-garment">
            <img
              src={IMG("hoodie-back")}
              alt="Back of the black hoodie on a screen-printing table"
            />
            <div
              className="pr-chest"
              style={{
                left: `${CHEST.x * 100}%`,
                top: `${CHEST.y * 100}%`,
                width: `${CHEST.w * 100}%`,
                height: `${CHEST.h * 100}%`,
              }}
            >
              <svg
                ref={svg}
                viewBox={`0 0 ${VB.w} ${VB.h}`}
                aria-label="Printed graphic: UPGRADE 07"
              >
                <defs>
                  {[0, 1, 2, 3].map((i) => (
                    <clipPath key={i} id={`kp-clip${i}`}>
                      <rect x="0" y="0" width="0" height={VB.h} />
                    </clipPath>
                  ))}
                </defs>
                <g clipPath="url(#kp-clip0)">
                  <text x="22" y="118" className="pr-t1">
                    UPGRADE
                  </text>
                </g>
                <g clipPath="url(#kp-clip1)">
                  <path d="M336 78 V42 A20 20 0 0 1 376 42 V78 Z" fill="#EC6A2C" />
                  <circle cx="364" cy="168" r="12" fill="#EC6A2C" />
                </g>
                <g clipPath="url(#kp-clip2)">
                  <text x="200" y="176" textAnchor="middle" className="pr-t2">
                    TALENTS · 07
                  </text>
                </g>
                <g clipPath="url(#kp-clip3)">
                  <path
                    d="M24 196H376"
                    stroke="#F6F6F4"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <text x="200" y="216" textAnchor="middle" className="pr-t3">
                    OFFICIAL MERCH · DROP 07
                  </text>
                </g>
              </svg>
              <div ref={blade} className="pr-blade" aria-hidden>
                <i />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
