"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, ChevronLeft, ChevronRight, ChevronDown, CalendarX2 } from "lucide-react";
import { publicApi, type BannerItem, type EventItem } from "@/lib/api";
import { Button } from "@/components/ui/Primitives";
import { cn, formatINR, imageFor, parseDate, isEventExpired, isDeadlinePassed } from "@/lib/utils";

const PAGE_SIZE = 8;

type Filter = "all" | "upcoming" | "live" | "free" | "paid";
type Sort = "newest" | "oldest" | "price-low" | "price-high" | "name";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All Events" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live Now" },
  { key: "free", label: "Free Entry" },
  { key: "paid", label: "Paid" },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "price-low", label: "Price: Low to High" },
  { key: "price-high", label: "Price: High to Low" },
  { key: "name", label: "A — Z" },
];

export default function EventsExplorer({
  initial = [],
  banners = [],
}: {
  initial?: EventItem[];
  banners?: BannerItem[];
}) {
  const [all, setAll] = useState<EventItem[]>(initial);
  const [loading, setLoading] = useState(!initial.length);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicApi
      .upcomingEvents({ limit: 100, search: debounced || undefined })
      .then((d) => { if (!cancelled) setAll(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Could not load events."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => { setPage(1); }, [debounced, filter, sort]);

  const filtered = useMemo(() => {
    let list = [...all];
    if (filter === "live") list = list.filter((e) => e.event_status === "live");
    if (filter === "upcoming") list = list.filter((e) => !isEventExpired(e.date, e.time) && e.event_status !== "completed" && e.event_status !== "cancelled");
    if (filter === "free") list = list.filter((e) => !e.price);
    if (filter === "paid") list = list.filter((e) => (e.price ?? 0) > 0);

    const time = (e: EventItem) => parseDate(e.date)?.getTime() ?? 0;
    if (sort === "newest") list.sort((a, b) => time(b) - time(a));
    if (sort === "oldest") list.sort((a, b) => time(a) - time(b));
    if (sort === "price-low") list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === "price-high") list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [all, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  /* The promo strip sits between two row groups, as in the reference.
     The split adapts so the strip never lands at the very end of the list. */
  const splitAt = pageItems.length >= 4 ? Math.min(4, Math.ceil(pageItems.length / 2)) : pageItems.length;
  const groupA = pageItems.slice(0, splitAt);
  const groupB = pageItems.slice(splitAt);
  const promo = banners[0];

  return (
    <section className="relative bg-[var(--bg)] pb-20">
      {/* ── Toolbar ── */}
      <div className="container-x pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
            <label htmlFor="event-search" className="sr-only">Search events</label>
            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Events"
              className="h-11 w-full rounded-md border border-[var(--border-strong)] bg-transparent pl-10 pr-3 text-[13px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
            />
          </div>

          <SelectBox
            id="event-filter"
            label="Filter events"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={FILTERS}
            className="w-full sm:w-[150px]"
          />

          <SelectBox
            id="event-sort"
            label="Sort events"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={SORTS}
            className="w-full sm:ml-auto sm:w-[180px]"
          />
        </div>
      </div>

      {/* ── States ── */}
      <div className="container-x mt-8">
        {error && (
          <div role="alert" className="border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-8 text-center">
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <Button onClick={() => setDebounced((d) => `${d} `.trim())} variant="outline" className="mt-5">Retry</Button>
          </div>
        )}

        {loading && !error && (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="py-5"><div className="skeleton h-[72px] w-full" /></li>
            ))}
          </ul>
        )}

        {!loading && !error && !filtered.length && (
          <div className="flex flex-col items-center gap-5 border border-dashed border-[var(--border-strong)] px-6 py-24 text-center">
            <CalendarX2 className="size-10 text-[var(--fg-subtle)]" aria-hidden />
            <h2 className="font-display text-2xl font-bold uppercase">No events match</h2>
            <p className="max-w-sm text-sm text-[var(--fg-muted)]">
              Try clearing the search or switching filters — new shows drop every week.
            </p>
            <Button onClick={() => { setSearch(""); setFilter("all"); }} variant="outline">Reset filters</Button>
          </div>
        )}
      </div>

      {/* ── Rows ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="container-x">
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {groupA.map((ev, i) => <EventRow key={ev._id} ev={ev} index={i} />)}
            </ul>
          </div>

          {promo && groupB.length > 0 && (
            <PromoStrip banner={promo} />
          )}

          {groupB.length > 0 && (
            <div className="container-x">
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {groupB.map((ev, i) => <EventRow key={ev._id} ev={ev} index={i + splitAt} />)}
              </ul>
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Event pages" className="container-x mt-12 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="grid size-9 cursor-pointer place-items-center rounded-full text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] disabled:opacity-35"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  aria-current={page === i + 1 ? "page" : undefined}
                  aria-label={`Page ${i + 1}`}
                  className={cn(
                    "grid size-9 cursor-pointer place-items-center rounded-full border text-[13px] font-semibold tabular-nums transition-all duration-300",
                    page === i + 1
                      ? "border-transparent bg-[var(--accent)] text-[var(--on-accent)]"
                      : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                  )}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="grid size-9 cursor-pointer place-items-center rounded-full text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] disabled:opacity-35"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

/* ─────────────── SELECT ─────────────── */

function SelectBox({
  id, label, value, onChange, options, className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-md border border-[var(--border-strong)] bg-transparent pl-3.5 pr-9 text-[13px] text-[var(--fg)] outline-none transition-colors focus:border-[var(--accent)]"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-[var(--surface)] text-[var(--fg)]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-muted)]" aria-hidden />
    </div>
  );
}

/* ─────────────── ROW ─────────────── */

function EventRow({ ev, index }: { ev: EventItem; index: number }) {
  const d = parseDate(ev.date);
  const weekday = d ? d.toLocaleDateString("en-GB", { weekday: "short" }) : "";
  const dayNum = d ? d.getDate() : null;
  const month = d ? d.toLocaleDateString("en-GB", { month: "short" }) : "TBA";
  const year = d ? d.getFullYear() : "";
  const ordinal = dayNum
    ? `${dayNum}${["th", "st", "nd", "rd"][(dayNum % 100 > 10 && dayNum % 100 < 14) || dayNum % 10 > 3 ? 0 : dayNum % 10]}`
    : "--";

  const expired = isEventExpired(ev.date, ev.time);
  const deadlinePassed = isDeadlinePassed(ev.registration_deadline);
  const lowStock = typeof ev.capacity === "number" && ev.capacity > 0 && ev.capacity <= 10;
  const closed = expired || deadlinePassed || ev.registration_enabled === false || ev.event_status === "completed" || ev.event_status === "cancelled";

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6%" }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className="flex flex-col gap-4 py-5 transition-colors duration-300 sm:flex-row sm:items-center sm:gap-6">
        {/* Date */}
        <div className="shrink-0 font-hero leading-[1.25] sm:w-[76px]">
          <span className="block text-[13px] font-semibold text-[var(--fg)]">{weekday},</span>
          <span className="block text-[13px] font-semibold text-[var(--fg)]">{ordinal} {month}</span>
          <span className="block text-[13px] font-semibold text-[var(--fg-muted)]">{year}</span>
        </div>

        {/* Poster */}
        <Link
          href={`/events/${ev._id}`}
          tabIndex={-1}
          aria-hidden
          className="relative hidden size-[72px] shrink-0 overflow-hidden rounded-sm sm:block"
        >
          <img
            src={imageFor(ev.image_url, index)}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover transition-transform duration-700 group-hover:scale-110",
              expired && "filter blur-[1.5px] grayscale-[40%] opacity-60"
            )}
          />
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {(lowStock || ev.event_status === "live" || !ev.price || expired) && (
            <div className="mb-1.5 flex flex-wrap gap-2">
              {expired && (
                <span className="inline-flex items-center rounded-sm bg-red-500/20 border border-red-500/30 px-2 py-[3px] text-[10px] font-semibold tracking-wide text-red-400">
                  Expired
                </span>
              )}
              {lowStock && !expired && (
                <span className="inline-flex items-center rounded-sm bg-[#e8395f] px-2 py-[3px] text-[10px] font-semibold tracking-wide text-white">
                  {ev.capacity} Tickets Remaining
                </span>
              )}
              {ev.event_status === "live" && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--accent)] px-2 py-[3px] text-[10px] font-semibold tracking-wide text-[var(--on-accent)]">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden /> Live Now
                </span>
              )}
              {!ev.price && (
                <span className="inline-flex items-center rounded-sm border border-[var(--border-strong)] px-2 py-[3px] text-[10px] font-semibold tracking-wide text-[var(--fg-muted)]">
                  Free Entry
                </span>
              )}
            </div>
          )}

          <h3>
            <Link
              href={`/events/${ev._id}`}
              className="font-display text-[clamp(1rem,2.2vw,1.35rem)] font-bold uppercase leading-[1.12] tracking-[-0.01em] text-[var(--fg)] transition-colors hover:text-[var(--accent)]"
            >
              {ev.title}
            </Link>
          </h3>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-[var(--fg-muted)]">
            {ev.venue && (
              <>
                <MapPin className="size-3.5 shrink-0 text-[var(--fg)]" aria-hidden />
                <span>{ev.venue}</span>
              </>
            )}
            {ev.venue && ev.time && <span aria-hidden>•</span>}
            {ev.time && <span>{ev.time}</span>}
            {(ev.price ?? 0) > 0 && (
              <>
                <span aria-hidden>•</span>
                <span className="font-semibold text-[var(--fg)]">{formatINR(ev.price)}</span>
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-row gap-2 sm:w-[112px] sm:flex-col">
          <Link
            href={closed ? `/events/${ev._id}` : `/events/${ev._id}/book`}
            aria-disabled={closed || undefined}
            className={cn(
              "inline-flex min-h-[36px] flex-1 items-center justify-center rounded-md px-4 text-[11.5px] font-semibold tracking-wide transition-all duration-300 sm:flex-none",
              closed
                ? "pointer-events-none bg-[var(--surface-2)] text-[var(--fg-subtle)]"
                : "bg-[var(--accent)] text-[var(--on-accent)] hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
            )}
          >
            {expired ? "Expired" : deadlinePassed ? "Closed" : closed ? "Closed" : "Buy Ticket"}
          </Link>
          <Link
            href={`/events/${ev._id}`}
            className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-md border border-[var(--border-strong)] px-4 text-[11.5px] font-semibold tracking-wide text-[var(--fg)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--fg)] sm:flex-none"
          >
            More Info
          </Link>
        </div>
      </div>
    </motion.li>
  );
}

/* ─────────────── PROMO STRIP ─────────────── */

function PromoStrip({ banner }: { banner: BannerItem }) {
  const inner = (
    <div className="relative isolate h-[150px] overflow-hidden md:h-[210px]">
      <img
        src={imageFor(banner.image_url, 4)}
        alt={banner.sponsor_name || banner.title || ""}
        loading="lazy"
        className="size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      {/* Angled slash, as in the reference */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-[34%]"
        style={{ clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0 100%)", background: "linear-gradient(120deg, transparent, rgba(0,0,0,0.55))" }}
      />
      <p className="absolute bottom-6 left-7 right-7 font-hero text-[clamp(1rem,3vw,1.9rem)] font-light text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
        {banner.description || banner.title}
      </p>
    </div>
  );

  return (
    <div className="my-12">
      {banner.target_url ? (
        <a href={banner.target_url} target="_blank" rel="noopener noreferrer" className="group block">
          {inner}
        </a>
      ) : (
        <div className="group">{inner}</div>
      )}
    </div>
  );
}
