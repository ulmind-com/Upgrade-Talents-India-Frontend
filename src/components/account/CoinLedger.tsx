"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Clock3, Coins, Loader2, TriangleAlert } from "lucide-react";
import { rewardsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Txn = {
  transaction_id?: string;
  transaction_type?: string;
  coin_amount?: number;
  direction?: "CREDIT" | "DEBIT";
  status?: string;
  description?: string;
  created_at?: string;
  valuation_snapshot?: { monetary_equivalent?: number; rate_per_coin?: number };
};

type Lot = {
  _id?: string;
  initial_coins?: number;
  remaining_coins?: number;
  credited_at?: string;
  expires_at?: string;
};

const pretty = (t?: string) =>
  (t || "Reward").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

function daysLeft(iso?: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

/**
 * The full coin ledger: every credit and debit from the backend's immutable
 * log, plus the lots that are about to lapse. `fallback` is the older
 * earn-only history, used when the ledger has nothing to show.
 */
export default function CoinLedger({ fallback = [] }: { fallback?: any[] }) {
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([rewardsApi.transactions({ limit: 50 }), rewardsApi.lots()]).then(([t, l]) => {
      if (!alive) return;
      if (t.status === "fulfilled") setTxns(t.value?.transactions || []);
      else setFailed(true);
      if (l.status === "fulfilled") setLots(Array.isArray(l.value) ? l.value : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  /* Lots inside 30 days are the ones worth warning about. */
  const expiring = useMemo(
    () => lots.filter((l) => { const d = daysLeft(l.expires_at); return d !== null && d <= 30; }),
    [lots]
  );
  const expiringCoins = expiring.reduce((n, l) => n + Number(l.remaining_coins || 0), 0);

  const rows: Txn[] = useMemo(() => {
    if (txns && txns.length) return txns;
    return (fallback || []).map((h: any) => ({
      transaction_type: h.reason || h.description || "Reward",
      coin_amount: Number(h.coins || h.amount || 0),
      direction: "CREDIT" as const,
      description: h.reason || h.description,
      created_at: h.created_at || h.date,
    }));
  }, [txns, fallback]);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Coins about to lapse ── */}
      {expiringCoins > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="overflow-hidden rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,var(--surface))]"
        >
          <div className="flex items-start gap-3.5 p-5 sm:p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--warning)_45%,transparent)] text-[var(--warning)]">
              <TriangleAlert className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h4 className="font-display text-base font-bold">
                {expiringCoins} coin{expiringCoins === 1 ? "" : "s"} expiring soon
              </h4>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                Use them on a course or workshop checkout before they lapse.
              </p>
              <ul className="mt-3.5 flex flex-wrap gap-2">
                {expiring.slice(0, 4).map((l, i) => {
                  const d = daysLeft(l.expires_at);
                  return (
                    <li
                      key={l._id || i}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[11.5px] font-semibold"
                    >
                      <Coins className="size-3.5 shrink-0 text-[var(--warning)]" aria-hidden />
                      <span className="tabular-nums">{l.remaining_coins}</span>
                      <Clock3 className="size-3 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
                      <span className="text-[var(--fg-subtle)]">
                        {d !== null && d <= 0 ? "today" : `${d}d left`}
                      </span>
                    </li>
                  );
                })}
                {expiring.length > 4 && (
                  <li className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--fg-subtle)]">
                    +{expiring.length - 4} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Ledger ── */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
          <h4 className="font-display text-sm font-bold uppercase tracking-wider">Coin ledger</h4>
          {!loading && rows.length > 0 && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              {rows.length} entr{rows.length === 1 ? "y" : "ies"}
            </span>
          )}
        </div>

        {loading ? (
          <ul className="divide-y divide-[var(--border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3.5 px-6 py-4">
                <span className="size-9 shrink-0 animate-pulse rounded-full bg-[var(--surface-2)]" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <span className="block h-2.5 w-1/5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                </span>
                <span className="h-4 w-16 animate-pulse rounded-full bg-[var(--surface-2)]" />
              </li>
            ))}
          </ul>
        ) : !rows.length ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
              <Coins className="size-6 text-[var(--fg-subtle)]" aria-hidden />
            </span>
            <p className="mt-4 font-display text-base font-bold">No coin activity yet</p>
            <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-[var(--fg-muted)]">
              {failed
                ? "We couldn't load your ledger just now. Refresh to try again."
                : "Invite a friend or book your first event — earned coins will show up here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((t, i) => {
              const debit = t.direction === "DEBIT";
              const coins = Math.abs(Number(t.coin_amount || 0));
              const inr = t.valuation_snapshot?.monetary_equivalent;
              return (
                <motion.li
                  key={t.transaction_id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-center gap-3.5 px-6 py-4"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border",
                      debit
                        ? "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
                        : "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
                    )}
                  >
                    {debit ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownLeft className="size-4" aria-hidden />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{t.description || pretty(t.transaction_type)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--fg-subtle)]">
                      <span>{when(t.created_at)}</span>
                      {t.status && t.status !== "COMPLETED" && (
                        <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          {pretty(t.status)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={cn("font-mono text-[14px] font-bold tabular-nums", debit ? "text-[var(--danger)]" : "text-[var(--success)]")}>
                      {debit ? "−" : "+"}{coins}
                    </p>
                    {inr != null && (
                      <p className="font-mono text-[10.5px] tabular-nums text-[var(--fg-subtle)]">₹{Number(inr).toFixed(0)}</p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}

        {loading && (
          <p className="sr-only" role="status">
            <Loader2 aria-hidden /> Loading coin ledger
          </p>
        )}
      </div>
    </div>
  );
}
