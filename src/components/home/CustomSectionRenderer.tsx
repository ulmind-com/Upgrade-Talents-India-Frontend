"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles, Play, CheckCircle2 } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem, SplitHeading } from "@/components/motion/Reveal";
import { Badge, Button, SectionLabel, Spotlights, TiltCard } from "@/components/ui/Primitives";
import { isUsableImageUrl } from "@/lib/utils";
import type { HomepageSectionItem } from "@/lib/api";

interface CustomSectionRendererProps {
  section: HomepageSectionItem;
}

export default function CustomSectionRenderer({ section }: CustomSectionRendererProps) {
  if (!section || section.is_enabled === false) return null;

  const cfg = section.config || {};
  const type = section.section_type || "custom_banner";
  const title = cfg.title || section.name;
  const subtitle = cfg.subtitle || section.category;
  const badge = cfg.badge || section.badge;
  const description = cfg.description || section.description;
  const buttonText = cfg.button_text;
  const buttonUrl = cfg.button_url || "#";
  const buttonStyle = cfg.button_style || "glow";
  const bgStyle = cfg.background_style || "gradient";
  const imageUrl = isUsableImageUrl(cfg.image_url) ? cfg.image_url : null;
  const videoUrl = cfg.video_url;
  const items = Array.isArray(cfg.items) ? cfg.items : [];

  // Determine container styling based on background_style
  const getBgClass = () => {
    switch (bgStyle) {
      case "gradient":
        return "bg-gradient-to-br from-[var(--surface-sunken)] via-[var(--surface)] to-[var(--surface-sunken)] border-y border-[var(--border)]";
      case "dark":
        return "bg-[#090b0e] text-white border-y border-white/10";
      case "glass":
        return "bg-[var(--surface)]/70 backdrop-blur-xl border-y border-[var(--border)]";
      case "brand":
        return "border-y border-[var(--border)] text-white";
      case "default":
      default:
        return "bg-[var(--surface)] border-y border-[var(--border)]";
    }
  };

  const getCustomStyle = () => {
    if (bgStyle === "brand") {
      return { background: "var(--grad-brand)" };
    }
    return undefined;
  };

  /* ── 1. CUSTOM BANNER ── */
  if (type === "custom_banner") {
    return (
      <section className={`relative overflow-hidden py-20 md:py-28 ${getBgClass()}`} style={getCustomStyle()}>
        <Spotlights variant="a" />
        <div className="container-x relative">
          <div className={`grid items-center gap-12 ${imageUrl ? "lg:grid-cols-12" : "max-w-4xl"}`}>
            <Reveal className={`flex flex-col items-start ${imageUrl ? "lg:col-span-7" : ""}`}>
              {badge && (
                <div className="mb-4">
                  <Badge tone="brand">
                    <Sparkles className="mr-1 size-3.5" />
                    {badge}
                  </Badge>
                </div>
              )}
              {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
              <SplitHeading
                text={title}
                className="mt-4 font-display text-[clamp(2.4rem,6vw,4.8rem)] font-bold uppercase leading-[0.95]"
              />
              {description && (
                <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)] md:text-[17px]">
                  {description}
                </p>
              )}
              {buttonText && (
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button
                    href={buttonUrl}
                    variant={buttonStyle === "outline" ? "outline" : "primary"}
                    size="lg"
                  >
                    {buttonText}
                    <ArrowUpRight className="ml-1 size-4" />
                  </Button>
                </div>
              )}
            </Reveal>

            {imageUrl && (
              <Reveal className="lg:col-span-5" delay={0.2}>
                <TiltCard intensity={8} className="overflow-hidden rounded-3xl border border-[var(--border)] shadow-2xl">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-sunken)]">
                    <img
                      src={imageUrl}
                      alt={title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                </TiltCard>
              </Reveal>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ── 2. CUSTOM CARDS GRID ── */
  if (type === "custom_cards") {
    return (
      <section className={`relative overflow-hidden py-20 md:py-28 ${getBgClass()}`} style={getCustomStyle()}>
        <Spotlights variant="b" />
        <div className="container-x relative">
          <Reveal className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              {badge && (
                <div className="mb-3">
                  <Badge tone="brand">
                    <Sparkles className="mr-1 size-3.5" />
                    {badge}
                  </Badge>
                </div>
              )}
              {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
              <SplitHeading
                text={title}
                className="mt-4 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-bold uppercase leading-[0.95]"
              />
              {description && (
                <p className="mt-4 max-w-xl text-[14.5px] text-[var(--fg-muted)]">
                  {description}
                </p>
              )}
            </div>
            {buttonText && (
              <Button href={buttonUrl} variant="outline">
                {buttonText} <ArrowRight className="size-4" />
              </Button>
            )}
          </Reveal>

          {items.length > 0 && (
            <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item: any, i: number) => (
                <StaggerItem key={i}>
                  <TiltCard className="group h-full" intensity={6}>
                    <div className="glow-ring flex h-full flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:border-[var(--brand)]">
                      <div>
                        {item.badge && (
                          <span className="inline-block rounded-md bg-[var(--brand)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--brand)]">
                            {item.badge}
                          </span>
                        )}
                        <h4 className="mt-3 text-lg font-bold text-[var(--fg)] group-hover:text-[var(--brand)] transition-colors">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.link && (
                        <div className="mt-6 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--brand)]">
                          <span>Explore</span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      )}
                    </div>
                  </TiltCard>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </div>
      </section>
    );
  }

  /* ── 3. CUSTOM SPLIT MEDIA ── */
  if (type === "custom_split_media") {
    return (
      <section className={`relative overflow-hidden py-20 md:py-28 ${getBgClass()}`} style={getCustomStyle()}>
        <Spotlights variant="a" />
        <div className="container-x relative">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-6">
              {badge && (
                <div className="mb-4">
                  <Badge tone="brand">{badge}</Badge>
                </div>
              )}
              {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
              <SplitHeading
                text={title}
                className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold uppercase leading-[0.95]"
              />
              {description && (
                <p className="mt-6 text-[15px] leading-relaxed text-[var(--fg-muted)] md:text-[16.5px]">
                  {description}
                </p>
              )}
              {buttonText && (
                <div className="mt-8">
                  <Button href={buttonUrl} variant="primary" size="lg">
                    {buttonText} <ArrowUpRight className="ml-1 size-4" />
                  </Button>
                </div>
              )}
            </Reveal>

            <Reveal className="lg:col-span-6" delay={0.2}>
              <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-sunken)] shadow-2xl">
                {videoUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={videoUrl}
                      title={title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="size-full border-0"
                    />
                  </div>
                ) : imageUrl ? (
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center p-12 text-center text-[var(--fg-muted)]">
                    <Sparkles className="size-10 text-[var(--brand)]" />
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    );
  }

  /* ── 4. CUSTOM CTA STRIP ── */
  if (type === "custom_cta") {
    return (
      <section className="relative overflow-hidden py-14" style={{ background: "var(--grad-brand)" }}>
        <div className="container-x relative">
          <div className="flex flex-col items-center justify-between gap-6 text-center text-white md:flex-row md:text-left">
            <div>
              {badge && (
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  {badge}
                </span>
              )}
              <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold uppercase leading-tight">
                {title}
              </h3>
              {description && (
                <p className="mt-2 max-w-xl text-[14px] text-white/80 md:text-[15px]">
                  {description}
                </p>
              )}
            </div>
            {buttonText && (
              <div className="shrink-0">
                <Link
                  href={buttonUrl}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 text-[14px] font-bold text-black shadow-xl transition-transform hover:scale-105"
                >
                  {buttonText} <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ── 5. CUSTOM RICH TEXT / EDITORIAL ── */
  if (type === "custom_rich_text") {
    return (
      <section className={`relative overflow-hidden py-20 ${getBgClass()}`} style={getCustomStyle()}>
        <div className="container-x relative max-w-4xl text-center">
          <Reveal>
            {badge && (
              <div className="mb-4 flex justify-center">
                <Badge tone="brand">{badge}</Badge>
              </div>
            )}
            {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
            <SplitHeading
              text={title}
              className="mt-4 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-bold uppercase leading-[0.95]"
            />
            {description && (
              <div className="mt-8 space-y-4 text-left text-[15px] leading-relaxed text-[var(--fg-muted)] md:text-[16.5px]">
                {description.split("\n\n").map((para: string, idx: number) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}
            {buttonText && (
              <div className="mt-10 flex justify-center">
                <Button href={buttonUrl} variant="primary" size="lg">
                  {buttonText} <ArrowUpRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    );
  }

  /* ── 6. CUSTOM VIDEO EMBED ── */
  if (type === "custom_video_embed") {
    return (
      <section className={`relative overflow-hidden py-20 md:py-28 ${getBgClass()}`} style={getCustomStyle()}>
        <Spotlights variant="b" />
        <div className="container-x relative max-w-5xl">
          <Reveal className="text-center">
            {badge && (
              <div className="mb-3 flex justify-center">
                <Badge tone="danger">
                  <Play className="mr-1 size-3.5 fill-current" />
                  {badge}
                </Badge>
              </div>
            )}
            {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
            <SplitHeading
              text={title}
              className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold uppercase leading-[0.95]"
            />
            {description && (
              <p className="mx-auto mt-4 max-w-2xl text-[14.5px] text-[var(--fg-muted)]">
                {description}
              </p>
            )}
          </Reveal>

          {videoUrl && (
            <Reveal className="mt-12" delay={0.2}>
              <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-2xl">
                <div className="aspect-video w-full">
                  <iframe
                    src={videoUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full border-0"
                  />
                </div>
              </div>
            </Reveal>
          )}

          {buttonText && (
            <div className="mt-8 flex justify-center">
              <Button href={buttonUrl} variant="outline">
                {buttonText} <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}
