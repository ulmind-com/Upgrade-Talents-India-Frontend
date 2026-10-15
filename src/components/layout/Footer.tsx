"use client";

import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUpRight, Sparkles } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { Button, Magnetic } from "@/components/ui/Primitives";

type Props = {
  brandName?: string;
  tagline?: string;
  contact?: {
    contact_email?: string;
    contact_phone?: string;
    office_address?: string;
    social_media?: Record<string, string | undefined>;
  } | null;
  links?: { _id: string; title?: string; label?: string; url?: string }[];
};

const SOCIAL_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

export default function Footer({ brandName = "UPGRADE TALENTS INDIA", tagline, contact, links = [] }: Props) {
  const socials = Object.entries(contact?.social_media || {}).filter(([, v]) => !!v) as [string, string][];
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-[var(--border)] bg-[var(--bg-elevated)] noise">
      <div
        aria-hidden
        className="spotlight"
        style={{ background: "var(--spot-1)", width: "min(70vw,700px)", height: "min(70vw,700px)", bottom: "-45%", left: "18%" }}
      />

      {/* CTA band */}
      <div className="container-x relative border-b border-[var(--border)] py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <SplitHeading
              text="Ready to take the stage?"
              className="font-display text-[clamp(2.4rem,6vw,4.6rem)] font-bold uppercase leading-[0.92] tracking-[-0.03em]"
            />
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              {tagline || "Book your slot for India's most electric dance events, competitions and masterclasses."}
            </p>
          </div>
          <Magnetic>
            <Button href="/events" size="lg">
              Browse events <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          </Magnetic>
        </div>
      </div>

      {/* Columns */}
      <div className="container-x relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <Reveal className="lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl" style={{ background: "var(--grad-brand)" }}>
              <Sparkles className="size-5 text-white" aria-hidden />
            </span>
            <span className="font-display text-base font-bold uppercase tracking-[0.12em]">{brandName}</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-[var(--fg-muted)]">
            {tagline || "Dance events, competitions, workshops and talent showcases — engineered for performers."}
          </p>

          {socials.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2.5">
              {socials.map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key] || ArrowUpRight;
                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={key}
                      className="grid size-11 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>

        <Reveal delay={0.08}>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--fg-subtle)]">Explore</h3>
          <ul className="mt-6 flex flex-col gap-3">
            {[
              { label: "All Events", href: "/events" },
              { label: "Competitions", href: "/competitions" },
              { label: "Gallery", href: "/gallery" },
              { label: "Verify Certificate", href: "/verify" },
              { label: "My Tickets", href: "/dashboard" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group inline-flex items-center gap-2 text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                >
                  <span className="h-px w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-4" aria-hidden />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.14}>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--fg-subtle)]">Information</h3>
          <ul className="mt-6 flex flex-col gap-3">
            {(links.length
              ? links.map((l) => ({ label: l.title || l.label || "Link", href: l.url || "#" }))
              : [
                  { label: "About Us", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Privacy Policy", href: "/contact" },
                  { label: "Terms of Service", href: "/contact" },
                ]
            ).map((l, i) => (
              <li key={`${l.href}-${i}`}>
                <Link
                  href={l.href}
                  className="group inline-flex items-center gap-2 text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                >
                  <span className="h-px w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-4" aria-hidden />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.2}>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--fg-subtle)]">Get in touch</h3>
          <ul className="mt-6 flex flex-col gap-4 text-sm">
            {contact?.contact_email && (
              <li>
                <a href={`mailto:${contact.contact_email}`} className="group flex items-start gap-3 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
                  <Mail className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  <span className="[overflow-wrap:anywhere]">{contact.contact_email}</span>
                </a>
              </li>
            )}
            {contact?.contact_phone && (
              <li>
                <a href={`tel:${contact.contact_phone}`} className="group flex items-start gap-3 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]">
                  <Phone className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  <span>{contact.contact_phone}</span>
                </a>
              </li>
            )}
            {contact?.office_address && (
              <li className="flex items-start gap-3 text-[var(--fg-muted)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{contact.office_address}</span>
              </li>
            )}
          </ul>
        </Reveal>
      </div>

      {/* Bottom bar */}
      <div className="container-x relative flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] py-7 text-center md:flex-row md:text-left">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          © {year} {brandName}. All rights reserved.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Powered by <span className="text-gradient font-semibold">Eventora</span>
        </p>
      </div>
    </footer>
  );
}
