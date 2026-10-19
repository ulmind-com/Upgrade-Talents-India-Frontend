"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BellOff, X, CheckCheck, Settings2, ArrowLeft, Loader2, Dot,
  Ticket, CreditCard, CalendarClock, Vote, Trophy, Medal, Award,
  Coins, GraduationCap, Package, Megaphone, Undo2,
} from "lucide-react";
import { usePageScrollLock } from "@/components/motion/Providers";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import type { NotificationItem, NotificationPrefs } from "@/lib/api";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Each notification type gets its own glyph and accent so the list can be
   skimmed by shape and colour, not only by reading every title. */
const TYPE_META: Record<string, { Icon: typeof Bell; tone: string }> = {
  REGISTRATION_CONFIRMATION: { Icon: CalendarClock, tone: "var(--accent)" },
  TICKET_CONFIRMATION: { Icon: Ticket, tone: "var(--accent)" },
  PAYMENT_CONFIRMATION: { Icon: CreditCard, tone: "var(--success)" },
  EVENT_REMINDER: { Icon: CalendarClock, tone: "var(--cyan)" },
  VOTING_REMINDER: { Icon: Vote, tone: "var(--cyan)" },
  LEADERBOARD_UPDATE: { Icon: Trophy, tone: "var(--warning)" },
  COMPETITION_RESULT: { Icon: Medal, tone: "var(--warning)" },
  CERTIFICATE_AVAILABLE: { Icon: Award, tone: "var(--lime)" },
  REWARD_COIN_UPDATE: { Icon: Coins, tone: "var(--warning)" },
  COURSE_WORKSHOP_UPDATE: { Icon: GraduationCap, tone: "var(--cyan)" },
  ORDER_UPDATE: { Icon: Package, tone: "var(--accent)" },
  IMPORTANT_ANNOUNCEMENT: { Icon: Megaphone, tone: "var(--danger)" },
};
const metaFor = (t?: string) => TYPE_META[t || ""] || { Icon: Bell, tone: "var(--fg-muted)" };

