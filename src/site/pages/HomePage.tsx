import { brandName } from "@/shared/brand";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";
import { CardSkeleton, EventCard } from "../components/EventCard";
import { HomeContent } from "../components/HomeContent";
import { publishedContent } from "@/shared/cms";
import type { EventItem } from "../api";

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ["site-events"], queryFn: () => siteApi.events() });
  const homepage = useQuery({ queryKey: ["homepage"], queryFn: siteApi.homepage, retry: false });
  const home = homepage.data;
  const events = publishedContent(home?.upcoming_events ?? data).filter(e => e.title).slice(0, 6) as EventItem[];
  return (
    <SiteLayout>
      <section className="relative mt-20 flex h-[min(560px,65svh)] min-h-96 items-center overflow-hidden text-on-media">
        <img src={hero} alt="Live music audience under stage lights" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fade" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-12 text-center lg:px-8">
          <p className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase sm:text-sm"><Sparkles className="h-4 w-4"/>{home?.brand?.tagline ?? "Events · Culture · Community"}</p>
          <h1 className="home-brand font-display text-[32px] font-extrabold leading-none sm:text-7xl md:text-8xl">{brandName(home?.brand?.name)}<span className="text-primary">.</span></h1>
          {home?.brand?.description && <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-on-media-muted sm:text-base">{home.brand.description}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12"><Link to="/events">Explore events<ArrowRight/></Link></Button>
            <Button asChild variant="outline" size="lg" className="media-control h-12 border-on-media/30 bg-transparent text-on-media hover:bg-on-media/10 hover:text-on-media"><Link to="/competitions">Explore competitions<ArrowUpRight/></Link></Button>
          </div>
        </div>
      </section>
      <section className="site-section mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0"><p className="mb-3 text-xs font-semibold uppercase text-primary">What's happening</p><h2 className="site-section-heading font-display font-bold">Up next<span className="text-primary">.</span></h2></div>
          <Button asChild variant="outline"><Link to="/events">View all<ArrowUpRight/></Link></Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />) : events.map((e) => <EventCard key={e._id} e={e} />)}
          {!isLoading && events.length === 0 && <p className="col-span-full border-y border-border py-10 text-muted-foreground">No events published yet.</p>}
        </div>
      </section>
      <HomeContent home={home}/>
    </SiteLayout>
  );
}
