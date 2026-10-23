"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy, Flame, Search, ChevronDown, Users, Sparkles, Vote, Gavel } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { publicApi } from "@/lib/api";
import { imageFor } from "@/lib/utils";

type Row = {
  rank?: number;
  name?: string;
  participant_id?: string;
  email?: string;
  profile_photo?: string;
  audience_votes?: number;
  judge_score?: number;
  final_score?: number;
  points?: number;
};

type Comp = { _id?: string; id?: string; title?: string; name?: string };

const DEMO: Row[] = [
  { rank: 1, name: "Riya Sharma", email: "riya@eventora.in", audience_votes: 3045, judge_score: 92, final_score: 98.4 },
  { rank: 2, name: "Arjun Mehta", email: "arjun@eventora.in", audience_votes: 2774, judge_score: 88, final_score: 94.1 },
  { rank: 3, name: "Neha Kapoor", email: "neha@eventora.in", audience_votes: 1988, judge_score: 90, final_score: 91.7 },
  { rank: 4, name: "Kabir Rao", email: "kabir@eventora.in", audience_votes: 1589, judge_score: 84, final_score: 86.0 },
  { rank: 5, name: "Ananya Das", email: "ananya@eventora.in", audience_votes: 1021, judge_score: 82, final_score: 80.2 },
  { rank: 6, name: "Dev Patel", email: "dev@eventora.in", audience_votes: 1000, judge_score: 79, final_score: 77.9 },
  { rank: 7, name: "Simran Gill", email: "simran@eventora.in", audience_votes: 842, judge_score: 76, final_score: 72.4 },
  { rank: 8, name: "Ved Nair", email: "ved@eventora.in", audience_votes: 640, judge_score: 71, final_score: 66.8 },
];

const handle = (r: Row) => "@" + ((r.email || r.participant_id || r.name || "player").split("@")[0].replace(/\s+/g, "_").toLowerCase());
const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));

const MEDAL = [
  { ring: "var(--accent)", glow: "0 0 50px -12px color-mix(in srgb, var(--accent) 60%, transparent)", Icon: Crown, label: "1st" },
  { ring: "var(--primary)", glow: "0 0 40px -16px color-mix(in srgb, var(--primary) 55%, transparent)", Icon: Medal, label: "2nd" },
  { ring: "var(--cyan)", glow: "0 0 40px -16px color-mix(in srgb, var(--cyan) 50%, transparent)", Icon: Medal, label: "3rd" },
];

function Avatar({ row, size = 72, ring }: { row: Row; size?: number; ring?: string }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: ring ? `linear-gradient(140deg, ${ring}, transparent 70%)` : "var(--surface-2)", padding: 2.5 }}
    >
      <img
        src={imageFor(row.profile_photo, row.rank ?? 0)}
        alt=""
        className="size-full rounded-full object-cover"
        style={{ width: size - 5, height: size - 5 }}
      />
    </span>
  );
}

function PodiumCard({ row, place }: { row: Row; place: 0 | 1 | 2 }) {
  const m = MEDAL[place];
  const lift = place === 0 ? "md:-translate-y-5" : "";
  return (
    <div
      className={`relative flex flex-col items-center rounded-[var(--radius-lg)] border bg-[var(--surface)] px-5 pb-6 pt-10 text-center transition-transform duration-500 hover:-translate-y-1 ${lift}`}
      style={{
        borderColor: place === 0 ? m.ring : "var(--border)",
        boxShadow: m.glow,
        background: place === 0 ? "var(--grad-surface), var(--surface)" : "var(--surface)",
      }}
    >
      <span
        className="absolute -top-4 grid size-9 place-items-center rounded-full text-[13px] font-bold text-[var(--on-accent)] shadow-lg"
        style={{ background: place === 0 ? "var(--grad-brand)" : m.ring }}
      >
        {(row.rank ?? place + 1)}
      </span>
      <m.Icon className="absolute right-4 top-4 size-5" style={{ color: m.ring }} aria-hidden />

      <Avatar row={row} size={place === 0 ? 92 : 76} ring={m.ring} />
      <p className="mt-4 line-clamp-1 font-display text-[clamp(1.05rem,2.4vw,1.4rem)] font-bold leading-tight">{row.name || "—"}</p>
      <p className="text-[12.5px] text-[var(--fg-subtle)]">{handle(row)}</p>

      <p className="mt-3 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-none text-gradient">{nf(row.final_score ?? row.audience_votes)}</p>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-subtle)]">Points</p>

      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2">
          <p className="font-display text-[15px] font-bold tabular-nums">{nf(row.audience_votes)}</p>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Votes</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2">
          <p className="font-display text-[15px] font-bold tabular-nums">{nf(row.judge_score)}</p>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">Judge</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ Icon, value, label }: { Icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-[var(--fg-muted)]">{label}</p>
      </div>
    </div>
  );
}

