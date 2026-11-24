import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, UserCheck, CreditCard, Scale, HelpCircle } from "lucide-react";
import PageHero from "@/components/events/PageHero";
import { Reveal, SplitHeading, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { SectionLabel, Spotlights } from "@/components/ui/Primitives";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Official Privacy Policy of Upgrade Talents India — how we collect, protect, and handle your data.",
};

export const revalidate = 60;

export default async function PrivacyPolicyPage() {
  const contact = await safe(publicApi.contactInfo(), {} as Record<string, any>);
  const supportEmail = contact?.contact_email || "support@upgradetalentsindia.in";
  const contactPhone = contact?.contact_phone || "+91-9181254824";
  const officeAddress = contact?.office_address || "Bokajan, Karbi Anglong, Assam - 782480, India";

  const keyHighlights = [
    {
      Icon: Lock,
      title: "Data Protection & Encryption",
      desc: "All sensitive data in transit is protected using TLS 1.3 encryption. Passwords and sensitive session tokens are salted and cryptographically hashed.",
    },
    {
      Icon: CreditCard,
      title: "Secure Payment Gateways",
      desc: "Payments for tickets, registrations, and merchandise are processed via RBI-authorized gateway Razorpay. We never store credit/debit card numbers or UPI PINs.",
    },
    {
      Icon: UserCheck,
      title: "DigiLocker & KYC Verification",
      desc: "Age and identity verifications for category brackets and prize disbursements follow strict Indian Govt. DigiLocker OAuth 2.0 PKCE protocols without intermediate storage.",
    },
    {
      Icon: ShieldCheck,
      title: "Voter Integrity & Fair Play",
      desc: "Audience voting data is strictly logged with device and session heuristics to eliminate duplicate votes, bot scripts, and artificial leaderboard manipulation.",
    },
  ];

  return (
    <>
      <PageHero
        title="Privacy Policy"
        subtitle="Transparent, secure, and privacy-first standards for India's talent ecosystem."
        seed={2}
        compact
      />

      <section className="relative overflow-hidden py-16 md:py-24">
        <Spotlights variant="a" />
        <div className="container-x relative max-w-4xl">
          
          {/* Header Introduction */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-8">
              <div>
                <SectionLabel>Legal &amp; Compliance</SectionLabel>
                <SplitHeading
                  text="Your Privacy Matters"
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

          {/* Quick Highlight Cards */}
          <Reveal className="mt-10">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--fg)]">
              Core Privacy Commitments
            </h3>
            <StaggerGroup className="mt-4 grid gap-4 sm:grid-cols-2" stagger={0.06}>
              {keyHighlights.map((k, idx) => (
                <StaggerItem key={idx}>
                  <div className="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform hover:-translate-y-0.5 shadow-xs">
                    <span
                      className="grid size-10 place-items-center rounded-xl text-white shadow-xs"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <k.Icon className="size-4.5" />
                    </span>
                    <h4 className="mt-3.5 font-display text-base font-bold text-[var(--fg)]">
                      {k.title}
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--fg-muted)]">
                      {k.desc}
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
                  <span className="text-[var(--accent)] font-mono text-base">01.</span> Introduction &amp; Scope
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Welcome to <strong>Upgrade Talents India</strong> (&quot;UTI&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We operate the digital platform available at{" "}
                    <Link href="/" className="font-semibold text-[var(--accent)] hover:underline">
                      upgradetalentsindia.in
                    </Link>{" "}
                    along with our mobile applications, contest control rooms, and live ticketing services.
                  </p>
                  <p>
                    This Privacy Policy governs the manner in which Upgrade Talents India collects, uses, maintains, protects, and discloses personal information gathered from contestants, audience voters, ticket purchasers, workshop attendees, and website visitors. We are committed to adhering strictly to the <strong>Information Technology Act, 2000</strong>, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> of India.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 2 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">02.</span> Information We Collect
                </h2>
                <div className="mt-4 space-y-3">
                  <p>We collect information you provide directly to us when creating an account, registering for competitions, purchasing tickets, or interacting with our services:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Account Identification:</strong> Full name, verified email address, mobile phone number, date of birth, gender, state, district, and profile photographs.
                    </li>
                    <li>
                      <strong>Contestant &amp; Audition Material:</strong> Selected competition categories (Sub-Junior, Junior, Senior, Group), audio/video performance files, streaming links (YouTube, Google Drive, Vimeo), choreography details, and studio/crew affiliations.
                    </li>
                    <li>
                      <strong>Identity &amp; Age Verification (KYC):</strong> Government-issued identification (Aadhaar, Voter ID, Passport, or Birth Certificate for minors) verified via official DigiLocker OAuth 2.0 PKCE or manual verification by authorized coordinators to validate age-division criteria.
                    </li>
                    <li>
                      <strong>Financial &amp; Transactional Data:</strong> Order references, payment status, GST details (where applicable), and transaction identifiers supplied by Razorpay. <em>We never store credit/debit card credentials, net banking passwords, or UPI PINs.</em>
                    </li>
                    <li>
                      <strong>Audience Voting &amp; Anti-Fraud Signals:</strong> Timestamped vote records, session tokens, anonymized IP addresses, and device fingerprints to protect fairness and eradicate bot-assisted vote manipulation.
                    </li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 3 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">03.</span> How We Use Your Information
                </h2>
                <div className="mt-4 space-y-3">
                  <p>Your information is collected and processed for genuine business and competition purposes:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>To orchestrate, judge, and manage offline/online rounds, audition reviews, and stage appearances.</li>
                    <li>To display live leaderboards, round progressions, advancing badges, and public Hall of Fame showcases.</li>
                    <li>To generate tamper-proof digital certificates verifiable by unique cryptographic tokens and QR codes.</li>
                    <li>To issue digital entry passes, BookMyShow-standard reserved seating holds, and QR gate scan validations.</li>
                    <li>To disburse cash prize pools, awards, and merchandise rewards to verified contest champions.</li>
                    <li>To transmit vital transactional notices (order confirmations, round advancement, judging schedules) via Email, WhatsApp, and SMS.</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 4 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">04.</span> Minors &amp; Children&apos;s Privacy
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    Because Upgrade Talents India hosts Sub-Junior (under 8 years) and Junior (9–13 years) competitions, we place the utmost priority on protecting minors.
                  </p>
                  <p>
                    Registrations for contestants under 18 years of age must be submitted with the explicit consent and oversight of a parent or legal guardian. Contact details (phone numbers and email addresses) associated with minor accounts must belong to their parent or guardian. We do not sell, rent, or publicly exploit minor demographic data.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 5 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">05.</span> Information Sharing &amp; Third Parties
                </h2>
                <div className="mt-4 space-y-3">
                  <p>Upgrade Talents India will never sell your personal data. We disclose information only under strict operational necessity:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Official Judges &amp; Evaluators:</strong> Judges access audition media, contestant names, and criteria scoring sheets solely during evaluation windows.</li>
                    <li><strong>Service Providers &amp; Infrastructure:</strong> Encrypted media storage (Cloudinary), payment processing (Razorpay), email dispatch (Resend API), and notification pipelines (Firebase Cloud Messaging).</li>
                    <li><strong>Legal Mandates:</strong> Where required by applicable Indian law, court order, or governmental authorities to comply with legal processes or protect vital rights and safety.</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 6 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">06.</span> Media Release &amp; Broadcast Rights
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    By participating in Upgrade Talents India live stage events, studio auditions, and workshops, performers acknowledge that live performances are recorded and photographed.
                  </p>
                  <p>
                    Contestants grant Upgrade Talents India a non-exclusive, worldwide license to utilize audio-visual recordings, stage moments, and photographs for promotional spotlights, social media highlights, broadcast streams, and archival records.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 7 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">07.</span> Data Security &amp; Retention
                </h2>
                <div className="mt-4 space-y-3">
                  <p>
                    We implement modern administrative, technical, and physical safeguards. User sessions are secured via HTTP-only cookies and WebAuthn/Passkey authentication. Databases are housed in SOC-2 compliant cloud infrastructure with automated backups and firewall monitoring.
                  </p>
                  <p>
                    Audition media and competition history are maintained to preserve official leaderboard validity and verify certificate authenticity for lifetime participant records.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Section 8 */}
            <Reveal>
              <div className="border-t border-[var(--border)] pt-8">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-base">08.</span> Your Rights &amp; Choices
                </h2>
                <div className="mt-4 space-y-3">
                  <p>Under Indian data protection standards, you have the right to:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Access and review the personal data associated with your participant profile.</li>
                    <li>Update or correct inaccurate demographic, profile, or contact information.</li>
                    <li>Request closure of your account and deletion of non-essential records (subject to contest verification retention).</li>
                    <li>Opt out of non-essential promotional email broadcasts at any time.</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Section 9 */}
            <Reveal>
              <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-6 md:p-8 shadow-md">
                <h2 className="font-display text-lg sm:text-xl font-bold uppercase text-[var(--fg)] flex items-center gap-2">
                  <HelpCircle className="size-5 text-[var(--accent)]" /> Grievance Officer &amp; Inquiries
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[var(--fg-muted)]">
                  If you have inquiries, concerns, or requests regarding this Privacy Policy, our Grievance Officer is available to assist you in accordance with the IT Rules, 2011:
                </p>
                <div className="mt-5 grid gap-3 text-xs sm:text-sm text-[var(--fg)] font-medium">
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Organization</span>
                    <span>Upgrade Talents India</span>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Grievance &amp; Privacy Officer</span>
                    <span>Legal &amp; Compliance Team</span>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Email</span>
                    <a href={`mailto:${supportEmail}`} className="text-[var(--accent)] font-bold hover:underline">
                      {supportEmail}
                    </a>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Contact Phone</span>
                    <a href={`tel:${contactPhone}`} className="hover:underline">
                      {contactPhone}
                    </a>
                  </div>
                  <div>
                    <span className="text-[var(--fg-subtle)] font-mono block text-[11px] uppercase">Registered Address</span>
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
