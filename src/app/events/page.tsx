import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import EventsExplorer from "@/components/events/EventsExplorer";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Events",
  description: "Browse and book tickets for upcoming dance events, battles and showcases.",
};

export const revalidate = 15;

export default async function EventsPage() {
  const [events, banners, settings] = await Promise.all([
    safe(publicApi.upcomingEvents({ limit: 100 }), []),
    safe(publicApi.banners(), []),
    safe(publicApi.settings(), {} as Record<string, any>),
  ]);

  return (
    <>
      <PageHero
        title="Events"
        subtitle={settings?.tagline || "Your Event, Our Platform"}
        image={events[0]?.image_url}
        seed={2}
        compact
        titleClassName="text-[clamp(1.9rem,4.8vw,3.6rem)]"
      />
      <EventsExplorer initial={events} banners={banners} />
    </>
  );
}
