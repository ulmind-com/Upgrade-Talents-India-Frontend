import Hero from "@/components/home/Hero";
import BannerSlider from "@/components/home/BannerSlider";
import GrandSponsorPopup from "@/components/home/GrandSponsorPopup";
import { ScrollCue, QuadTiles, FeaturedShow, PhotoStrip } from "@/components/home/Theater";
import {
  AppPromo, ContestBand, LearnGrid, LiveNow, Marquee,
  Sponsors, Stats, Testimonials, UpcomingCompetitions, UpcomingEvents,
} from "@/components/home/Sections";
import GalleryReveal from "@/components/home/GalleryReveal";
import ScrollMorphShowcase from "@/components/home/ScrollMorphShowcase";
import StudioShowcase from "@/components/home/StudioShowcase";
import CustomSectionRenderer from "@/components/home/CustomSectionRenderer";
import { publicApi, safe, type HomepagePayload, type HomepageSectionItem } from "@/lib/api";

export const revalidate = 15;

const DEFAULT_FALLBACK_SECTIONS: HomepageSectionItem[] = [
  { id: "sponsor_popup", name: "Grand Platinum Sponsor Pop-up", section_type: "builtin", is_enabled: true, display_order: 1 },
  { id: "hero_banner", name: "Hero Sponsor Banner Slider", section_type: "builtin", is_enabled: true, display_order: 2 },
  { id: "hero", name: "Interactive Hero Showcase", section_type: "builtin", is_enabled: true, display_order: 3 },
  { id: "scroll_cue", name: "Scroll Indicator Cue", section_type: "builtin", is_enabled: true, display_order: 4 },
  { id: "quad_tiles", name: "Featured 4 Action Tiles", section_type: "builtin", is_enabled: true, display_order: 5 },
  { id: "featured_show", name: "Featured Show Stage", section_type: "builtin", is_enabled: true, display_order: 6 },
  { id: "marquee", name: "Marquee Running Ticker", section_type: "builtin", is_enabled: true, display_order: 7 },
  { id: "gallery", name: "Gallery Reveal Section", section_type: "builtin", is_enabled: true, display_order: 8 },
  { id: "upcoming_competitions", name: "Upcoming Competitions", section_type: "builtin", is_enabled: true, display_order: 9 },
  { id: "studio_showcase", name: "3D Studio Cylinder Showcase", section_type: "builtin", is_enabled: true, display_order: 10 },
  { id: "stats", name: "Live Statistics Counter", section_type: "builtin", is_enabled: true, display_order: 11 },
  { id: "live_now", name: "Live Stage Streaming", section_type: "builtin", is_enabled: true, display_order: 12 },
  { id: "contest_band", name: "Contest Promotion Banner", section_type: "builtin", is_enabled: true, display_order: 13 },
  { id: "courses", name: "Masterclasses & Courses", section_type: "builtin", is_enabled: true, display_order: 14 },
  { id: "workshops", name: "Intensive Dance Workshops", section_type: "builtin", is_enabled: true, display_order: 15 },
  { id: "testimonials", name: "Dancer & Artist Testimonials", section_type: "builtin", is_enabled: true, display_order: 16 },
  { id: "stage_moments", name: "Stage Moments (3D Ring)", section_type: "builtin", is_enabled: true, display_order: 17 },
  { id: "spotlight", name: "Spotlight Posts & Social Strip", section_type: "builtin", is_enabled: true, display_order: 18 },
  { id: "sponsors", name: "Partners & Sponsors Wall", section_type: "builtin", is_enabled: true, display_order: 19 },
  { id: "app_promo", name: "Mobile App Promotion", section_type: "builtin", is_enabled: true, display_order: 20 },
];

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

  // Retrieve sections configuration from backend or fallback to defaults
  const rawSections: HomepageSectionItem[] =
    Array.isArray(data.homepage_sections) && data.homepage_sections.length > 0
      ? data.homepage_sections
      : DEFAULT_FALLBACK_SECTIONS;

  // Filter ONLY enabled sections and sort by display_order
  const activeSections = rawSections
    .filter((sec) => sec.is_enabled !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  return (
    <>
      {activeSections.map((sec) => {
        // Built-in Core Sections
        switch (sec.id) {
          case "sponsor_popup":
            return <GrandSponsorPopup key={sec.id} popup={data.sponsor_popup} />;

          case "hero_banner":
            return <BannerSlider key={sec.id} banners={data.sponsored_banners} isHero={true} />;

          case "hero":
            return (
              <Hero
                key={sec.id}
                events={data.upcoming_events}
                competitions={data.upcoming_competitions}
                brandTitle={data.brand?.title}
                brandTagline={data.brand?.tagline}
                brandBody={data.brand?.description}
              />
            );

          case "scroll_cue":
            return <ScrollCue key={sec.id} />;

          case "quad_tiles":
            return <QuadTiles key={sec.id} events={data.upcoming_events} tiles={data.featured_tiles} />;

          case "featured_show":
            return (
              <FeaturedShow
                key={sec.id}
                events={data.upcoming_events}
                competitions={data.upcoming_competitions}
                liveEvents={data.live_events}
              />
            );

          case "marquee":
            return (
              <Marquee
                key={sec.id}
                words={sec.config?.words || data.marquee_words || ["JOIN THE MOVEMENT", "BOOK YOUR STAGE", "DANCE LOUDER"]}
              />
            );

          case "gallery":
            return (
              <GalleryReveal
                key={sec.id}
                events={data.upcoming_events}
                gallerySection={data.gallery_section}
              />
            );

          case "upcoming_competitions":
            return (
              <UpcomingCompetitions
                key={sec.id}
                competitions={data.upcoming_competitions}
                events={data.upcoming_events}
                sectionConfig={{
                  ...data.competitions_section,
                  ...sec.config,
                }}
              />
            );

          case "studio_showcase":
            return <StudioShowcase key={sec.id} events={data.upcoming_events} />;

          case "stats":
            return (
              <Stats
                key={sec.id}
                eventCount={data.upcoming_events.length}
                courseCount={data.courses.length + data.workshops.length}
                stats={data.homepage_stats}
              />
            );

          case "live_now":
            return (
              <LiveNow
                key={sec.id}
                items={data.live_events}
                sectionConfig={{
                  ...data.live_stage_section,
                  ...sec.config,
                }}
              />
            );

          case "contest_band":
            return (
              <ContestBand
                key={sec.id}
                items={data.contest_promotions}
                competitions={data.upcoming_competitions}
              />
            );

          case "courses":
            return (
              <LearnGrid
                key={sec.id}
                title={sec.config?.title || "Masterclasses"}
                label={sec.config?.label || "Courses"}
                items={data.courses}
                href={sec.config?.view_all_url || "/courses"}
              />
            );

          case "workshops":
            return (
              <LearnGrid
                key={sec.id}
                title={sec.config?.title || "Workshops"}
                label={sec.config?.label || "Workshops"}
                items={data.workshops}
                href={sec.config?.view_all_url || "/workshops"}
              />
            );

          case "testimonials":
            return <Testimonials key={sec.id} items={data.testimonials} />;

          case "stage_moments":
            return (
              <ScrollMorphShowcase
                key={sec.id}
                images={data.stage_moments_section?.images?.map((i) => i.image_url).filter(Boolean)}
                title={data.stage_moments_section?.title}
                subtitle={data.stage_moments_section?.subtitle}
                introTitle={data.stage_moments_section?.intro_title}
              />
            );

          case "spotlight":
            return (
              <PhotoStrip
                key={sec.id}
                events={data.upcoming_events}
                banners={data.sponsored_banners}
                spotlightSection={data.spotlight_section}
              />
            );

          case "sponsors":
            return (
              <Sponsors
                key={sec.id}
                items={data.sponsored_banners}
                partnersSection={data.partners_section}
              />
            );

          case "app_promo":
            return <AppPromo key={sec.id} promo={data.app_promotion} />;

          default:
            // Custom Section types (custom_banner, custom_cards, custom_split_media, custom_cta, custom_rich_text, custom_video_embed)
            if (sec.section_type && sec.section_type !== "builtin") {
              return <CustomSectionRenderer key={sec.id} section={sec} />;
            }
            return null;
        }
      })}
    </>
  );
}
