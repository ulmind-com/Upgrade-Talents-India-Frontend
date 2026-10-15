"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, Loader2, BadgeCheck, CircleSlash, FileQuestion, Award, Calendar, Hash, Sparkles, Trophy } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/Primitives";
import { publicApi } from "@/lib/api";

type Result = {
  verification_status?: string; status?: string; message?: string;
  certificate_id?: string; certificate_type?: string;
  participant_name?: string; activity_title?: string; activity_type?: string;
  rank?: number | string; award_title?: string; issue_date?: string;
};

const DEMO: Result = {
  verification_status: "VALID", status: "VALID",
  certificate_id: "UTI-CERT-2026-0007", certificate_type: "ACHIEVEMENT",
  participant_name: "Riya Sharma", activity_title: "Grand Finale Night 2026",
  activity_type: "COMPETITION", award_title: "Champion — 1st Place", rank: 1, issue_date: "2026-09-18",
};

const pretty = (s?: string) => (s || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function CertificateVerify({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [preview, setPreview] = useState(false);

  async function verify(t: string) {
    const code = t.trim();
    if (!code) return;
    setLoading(true); setRes(null);
    try { setRes(await publicApi.verifyCertificate(code)); }
    catch (e: any) { setRes({ verification_status: "NOT_FOUND", message: e?.message || "Could not verify this certificate." }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) { setPreview(true); setRes(DEMO); return; }
    if (initialToken) verify(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const status = res?.verification_status || res?.status;
  const valid = status === "VALID";
  const revoked = status === "REVOKED";

  return (
    <section className="container-x relative pb-24 pt-14 md:pt-20">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}><ShieldCheck className="size-8" aria-hidden /></span>
            <h2 className="mt-5 font-display text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-[0.98]">Verify a Certificate</h2>
            <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-[var(--fg-muted)]">
              Enter a certificate ID or scan its QR code to confirm it was genuinely issued by Upgrade Talents.
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-8">
          <form onSubmit={(e) => { e.preventDefault(); verify(token); }} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
              <input
                value={token} onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. UTI-CERT-2026-0007" aria-label="Certificate ID or verification code"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-11 pr-4 font-mono text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
            <button type="submit" disabled={loading || !token.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-bold text-[var(--on-accent)] transition-opacity disabled:opacity-50" style={{ background: "var(--grad-brand)" }}>
              {loading ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : <ShieldCheck className="size-4.5" aria-hidden />} Verify
            </button>
          </form>
        </Reveal>

        <AnimatePresence mode="wait">
          {res && (
            <motion.div key={status} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-8">
              {valid ? (
                <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border p-7 md:p-9" style={{ borderColor: "var(--accent)", background: "var(--grad-surface), var(--surface)", boxShadow: "0 0 70px -26px color-mix(in srgb, var(--accent) 55%, transparent)" }}>
                  <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full opacity-20 blur-3xl" style={{ background: "var(--grad-brand)" }} />
                  {/* seal */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>
                      <BadgeCheck className="size-4" aria-hidden /> Verified &amp; authentic
                    </span>
                    <span className="grid size-12 place-items-center rounded-full text-[var(--on-accent)] shadow-lg" style={{ background: "var(--grad-brand)" }}><Award className="size-6" aria-hidden /></span>
                  </div>

                  <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--fg-subtle)]">This certifies that</p>
                  <p className="mt-1.5 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight">{res.participant_name || "—"}</p>
                  <p className="mt-2 text-[14.5px] text-[var(--fg-muted)]">
                    {res.certificate_type === "ACHIEVEMENT" || res.rank ? "achieved distinction in" : "participated in"}{" "}
                    <span className="font-semibold text-[var(--fg)]">{res.activity_title}</span>
                  </p>

                  {(res.award_title || res.rank) && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-2.5 text-[13.5px] font-semibold">
                      <Trophy className="size-4 text-[var(--accent)]" aria-hidden /> {res.award_title || `Rank #${res.rank}`}
                    </p>
                  )}

                  <div className="mt-7 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-3">
                    <Meta Icon={Sparkles} label="Type" value={pretty(res.certificate_type || res.activity_type)} />
                    <Meta Icon={Calendar} label="Issued on" value={res.issue_date || "—"} />
                    <Meta Icon={Hash} label="Certificate ID" value={res.certificate_id || "—"} mono />
                  </div>
                </div>
              ) : revoked ? (
                <StatusCard tone="warn" Icon={CircleSlash} title="Certificate revoked"
                  text={`This certificate${res.certificate_id ? ` (${res.certificate_id})` : ""} was issued but has since been revoked by Upgrade Talents and is no longer valid.`} />
              ) : (
                <StatusCard tone="neutral" Icon={FileQuestion} title="No certificate found"
                  text={res.message || "We couldn't find a certificate for that code. Check the ID and try again."} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!res && !loading && (
          <Reveal className="mt-10">
            <p className="flex items-center justify-center gap-2 text-center text-[12.5px] text-[var(--fg-subtle)]">
              <SectionLabel>Tip</SectionLabel> The certificate ID is printed on the document and encoded in its QR code.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

function Meta({ Icon, label, value, mono }: { Icon: typeof Award; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]"><Icon className="size-3.5" aria-hidden /> {label}</p>
      <p className={`mt-1 text-[13.5px] font-semibold ${mono ? "font-mono text-[12.5px]" : ""}`} style={{ overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function StatusCard({ tone, Icon, title, text }: { tone: "warn" | "neutral"; Icon: typeof Award; title: string; text: string }) {
  const color = tone === "warn" ? "var(--danger)" : "var(--fg-muted)";
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <Icon className="size-8" style={{ color }} aria-hidden />
      </span>
      <p className="mt-5 font-display text-xl font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--fg-muted)]">{text}</p>
    </div>
  );
}
