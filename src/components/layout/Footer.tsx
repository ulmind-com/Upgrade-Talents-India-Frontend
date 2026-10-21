"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUpRight, Sparkles } from "lucide-react";

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

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

const VIDEO =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4d01c727-d9c5-47c8-a778-35a451ffd39f.mp4";
const POSTER =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261014_121838_c97d0940-f430-4304-8573-4f47ee44f447.png";

const CSS = `
/* ── tokens ─────────────────────────────────────────────────────────
   The footer tracks the site's own themes: "dark" is the deep navy
   night, "blue" is the warm paper daytime. Each one carries an rgb
   triple too, so the haze and fog can fade out to the same colour. */
.dfoot{
  --paper:#091124;  --paper-rgb:9 17 36;
  --ink:#f5f7ff;
  --body:#9aa6cc;
  --muted:#6b7aa3;
  --mist:#121a38;   --mist-rgb:18 26 56;
  --list-fg:#dde3f5;
  --line:255 255 255;
  --chip-bg:rgb(255 255 255 / .07);
  --chip-line:rgb(255 255 255 / .16);
  --mark-bg:linear-gradient(to bottom,#f4f6ff,#d9e0ff 55%);
  --mark-fg:#0b1226;
  --cta-bg:#f5f7ff;
  --cta-fg:#0b1226;
  --cta-bg-hover:#ffffff;
  --glass-fill:rgb(196 208 255 / .20);
  --glass-grad:linear-gradient(to bottom,rgb(255 255 255 / .58),rgb(168 182 240 / .24) 48%,rgb(255 255 255 / .42));
  --glass-rim:rgb(255 255 255 / .35);
  --glass-halo:rgb(150 170 255 / .40);

  --dfont:"Inter",system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
  --u: min(100vw / 1440, 100vh / 672);
  --u: min(100vw / 1440, 100svh / 672);
  position:relative; height:100vh; height:100svh;
  background:var(--paper); color:var(--ink);
  font-family:var(--dfont); -webkit-font-smoothing:antialiased;
  overflow:hidden; isolation:isolate;
}

:root[data-theme="blue"] .dfoot{
  --paper:#fff7f1;  --paper-rgb:255 247 241;
  --ink:#2a1810;
  --body:#6b5546;
  --muted:#957d6c;
  --mist:#ece2ee;   --mist-rgb:236 226 238;
  --list-fg:#2b1b11;
  --line:120 60 20;
  --chip-bg:rgb(255 255 255 / .62);
  --chip-line:rgb(120 60 20 / .16);
  --mark-bg:linear-gradient(to bottom,#2b2b2b,#0a0a0a 55%);
  --mark-fg:#ffffff;
  --cta-bg:#1a1008;
  --cta-fg:#fff7f1;
  --cta-bg-hover:#332016;
  --glass-fill:rgb(232 234 250 / .4);
  --glass-grad:linear-gradient(to bottom,rgb(255 255 255 / .78),rgb(214 218 246 / .36) 48%,rgb(255 255 255 / .62));
  --glass-rim:rgb(255 255 255 / .55);
  --glass-halo:rgb(190 200 255 / .45);
}

.dfoot *,.dfoot *::before,.dfoot *::after{box-sizing:border-box}
.dfoot a{color:inherit;text-decoration:none}
.dfoot ul{margin:0;padding:0;list-style:none}

.dfoot__stage{position:absolute;inset:0;z-index:0}
.dfoot__video{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 100%;transform:translateY(9%)}
.dfoot__stage::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(to bottom,var(--paper) 0%,rgb(var(--paper-rgb) / .96) 26%,rgb(var(--paper-rgb) / .72) 44%,rgb(var(--paper-rgb) / 0) 70%);
}

.dfoot__wordmark{
  position:absolute;left:50%;bottom:calc(-2 * var(--u));transform:translateX(-50%);
  z-index:1;margin:0;
  font-size:calc(var(--wm,390) * var(--u));font-weight:600;line-height:.74;letter-spacing:-0.045em;
  white-space:nowrap;pointer-events:none;user-select:none;
  color:var(--glass-fill);
  background:var(--glass-grad);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 calc(-1 * var(--u)) 0 var(--glass-rim)) drop-shadow(0 0 calc(18 * var(--u)) var(--glass-halo));
}

.dfoot__fog{
  position:absolute;inset:auto 0 0;z-index:2;height:17%;pointer-events:none;
  background:linear-gradient(to top,var(--mist) 0%,rgb(var(--mist-rgb) / .6) 30%,rgb(var(--mist-rgb) / 0) 100%);
}

.dfoot__content{
  position:relative;z-index:3;display:grid;
  grid-template-columns:calc(440 * var(--u)) calc(240 * var(--u)) calc(240 * var(--u)) 1fr;
  align-items:start;
  width:calc(1440 * var(--u));margin:0 auto;
  /* the site's navbar is fixed, and this footer is exactly one viewport
     tall, so its first row always lands under it without the clearance */
  padding:calc(86 * var(--u) + var(--navclear,56px)) calc(100 * var(--u)) 0 calc(160 * var(--u));
}

.dbrand__logo{display:inline-flex;align-items:center;gap:calc(10 * var(--u));font-size:calc(17 * var(--u));font-weight:500;letter-spacing:-0.02em}
.dbrand__mark{
  position:relative;display:grid;place-items:center;
  width:calc(30 * var(--u));height:calc(30 * var(--u));border-radius:calc(8 * var(--u));
  background:var(--mark-bg);
  box-shadow:0 calc(1 * var(--u)) calc(2 * var(--u)) rgb(0 0 0 / .25);
  color:var(--mark-fg);
}
.dbrand__mark svg{width:calc(15 * var(--u));height:calc(15 * var(--u))}

.dbrand__title{margin:calc(19 * var(--u)) 0 0;font-size:calc(20 * var(--u));font-weight:600;line-height:1.2;letter-spacing:-0.045em}
.dbrand__text{max-width:calc(412 * var(--u));margin:calc(18 * var(--u)) 0 0;color:var(--body);font-size:calc(13.7 * var(--u));line-height:1.43;letter-spacing:-0.012em}

.dfoot a.dbrand__cta{
  display:inline-flex;align-items:center;gap:calc(6 * var(--u));
  height:calc(32.5 * var(--u));margin-top:calc(20 * var(--u));
  padding:0 calc(16 * var(--u)) 0 calc(15 * var(--u));
  border-radius:calc(7 * var(--u));background:var(--cta-bg);color:var(--cta-fg);
  font-size:calc(11.8 * var(--u));font-weight:500;letter-spacing:-0.01em;
  transition:background .2s,transform .2s;
}
.dfoot a.dbrand__cta svg{width:calc(13 * var(--u));height:calc(13 * var(--u));margin-top:calc(-1.5 * var(--u))}
.dfoot a.dbrand__cta:hover{background:var(--cta-bg-hover);transform:translateY(-1px)}

.dbrand__copy{margin:calc(23 * var(--u)) 0 0;color:var(--muted);font-size:calc(12.2 * var(--u));letter-spacing:.01em}
/* sits bottom-right of the content block, balancing the brand column.
   The logo is the alpha-trimmed copy, so the gap is only what is set here. */
.dcredit{display:flex;align-items:center;gap:calc(7 * var(--u));margin:0;
  font-size:calc(11.8 * var(--u));font-weight:500;letter-spacing:-0.01em;color:var(--body);
  grid-column:4;justify-self:end;align-self:end}
.dcredit img{height:calc(18 * var(--u));width:auto;object-fit:contain;display:block}
.dcredit a{display:inline-flex;align-items:center;transition:opacity .2s}
.dfoot .dcredit a:hover{opacity:.6}

.dbrand__status{display:flex;flex-wrap:wrap;gap:calc(8 * var(--u));margin-top:calc(16 * var(--u))}
.dchip{
  display:inline-flex;align-items:center;gap:calc(6 * var(--u));
  height:calc(25 * var(--u));padding:0 calc(10 * var(--u));
  border:1px solid var(--chip-line);border-radius:999px;background:var(--chip-bg);
  font-size:calc(10.8 * var(--u));font-weight:500;letter-spacing:-0.01em;white-space:nowrap;
  backdrop-filter:blur(calc(6 * var(--u)));-webkit-backdrop-filter:blur(calc(6 * var(--u)));
  transition:background .2s,transform .2s;
}
.dfoot a.dchip:hover{background:rgb(var(--line) / .18);transform:translateY(-1px)}
.dchip svg{width:calc(11 * var(--u));height:calc(11 * var(--u));fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.dchip__dot{width:calc(6 * var(--u));height:calc(6 * var(--u));border-radius:999px;background:#2fb36a;box-shadow:0 0 0 calc(2.5 * var(--u)) rgb(47 179 106 / .18)}

.dcol__title{margin:0;font-size:calc(16 * var(--u));font-weight:600;line-height:1;letter-spacing:-0.045em}
.dcol__list{display:grid;gap:calc(20.5 * var(--u));margin-top:calc(24 * var(--u));font-size:calc(13.7 * var(--u));line-height:1.24;letter-spacing:.022em;color:var(--list-fg)}
.dcol--menu .dcol__list{gap:calc(15 * var(--u));margin-top:calc(21 * var(--u));font-weight:500;letter-spacing:-0.025em;color:var(--ink)}
.dcol__list a,.dcol__list span{transition:opacity .2s}
.dfoot .dcol__list a:hover{opacity:.55}
.dcol__list li{display:flex;align-items:flex-start;gap:calc(8 * var(--u))}
.dcol__list li svg{width:calc(13 * var(--u));height:calc(13 * var(--u));flex:none;margin-top:calc(2 * var(--u));opacity:.55}

@media (min-width:768px) and (max-width:1023px){
  .dfoot{--u: min(100vw / 1040, 100svh / 672)}
  .dfoot__content{grid-template-columns:calc(400 * var(--u)) calc(190 * var(--u)) calc(210 * var(--u)) 1fr;
    width:calc(1040 * var(--u));padding:calc(64 * var(--u) + var(--navclear,56px)) calc(40 * var(--u)) 0}
  .dbrand__text{max-width:calc(350 * var(--u))}
  .dfoot__wordmark{font-size:calc(var(--wmT,286) * var(--u));bottom:calc(10 * var(--u))}
}

@media (max-width:767px){
  .dfoot{--u:1px;display:flex;flex-direction:column;height:auto;min-height:100svh}
  .dfoot__stage::after{
    background:linear-gradient(to bottom,var(--paper) 0%,rgb(var(--paper-rgb) / .95) 50%,rgb(var(--paper-rgb) / .8) 68%,rgb(var(--paper-rgb) / 0) 90%);
  }
  .dfoot__content{
    grid-template-columns:auto auto auto;justify-content:space-between;
    column-gap:12px;row-gap:36px;width:100%;padding:84px 20px 0;margin-bottom:max(34vw,150px);
  }
  .dbrand{grid-column:1 / -1}
  .dbrand__title{font-size:21px}
  .dbrand__text{max-width:34em;font-size:14px}
  .dfoot a.dbrand__cta{height:38px;padding:0 18px 0 16px;border-radius:8px;font-size:13px}
  .dfoot a.dbrand__cta svg{width:14px;height:14px}
  .dbrand__copy,.dcredit{font-size:12.5px}
  .dcredit{grid-column:1 / -1;justify-self:start;gap:7px;margin-top:4px}
  .dcredit img{height:17px}
  .dchip{height:28px;font-size:12px}
  .dcol__title{font-size:15px}
  .dfoot .dcol__list,.dfoot .dcol--menu .dcol__list{gap:14px;margin-top:20px;font-size:13px;letter-spacing:0;white-space:nowrap}
  .dfoot .dcol--contact .dcol__list{white-space:normal}
  .dcol--contact a{overflow-wrap:anywhere}
  .dfoot__wordmark{bottom:5vw;font-size:27vw}
  .dfoot__fog{height:7%}
}

@media (max-width:359px){
  .dfoot__content{grid-template-columns:1fr 1fr}
}

@media (prefers-reduced-motion:reduce){
  .dfoot a.dbrand__cta,.dchip,.dcol__list a,.dcol__list span,.dcredit a{transition:none}
}
`;

