"use client";

import { motion } from "framer-motion";
import { GraduationCap, Clock, User2, CalendarRange, ArrowUpRight } from "lucide-react";
import type { CourseItem } from "@/lib/api";
import { Badge, Button, SectionLabel, TiltCard } from "@/components/ui/Primitives";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { formatEventDate, formatINR, imageFor, truncate } from "@/lib/utils";

export default function LearnListing({ items, kind }: { items: CourseItem[]; kind: "course" | "workshop" }) {
  const noun = kind === "course" ? "courses" : "workshops";

  if (!items.length) {
    return (
      <section className="py-24">
        <div className="container-x">
          <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] px-6 py-24 text-center">
            <GraduationCap className="size-10 text-[var(--fg-subtle)]" aria-hidden />
            <h2 className="font-display text-2xl font-bold uppercase">No {noun} published yet</h2>
            <p className="max-w-sm text-sm text-[var(--fg-muted)]">
              New {noun} drop regularly — check the events page in the meantime.
            </p>
            <Button href="/events">Browse events <ArrowUpRight className="size-4" aria-hidden /></Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 md:py-24">
      <div className="container-x">
        <Reveal>
          <SectionLabel>{items.length} {noun} available</SectionLabel>
        </Reveal>

        <StaggerGroup className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {items.map((c, i) => (
            <StaggerItem key={c._id} className="h-full">
              <TiltCard className="group h-full" intensity={7}>
                <article className="glow-ring flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={imageFor(c.thumbnail, i)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[1.2s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] to-transparent" aria-hidden />
                    <div className="absolute left-4 top-4">
                      {c.registration_status && (
                        <Badge tone={c.can_register ? "success" : c.registration_status === "UPCOMING" ? "warning" : "neutral"}>
                          {c.registration_status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h2 className="font-display text-xl font-bold uppercase leading-tight transition-colors group-hover:text-[var(--accent)]">
                      {c.title}
                    </h2>

                    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[var(--fg-muted)]">
                      <li className="inline-flex items-center gap-1.5">
                        <User2 className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />{c.instructor_name}
                      </li>
                      {c.start_date && (
                        <li className="inline-flex items-center gap-1.5">
                          <CalendarRange className="size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />{formatEventDate(c.start_date)}
                        </li>
                      )}
                    </ul>

                    <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">{truncate(c.description, 110)}</p>

                    <div className="mt-auto flex items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
                      <div>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Fee</span>
                        <span className="font-display text-lg font-bold">{formatINR(c.price)}</span>
                      </div>
                      {typeof c.available_seats === "number" && (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                          <Clock className="size-3.5" aria-hidden />{c.available_seats} seats
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
