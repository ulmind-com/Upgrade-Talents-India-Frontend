import type { Metadata } from "next";
import Link from "next/link";
import { Scale, FileCheck, AlertTriangle, Trophy, Ticket, CreditCard, Ban, HelpCircle } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import { Reveal, SplitHeading, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Official Terms & Conditions of Upgrade Talents India — guidelines for competitions, voting, ticketing, and platform usage.",
};

export const revalidate = 60;

export default async function TermsAndConditionsPage() {
  const contact = await safe(publicApi.contactInfo(), {} as Record<string, any>);
  const supportEmail = contact?.contact_email || "support@upgradetalentsindia.in";
  const contactPhone = contact?.contact_phone || "+91-9181254824";
  const officeAddress = contact?.office_address || "Bokajan, Karbi Anglong, Assam - 782480, India";

  const keyPillars = [
    {
      Icon: Trophy,
      title: "Fair Competition & Judging",
      desc: "All scores, round qualifications, and winner designations by our Grand Judges and certified jury panel are definitive, impartial, and final.",
    },
    {
      Icon: FileCheck,
      title: "Audience Voting Integrity",
      desc: "One authenticated vote per voter per round. Any automated voting, proxy farms, or artificial vote inflation triggers immediate vote disqualification.",
    },
    {
      Icon: Ticket,
      title: "Ticket & Gate Pass Rules",
      desc: "Digital QR tickets provide single-scan entry at event venues. 5-minute checkout seat holds prevent scalping and guarantee reserved placement.",
    },
    {
      Icon: CreditCard,
      title: "Payments & Refunds",
      desc: "Secure transactions via Razorpay. Entry fees and tickets are non-refundable once confirmed, except in the unlikely event of competition cancellation.",
    },
  ];

  return (
    <>
      <PageHero
        title="Terms &amp; Conditions"
        subtitle="Clear rules, strict integrity, and stage standards for performers and fans."
        seed={1}
        compact
      />

      <section className="relative overflow-hidden py-16 md:py-24">
        <Spotlights variant="b" />
        <div className="container-x relative max-w-4xl">
          
          {/* Header Introduction */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-8">
              <div>
                <SectionLabel>Terms of Service</SectionLabel>
                <SplitHeading
                  text="Rules of the Stage"
                  className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold uppercase leading-tight"
                />
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-right">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-[var(--fg-subtle)]">
                  Last Updated
                </span>
                <span className="text-xs font-bold text-[var(--accent)]">November 24, 2026</span>
              </div>
            </div>
          </Reveal>

          {/* Quick Pillars */}
          <Reveal className="mt-10">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--fg)]">
              Fundamental Principles
            </h3>
            <StaggerGroup className="mt-4 grid gap-4 sm:grid-cols-2" stagger={0.06}>
              {keyPillars.map((p, idx) => (
                <StaggerItem key={idx}>
                  <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform hover:-translate-y-0.5 shadow-xs">
                    <span
                      className="grid size-10 place-items-center rounded-xl text-white shadow-xs"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <p.Icon className="size-4.5" />
                    </span>
                    <h4 className="mt-3.5 font-display text-base font-bold text-[var(--fg)]">
                      {p.title}
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--fg-muted)]">
                      {p.desc}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Reveal>

          {/* Detailed Legal Text */}
          <div className="mt-14 space-y-12 text-[14.5px] leading-[1.8] text-[var(--fg-muted)]">
            
            {/* Section 1 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">01.</span> Agreement to Terms
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    These Terms and Conditions constitute a legally binding agreement between you (&quot;User&quot;, &quot;Contestant&quot;, &quot;Attendee&quot;, or &quot;You&quot;) and <strong>Upgrade Talents India</strong> (&quot;UTI&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;our&quot;).
                  </p>
                  <p>
                    By accessing or using our website (
                    <Link href="/" className="font-semibold text-[var(--accent)] hover:underline">
                      upgradetalentsindia.in
                    </Link>
                    ), registering for any talent competition, casting audience votes, purchasing event admission passes, or booking workshops, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{" "}
                    <Link href="/privacy-policy" className="font-semibold text-[var(--accent)] hover:underline">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 2 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">02.</span> Eligibility &amp; Minor Participation
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Our platform is open to individuals of all age brackets as specified in individual contest regulations. 
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Sub-Junior Bracket:</strong> Up to 8 years of age.
                    </li>
                    <li>
                      <strong>Junior Bracket:</strong> 9 to 13 years of age.
                    </li>
                    <li>
                      <strong>Senior Bracket:</strong> 13 years of age and above.
                    </li>
                    <li>
                      <strong>Group Divisions:</strong> Open to all eligible age compositions adhering to crew registration criteria.
                    </li>
                  </ul>
                  <p>
                    <strong>Minors:</strong> Any participant under 18 years of age must register under the explicit supervision and consent of a parent or legal guardian. The parent or guardian assumes full financial and legal responsibility for the minor&apos;s participation, compliance with rules, and attendance at physical stage events.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 3 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">03.</span> Competition Entries &amp; Audition Formats
                </h2>
                <div className="mt-4 space-y-3">
                  <p>Contestants must adhere strictly to submission requirements:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Permitted Submission Formats:</strong> High-definition video files (MP4/MOV), high-bitrate audio files (MP3), or valid public streaming URLs (YouTube, Google Drive, Vimeo). Links must remain publicly accessible throughout the judging cycle.
                    </li>
                    <li>
                      <strong>Performance Time Limits:</strong> Solo performances must not exceed 2 minutes unless specified. Group dance entries must not exceed 3 minutes. Exceeding allotted performance durations may incur scoring penalties.
                    </li>
                    <li>
                      <strong>Originality &amp; Decency:</strong> Content must not contain offensive, defamatory, profane, or sexually explicit choreography or lyrical themes.
                    </li>
                    <li>
                      <strong>Deadlines:</strong> All submissions must be uploaded prior to the published registration and submission deadlines. Late submissions will not be accepted.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 4 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">04.</span> Judging Authority &amp; Scoring System
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Upgrade Talents India prides itself on uncompromising artistic integrity:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Finality of Judges:</strong> The evaluations, feedback, and scores awarded by our Grand Judges and evaluation panel are conclusive, final, and non-negotiable. No appeals or external arbitrations against artistic judgment will be entertained.
                    </li>
                    <li>
                      <strong>Multi-Criteria Scoring:</strong> Contestants are scored across standardized dimensions (e.g., Skill &amp; Technique, Creativity &amp; Style, Rhythm, Stage Presence) with explicit maximum point caps and weighting.
                    </li>
                    <li>
                      <strong>Leaderboard Publication:</strong> While auditions are under active evaluation, public standings may be private to prevent bias. Once results are verified by the super admin control room, official final standings are published.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 5 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">05.</span> Audience Voting &amp; Fair Play Rules
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Where a competition enables public audience voting, the following rules apply:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Voter Authentication:</strong> Users must hold a verified account to cast votes.
                    </li>
                    <li>
                      <strong>Voting Allowance:</strong> One vote per user account per contestant in an active round.
                    </li>
                    <li>
                      <strong>Anti-Bot &amp; Anti-Fraud:</strong> Automated scripts, click farms, VPN spoofing, paid voting syndicates, or creating disposable dummy accounts are strictly prohibited.
                    </li>
                    <li>
                      <strong>Audit Disqualification:</strong> Our automated telemetry constantly monitors anomaly spikes. The administration reserves the unilateral right to deduct fraudulent votes, reset manipulated tallies, or disqualify contestants found engaging in vote purchasing.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 6 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">06.</span> Cash Prizes, Awards &amp; Taxation (TDS)
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Prizes announced (Cash awards, trophies, certificates, merchandise) are distributed strictly in accordance with Indian financial and legal regulations:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Mandatory Identity &amp; Bank KYC:</strong> Prior to releasing any cash prize, winners must submit verified Government Photo ID (Aadhaar/PAN card) and bank account details matching the registered participant or legal guardian.
                    </li>
                    <li>
                      <strong>Tax Deducted at Source (TDS):</strong> All prize winnings are subject to applicable Indian income tax withholding as prescribed under Section 194B / 194BA of the Income Tax Act, 1961. The net prize amount after required statutory tax deduction will be remitted to the verified bank account, and an official Form 16A will be issued.
                    </li>
                    <li>
                      <strong>Certificates:</strong> Digital verifiable certificates with unique cryptographic hashes will be accessible in the participant dashboard.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 7 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">07.</span> Event Tickets, Bookings &amp; Gate Entry
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    For audience members and supporters attending live auditorium showcases:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>5-Minute Temporary Seat Hold:</strong> When choosing seats, our ticketing system reserves selected positions for 5 minutes (BookMyShow standard) to allow seamless checkout before releasing them to other fans.
                    </li>
                    <li>
                      <strong>Digital QR Tickets:</strong> Every confirmed ticket generates an encrypted QR code. Tickets must be presented at the venue gate on mobile or physical print for scanning.
                    </li>
                    <li>
                      <strong>Single-Scan Admission:</strong> Each ticket QR code is valid for a single admission scan only. Duplication or unauthorized reproduction voids entry.
                    </li>
                    <li>
                      <strong>Right of Admission Reserved:</strong> Venue management reserves the right to deny admission or eject individuals exhibiting unruly behavior, substance misuse, or violation of venue protocols.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 8 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">08.</span> Payments, Fees &amp; Refund Policy
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    All payments are processed securely in Indian Rupees (INR) via Razorpay.
                  </p>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-amber-500 shrink-0" /> Refund Policy Terms:
                    </p>
                    <p>
                      <strong>1. Competition Registration Fees:</strong> Once an audition submission or slot is booked and confirmed, registration fees are strictly <strong>non-refundable</strong> and non-transferable, as judging infrastructure, slot scheduling, and evaluation resources are deployed immediately.
                    </p>
                    <p>
                      <strong>2. Event &amp; Show Tickets:</strong> Admission tickets once purchased cannot be cancelled or refunded. In the rare scenario that an event is completely cancelled by Upgrade Talents India without a rescheduled date, a full refund will be credited to the original payment source within 7–10 business days.
                    </p>
                    <p>
                      <strong>3. Merchandise Orders:</strong> Defective or damaged items will be replaced if reported within 48 hours of delivery with photographic evidence.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Section 9 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">09.</span> Intellectual Property &amp; Media Licensing
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Contestants retain underlying ownership of their original choreography, style, and creations. However, by participating in Upgrade Talents India contests and events, contestants grant Upgrade Talents India an irrevocable, perpetual, royalty-free, worldwide license to film, photograph, livestream, reproduce, broadcast, and distribute performance footage across websites, mobile apps, social media channels, television broadcasts, and promotional collateral.
                  </p>
                  <p>
                    All platform logos, trademarks, wordmarks, graphical assets, UI designs, and codebase are the proprietary intellectual property of Upgrade Talents India and its technical partner Ulmind.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 10 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">10.</span> Limitation of Liability &amp; Indemnity
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Dance and stage performances involve inherent physical exertion and risk of athletic injury. Performers acknowledge that participation is voluntary and undertake rehearsals and performances at their own physical risk.
                  </p>
                  <p>
                    Upgrade Talents India, its founders, judges, and venue partners shall not be held liable for any personal injury, loss of personal possessions, travel disruptions, or indirect damages arising out of participation. Users agree to indemnify and hold harmless Upgrade Talents India against any claims, losses, or legal costs arising from their breach of these Terms.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 11 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">11.</span> Governing Law &amp; Jurisdiction
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes, claims, or controversies arising under or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in Assam / West Bengal, India.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 12 */}
            <Reveal>
              <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-6 md:p-8 shadow-md">
                <h2 className="font-display text-lg sm:text-xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <HelpCircle className="size-5 text-[var(--accent)]" /> Inquiries &amp; Legal Notices
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[var(--fg-muted)]">
                  For legal inquiries, dispute submissions, or questions regarding these Terms &amp; Conditions, please contact:
                </p>
                <div className="mt-5 grid gap-3 text-xs sm:text-sm text-[var(--fg)] font-medium">
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Entity</span>
                    <span>Upgrade Talents India</span>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Legal &amp; Support Email</span>
                    <a href={`mailto:${supportEmail}`} className="text-[var(--accent)] font-bold hover:underline">
                      {supportEmail}
                    </a>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Telephone</span>
                    <a href={`tel:${contactPhone}`} className="hover:underline">
                      {contactPhone}
                    </a>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Head Office</span>
                    <span>{officeAddress}</span>
                  </div>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>
    </>
  );
}