export default function Footer({ brandName = "UPGRADE TALENTS INDIA", tagline, contact, links = [] }: Props) {
  const socials = Object.entries(contact?.social_media || {}).filter(([, v]) => !!v) as [string, string][];
  const year = new Date().getFullYear();
  // the giant wordmark carries just the lead word — the full name would have
  // to shrink to fit the width and lose its weight
  const wordmark = brandName.trim().split(/\s+/)[0];

  const wordRef = useRef<HTMLParagraphElement>(null);

  /* the wordmark should span ~1200u whatever the brand name is, so measure
     it once at a known size and scale from there */
  const fitWordmark = useCallback(() => {
    const el = wordRef.current;
    if (!el) return;
    const root = el.parentElement;
    if (!root) return;
    const narrow = root.clientWidth <= 767;
    const probe = narrow ? 100 : 100;
    el.style.fontSize = narrow ? `${probe}px` : `calc(${probe} * var(--u))`;
    const measured = el.scrollWidth;
    if (!measured) {
      el.style.fontSize = "";
      return;
    }
    // desktop spans ~1200 of the 1440 canvas, phones nearly the full width
    const target = root.clientWidth * (narrow ? 0.98 : 1200 / 1440);
    const size = Math.round(probe * (target / measured) * 10) / 10;
    if (narrow) {
      el.style.fontSize = `${size}px`;
      return;
    }
    el.style.fontSize = "";
    el.style.setProperty("--wm", String(size));
    el.style.setProperty("--wmT", String(size));
  }, []);

  useEffect(() => {
    const run = () => fitWordmark();
    run();
    document.fonts?.ready.then(run).catch(() => {});
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, [fitWordmark]);

  const explore = [
    { label: "All Events", href: "/events" },
    { label: "Competitions", href: "/competitions" },
    { label: "Gallery", href: "/gallery" },
    { label: "Verify Certificate", href: "/verify" },
    { label: "My Tickets", href: "/dashboard" },
  ];

  const info = links.length
    ? links.map((l) => ({ label: l.title || l.label || "Link", href: l.url || "#" }))
    : [
        { label: "About Us", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Privacy Policy", href: "/contact" },
        { label: "Terms of Service", href: "/contact" },
      ];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap" rel="stylesheet" />
      <style>{CSS}</style>

      <footer className="dfoot">
        <div className="dfoot__stage" aria-hidden>
          <video className="dfoot__video" src={VIDEO} poster={POSTER} autoPlay muted loop playsInline preload="auto" />
        </div>

        <p className="dfoot__wordmark" ref={wordRef} aria-hidden>{wordmark}</p>

        <div className="dfoot__fog" aria-hidden />

        <div className="dfoot__content">
          <div className="dbrand">
            <Link href="/" className="dbrand__logo" aria-label={`${brandName} home`}>
              <span className="dbrand__mark"><Sparkles aria-hidden /></span>
              {brandName}
            </Link>

            <h2 className="dbrand__title">Ready to take the stage?</h2>
            <p className="dbrand__text">
              {tagline || "Dance events, competitions, workshops and talent showcases — engineered for performers. Book your slot for India's most electric stages."}
            </p>

            <Link href="/events" className="dbrand__cta">
              <ArrowUpRight aria-hidden /> Browse events
            </Link>

            <p className="dbrand__copy">© {year} {brandName}. All rights reserved.</p>

            {socials.length > 0 && (
              <ul className="dbrand__status" aria-label="Follow us">
                <li className="dchip"><span className="dchip__dot" aria-hidden /> Live on every stage</li>
                {socials.map(([key, url]) => {
                  const Icon = SOCIAL_ICONS[key] || ArrowUpRight;
                  return (
                    <li key={key}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="dchip">
                        <Icon aria-hidden /> {key.charAt(0).toUpperCase() + key.slice(1)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <nav className="dcol dcol--menu" aria-label="Explore">
            <h3 className="dcol__title">Explore</h3>
            <ul className="dcol__list">
              {explore.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="dcol" aria-label="Information">
            <h3 className="dcol__title">Information</h3>
            <ul className="dcol__list">
              {info.map((l, i) => (
                <li key={`${l.href}-${i}`}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="dcol dcol--contact" aria-label="Get in touch">
            <h3 className="dcol__title">Get in touch</h3>
            <ul className="dcol__list">
              {contact?.contact_email && (
                <li>
                  <Mail aria-hidden />
                  <a href={`mailto:${contact.contact_email}`} style={{ overflowWrap: "anywhere" }}>{contact.contact_email}</a>
                </li>
              )}
              {contact?.contact_phone && (
                <li>
                  <Phone aria-hidden />
                  <a href={`tel:${contact.contact_phone}`}>{contact.contact_phone}</a>
                </li>
              )}
              {contact?.office_address && (
                <li><MapPin aria-hidden /><span>{contact.office_address}</span></li>
              )}
            </ul>
          </nav>

          <p className="dcredit">
            Designed and Developed by
            <a href="https://www.ulmind.com" target="_blank" rel="noopener noreferrer">
              <img src="/assets/ulmind-trim.png" alt="Ulmind" />
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
