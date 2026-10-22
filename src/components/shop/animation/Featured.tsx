"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { IMG, PAST, inrS } from "./content";
import { tick, isStatic, lenisVelocity, watchVisible } from "./lib/motion";

export default function Featured() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const s = useRef({ x: 0, hover: false, vis: false });

  useEffect(() => {
    if (isStatic() || !root.current || !track.current) return;
    const tr = track.current;
    const off = watchVisible(root.current, (v) => (s.current.vis = v));

    const t = tick((dt) => {
      if (!s.current.vis) return;
      const half = tr.scrollWidth / 2;
      const sp = s.current.hover ? 0 : 70 + Math.abs(lenisVelocity()) * 28;
      s.current.x = (s.current.x - sp * dt) % half;
      tr.style.transform = `translateX(${s.current.x.toFixed(1)}px)`;
    });

    const stamps = root.current.querySelectorAll<HTMLElement>(".fe-stamp");
    gsap.set(stamps, { opacity: 0, scale: 2.4, rotate: -22 });

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 70%",
      end: "bottom 10%",
      onEnter: () =>
        gsap.to(stamps, {
          opacity: 1,
          scale: 1,
          rotate: -8,
          duration: 0.45,
          ease: "power4.in",
          stagger: 0.08,
          overwrite: true,
        }),
      onEnterBack: () =>
        gsap.to(stamps, {
          opacity: 1,
          scale: 1,
          rotate: -8,
          duration: 0.45,
          ease: "power4.in",
          stagger: 0.08,
          overwrite: true,
        }),
      onLeave: () => gsap.set(stamps, { opacity: 0, scale: 2.4, rotate: -22 }),
      onLeaveBack: () => gsap.set(stamps, { opacity: 0, scale: 2.4, rotate: -22 }),
    });

    return () => {
      off();
      t();
      st.kill();
    };
  }, []);

  const cards = [...PAST, ...PAST];

  return (
    <section ref={root} id="featured" data-nav="dark" className="featured">
      <div className="container-x fe-head">
        <p className="k-eyebrow">Archive</p>
        <h2 className="k-h2">
          Past drops.
          <br />
          Gone forever.
        </h2>
      </div>

      <div
        className="fe-rail"
        onMouseEnter={() => (s.current.hover = true)}
        onMouseLeave={() => (s.current.hover = false)}
      >
        <div ref={track} className="fe-track">
          {cards.map((c, i) => (
            <article key={i} className="fe-card">
              <div className="fe-img">
                <img src={IMG(c.img)} alt={c.name} />
                <span className="fe-stamp">SOLD OUT</span>
              </div>
              <p>{c.drop}</p>
              <h3>{c.name}</h3>
              <em>{inrS(c.price)}</em>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
