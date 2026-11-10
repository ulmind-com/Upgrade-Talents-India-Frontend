"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Fingerprint, Loader2, Trash2, ShieldCheck, AlertCircle, CheckCircle2,
} from "lucide-react";
import * as passkey from "@/lib/passkey";
import type { PasskeyCredential } from "@/lib/api";
import { Button } from "@/components/ui/Primitives";
import { formatEventDate } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   PASSKEY MANAGER — Lives in the dashboard profile tab.
   Add this device's fingerprint / Face ID, see the passkeys already on
   the account, remove one. Sign-in itself happens on the login page.
   ═══════════════════════════════════════════════════════════════════ */

export default function PasskeyManager() {
  const [creds, setCreds] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [platformOk, setPlatformOk] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await passkey.listCredentials();
      setCreds(res.credentials || []);
    } catch {
      setCreds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    passkey.isPlatformAvailable().then(setPlatformOk).catch(() => setPlatformOk(false));
  }, [load]);

  const add = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await passkey.register();
      await load();
      setNotice({ kind: "ok", text: "Passkey added. You can now sign in with your fingerprint." });
    } catch (e: any) {
      // A cancelled OS prompt throws too — say something useful rather than raw DOM text.
      const raw = String(e?.message || "");
      setNotice({
        kind: "err",
        text: /NotAllowed|abort|cancel/i.test(raw)
          ? "Fingerprint prompt was cancelled."
          : raw || "Could not add a passkey on this device.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    setNotice(null);
    try {
      await passkey.removeCredential(id);
      await load();
      setNotice({ kind: "ok", text: "Passkey removed." });
    } catch (e: any) {
      setNotice({ kind: "err", text: e?.message || "Could not remove that passkey." });
    } finally {
      setRemovingId(null);
    }
  };

  // Browsers without WebAuthn at all get nothing — there is no action to offer.
  if (typeof window !== "undefined" && !passkey.isSupported()) return null;

  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-400">
            <Fingerprint className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--fg)]">Fingerprint sign-in</h4>
            <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-[var(--fg-muted)]">
              Add a passkey and sign in with your fingerprint or Face ID — no password. A passkey
              your device syncs (same Google / Apple account) works on your other devices too.
            </p>
          </div>
        </div>

        {platformOk !== false && (
          <Button size="sm" onClick={add} loading={busy} className="self-start shrink-0">
            <Fingerprint className="size-3.5" aria-hidden /> Add this device
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {notice && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
              notice.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {notice.kind === "ok" ? (
              <CheckCircle2 className="mt-px size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            )}
            {notice.text}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking your passkeys…
          </div>
        ) : platformOk === false && creds.length === 0 ? (
          <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
            This device has no fingerprint or Face ID sensor, so you cannot add one here. Open this
            page on a phone or laptop that has one.
          </p>
        ) : creds.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--fg-subtle)]">
              <Fingerprint className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--fg)]">No passkey yet</p>
              <p className="text-[11px] text-[var(--fg-muted)]">
                Tap &quot;Add this device&quot;, confirm with your fingerprint, and you are set.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {creds.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--fg)]">{c.label}</p>
                    <p className="text-[10.5px] text-[var(--fg-subtle)]">
                      Added {formatEventDate(c.created_at) || "—"}
                      {c.last_used_at ? ` · Last used ${formatEventDate(c.last_used_at)}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={removingId === c.id}
                  aria-label={`Remove passkey ${c.label}`}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {removingId === c.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
