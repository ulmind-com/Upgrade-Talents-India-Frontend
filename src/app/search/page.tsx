"use client";

import { useEffect, useState, useMemo, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, X, Calendar, MapPin, Trophy, ShoppingBag, Sparkles, ArrowRight, Ticket } from "lucide-react";
import { publicApi, shopApi, type EventItem } from "@/lib/api";
import { formatINR, formatEventDate, imageFor } from "@/lib/utils";

const TRENDING = [
  "Hip Hop",
  "Choreography",
  "Contemporary",
  "Battle",
  "Workshops",
  "Solo",
  "Duet",
  "Merch",
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "events" | "competitions" | "shop">("all");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      const p = new URLSearchParams(window.location.search);
      if (query.trim()) {
        p.set("q", query.trim());
      } else {
        p.delete("q");
      }
      const newUrl = p.toString() ? `/search?${p.toString()}` : "/search";
      window.history.replaceState(null, "", newUrl);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [evs, comps, prods] = await Promise.all([
          publicApi.upcomingEvents({ search: debounced || undefined, limit: 20 }).catch(() => []),
          publicApi.competitions({ search: debounced || undefined, limit: 20 }).catch(() => []),
          shopApi.products({ limit: 30 }).catch(() => []),
        ]);
        if (!cancelled) {
          setEvents(evs || []);
          setCompetitions(comps || []);
          if (debounced) {
            const q = debounced.toLowerCase();
            setProducts(
              (prods || []).filter(
                (p: any) =>
                  p?.name?.toLowerCase().includes(q) ||
                  p?.description?.toLowerCase().includes(q) ||
                  p?.category?.toLowerCase().includes(q)
              )
            );
          } else {
            setProducts(prods || []);
          }
        }
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const totalHits = events.length + competitions.length + products.length;

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 pb-36 pt-24 sm:px-6 sm:pt-28 md:pt-32 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] backdrop-blur-md">
            <Sparkles className="size-3.5" /> Universal Search
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-[var(--fg)]">
            Find Your Next Stage
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)] sm:text-base">
            Search events, competitions, battles, workshops and official merchandise.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mx-auto mb-8 max-w-2xl">
          <div className="relative flex items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xl transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <SearchIcon className="ml-4 size-5 shrink-0 text-[var(--fg-subtle)]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, battles, styles, merchandise…"
              className="w-full bg-transparent px-3.5 py-4 text-base text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-3 grid size-8 place-items-center rounded-full text-[var(--fg-subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Quick tags */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-[var(--fg-subtle)]">Trending:</span>
            {TRENDING.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)]/50 px-2.5 py-1 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8 flex items-center justify-center gap-2 border-b border-[var(--border)] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            All Results ({totalHits})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "events"
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("competitions")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "competitions"
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            Competitions ({competitions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shop")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "shop"
                ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            Shop ({products.length})
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--fg-muted)]">
            Searching stages and merchandise…
          </div>
        ) : totalHits === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/50 p-12 text-center">
            <SearchIcon className="mx-auto mb-3 size-10 text-[var(--fg-subtle)]" />
            <h3 className="text-lg font-bold text-[var(--fg)]">No results found</h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              We couldn&apos;t find anything matching &ldquo;{debounced}&rdquo;. Try another keyword.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Events section */}
            {(activeTab === "all" || activeTab === "events") && events.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--fg)] sm:text-2xl">
                    <Ticket className="size-5 text-[var(--accent)]" /> Events & Shows
                  </h2>
                  <Link href="/events" className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
                    View all <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((ev) => (
                    <Link
                      key={ev._id}
                      href={`/events/${ev._id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-xl"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                        <img
                          src={imageFor(ev.image_url, ev.title)}
                          alt={ev.title}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md">
                          {formatINR(ev.price)}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="line-clamp-1 font-display text-base font-bold text-[var(--fg)] group-hover:text-[var(--accent)]">
                          {ev.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--fg-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-[var(--accent)]" /> {formatEventDate(ev.date)}
                          </span>
                          {ev.venue && (
                            <span className="flex items-center gap-1 line-clamp-1">
                              <MapPin className="size-3.5 text-[var(--accent)]" /> {ev.venue}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Competitions section */}
            {(activeTab === "all" || activeTab === "competitions") && competitions.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--fg)] sm:text-2xl">
                    <Trophy className="size-5 text-[var(--accent)]" /> Competitions
                  </h2>
                  <Link href="/competitions" className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
                    View all <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {competitions.map((comp) => (
                    <Link
                      key={comp._id || comp.id}
                      href={`/competitions/${comp._id || comp.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-xl"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                        <img
                          src={imageFor(comp.image_url || comp.poster_url, comp.title || comp.name)}
                          alt={comp.title || comp.name}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute right-3 top-3 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
                          Competition
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="line-clamp-1 font-display text-base font-bold text-[var(--fg)] group-hover:text-[var(--accent)]">
                          {comp.title || comp.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--fg-muted)]">
                          {comp.short_description || comp.description || "Join the national dance battle."}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Shop section */}
            {(activeTab === "all" || activeTab === "shop") && products.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--fg)] sm:text-2xl">
                    <ShoppingBag className="size-5 text-[var(--accent)]" /> Official Merchandise
                  </h2>
                  <Link href="/shop" className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
                    View all <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {products.map((prod) => (
                    <Link
                      key={prod._id || prod.id}
                      href={`/shop/${prod._id || prod.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:-translate-y-1 hover:border-[var(--border-strong)]"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                        <img
                          src={prod.images?.[0] || prod.image || "/placeholder.png"}
                          alt={prod.name}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          {prod.category || "Merch"}
                        </span>
                        <h3 className="line-clamp-1 font-display text-sm font-bold text-[var(--fg)]">
                          {prod.name}
                        </h3>
                        <span className="mt-1 font-mono text-xs font-bold text-[var(--fg)]">
                          {formatINR(prod.price)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] pt-32 text-center text-sm text-[var(--fg-muted)]">Loading search…</div>}>
      <SearchContent />
    </Suspense>
  );
}
