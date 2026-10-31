"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for client diagnostic tracking
    console.error("Application error captured:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center p-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6">
          <AlertCircle className="size-7" aria-hidden />
        </div>

        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-[var(--fg-muted)] mb-6">
          We encountered a temporary issue while loading this page. Please try refreshing or return to the homepage.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-bold text-[var(--on-accent)] transition-transform active:scale-95 cursor-pointer"
            style={{ background: "var(--grad-brand)" }}
          >
            <RotateCcw className="size-4" aria-hidden /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--border-strong)] transition-colors"
          >
            <Home className="size-4" aria-hidden /> Go to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
