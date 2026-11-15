"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete & hide progress bar when navigation finishes
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const doneTimer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(doneTimer);
    }
  }, [pathname, searchParams]);

  // Global listener: instantly show progress on any internal link click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const anchor = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore non-navigation links
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if internal link
      const isInternal =
        href.startsWith("/") ||
        href.startsWith(window.location.origin);

      if (isInternal) {
        const url = new URL(anchor.href, window.location.href);
        // If clicking the current exact URL, ignore
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }

        // Instantly trigger progress bar (< 10ms feedback)
        setLoading(true);
        setProgress(25);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setProgress(75);
        }, 150);
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[99999] h-[3px] pointer-events-none overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "350ms",
        }}
      />
    </div>
  );
}
