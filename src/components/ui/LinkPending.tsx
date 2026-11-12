"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Rendered inside a <Link>. The moment the card is clicked it covers the card
 * with a spinner, so a slow page never reads as an ignored click.
 */
export default function LinkPending({ label = "Opening" }: { label?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden
      className="absolute inset-0 z-30 flex items-center justify-center gap-2 rounded-[inherit] bg-black/55 text-[12px] font-bold uppercase tracking-wider text-white backdrop-blur-[2px]"
    >
      <Loader2 className="size-4 animate-spin" />
      {label}…
    </span>
  );
}
