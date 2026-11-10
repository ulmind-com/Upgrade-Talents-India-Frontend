import ScrollMorphHero from "@/components/ui/scroll-morph-hero";

/* ═══════════ SCROLL MORPH SHOWCASE ═══════════ */

export interface ScrollMorphShowcaseProps {
  images?: string[];
  title?: string;
  subtitle?: string;
  introTitle?: string;
}

export default function ScrollMorphShowcase({
  images,
  title = "Moments from the floor",
  subtitle = "Stages, crews and performances from across the Upgrade Talents circuit.",
  introTitle = "The floor is built on movement.",
}: ScrollMorphShowcaseProps = {}) {
  return (
    <section className="relative border-y border-[var(--border)]">
      <ScrollMorphHero
        images={images}
        introTitle={introTitle}
        title={title}
        subtitle={subtitle}
      />
    </section>
  );
}
