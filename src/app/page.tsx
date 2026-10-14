import Hero from "@/components/home/Hero";
import { ScrollCue, QuadTiles, FeaturedShow, PhotoStrip } from "@/components/home/Theater";
import {
  AppPromo, ContestBand, LearnGrid, LiveNow, Marquee,
  Sponsors, Stats, Testimonials, UpcomingEvents,
} from "@/components/home/Sections";
import { publicApi, safe, type HomepagePayload } from "@/lib/api";

export const revalidate = 60;

const EMPTY: HomepagePayload = {
  brand: {},
  upcoming_events: [],
  live_events: [],
  sponsored_banners: [],
  testimonials: [],
  courses: [],
  workshops: [],
  contest_promotions: [],
  app_promotion: null,
  contact: null,
  important_links: [],
};

export default async function HomePage() {
  const data = await safe(publicApi.homepage(), EMPTY);

  return (
    <>
      <Hero
        events={data.upcoming_events}
        brandTitle={data.brand?.title}
        brandTagline={data.brand?.tagline}
        brandBody={data.brand?.description}
      />

      <ScrollCue />
      <QuadTiles events={data.upcoming_events} />
      <FeaturedShow events={data.upcoming_events} />

      <Marquee />
      <UpcomingEvents events={data.upcoming_events} />
      <Stats eventCount={data.upcoming_events.length} courseCount={data.courses.length + data.workshops.length} />
      <LiveNow items={data.live_events} />
      <ContestBand items={data.contest_promotions} />
      <LearnGrid title="Masterclasses" label="Courses" items={data.courses} href="/courses" />
      <LearnGrid title="Workshops" label="Workshops" items={data.workshops} href="/workshops" />
      <Testimonials items={data.testimonials} />
      <PhotoStrip events={data.upcoming_events} banners={data.sponsored_banners} />
      <Sponsors items={data.sponsored_banners} />
      <AppPromo promo={data.app_promotion} />
    </>
  );
}
