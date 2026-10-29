"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Search, MapPin, ChevronLeft, ChevronRight, ChevronDown,
  CalendarX2, Calendar, Clock, Ticket
} from "lucide-react";
import { publicApi, type BannerItem, type EventItem } from "@/lib/api";
import { Button, SectionLabel } from "@/components/ui/Primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import {
  cn, formatINR, imageFor, parseDate, formatEventDate, truncate,
  isEventExpired, isDeadlinePassed
} from "@/lib/utils";

const PAGE_SIZE = 9;

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

  /* Split for sponsor banner after the first 6 cards */
  const splitAt = pageItems.length >= 6 ? 6 : pageItems.length;
  const groupA = pageItems.slice(0, splitAt);
  const groupB = pageItems.slice(splitAt);
  const promo = banners[0];

  return (
    <section className="container-x relative pb-24 pt-3 sm:pt-4 md:pt-6">
      {/* ── Toolbar ── */}
      <Reveal>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel>Live &amp; upcoming</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">Upcoming Events</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
              <label htmlFor="event-search" className="sr-only">Search events</label>
              <input
                id="event-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events"
                className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-[13px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
              />
            </div>

            <SelectBox
              id="event-filter"
              label="Filter events"
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              options={FILTERS}
              className="w-full sm:w-[135px]"
            />

            <SelectBox
              id="event-sort"
              label="Sort events"
              value={sort}
              onChange={(v) => setSort(v as Sort)}
              options={SORTS}
              className="w-full sm:w-[170px]"
            />
          </div>
        </div>
      </Reveal>

      {/* ── States ── */}
      {error && (
        <div role="alert" className="mt-8 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-8 text-center">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <Button onClick={() => setDebounced((d) => `${d} `.trim())} variant="outline" className="mt-5">Retry</Button>
        </div>
      )}

      {loading && !error && (
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="skeleton aspect-[16/10] w-full" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton h-6 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-8 w-full pt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && !filtered.length && (
        <div className="mt-9 flex flex-col items-center gap-5 rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-24 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]">
            <CalendarX2 className="size-7 text-[var(--fg-subtle)]" aria-hidden />
          </span>
          <h2 className="font-display text-2xl font-bold uppercase">No events match</h2>
          <p className="max-w-sm text-sm text-[var(--fg-muted)]">
            Try clearing the search or switching filters — new shows drop every week.
          </p>
          <Button onClick={() => { setSearch(""); setFilter("all"); }} variant="outline">Reset filters</Button>
        </div>
      )}

      {/* ── Cards Grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <StaggerGroup className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groupA.map((ev, i) => (
              <StaggerItem key={ev._id || i}>
                <EventCard ev={ev} index={i} />
              </StaggerItem>
            ))}
          </StaggerGroup>

          {promo && groupB.length > 0 && (
            <Reveal>
              <PromoStrip banner={promo} />
            </Reveal>
          )}

          {groupB.length > 0 && (
            <StaggerGroup className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", promo ? "mt-9" : "mt-6")}>
              {groupB.map((ev, i) => (
                <StaggerItem key={ev._id || i + splitAt}>
                  <EventCard ev={ev} index={i + splitAt} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}

          {totalPages > 1 && (
            <nav aria-label="Event pages" className="mt-12 flex items-center justify-center gap-2.5">
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
        className="h-10 w-full cursor-pointer appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] pl-3.5 pr-8 text-[12.5px] font-medium text-[var(--fg)] outline-none transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent)]"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-[var(--surface)] text-[var(--fg)]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-muted)]" aria-hidden />
    </div>
  );
}

/* ─────────────── EVENT CARD ─────────────── */

function EventCard({ ev, index }: { ev: EventItem; index: number }) {
  const expired = isEventExpired(ev.date, ev.time);
  const deadlinePassed = isDeadlinePassed(ev.registration_deadline);
  const isLive = ev.event_status === "live";
  const lowStock = typeof ev.capacity === "number" && ev.capacity > 0 && ev.capacity <= 10;
  const closed =
    expired ||
    deadlinePassed ||
    ev.registration_enabled === false ||
    ev.event_status === "completed" ||
    ev.event_status === "cancelled";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[0_20px_45px_-18px_rgba(0,0,0,0.5)]">
      {/* Media / Poster */}
      <Link href={`/events/${ev._id}`} className="relative aspect-[16/10] overflow-hidden block">
        <img
          src={imageFor(ev.image_url, index)}
          alt={ev.title}
          loading="lazy"
          className={cn(
            "size-full object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-105",
            expired && "filter blur-[1px] grayscale-[40%] opacity-60"
          )}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden />

        {/* Top-left Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/95 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md animate-pulse">
              <span className="size-2 rounded-full bg-white animate-ping" />
              Live Now
            </span>
          ) : expired ? (
            <span className="rounded-full bg-red-500/85 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              Ended
            </span>
          ) : closed ? (
            <span className="rounded-full bg-black/60 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
              Closed
            </span>
          ) : lowStock ? (
            <span className="rounded-full bg-amber-500/95 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-black shadow-md backdrop-blur-md">
              {ev.capacity} Left
            </span>
          ) : (
            <span
              className="rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider backdrop-blur-md"
              style={{ background: "color-mix(in srgb, var(--success) 22%, transparent)", color: "var(--success)" }}
            >
              Booking Open
            </span>
          )}
        </div>
      </Link>

      {/* Info Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Date & Time */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[var(--accent)]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" aria-hidden />
            {formatEventDate(ev.date)}
          </span>
          {ev.time && (
            <>
              <span className="text-[var(--border-strong)]" aria-hidden>•</span>
              <span className="inline-flex items-center gap-1 font-normal text-[var(--fg-muted)]">
                <Clock className="size-3" aria-hidden />
                {ev.time}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2.5">
          <Link
            href={`/events/${ev._id}`}
            className="font-display text-[1.22rem] font-bold leading-tight text-[var(--fg)] transition-colors hover:text-[var(--accent)] line-clamp-2"
          >
            {ev.title}
          </Link>
        </h3>

        {/* Venue */}
        {ev.venue && (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[var(--fg-muted)]">
            <MapPin className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
            <span className="truncate">{ev.venue}</span>
          </p>
        )}

        {/* Description */}
        {ev.description && (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)] line-clamp-2">
            {truncate(ev.description, 96)}
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--fg-muted)]">
            {closed ? (
              <span className="text-[var(--danger)]">{expired ? "Event ended" : "Registration closed"}</span>
            ) : isLive ? (
              <span className="flex items-center gap-1.5 font-semibold text-rose-400">
                <span className="size-1.5 rounded-full bg-rose-500 animate-ping" /> Live now
              </span>
            ) : lowStock ? (
              <span className="font-semibold text-amber-400">{ev.capacity} passes left</span>
            ) : (
              <span>Passes available</span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <Link
              href={`/events/${ev._id}`}
              className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-[11.5px] font-semibold text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
            >
              Details
            </Link>
            {closed ? (
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3.5 py-1 text-[11.5px] font-semibold text-[var(--fg-subtle)]">
                {expired ? "Ended" : "Closed"}
              </span>
            ) : (
              <Link
                href={`/events/${ev._id}/book`}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3.5 py-1 text-[11.5px] font-semibold text-[var(--on-accent)] shadow-sm transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--accent-hover)]"
              >
                <Ticket className="size-3.5" aria-hidden />
                Buy Ticket
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── PROMO STRIP ─────────────── */

function PromoStrip({ banner }: { banner: BannerItem }) {
  const inner = (
    <div className="relative isolate h-[150px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] md:h-[210px]">
      <img
        src={imageFor(banner.image_url, 4)}
        alt={banner.sponsor_name || banner.title || ""}
        loading="lazy"
        className="size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
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
    <div className="my-9">
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
