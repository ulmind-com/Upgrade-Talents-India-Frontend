"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import Magnetic from "./Magnetic";
import { IMG, COLOURWAYS } from "./content";
import { FILM, getFilm, loadFilm, onKerbLift } from "./lib/kerb";
import { usePinProgress, isStatic, tick, watchVisible, lenisVelocity } from "./lib/motion";

function HeroFilm() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const flip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let off = () => {};
    let alive = true;
    const film = getFilm();

    const start = () => {
      if (!alive || !cv.current) return;
      const c = cv.current;
      const g = c.getContext("2d");
      if (!g) return;

      let last = -1;
      let vis = true;
      let phase = 0;
      let extra = 0;
      let lastY = window.scrollY;

      const offV = watchVisible(c, (v) => (vis = v));
      const N = FILM.n;
      const cycle = 2 * (N - 1);

      const draw = (i: number) => {
        let im = film.frames[i];
        if (!im) {
          for (let d = 1; d < 12 && !im; d++) {
            im = film.frames[i - d] || film.frames[i + d];
          }
        }
        if (im) {
          g.clearRect(0, 0, c.width, c.height);
          g.drawImage(im, 0, 0, c.width, c.height);
          last = i;
        }
      };

      draw(0);
      if (isStatic()) return;

      const offT = tick((dt) => {
        if (!vis) return;
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        extra += dy * 0.06 + lenisVelocity() * 0.004;
        phase += dt * FILM.fps * 0.75;
        const u = (((phase + extra) % cycle) + cycle) % cycle;
        const i = Math.round(u <= N - 1 ? u : cycle - u);
        if (i !== last) draw(i);
      });

      off = () => {
        offT();
        offV();
      };
    };

    if (isStatic()) {
      loadFilm(undefined, true).then((ok) => (ok ? start() : setFailed(true)));
    } else {
      loadFilm().then((ok) => (ok ? start() : setFailed(true)));
    }

    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    if (!failed || isStatic()) return;
    const el = flip.current;
    if (!el) return;
    return tick((_, t) => {
      el.style.transform = `rotateY(${(t * 22) % 360}deg) rotateX(${Math.sin(t) * 3}deg)`;
    });
  }, [failed]);

  if (failed) {
    return (
      <div className="hf-flip">
        <div ref={flip} className="hf-flip-in">
          <img src={IMG("hoodie-front")} alt="Drop 07 hoodie, front" />
          <img className="back" src={IMG("hoodie-back")} alt="Drop 07 hoodie, back" />
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={cv}
      width={FILM.w}
      height={FILM.h}
      className="hf-canvas"
      aria-label="Drop 07 hoodie turning 3D"
    />
  );
}

export default function Hero3D() {
  const outer = useRef<HTMLElement>(null);
  const disc = useRef<SVGSVGElement>(null);
  const wl = useRef<HTMLSpanElement>(null);
  const wr = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const sp = useRef(0);
  const [cw, setCw] = useState(0);

  usePinProgress(
    outer,
    (p) => {
      sp.current = p;
      if (wl.current) gsap.set(wl.current, { x: -p * 260 });
      if (wr.current) gsap.set(wr.current, { x: p * 260 });
      if (wl.current?.parentElement) {
        wl.current.parentElement.style.opacity = String(
          1 - Math.min(1, Math.max(0, (p - 0.6) / 0.35))
        );
      }
      if (panel.current) gsap.set(panel.current, { y: -p * 40 });
      if (copy.current) gsap.set(copy.current, { opacity: 1 - p * 1.6 });
    },
    0
  );

  useEffect(() => {
    if (isStatic()) return;
    const el = disc.current;
    if (!el) return;
    return tick((_, t) => {
      el.style.transform = `rotate(${t * 6 + sp.current * 200}deg)`;
    });
  }, []);

  useEffect(() => {
    if (isStatic() || !outer.current) return;
    return onKerbLift(() => {
      if (!outer.current) return;
      const q = (s: string) => outer.current!.querySelectorAll(s);
      gsap.fromTo(
        q(".hero-word span"),
        { yPercent: 40, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.2, ease: "power4.out", stagger: 0.12 }
      );
      gsap.fromTo(
        q(".hero-panel"),
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", delay: 0.15, clearProps: "opacity" }
      );
      gsap.fromTo(
        q(".hero-disc"),
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.3, ease: "power3.out", delay: 0.2 }
      );
      gsap.fromTo(
        q(".hero-fade"),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.5 }
      );
    });
  }, []);

  const c = COLOURWAYS[cw];

  return (
    <section ref={outer} id="hero-3d" data-nav="light" className="pin hero">
      <div className="pin-in">
        <svg ref={disc} className="hero-disc" viewBox="-100 -100 200 200" aria-hidden>
          <path d="M0 0 L0 -100 A100 100 0 1 1 -100 0 Z" fill="#A49A74" />
          <path
            d="M0 0 L-100 0 A100 100 0 0 1 0 -100 Z"
            fill="none"
            stroke="#0E0F11"
            strokeWidth="1.5"
            strokeDasharray="3 5"
            transform="translate(-7 -7)"
          />
        </svg>

        <div className="hero-word" aria-hidden>
          <span ref={wl}>UP</span>
          <span ref={wr}>GRADE</span>
        </div>

        <div ref={panel} className="hero-panel">
          <HeroFilm />
          <i className="hero-tag">DROP 07 · AW26</i>
        </div>

        <div ref={copy} className="hero-copy hero-fade">
          <p className="k-eyebrow">Official Merchandise</p>
          <p className="hero-lede">
            Heavyweight streetwear crafted for dancers, performers & creators. Limited drop, no restocks.
          </p>
          <p className="hero-hint">
            <i /> Scroll to explore
          </p>
        </div>

        <div className="hero-card hero-fade">
          <button
            type="button"
            className="hero-thumb"
            aria-label={`Colour ${c.name}, tap for next`}
            onMouseEnter={() => setCw((v) => (v + 1) % COLOURWAYS.length)}
            onClick={() => setCw((v) => (v + 1) % COLOURWAYS.length)}
          >
            <img key={c.id} src={IMG(c.img)} alt="" />
          </button>
          <span className="hero-card-t">
            <b>Drop 07 Hoodie</b>
            <em>{c.name} · MRP ₹4,990</em>
          </span>
          <Magnetic strength={0.3}>
            <a href="#product" className="hero-arrow" aria-label="Shop the hoodie">
              <svg viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
