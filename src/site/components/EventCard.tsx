import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { EventItem } from "../api";
import { fmtDate, fmtPrice, str } from "@/shared/format";
import hero from "@/assets/hero.jpg";

export function EventCard({ e }: { e: EventItem; i?: number }) {
  const img = str(e.image_url) || hero;
  return (
    <Link to="/events/$id" params={{ id: e._id }} className="premium-card group flex h-full min-w-0 flex-col overflow-hidden border border-border bg-card">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img src={img} alt={str(e.title)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur"><CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-primary"/>{fmtDate(e.date)}</span>
      </div>
      <div className="flex flex-1 flex-col p-5 lg:p-6">
        <h3 className="line-clamp-2 min-h-14 font-display text-xl font-bold leading-7">{str(e.title, "Untitled event")}</h3>
        {e.venue ? <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0"/><span className="truncate">{str(e.venue)}</span></p> : null}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4"><span className="font-bold">{fmtPrice(e.price)}</span><span className="flex items-center gap-2 text-xs font-semibold text-primary">View event<span className="grid h-8 w-8 place-items-center rounded-full bg-accent"><ArrowUpRight className="h-4 w-4"/></span></span></div>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="premium-card overflow-hidden border border-border bg-card"><div className="aspect-[16/10] animate-pulse bg-muted"/><div className="space-y-4 p-6"><div className="h-6 w-3/4 animate-pulse rounded bg-muted"/><div className="h-4 w-1/2 animate-pulse rounded bg-muted"/><div className="h-10 animate-pulse rounded bg-muted"/></div></div>;
}
