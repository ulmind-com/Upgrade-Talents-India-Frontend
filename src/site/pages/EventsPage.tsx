import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";
import { CardSkeleton, EventCard } from "../components/EventCard";

export function EventsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["site-events"], queryFn: () => siteApi.events() });
  const events = (data ?? []).filter(
    (e) => e.title && e.is_published !== false && String(e.title).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 lg:px-8">
        <p className="mb-4 text-xs font-semibold uppercase text-primary">Discover</p><h1 className="page-heading font-display font-extrabold">All <span className="text-ember">events</span></h1>
        <div className="mt-8 flex max-w-md items-center gap-3 rounded-lg border border-border bg-card shadow-glow px-5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" placeholder="Search events" className="w-full bg-transparent outline-none" />
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : events.map((e, i) => <EventCard key={e._id} e={e} i={i} />)}
        </div>
        {!isLoading && events.length === 0 && <p className="mt-8 text-muted-foreground">No events match.</p>}
      </section>
    </SiteLayout>
  );
}
