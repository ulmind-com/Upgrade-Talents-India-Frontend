"use client";

import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Detects touch/narrow viewports after mount so mobile gets pure compositor animations and zero scroll-spring overhead. */
function useMotionProfile(): { lite: boolean; ready: boolean; reduce: boolean } {
  const reduce = Boolean(useReducedMotion());
  const [state, setState] = useState({ lite: false, ready: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px), (hover: none) and (pointer: coarse)");
    const update = () => setState({ lite: mq.matches, ready: true });
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return {
    lite: Boolean(reduce || state.lite),
    ready: Boolean(reduce || state.ready),
    reduce,
  };
}

export function useLiteMotion(): boolean {
  return useMotionProfile().lite;
}

/** Scroll-triggered reveal with directional entry. */
export function Reveal({
  children,
  delay = 0,
  y = 44,
  x = 0,
  blur = true,
  once = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  blur?: boolean;
  once?: boolean;
  className?: string;
}) {
  const { lite, ready, reduce } = useMotionProfile();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: lite ? "0px" : "-12% 0px -12% 0px" });

  if (reduce) return <div className={className}>{children}</div>;

  const useDesktopBlur = ready && !lite && blur;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={lite ? { opacity: 0, y: Math.min(y, 18), x: 0, filter: "none" } : { opacity: 0, y, x }}
      animate={
        inView
          ? { opacity: 1, y: 0, x: 0, filter: useDesktopBlur ? "blur(0px)" : "none" }
          : useDesktopBlur
            ? { filter: "blur(10px)" }
            : { filter: "none" }
      }
      transition={
        lite
          ? { duration: 0.35, delay: Math.min(delay, 0.1), ease: [0.16, 1, 0.3, 1] }
          : { duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}

/** Staggered children reveal (lists / grids). */
export function StaggerGroup({
  children,
  className,
  stagger = 0.07,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const { lite, reduce } = useMotionProfile();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: lite ? "0px" : "-10% 0px" });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: lite ? Math.min(stagger, 0.03) : stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem as any}>
      {children}
    </motion.div>
  );
}

/** Parallax wrapper — element drifts at a different rate than the page (desktop only for 60fps mobile scroll). */
export function Parallax({
  children,
  speed = 0.25,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const lite = useLiteMotion();
  if (lite) return <div className={className}>{children}</div>;
  return <ParallaxDesktop speed={speed} className={className}>{children}</ParallaxDesktop>;
}

function ParallaxDesktop({
  children,
  speed = 0.25,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [speed * 120, speed * -120]);
  const y = useSpring(raw, { stiffness: 120, damping: 26, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/** Word-by-word kinetic headline. */
export function SplitHeading({
  text,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: any;
}) {
  const lite = useLiteMotion();
  if (lite) return <Tag className={className}>{text}</Tag>;
  return <SplitHeadingDesktop text={text} className={className} delay={delay} as={Tag} />;
}

function SplitHeadingDesktop({
  text,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const words = text.split(" ");

  return (
    <Tag className={className}>
      <span ref={ref as any} className="inline">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "110%", rotate: 4, opacity: 0 }}
              animate={inView ? { y: "0%", rotate: 0, opacity: 1 } : {}}
              transition={{ duration: 0.9, delay: delay + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Scroll progress bar for the whole document. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[90] h-[3px] w-full origin-left"
    >
      <div className="h-full w-full" style={{ background: "var(--grad-brand)" }} />
    </motion.div>
  );
}
