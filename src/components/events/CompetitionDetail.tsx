"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy, Calendar, Gavel, Upload, CheckCircle2, AlertCircle, ListChecks,
  ShieldCheck, LogIn, Loader2, Heart, Crown, FileUp, Link2, Film, Music, X,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
import { competeApi } from "@/lib/api";
import { imageFor, formatEventDate } from "@/lib/utils";

type Field = { name: string; required?: boolean; type?: string };
type Comp = {
  _id?: string; id?: string; title?: string; name?: string;
  description?: string; prize?: string; rules?: string;
  registration_deadline?: string; min_age?: number; max_age?: number;
  judging_criteria?: { name: string; max_score?: number }[];
  dynamic_submission_fields?: Field[];
};
type Row = { rank?: number; name?: string; participant_id?: string; email?: string; profile_photo?: string; audience_votes?: number; final_score?: number };

const nf = (n?: number) => new Intl.NumberFormat("en-IN").format(Math.round(Number(n ?? 0)));
const handle = (r: Row) => "@" + ((r.email || r.participant_id || r.name || "player").split("@")[0].replace(/\s+/g, "_").toLowerCase());

export default function CompetitionDetail({ comp, initialLeaderboard }: { comp: Comp; initialLeaderboard: Row[] }) {
  const id = comp._id || comp.id || "";
  const { user, loading } = useAuth();
  const fields = comp.dynamic_submission_fields || [];

  const [step, setStep] = useState<"register" | "submit" | "done">("register");
  const [rules, setRules] = useState(false);
  const [entryModes, setEntryModes] = useState<Record<string, "file" | "link">>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [rows, setRows] = useState<Row[]>(
    (initialLeaderboard || []).map((r: any) => ({ ...r, audience_votes: r.audience_votes ?? r.raw_audience_votes, final_score: r.final_score }))
  );
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  async function doRegister() {
    setBusy(true); setMsg(null);
    try {
      const el = await competeApi.eligibility(id);
      if (!el.eligible) { setMsg({ tone: "err", text: el.reason || "You are not eligible." }); return; }
      await competeApi.register(id, true);
      setStep(fields.length ? "submit" : "done");
      setMsg({ tone: "ok", text: "You're registered!" });
    } catch (e: any) {
      const m = String(e?.message || "");
      if (/already/i.test(m)) { setStep(fields.length ? "submit" : "done"); setMsg({ tone: "ok", text: "You're already registered." }); }
      else setMsg({ tone: "err", text: m || "Could not register." });
    } finally { setBusy(false); }
  }

  async function doSubmit() {
    const missing: string[] = [];
    const payloadFiles: File[] = [];
    const fieldNames: string[] = [];

    for (const f of fields) {
      const mode = entryModes[f.name] || (f.type === "URL" || f.type === "PORTFOLIO_LINK" ? "link" : "file");
      const file = files[f.name];
      const link = (links[f.name] || "").trim();

      if (mode === "link") {
        if (!link) {
          if (f.required) missing.push(f.name);
        } else {
          if (!/^https?:\/\//i.test(link)) {
            setMsg({ tone: "err", text: `Please enter a valid link starting with http:// or https:// for ${f.name}` });
            return;
          }
          const safeName = f.name.replace(/[^a-zA-Z0-9_-]/g, "_");
          const linkFile = new File([link], `${safeName}_link.txt`, { type: "text/plain" });
          payloadFiles.push(linkFile);
          fieldNames.push(f.name);
        }
      } else {
        if (!file) {
          if (f.required) missing.push(f.name);
        } else {
          payloadFiles.push(file);
          fieldNames.push(f.name);
        }
      }
    }

    if (missing.length) {
      setMsg({ tone: "err", text: `Please provide a file or link for: ${missing.join(", ")}` });
      return;
    }

    if (payloadFiles.length === 0) {
      setMsg({ tone: "err", text: "Please provide at least one entry file or link to submit." });
      return;
    }

    setBusy(true); setMsg(null);
    try {
      await competeApi.submit(id, payloadFiles, fieldNames);
      setStep("done");
      setMsg({ tone: "ok", text: "Entry submitted successfully!" });
    } catch (e: any) {
      setMsg({ tone: "err", text: e?.message || "Submission failed." });
    } finally {
      setBusy(false);
    }
  }

  async function doVote(pid?: string) {
    if (!pid || !user || voted.has(pid)) return;
    setVotingId(pid);
    try {
      await competeApi.vote(id, pid);
      setVoted((s) => new Set(s).add(pid));
      setRows((rs) => rs.map((r) => (r.participant_id === pid ? { ...r, audience_votes: (r.audience_votes || 0) + 1 } : r)));
    } catch { /* ignore vote errors silently in UI feedback */ }
    finally { setVotingId(null); }
  }

  const open = !comp.registration_deadline || new Date(comp.registration_deadline).getTime() > Date.now();

  return (
    <section className="container-x relative grid gap-10 pb-24 pt-14 md:pt-16 lg:grid-cols-[1fr_380px]">
      {/* ── Left: info ── */}
      <div className="min-w-0">
        <StaggerGroup className="flex flex-wrap gap-2.5">
          {comp.prize && <StaggerItem><span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}><Trophy className="size-3.5" aria-hidden /> {comp.prize}</span></StaggerItem>}
          <StaggerItem><span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-semibold"><Calendar className="size-3.5 text-[var(--fg-subtle)]" aria-hidden /> {comp.registration_deadline ? `Closes ${formatEventDate(comp.registration_deadline)}` : "Open entry"}</span></StaggerItem>
          {(comp.min_age || comp.max_age) && <StaggerItem><span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-semibold"><ShieldCheck className="size-3.5 text-[var(--fg-subtle)]" aria-hidden /> Age {comp.min_age ?? 0}{comp.max_age ? `–${comp.max_age}` : "+"}</span></StaggerItem>}
        </StaggerGroup>

        {comp.description && (
          <Reveal className="mt-8">
            <SectionLabel>About</SectionLabel>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">{comp.description}</p>
          </Reveal>
        )}

        {comp.rules && (
          <Reveal className="mt-8">
            <SectionLabel>Rules</SectionLabel>
            <p className="mt-3 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-[var(--fg-muted)]">{comp.rules}</p>
          </Reveal>
        )}

        {!!comp.judging_criteria?.length && (
          <Reveal className="mt-8">
            <SectionLabel>Judging criteria</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {comp.judging_criteria.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <span className="flex items-center gap-2 text-[13.5px] font-medium"><Gavel className="size-4 text-[var(--accent)]" aria-hidden /> {c.name}</span>
                  {c.max_score != null && <span className="font-display text-sm font-bold text-[var(--fg-muted)]">/{c.max_score}</span>}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {!!fields.length && (
          <Reveal className="mt-8">
            <SectionLabel>What to submit</SectionLabel>
            <ul className="mt-3 grid gap-2">
              {fields.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13.5px]">
                  <ListChecks className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  <span className="font-medium">{f.name}</span>
                  {f.required && <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">Required</span>}
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {/* ── Standings + voting ── */}
        <Reveal className="mt-12">
          <div className="flex items-center justify-between">
            <SectionLabel>Standings</SectionLabel>
            <Link href="/leaderboard" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Full leaderboard →</Link>
          </div>
          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-8 text-center text-[13px] text-[var(--fg-muted)]">No entries ranked yet. Be the first to compete!</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              {rows.slice(0, 8).map((r, i) => {
                const pid = r.participant_id || r.email || "";
                const top = (r.rank ?? i + 1) <= 3;
                return (
                  <div key={pid + i} className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3 first:border-t-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full text-[11.5px] font-bold tabular-nums" style={top ? { background: "var(--grad-brand)", color: "var(--on-accent)" } : { background: "var(--surface-2)", color: "var(--fg-muted)" }}>{r.rank ?? i + 1}</span>
                    <img src={imageFor(r.profile_photo, i)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold leading-tight">{r.name || "—"} {top && i === 0 && <Crown className="ml-0.5 inline size-3.5 text-[var(--accent)]" aria-hidden />}</p>
                      <p className="truncate text-[11px] text-[var(--fg-subtle)]">{nf(r.audience_votes)} votes</p>
                    </div>
                    <button
                      onClick={() => doVote(pid)}
                      disabled={!user || voted.has(pid) || votingId === pid}
                      aria-label={`Vote for ${r.name}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold transition-all enabled:hover:border-[var(--accent)] enabled:hover:text-[var(--accent)] disabled:opacity-50"
                    >
                      {votingId === pid ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Heart className={`size-3.5 ${voted.has(pid) ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} aria-hidden />}
                      {voted.has(pid) ? "Voted" : "Vote"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {!user && rows.length > 0 && <p className="mt-2.5 text-[12px] text-[var(--fg-subtle)]"><Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">Sign in</Link> to vote for your favourite.</p>}
        </Reveal>
      </div>

      {/* ── Right: action card (sticky) ── */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]" style={{ background: "var(--grad-surface), var(--surface)" }}>
          <div className="border-b border-[var(--border)] p-5">
            <p className="font-display text-lg font-bold">Enter this competition</p>
            <p className="mt-1 text-[12.5px] text-[var(--fg-muted)]">{open ? "Registration is open." : "Registration has closed."}</p>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="skeleton h-28 w-full rounded-xl" />
            ) : !user ? (
              <>
                <p className="text-[13.5px] text-[var(--fg-muted)]">Sign in to register, submit your entry and vote.</p>
                <Link href="/login" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                  <LogIn className="size-4" aria-hidden /> Sign in to enter
                </Link>
              </>
            ) : step === "register" ? (
              <>
                <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[var(--fg-muted)]">
                  <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                  <span>I have read and accept the competition rules and eligibility criteria.</span>
                </label>
                <button onClick={doRegister} disabled={!rules || busy || !open}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)] transition-opacity disabled:opacity-50" style={{ background: "var(--grad-brand)" }}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />} Register to compete
                </button>
              </>
            ) : step === "submit" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">Upload your entry</p>
                  <span className="text-[11px] text-[var(--fg-subtle)]">File or Link accepted</span>
                </div>
                <div className="mt-3 flex flex-col gap-3.5">
                  {fields.map((f) => {
                    const mode = entryModes[f.name] || (f.type === "URL" || f.type === "PORTFOLIO_LINK" ? "link" : "file");
                    const selectedFile = files[f.name];
                    const enteredLink = links[f.name] || "";

                    const isAudio = /audio|sound|singing|voice|music|song/i.test(f.name) || f.type === "AUDIO";
                    const isVideo = /video|dance|film|visual|acting|performance/i.test(f.name) || f.type === "VIDEO";
                    const acceptTypes = isAudio
                      ? "audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                      : isVideo
                      ? "video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.wav"
                      : "video/*,audio/*,image/*,.pdf";

                    return (
                      <div key={f.name} className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[var(--fg)]">
                            {f.name}{f.required && <span className="text-[var(--accent)]"> *</span>}
                          </span>
                          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "file" }))}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                mode === "file"
                                  ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <Upload className="size-3" /> File
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryModes((s) => ({ ...s, [f.name]: "link" }))}
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                                mode === "link"
                                  ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <Link2 className="size-3" /> Link
                            </button>
                          </div>
                        </div>

                        {mode === "file" ? (
                          <div>
                            {selectedFile ? (
                              <div className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[12px]">
                                <div className="flex min-w-0 flex-1 items-center gap-2 mr-2">
                                  {selectedFile.type.startsWith("video") ? (
                                    <Film className="size-4 shrink-0 text-[var(--accent)]" />
                                  ) : selectedFile.type.startsWith("audio") ? (
                                    <Music className="size-4 shrink-0 text-[var(--accent)]" />
                                  ) : (
                                    <FileUp className="size-4 shrink-0 text-[var(--accent)]" />
                                  )}
                                  <div className="min-w-0 truncate">
                                    <p className="truncate font-medium">{selectedFile.name}</p>
                                    <p className="text-[10px] text-[var(--fg-subtle)]">
                                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "file"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFiles((s) => ({ ...s, [f.name]: null }))}
                                  aria-label="Remove file"
                                  className="grid size-6 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3 text-[12px] text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]">
                                {isAudio ? (
                                  <Music className="size-4 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                                ) : isVideo ? (
                                  <Film className="size-4 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                                ) : (
                                  <FileUp className="size-4 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                                )}
                                <span className="truncate">Choose video, audio or photo…</span>
                                <input
                                  type="file"
                                  accept={acceptTypes}
                                  className="hidden"
                                  onChange={(e) => {
                                    const fl = e.target.files?.[0] || null;
                                    setFiles((s) => ({ ...s, [f.name]: fl }));
                                  }}
                                />
                              </label>
                            )}
                            <p className="mt-1 text-[10.5px] text-[var(--fg-subtle)]">
                              {isAudio
                                ? "Accepts MP3, WAV, M4A, AAC audio"
                                : isVideo
                                ? "Accepts MP4, MOV, WebM, MKV video or audio"
                                : "Accepts video, audio, image (JPG/PNG) or PDF"}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="relative">
                              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
                              <input
                                type="url"
                                value={enteredLink}
                                onChange={(e) => setLinks((s) => ({ ...s, [f.name]: e.target.value }))}
                                placeholder="https://youtu.be/... or Google Drive link"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] focus:outline-none"
                              />
                            </div>
                            <p className="mt-1 text-[10.5px] text-[var(--fg-subtle)]">
                              Paste YouTube, Vimeo, Google Drive, SoundCloud, or portfolio URL
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button onClick={doSubmit} disabled={busy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold text-[var(--on-accent)] transition-opacity disabled:opacity-50" style={{ background: "var(--grad-brand)" }}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Submit entry
                </button>
              </>
            ) : (
              <div className="grid place-items-center py-4 text-center">
                <CheckCircle2 className="size-11 text-[var(--success)]" aria-hidden />
                <p className="mt-3 font-display text-lg font-bold">You&apos;re all set!</p>
                <p className="mt-1 text-[12.5px] text-[var(--fg-muted)]">Track your rank on the leaderboard.</p>
                <Link href="/leaderboard" className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-[12.5px] font-semibold hover:border-[var(--border-strong)]">View leaderboard</Link>
              </div>
            )}

            {msg && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] ${msg.tone === "ok" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                style={{ background: msg.tone === "ok" ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
                {msg.tone === "ok" ? <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />}
                {msg.text}
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
