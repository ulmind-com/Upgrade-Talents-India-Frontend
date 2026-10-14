"use client";

import { useEffect, useState } from "react";
import { countdownParts, formatEventDate } from "@/lib/utils";

/** Live countdown. The exact deadline is always exposed as text (never motion-only). */
export default function Countdown({ target }: { target?: string | null }) {
  const [parts, setParts] = useState(() => countdownParts(target));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || !parts) return null;

  const units = [
    { label: "Days", value: parts.days },
    { label: "Hrs", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ];

  return (
    <div className="mt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--fg-subtle)]">
        {parts.done ? "Registration closed" : `Closes ${formatEventDate(target)}`}
      </p>
      {!parts.done && (
        <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Time remaining">
          {units.map((u) => (
            <li key={u.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-3 text-center">
              <span className="block font-display text-xl font-bold tabular-nums leading-none">
                {String(u.value).padStart(2, "0")}
              </span>
              <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">{u.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
