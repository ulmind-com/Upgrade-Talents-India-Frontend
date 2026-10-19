"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Loader2 } from "lucide-react";
import { rewardsApi } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Quote = {
  is_eligible?: boolean;
  ineligible_reason?: string;
  available_coins?: number;
  coins_applied?: number;
  coin_value_rate?: number;
  original_price?: number;
  discount_amount?: number;
  final_payable_amount?: number;
};

/**
 * Coin redemption for a paid course or workshop. The backend owns every
 * limit (per-order cap, max discount %, eligibility), so this asks it for a
 * quote rather than computing one, and reports the chosen amount upward —
 * the registration call applies and reserves the coins itself.
 */
export default function CoinRedeem({
  itemId,
  itemType,
  onChange,
  disabled,
}: {
  itemId: string;
  itemType: "course" | "workshop";
  /** Reports both the coin count and the price the backend says you'd pay. */
  onChange: (coins: number, payable: number | null) => void;
  disabled?: boolean;
}) {
  const [max, setMax] = useState(0);
  const [coins, setCoins] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Opening quote with no amount = the most the backend will allow. */
  useEffect(() => {
    let alive = true;
    rewardsApi
      .calculateDiscount({ item_id: itemId, item_type: itemType })
      .then((q: Quote) => {
        if (!alive) return;
        setQuote(q);
        const cap = Number(q?.coins_applied || 0);
        setMax(cap);
        setCoins(cap);
        onChange(q?.is_eligible ? cap : 0, q?.is_eligible ? Number(q?.final_payable_amount ?? 0) : null);
      })
      .catch(() => alive && setQuote({ is_eligible: false }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [itemId, itemType]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-quote while the slider settles, so totals stay authoritative. */
  const pick = (n: number) => {
    setCoins(n);
    onChange(n, null);
    if (timer.current) clearTimeout(timer.current);
    if (!n) { setQuoting(false); onChange(0, Number(quote?.original_price ?? 0) || null); return; }
    setQuoting(true);
    timer.current = setTimeout(async () => {
      try {
        const q = await rewardsApi.calculateDiscount({ item_id: itemId, item_type: itemType, coins_to_use: n });
        setQuote(q);
        const applied = Number(q?.coins_applied || 0);
        if (applied !== n) setCoins(applied);
        onChange(applied, Number(q?.final_payable_amount ?? 0));
      } catch {
        /* keep the last good quote */
      } finally {
        setQuoting(false);
      }
    }, 350);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[12.5px] text-[var(--fg-subtle)]">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking your coins…
      </div>
    );
  }

  /* Nothing to offer — say nothing rather than showing a dead control. */
  if (!quote?.is_eligible || max <= 0) {
    if (quote?.ineligible_reason && Number(quote?.available_coins || 0) > 0) {
      return (
        <p className="mt-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[12px] leading-relaxed text-[var(--fg-subtle)]">
          <Coins className="mt-0.5 size-3.5 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
          {quote.ineligible_reason}
        </p>
      );
    }
    return null;
  }

  const discount = Number(quote.discount_amount || 0);
  const payable = Number(quote.final_payable_amount ?? quote.original_price ?? 0);
  const price = Number(quote.original_price || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--warning)_35%,var(--border))]"
      style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--warning) 9%, var(--surface)), var(--surface))" }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-bold">
          <Coins className="size-4 text-[var(--warning)]" aria-hidden />
          Pay with coins
        </p>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
          {quote.available_coins ?? 0} available
        </span>
      </div>

      <div className="px-4 py-4">
        <label htmlFor="coin-slider" className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold text-[var(--fg-muted)]">Coins to use</span>
          <span className="font-mono text-[18px] font-bold tabular-nums text-[var(--warning)]">{coins}</span>
        </label>

        <input
          id="coin-slider"
          type="range"
          min={0}
          max={max}
          step={1}
          value={coins}
          disabled={disabled}
          onChange={(e) => pick(Number(e.target.value))}
          aria-describedby="coin-summary"
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-2)] accent-[var(--warning)] disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
          <button type="button" onClick={() => pick(0)} disabled={disabled} className="transition-colors hover:text-[var(--fg)]">None</button>
          <button type="button" onClick={() => pick(max)} disabled={disabled} className="transition-colors hover:text-[var(--fg)]">Use max ({max})</button>
        </div>

        <dl id="coin-summary" className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3.5 text-[12.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--fg-subtle)]">Fee</dt>
            <dd className="font-mono tabular-nums">{formatINR(price)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--fg-subtle)]">Coin discount</dt>
            <dd className="font-mono tabular-nums text-[var(--success)]">−{formatINR(discount)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[14px] font-bold">
            <dt>You pay</dt>
            <dd className="flex items-center gap-2 font-mono tabular-nums">
              <AnimatePresence mode="wait">
                <motion.span
                  key={payable}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  {payable <= 0 ? "Free" : formatINR(payable)}
                </motion.span>
              </AnimatePresence>
              {quoting && <Loader2 className="size-3.5 animate-spin text-[var(--fg-subtle)]" aria-hidden />}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
          Coins are reserved when you enrol and only deducted once payment completes.
        </p>
      </div>
    </motion.div>
  );
}
