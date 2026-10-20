import ScrollMorphHero from "@/components/ui/scroll-morph-hero";

/* ═══════════ SCROLL MORPH SHOWCASE ═══════════ */

export default function ScrollMorphShowcase() {
  return (
    <section className="relative border-y border-[var(--border)]">
      <ScrollMorphHero
        introTitle="The floor is built on movement."
        title="Moments from the floor"
        subtitle="Stages, crews and performances from across the Upgrade Talents circuit."
      />
    </section>
  );
}
