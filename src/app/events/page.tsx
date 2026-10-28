import type { Metadata } from "next";
import EventsHero from "@/components/events/EventsHero";
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
      <EventsHero
        title="Events"
        subtitle={settings?.tagline || "Dance Floors for A Dance Nation"}
        image={events[0]?.image_url}
        seed={2}
      />
      <EventsExplorer initial={events} banners={banners} />
    </>
  );
}
