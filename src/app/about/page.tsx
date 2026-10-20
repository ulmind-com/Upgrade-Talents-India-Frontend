import type { Metadata } from "next";
import { Flame, Users, Trophy, Target, HeartHandshake, Music4 } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import { Reveal, SplitHeading, StaggerGroup, StaggerItem, Parallax } from "@/components/motion/Reveal";
import { Button, SectionLabel, Spotlights, TiltCard } from "@/components/ui/Primitives";
import { imageFor } from "@/lib/utils";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "About", description: "Who we are — the team building India's biggest dance stage." };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALUES = [
  { Icon: Flame, title: "Stage first", body: "Every decision we make starts with one question — does it make the performance better?" },
  { Icon: Users, title: "Open floor", body: "From first-timers to finalists, every dancer gets a fair shot at the spotlight." },
  { Icon: Trophy, title: "Real stakes", body: "Judged formats, transparent scoring and prizes that actually move careers forward." },
  { Icon: Target, title: "Built to scale", body: "Gate scanning, VIP access control and live results — run on infrastructure made for crowds." },
  { Icon: HeartHandshake, title: "Community owned", body: "Crews, studios and choreographers shape the calendar alongside us." },
  { Icon: Music4, title: "Culture respected", body: "Street, classical, contemporary — every form gets its own stage and its own rules." },
];

export default async function AboutPage() {
  const settings = await safe(publicApi.settings(), {} as Record<string, any>);

  return (
    <>
      <PageHero title="About Us" subtitle={settings?.tagline || "The team behind the stage."} seed={4} compact />

      {/* Story */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <Spotlights variant="a" />
        <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionLabel>Our story</SectionLabel>
            <SplitHeading
              text="We build stages, not just events"
              className="mt-5 font-display text-[clamp(2rem,5.5vw,3.8rem)] font-bold uppercase leading-[0.92]"
            />
            <div className="mt-7 flex flex-col gap-5 text-[15px] leading-[1.85] text-[var(--fg-muted)]">
              <p>
                {settings?.homepage_description ||
                  "Upgrade Talents India started with a simple frustration — brilliant dancers across the country had nowhere serious to compete. Local shows were disorganised, judging was opaque, and tickets were a mess of WhatsApp forwards."}
              </p>
              <p>
                So we built the whole thing properly: curated events, verified judges, QR-based gate entry, VIP access control, and instant digital tickets. The result is a circuit where dancers show up to perform, not to chase organisers.
              </p>
              <p>
                Today we run competitions, masterclasses, workshops and showcases across the country — with the same promise every time: a real stage, a fair call, and a crowd that shows up.
              </p>
            </div>
            <Button href="/events" size="lg" className="mt-9">See upcoming events</Button>
          </Reveal>

          <Reveal delay={0.12} x={40} y={0}>
            <div className="grid grid-cols-2 gap-5">
              <Parallax speed={0.18}>
                <img src={imageFor(null, 0)} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-[var(--radius-lg)] border border-[var(--border)] object-cover" />
              </Parallax>
              <Parallax speed={-0.14} className="mt-10">
                <img src={imageFor(null, 2)} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-[var(--radius-lg)] border border-[var(--border)] object-cover" />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="relative border-t border-[var(--border)] py-20 md:py-28">
        <div className="container-x">
          <Reveal>
            <SectionLabel>What we stand for</SectionLabel>
            <SplitHeading text="Our principles" className="mt-5 font-display text-[clamp(2rem,6vw,4rem)] font-bold uppercase" />
          </Reveal>

          <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
            {VALUES.map((v) => (
              <StaggerItem key={v.title} className="h-full">
                <TiltCard className="h-full" intensity={6}>
                  <div className="glow-ring flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-7">
                    <span className="grid size-12 place-items-center rounded-xl" style={{ background: "var(--grad-brand)" }}>
                      <v.Icon className="size-5 text-white" aria-hidden />
                    </span>
                    <h3 className="font-display text-lg font-bold uppercase leading-tight">{v.title}</h3>
                    <p className="text-[14px] leading-relaxed text-[var(--fg-muted)]">{v.body}</p>
                  </div>
                </TiltCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>
    </>
  );
}
