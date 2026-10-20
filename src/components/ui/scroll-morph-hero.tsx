"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";

/* ═══════════ Types ═══════════ */
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
  src: string;
  index: number;
  total: number;
  phase: AnimationPhase;
  target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

/* ═══════════ FlipCard ═══════════ */
const IMG_WIDTH = 60;
const IMG_HEIGHT = 85;

function FlipCard({ src, index, target }: FlipCardProps) {
  return (
    <motion.div
      animate={{
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        opacity: target.opacity,
      }}
      transition={{ type: "spring", stiffness: 40, damping: 15 }}
      style={{
        position: "absolute",
        width: IMG_WIDTH,
        height: IMG_HEIGHT,
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
      className="cursor-pointer group"
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ rotateY: 180 }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-transparent" />
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[var(--border-strong,var(--border))] bg-[var(--bg)] p-4 shadow-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="text-center">
            <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              View
            </p>
            <p className="text-xs font-medium text-[var(--fg)]">Details</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ Main ═══════════ */
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;
const TRACK_VH = 320; // scroll runway: the sticky stage stays pinned across this height

const IMAGES = [
  "https://cdn.21st.dev/assets/mirror/4d/4d1bff4ea8b9f400dff7ae405f92e15bd39ec76e9285c7d96017e64ba1de3ae1.jpg",
  "https://cdn.21st.dev/assets/mirror/ee/ee36e332fe99d7611c43b90511db08a4f84e4545caa78e7b52e9ccffe273864b.jpg",
  "https://cdn.21st.dev/assets/mirror/dd/dddeaa4e6132c65bf7ff99d197f792a30937b5cbfe97a2b1ee54a793684df52e.jpg",
  "https://cdn.21st.dev/assets/mirror/48/487977107b5011b5e1c25289f6e4393ef555e1a92daee554788e9363b233ca14.jpg",
  "https://cdn.21st.dev/assets/mirror/a1/a12509688be6c9d3b2cb26d2ea1cfce48b8a8dbf2653e17be8a3fc31bd69f162.jpg",
  "https://cdn.21st.dev/assets/mirror/05/051f9e565b5b0b221384d9c27a0760febc3fb48d190c046adfda579f3614c958.jpg",
  "https://cdn.21st.dev/assets/mirror/87/87d4f60a4465d19d14b8acefa46275df4ccd767ccea6d7f234ea5bad99cfec56.jpg",
  "https://cdn.21st.dev/assets/mirror/06/0610989e0675a12c02d35aa5464e2644bf77913214b748b73a894808d2d79877.jpg",
  "https://cdn.21st.dev/assets/mirror/fe/fe90b90751e671a9526134c4743e2fcbf6c1a24991aba273ad7418c88fc9c701.jpg",
  "https://cdn.21st.dev/assets/mirror/2e/2e0452c1994fcc2130a1b8ef68e34b5ea52d1b35b80dde09b99349ad1de54598.jpg",
  "https://cdn.21st.dev/assets/mirror/84/847dc523558808119dc4bbb5218ff862ae5f5b455f33e9a0304f2f5a4b2f0f2c.jpg",
  "https://cdn.21st.dev/assets/mirror/2f/2f128763d177d6bdda3de9f0a766693406034977082bdb542138b7b74af9697b.jpg",
  "https://cdn.21st.dev/assets/mirror/30/30f8223f1d1ecc24fc8b7a9995b8ee98449b1e9fc300c14fbccec01b6a83a0ae.jpg",
  "https://cdn.21st.dev/assets/mirror/b4/b4df0e3e425ffce3b4f62fd7bc717e4dc90b94455f4d65d64fc07fe9721b0519.jpg",
  "https://cdn.21st.dev/assets/mirror/90/90c625659f072e4a701c2e37fa4ca46f25c7ca8689d723e7802fe84cf17874e9.jpg",
  "https://cdn.21st.dev/assets/mirror/6a/6aa0befc69cc3db8f3f3558d4b5e1216a5b64ceae1b86f51acf1c3f1432a8cf7.jpg",
  "https://cdn.21st.dev/assets/mirror/dc/dc126cfd753dc217945d0ea2f915e539dfe4ffb5fdea02245d0f576b25a9c4dd.jpg",
  "https://cdn.21st.dev/assets/mirror/ab/ab5f167fcb763aee7c3247fb8af97875998a7f519a6119da7dadd9cf73ae1a2c.jpg",
  "https://cdn.21st.dev/assets/mirror/57/57d6e450f7068e5f3be04907dcc0815343e67df1dc82f2da0ff1c859afc1f700.jpg",
  "https://cdn.21st.dev/assets/mirror/e4/e491359016d1494074e287dfbb55be068cffc0110017ae2257a5d4cdec193a47.jpg",
];

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// Stable per-index pseudo-random in [0, 1).
const rand = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export default function IntroAnimation({
  images = IMAGES,
  title = "Explore Our Vision",
  subtitle = "Discover a world where technology meets creativity.",
  introTitle = "The future is built on AI.",
}: {
  images?: string[];
  title?: string;
  subtitle?: string;
  introTitle?: string;
} = {}) {
  const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const pool = images.length ? images : IMAGES;
  const cards = useMemo(
    () => Array.from({ length: TOTAL_IMAGES }, (_, i) => pool[i % pool.length]),
    [pool],
  );

  /* Container size */
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    setContainerSize({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });

    return () => observer.disconnect();
  }, []);

  /* Scroll driver — tied to the page scroll over this section, so the
     page (and Lenis smooth scrolling) keeps behaving normally. */
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const virtualScroll = useTransform(scrollYProgress, [0, 1], [0, MAX_SCROLL]);

  // Morph: circle -> bottom arc
  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

  // Shuffle the arc on continued scroll
  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

  /* Mouse parallax */
  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const normalizedX = (relativeX / rect.width) * 2 - 1;
      mouseX.set(normalizedX * 100);
    };
    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX]);

  /* Intro sequence */
  useEffect(() => {
    const timer1 = setTimeout(() => setIntroPhase("line"), 500);
    const timer2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  /* Scatter positions */
  // Deterministic pseudo-random so server and client markup match.
  const scatterPositions = useMemo(
    () =>
      cards.map((_, i) => ({
        x: (rand(i, 1) - 0.5) * 1500,
        y: (rand(i, 2) - 0.5) * 1000,
        rotation: (rand(i, 3) - 0.5) * 180,
        scale: 0.6,
        opacity: 0,
      })),
    [cards],
  );

  /* Render loop values */
  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);
  const [parallaxValue, setParallaxValue] = useState(0);

  useEffect(() => {
    const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
    const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
    const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
    return () => {
      unsubscribeMorph();
      unsubscribeRotate();
      unsubscribeParallax();
    };
  }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

  const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
  const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${TRACK_VH}vh` }}>
      <div
        ref={containerRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--bg-elevated)]"
      >
      <div
        className="flex h-full w-full flex-col items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Intro text (fades out) */}
        <div className="pointer-events-none absolute top-1/2 z-0 flex -translate-y-1/2 flex-col items-center justify-center text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={
              introPhase === "circle" && morphValue < 0.5
                ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" }
                : { opacity: 0, filter: "blur(10px)" }
            }
            transition={{ duration: 1 }}
            className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--fg)] md:text-4xl"
          >
            {introTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={
              introPhase === "circle" && morphValue < 0.5
                ? { opacity: 0.5 - morphValue }
                : { opacity: 0 }
            }
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--fg-muted)]"
          >
            Scroll to explore
          </motion.p>
        </div>

        {/* Arc-active content (fades in) */}
        <motion.div
          style={{ opacity: contentOpacity, y: contentY }}
          className="pointer-events-none absolute top-[10%] z-10 flex flex-col items-center justify-center px-4 text-center"
        >
          <h2 className="mb-4 font-display text-3xl font-bold uppercase tracking-tight text-[var(--fg)] md:text-5xl">
            {title}
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-[var(--fg-muted)] md:text-base">
            {subtitle}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="relative flex h-full w-full items-center justify-center">
          {cards.map((src, i) => {
            let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

            if (introPhase === "scatter") {
              target = scatterPositions[i];
            } else if (introPhase === "line") {
              const lineSpacing = 70;
              const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
              const lineX = i * lineSpacing - lineTotalWidth / 2;
              target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
            } else {
              const isMobile = containerSize.width < 768;
              const minDimension = Math.min(containerSize.width, containerSize.height);

              // Circle
              const circleRadius = Math.min(minDimension * 0.35, 350);
              const circleAngle = (i / TOTAL_IMAGES) * 360;
              const circleRad = (circleAngle * Math.PI) / 180;
              const circlePos = {
                x: Math.cos(circleRad) * circleRadius,
                y: Math.sin(circleRad) * circleRadius,
                rotation: circleAngle + 90,
              };

              // Bottom arc ("rainbow" arch, convex up)
              const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
              const arcRadius = baseRadius * (isMobile ? 1.8 : 1.1);
              const arcApexY = containerSize.height * (isMobile ? 0.14 : 0.06);
              const arcCenterY = arcApexY + arcRadius;

              const spreadAngle = isMobile ? 100 : 130;
              const startAngle = -90 - spreadAngle / 2;
              const step = spreadAngle / (TOTAL_IMAGES - 1);

              // Bounded shuffle so the last card stays in view
              const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
              const maxRotation = spreadAngle * 0.3;
              const boundedRotation = -scrollProgress * maxRotation;

              const currentArcAngle = startAngle + i * step + boundedRotation;
              const arcRad = (currentArcAngle * Math.PI) / 180;

              const arcPos = {
                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                rotation: currentArcAngle + 90,
                scale: isMobile ? 1.1 : 1.8,
              };

              target = {
                x: lerp(circlePos.x, arcPos.x, morphValue),
                y: lerp(circlePos.y, arcPos.y, morphValue),
                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                scale: lerp(1, arcPos.scale, morphValue),
                opacity: 1,
              };
            }

            return (
              <FlipCard
                key={i}
                src={src}
                index={i}
                total={TOTAL_IMAGES}
                phase={introPhase}
                target={target}
              />
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
