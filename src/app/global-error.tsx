"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root layout error captured:", error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-[#05060d] text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md text-center p-8 rounded-3xl border border-white/10 bg-[#0d1021] shadow-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6">
            <AlertCircle className="size-7" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-white/70 mb-6">
            An unexpected error occurred while loading Upgrade Talents India.
          </p>

          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-bold text-black transition-transform active:scale-95 cursor-pointer bg-[#BFFF2E]"
          >
            <RotateCcw className="size-4" aria-hidden /> Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
