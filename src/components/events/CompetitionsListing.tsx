"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Trophy, Calendar, ArrowUpRight, Radio, Clock, Sparkles } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { imageFor, formatEventDate, truncate } from "@/lib/utils";
import { getCompetitionLifecycle } from "@/lib/competition-lifecycle";

type Comp = {
  _id?: string; id?: string;
  title?: string; name?: string;
  description?: string; prize?: string;
  image_url?: string;
  start_date?: string; end_date?: string;
  registration_start_date?: string; registration_deadline?: string;
  submission_deadline?: string;
  start_time?: string; time?: string;
  is_published?: boolean; status?: string;
  voting_status?: "OPEN" | "CLOSED";
  judging_status?: "OPEN" | "CLOSED";
  result_status?: "PENDING" | "APPROVED" | "PUBLISHED";
  results_published?: boolean;
  audience_voting_enabled?: boolean;
};

const cid = (c: Comp) => c._id || c.id || "";

export default function CompetitionsListing({ items }: { items: Comp[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => items.filter((c) => !q || (c.title || c.name || "").toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  return (
    <section className="container-x relative pb-24 pt-3 sm:pt-4 md:pt-6">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel>Compete &amp; win</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">Open Competitions</h2>
          </div>
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search competitions"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>
        </div>
      </Reveal>

      {list.length === 0 ? (
        <Reveal>
          <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]"><Trophy className="size-7 text-[var(--fg-subtle)]" aria-hidden /></span>
            <p className="mt-5 font-display text-xl font-bold">No competitions yet</p>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--fg-muted)]">New contests and talent shows will appear here. Check back soon.</p>
          </div>
        </Reveal>
      ) : (
        <StaggerGroup className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => {
            const lifecycle = getCompetitionLifecycle(c);
            const isResults = lifecycle.isResultsOut;

            return (
              <StaggerItem key={cid(c) || i}>
                <Link
                  href={isResults ? `/competitions/${cid(c)}/results` : `/competitions/${cid(c)}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--border-strong)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={imageFor(c.image_url, i)} alt="" className="size-full object-cover transition-transform duration-[1.1s] group-hover:scale-110" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                    
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {lifecycle.isResultsOut ? (
                        <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-black shadow-md backdrop-blur-md">
                          Results Out
                        </span>
                      ) : lifecycle.isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/95 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md animate-pulse">
                          <span className="size-2 rounded-full bg-white animate-ping" />
                          Live Now
                        </span>
                      ) : lifecycle.isRegistrationOpen ? (
                        <span
                          className="rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider backdrop-blur-md"
                          style={{ background: "color-mix(in srgb, var(--success) 22%, transparent)", color: "var(--success)" }}
                        >
                          Registration Open
                        </span>
                      ) : lifecycle.isRegClosed && !lifecycle.isEnded ? (
                        <span className="rounded-full bg-amber-500/90 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-black shadow-md backdrop-blur-md">
                          Starts Soon
                        </span>
                      ) : lifecycle.isRegUpcoming ? (
                        <span className="rounded-full bg-sky-500/90 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                          Reg Opens Soon
                        </span>
                      ) : (
                        <span className="rounded-full bg-black/60 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
                          Closed
                        </span>
                      )}
                    </div>

                    {c.prize && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                        <Trophy className="size-3" aria-hidden /> {c.prize}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-[1.25rem] font-bold leading-tight">{c.title || c.name || "Competition"}</h3>
                    {c.description && <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">{truncate(c.description, 96)}</p>}
                    <div className="mt-auto flex items-center justify-between pt-5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-subtle)]">
                        <Calendar className="size-3.5" aria-hidden />{" "}
                        {lifecycle.isLive
                          ? "Live right now"
                          : lifecycle.isRegistrationOpen && c.registration_deadline
                          ? `Closes ${formatEventDate(c.registration_deadline)}`
                          : lifecycle.isRegClosed && c.start_date
                          ? `Starts ${formatEventDate(c.start_date)}`
                          : lifecycle.isRegUpcoming && c.registration_start_date
                          ? `Reg opens ${formatEventDate(c.registration_start_date)}`
                          : c.start_date
                          ? `Starts ${formatEventDate(c.start_date)}`
                          : c.registration_deadline
                          ? formatEventDate(c.registration_deadline)
                          : "Open entry"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent)]">
                        {lifecycle.isResultsOut
                          ? "View Results"
                          : lifecycle.isLive
                          ? "Watch & Vote"
                          : lifecycle.canRegister
                          ? "Enter Now"
                          : "View Details"}{" "}
                        <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </section>
  );
}
