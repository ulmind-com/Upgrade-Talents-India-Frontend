import type { Metadata } from "next";
import { Mail, Phone, MapPin, LifeBuoy, Instagram, Facebook, Twitter, Youtube, Linkedin } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import ContactForm from "@/components/events/ContactForm";
import { Reveal, SplitHeading, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Contact", description: "Reach the Upgrade Talents India team — support, partnerships and bookings." };
export const revalidate = 300;

const SOCIAL_ICONS: Record<string, any> = { instagram: Instagram, facebook: Facebook, twitter: Twitter, youtube: Youtube, linkedin: Linkedin };

export default async function ContactPage() {
  const contact = await safe(publicApi.contactInfo(), {} as Record<string, any>);
  const socials = Object.entries(contact?.social_media || {}).filter(([, v]) => !!v) as [string, string][];

  const cards = [
    contact?.contact_email && { Icon: Mail, label: "Email us", value: contact.contact_email, href: `mailto:${contact.contact_email}` },
    contact?.contact_phone && { Icon: Phone, label: "Call us", value: contact.contact_phone, href: `tel:${contact.contact_phone}` },
    contact?.office_address && { Icon: MapPin, label: "Visit us", value: contact.office_address },
    contact?.support_url && { Icon: LifeBuoy, label: "Support", value: "Help centre", href: contact.support_url },
  ].filter(Boolean) as { Icon: any; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHero title="Contact" subtitle="Bookings, partnerships, press — we read everything." seed={0} compact />

      <section className="relative overflow-hidden py-16 md:py-24">
        <Spotlights variant="b" />
        <div className="container-x relative grid gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Reveal>
              <SectionLabel>Get in touch</SectionLabel>
              <SplitHeading text="Let's talk" className="mt-5 font-display text-[clamp(2rem,6vw,3.6rem)] font-bold uppercase" />
              <p className="mt-5 max-w-sm text-[15px] text-[var(--fg-muted)]">
                Whether you're a dancer, a studio or a brand — our team replies within one working day.
              </p>
            </Reveal>

            {cards.length > 0 && (
              <StaggerGroup className="mt-10 flex flex-col gap-4">
                {cards.map((c) => {
                  const Inner = (
                    <div className="glow-ring flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform duration-400 hover:-translate-y-0.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--grad-brand)" }}>
                        <c.Icon className="size-5 text-white" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">{c.label}</span>
                        <span className="mt-1 block text-[15px] font-semibold [overflow-wrap:anywhere]">{c.value}</span>
                      </span>
                    </div>
                  );
                  return (
                    <StaggerItem key={c.label}>
                      {c.href ? <a href={c.href} className="block">{Inner}</a> : Inner}
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            )}

            {socials.length > 0 && (
              <Reveal className="mt-10">
                <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--fg-subtle)]">Follow the movement</span>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {socials.map(([k, url]) => {
                    const Icon = SOCIAL_ICONS[k] || Instagram;
                    return (
                      <li key={k}>
                        <a
                          href={url} target="_blank" rel="noopener noreferrer" aria-label={k}
                          className="grid size-12 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                        >
                          <Icon className="size-[18px]" aria-hidden />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.1}>
            <ContactForm supportUrl={contact?.support_url} email={contact?.contact_email} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