export default function LeaderboardView({
  competitions,
  initialCompId,
  initialRows,
}: {
  competitions: Comp[];
  initialCompId?: string;
  initialRows: Row[];
}) {
  const [compId, setCompId] = useState(initialCompId || "");
  const [rows, setRows] = useState<Row[]>(initialRows || []);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) setPreview(true);
  }, []);

  async function pick(id: string) {
    setCompId(id);
    setLoading(true);
    try {
      const d = await publicApi.leaderboard(id);
      setRows(d?.leaderboard || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  const data = (rows.length ? rows : preview ? DEMO : []).map((r: any, i) => ({
    ...r,
    rank: r.rank ?? i + 1,
    audience_votes: r.audience_votes ?? r.raw_audience_votes,
    judge_score: r.judge_score ?? r.raw_judge_score,
  }));
  const podium = data.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as Row[]; // 2 · 1 · 3
  const filtered = useMemo(
    () => data.filter((r) => !q || (r.name || "").toLowerCase().includes(q.toLowerCase()) || handle(r).includes(q.toLowerCase())),
    [data, q]
  );

  return (
    <section className="container-x relative pb-24 pt-14 md:pt-20">
      {/* Controls */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionLabel>Live rankings</SectionLabel>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,4.5vw,3rem)] font-bold leading-[0.95]">Global Ranking</h2>
          </div>
          {competitions.length > 0 && (
            <div className="relative">
              <select
                value={compId}
                onChange={(e) => pick(e.target.value)}
                aria-label="Choose competition"
                className="appearance-none rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-5 pr-11 text-[13.5px] font-semibold text-[var(--fg)] outline-none transition-colors hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {competitions.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.title || c.name || "Competition"}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
            </div>
          )}
        </div>
      </Reveal>

      {data.length === 0 ? (
        <Reveal>
          <div className="mt-10 grid place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-2)]"><Trophy className="size-7 text-[var(--fg-subtle)]" aria-hidden /></span>
            <p className="mt-5 font-display text-xl font-bold">No rankings yet</p>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--fg-muted)]">
              Rankings appear here once a competition goes live and judging or voting begins.
            </p>
          </div>
        </Reveal>
      ) : (
        <>
          {/* Stats */}
          <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-3">
            <StaggerItem><StatCard Icon={Users} value={nf(data.length)} label="Contestants ranked" /></StaggerItem>
            <StaggerItem><StatCard Icon={Vote} value={nf(data.reduce((a, r) => a + Number(r.audience_votes || 0), 0))} label="Total audience votes" /></StaggerItem>
            <StaggerItem><StatCard Icon={Flame} value={nf(data[0]?.final_score ?? data[0]?.audience_votes)} label="Top score" /></StaggerItem>
          </StaggerGroup>

          {/* Podium */}
          <StaggerGroup className="mt-10 grid grid-cols-1 items-end gap-5 sm:grid-cols-3">
            {podiumOrder.map((r) => (
              <StaggerItem key={r.rank}><PodiumCard row={r} place={((r.rank ?? 1) - 1) as 0 | 1 | 2} /></StaggerItem>
            ))}
          </StaggerGroup>

          {/* Table */}
          <Reveal className="mt-12">
            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-4 md:p-5">
                <p className="flex items-center gap-2 font-display text-lg font-bold"><Gavel className="size-4 text-[var(--accent)]" aria-hidden /> Full standings</p>
                <div className="relative w-full max-w-[240px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
                  <input
                    value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players"
                    className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-10 pr-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                      <th className="px-5 py-3 font-bold">Rank</th>
                      <th className="px-3 py-3 font-bold">Player</th>
                      <th className="px-3 py-3 text-right font-bold">Votes</th>
                      <th className="px-3 py-3 text-right font-bold">Judge</th>
                      <th className="px-5 py-3 text-right font-bold">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const top = (r.rank ?? 99) <= 3;
                      return (
                        <motion.tr
                          key={(r.rank ?? 0) + (r.email || r.name || "")}
                          whileHover={{ backgroundColor: "var(--surface-2)" }}
                          className="border-t border-[var(--border)] text-[14px]"
                        >
                          <td className="px-5 py-3.5">
                            <span
                              className="grid size-8 place-items-center rounded-full text-[12.5px] font-bold tabular-nums"
                              style={top ? { background: "var(--grad-brand)", color: "var(--on-accent)" } : { background: "var(--surface-2)", color: "var(--fg-muted)" }}
                            >
                              {r.rank}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar row={r} size={38} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold leading-tight">{r.name || "—"}</p>
                                <p className="truncate text-[11.5px] text-[var(--fg-subtle)]">{handle(r)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fg-muted)]">{nf(r.audience_votes)}</td>
                          <td className="px-3 py-3.5 text-right tabular-nums text-[var(--fg-muted)]">{nf(r.judge_score)}</td>
                          <td className="px-5 py-3.5 text-right font-display font-bold tabular-nums">{nf(r.final_score ?? r.audience_votes)}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && <div className="border-t border-[var(--border)] p-4 text-center text-[12.5px] text-[var(--fg-subtle)]">Updating…</div>}
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}
