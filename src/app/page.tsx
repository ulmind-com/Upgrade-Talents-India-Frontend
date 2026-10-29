import Hero from "@/components/home/Hero";
import BannerSlider from "@/components/home/BannerSlider";
import { ScrollCue, QuadTiles, FeaturedShow, PhotoStrip } from "@/components/home/Theater";
import {
  AppPromo, ContestBand, LearnGrid, LiveNow, Marquee,
  Sponsors, Stats, Testimonials, UpcomingCompetitions, UpcomingEvents,
} from "@/components/home/Sections";
import GalleryReveal from "@/components/home/GalleryReveal";
import ScrollMorphShowcase from "@/components/home/ScrollMorphShowcase";
import StudioShowcase from "@/components/home/StudioShowcase";
import { publicApi, safe, type HomepagePayload } from "@/lib/api";

export const revalidate = 15;

const EMPTY: HomepagePayload = {
  brand: {},
  upcoming_events: [],
  upcoming_competitions: [],
  competitions_section: {
    title: "Upcoming Competitions",
    label: "What's next",
    view_all_url: "/competitions",
  },
  homepage_stats: [
    { label: "Live events", value: 12, suffix: "+", icon: "calendar" },
    { label: "Dancers on stage", value: 25000, suffix: "+", icon: "users" },
    { label: "Masterclasses", value: 40, suffix: "+", icon: "graduation" },
    { label: "Cities covered", value: 28, suffix: "", icon: "trophy" },
  ],
  live_stage_section: {
    title: "Live Stage",
    label: "Streaming right now",
  },
  live_events: [],
  sponsored_banners: [],
  testimonials: [],
  courses: [],
  workshops: [],
  contest_promotions: [],
  app_promotion: null,
  contact: null,
  important_links: [],
  featured_tiles: [],
};

export default async function HomePage() {
  const data = await safe(publicApi.homepage(), EMPTY);

  return (
    <>
      <Hero
        events={data.upcoming_events}
        competitions={data.upcoming_competitions}
        brandTitle={data.brand?.title}
        brandTagline={data.brand?.tagline}
        brandBody={data.brand?.description}
      />

      <ScrollCue />
      <QuadTiles events={data.upcoming_events} tiles={data.featured_tiles} />
      <BannerSlider banners={data.sponsored_banners} />
      <FeaturedShow
        events={data.upcoming_events}
        competitions={data.upcoming_competitions}
        liveEvents={data.live_events}
      />

      <Marquee />
      <GalleryReveal
        events={data.upcoming_events}
        gallerySection={data.gallery_section}
      />
      <UpcomingCompetitions
        competitions={data.upcoming_competitions}
        events={data.upcoming_events}
        sectionConfig={data.competitions_section}
      />
      <StudioShowcase events={data.upcoming_events} />
      <Stats
        eventCount={data.upcoming_events.length}
        courseCount={data.courses.length + data.workshops.length}
        stats={data.homepage_stats}
      />
      <LiveNow items={data.live_events} sectionConfig={data.live_stage_section} />
      <ContestBand items={data.contest_promotions} />
      <LearnGrid title="Masterclasses" label="Courses" items={data.courses} href="/courses" />
      <LearnGrid title="Workshops" label="Workshops" items={data.workshops} href="/workshops" />
      <Testimonials items={data.testimonials} />
      <ScrollMorphShowcase />
      <PhotoStrip events={data.upcoming_events} banners={data.sponsored_banners} />
      <Sponsors items={data.sponsored_banners} />
      <AppPromo promo={data.app_promotion} />
    </>
  );
}