const prettyType = (t?: string) =>
  (t || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function relative(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function bucketOf(iso?: string) {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((+new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
    +new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return "Earlier";
}

/* ─────────────── Bell ─────────────── */

export function NotificationBell() {
  const { unread, setOpen, open } = useNotifications();
  const shown = unread > 99 ? "99+" : String(unread);

  return (
    <button
      onClick={() => setOpen(!open)}
      aria-label="Notifications"
      aria-expanded={open}
      className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
    >
      <motion.span
        key={unread}
        initial={unread ? { rotate: 0 } : false}
        animate={unread ? { rotate: [0, -14, 11, -7, 0] } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="grid place-items-center"
      >
        <Bell className="size-[18px]" aria-hidden />
      </motion.span>

      {unread > 0 && (
        <span
          className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-[var(--on-accent)]"
          style={{ background: "var(--grad-brand)" }}
        >
          <span aria-hidden>{shown}</span>
          {/* One atomic, contextual announcement — not a bare number. */}
          <span role="status" aria-atomic="true" className="sr-only">
            {unread} unread notification{unread === 1 ? "" : "s"}
          </span>
        </span>
      )}
      {unread > 0 && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{ opacity: [0.45, 0, 0.45], scale: [1, 1.45, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent)" }}
        />
      )}
    </button>
  );
}

/* ─────────────── Row ─────────────── */

function Row({ n, onClose }: { n: NotificationItem; onClose: () => void }) {
  const { markRead, markUnread } = useNotifications();
  const { Icon, tone } = metaFor(n.notification_type);
  const urgent = n.priority === "URGENT" || n.priority === "HIGH";

  const body = (
    <>
      <span
        className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-[14px] border"
        style={{
          borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`,
          background: `color-mix(in srgb, ${tone} 12%, transparent)`,
          color: tone,
        }}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("line-clamp-2 text-[13.5px] leading-snug", n.is_read ? "font-medium text-[var(--fg-muted)]" : "font-bold text-[var(--fg)]")}>
            {n.title}
          </span>
          {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: "var(--grad-brand)" }} aria-hidden />}
        </span>

        <span className="mt-1 line-clamp-2 block text-[12.5px] leading-relaxed text-[var(--fg-subtle)]">{n.message}</span>

        <span className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
          <span style={{ color: tone }}>{prettyType(n.notification_type)}</span>
          <Dot className="size-3" aria-hidden />
          <span className="normal-case tracking-normal">{relative(n.created_at)}</span>
          {urgent && (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] px-1.5 py-0.5 text-[9.5px] text-[var(--danger)]">
              {n.priority === "URGENT" ? "Urgent" : "Important"}
            </span>
          )}
        </span>
      </span>
    </>
  );

  const shell = cn(
    "group relative flex w-full gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-all duration-300",
    n.is_read
      ? "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]"
      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="relative"
    >
      {!n.is_read && (
        <span aria-hidden className="absolute -left-1 top-5 h-8 w-[3px] rounded-full" style={{ background: "var(--grad-brand)" }} />
      )}

      {n.action_url ? (
        <Link href={n.action_url} onClick={() => { if (!n.is_read) markRead(n.id); onClose(); }} className={shell}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={() => (n.is_read ? markUnread(n.id) : markRead(n.id))} className={cn(shell, "cursor-pointer")}>
          {body}
        </button>
      )}

      {n.action_url && (
        <button
          type="button"
          onClick={() => (n.is_read ? markUnread(n.id) : markRead(n.id))}
          aria-label={n.is_read ? `Mark "${n.title}" as unread` : `Mark "${n.title}" as read`}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-[var(--fg-subtle)] opacity-0 transition-all hover:bg-[var(--surface-2)] hover:text-[var(--fg)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          {n.is_read ? <Undo2 className="size-3.5" aria-hidden /> : <CheckCheck className="size-3.5" aria-hidden />}
        </button>
      )}
    </motion.li>
  );
}

/* ─────────────── Preferences ─────────────── */

const PREF_GROUPS: { label: string; items: { key: keyof NotificationPrefs; label: string; hint: string }[] }[] = [
  {
    label: "Channels",
    items: [
      { key: "in_app_enabled", label: "In-app", hint: "Show notifications inside this panel" },
      { key: "email_enabled", label: "Email", hint: "Send a copy to your inbox" },
      { key: "push_enabled", label: "Push", hint: "Alerts on your mobile device" },
      { key: "sound_enabled", label: "Sound", hint: "Play a chime on arrival" },
    ],
  },
  {
    label: "Topics",
    items: [
      { key: "event_reminders", label: "Event reminders", hint: "Before an event you booked starts" },
      { key: "voting_reminders", label: "Voting reminders", hint: "When a round opens for voting" },
      { key: "leaderboard_updates", label: "Leaderboard updates", hint: "When your standing changes" },
      { key: "competition_results", label: "Competition results", hint: "When results are published" },
    ],
  },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-300",
        on ? "border-transparent" : "border-[var(--border-strong)] bg-[var(--surface-2)]"
      )}
      style={on ? { background: "var(--grad-brand)" } : undefined}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className={cn("absolute top-[3px] size-[18px] rounded-full bg-white shadow-sm", on ? "left-[23px]" : "left-[3px]")}
      />
    </button>
  );
}

function Preferences() {
  const { prefs, loadPrefs, savePrefs } = useNotifications();

  useEffect(() => { if (!prefs) loadPrefs(); }, [prefs, loadPrefs]);

  if (!prefs) {
    return (
      <div className="grid flex-1 place-items-center">
        <Loader2 className="size-5 animate-spin text-[var(--fg-subtle)]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {PREF_GROUPS.map((g, gi) => (
        <section key={g.label} className={gi ? "mt-7" : ""}>
          <h3 className="px-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--fg-subtle)]">{g.label}</h3>
          <ul className="mt-2.5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
            {g.items.map((it, i) => (
              <li
                key={it.key}
                className={cn("flex items-center justify-between gap-4 px-4 py-3.5", i && "border-t border-[var(--border)]")}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{it.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--fg-subtle)]">{it.hint}</span>
                </span>
                <Toggle
                  label={it.label}
                  on={prefs[it.key] !== false}
                  onChange={(v) => savePrefs({ [it.key]: v } as NotificationPrefs)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-6 px-1 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
        Changes save as you switch them. Critical account and payment messages are always delivered.
      </p>
    </div>
  );
}

/* ─────────────── Panel ─────────────── */

export function NotificationPanel() {
  const { items, unread, loading, hasNext, open, live, setOpen, load, loadMore, markAllRead } = useNotifications();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [view, setView] = useState<"list" | "prefs">("list");

  usePageScrollLock(open, () => setOpen(false));

  useEffect(() => { if (open) { setView("list"); load({ unreadOnly: tab === "unread", page: 1 }); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const out: { bucket: string; rows: NotificationItem[] }[] = [];
    for (const n of items) {
      const b = bucketOf(n.created_at);
      const last = out[out.length - 1];
      if (last && last.bucket === b) last.rows.push(n);
      else out.push({ bucket: b, rows: [n] });
    }
    return out;
  }, [items]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[130]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={close} aria-hidden />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)]"
            role="dialog"
            aria-label="Notifications"
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: "var(--grad-surface)" }} />

            {/* ── Header ── */}
            <div className="relative flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <p className="flex min-w-0 items-center gap-2.5 font-display text-lg font-bold">
                {view === "prefs" && (
                  <button onClick={() => setView("list")} aria-label="Back to notifications" className="grid size-7 place-items-center rounded-full hover:bg-[var(--surface-2)]">
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                )}
                <Bell className="size-5 shrink-0 text-[var(--accent)]" aria-hidden />
                <span className="truncate">{view === "prefs" ? "Preferences" : "Notifications"}</span>
                {view === "list" && live && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--success)_40%,transparent)] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--success)]">
                    <motion.span
                      aria-hidden
                      className="size-1.5 rounded-full bg-[var(--success)]"
                      animate={{ opacity: [1, 0.25, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    Live
                  </span>
                )}
              </p>

              <div className="flex shrink-0 items-center gap-1">
                {view === "list" && (
                  <button
                    onClick={() => setView("prefs")}
                    aria-label="Notification preferences"
                    className="grid size-8 place-items-center rounded-full text-[var(--fg-subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                  >
                    <Settings2 className="size-4.5" aria-hidden />
                  </button>
                )}
                <button onClick={close} aria-label="Close notifications" className="grid size-8 place-items-center rounded-full hover:bg-[var(--surface-2)]">
                  <X className="size-4.5" aria-hidden />
                </button>
              </div>
            </div>

            {view === "prefs" ? (
              <Preferences />
            ) : (
              <>
                {/* ── Filters ── */}
                <div className="relative flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {(["all", "unread"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); load({ unreadOnly: t === "unread", page: 1 }); }}
                        className={cn(
                          "relative rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors",
                          tab === t ? "text-[var(--on-accent)]" : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                        )}
                      >
                        {tab === t && (
                          <motion.span layoutId="notifTab" className="absolute inset-0 rounded-full" style={{ background: "var(--grad-brand)" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                        )}
                        <span className="relative">{t === "all" ? "All" : `Unread${unread ? ` ${unread}` : ""}`}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={markAllRead}
                    disabled={!unread}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] disabled:pointer-events-none disabled:opacity-35"
                  >
                    <CheckCheck className="size-3.5" aria-hidden /> Mark all read
                  </button>
                </div>

                {/* ── List ── */}
                <div className="relative flex-1 overflow-y-auto px-4 py-4">
                  {loading && !items.length ? (
                    <ul className="flex flex-col gap-2.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <li key={i} className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3.5">
                          <span className="size-10 shrink-0 animate-pulse rounded-[14px] bg-[var(--surface-2)]" />
                          <span className="flex-1 space-y-2 py-0.5">
                            <span className="block h-3 w-2/3 animate-pulse rounded-full bg-[var(--surface-2)]" />
                            <span className="block h-2.5 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
                            <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-[var(--surface-2)]" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : !items.length ? (
                    <div className="grid h-full place-items-center px-6 text-center">
                      <div>
                        <span className="mx-auto grid size-16 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                          <BellOff className="size-7 text-[var(--fg-subtle)]" aria-hidden />
                        </span>
                        <p className="mt-4 font-display text-lg font-bold">
                          {tab === "unread" ? "You're all caught up" : "Nothing here yet"}
                        </p>
                        <p className="mx-auto mt-1.5 max-w-[26ch] text-[13px] leading-relaxed text-[var(--fg-muted)]">
                          {tab === "unread"
                            ? "Every notification has been read. Nice."
                            : "Book an event or enter a competition — updates will land right here."}
                        </p>
                        {tab === "unread" && (
                          <button onClick={() => { setTab("all"); load({ unreadOnly: false, page: 1 }); }} className="mt-5 text-[13px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                            View all notifications
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {groups.map((g) => (
                        <section key={g.bucket} className="mb-5 last:mb-0">
                          <h3 className="sticky top-0 z-10 -mx-4 bg-[var(--bg-elevated)]/92 px-5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--fg-subtle)] backdrop-blur-sm">
                            {g.bucket}
                          </h3>
                          <ul className="mt-2 flex flex-col gap-2">
                            <AnimatePresence initial={false}>
                              {g.rows.map((n) => <Row key={n.id} n={n} onClose={close} />)}
                            </AnimatePresence>
                          </ul>
                        </section>
                      ))}

                      {hasNext && (
                        <button
                          onClick={loadMore}
                          disabled={loading}
                          className="mt-2 w-full rounded-full border border-[var(--border)] py-2.5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="mx-auto size-4 animate-spin" aria-hidden /> : "Load older"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
