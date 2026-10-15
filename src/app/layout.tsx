import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider, SmoothScroll, ThemeProvider } from "@/components/motion/Providers";
import { CartProvider } from "@/components/shop/CartProvider";
import Shell from "@/components/layout/Shell";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: {
    default: "Upgrade Talents India — Dance Events, Competitions & Workshops",
    template: "%s | Upgrade Talents India",
  },
  description:
    "Book tickets for India's most electric dance events, competitions, masterclasses and workshops. Live stages, world-class choreographers, instant digital tickets.",
  openGraph: {
    title: "Upgrade Talents India",
    description: "Dance events, competitions and workshops — book your stage.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05060d" },
    { media: "(prefers-color-scheme: light)", color: "#e8eeff" },
  ],
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('uti_theme');document.documentElement.setAttribute('data-theme',t==='blue'?'blue':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await safe(publicApi.settings(), {} as Record<string, any>);
  const contact = {
    contact_email: settings?.contact_email,
    contact_phone: settings?.contact_phone,
    office_address: settings?.office_address,
    social_media: settings?.social_media,
  };
  const links = await safe(publicApi.importantLinks(), []);

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&family=Poppins:wght@300;400;500;600;700;800&family=Anton&family=Oswald:wght@400;500;600;700&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-display:'Archivo Black','Inter',system-ui,sans-serif;--font-sans:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono',ui-monospace,monospace;--font-hero:'Poppins','Inter',system-ui,sans-serif;--font-street:'Anton','Archivo Black',system-ui,sans-serif;--font-cond:'Oswald','Inter',system-ui,sans-serif;--font-marker:'Permanent Marker',cursive;--font-serif:'Playfair Display',Georgia,serif;}`}</style>
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-[var(--accent)] focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--on-accent)]"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
            <SmoothScroll>
              <Shell
                brandName={settings?.brand_name || "UPGRADE TALENTS"}
                logo={settings?.logo_url}
                tagline={settings?.tagline}
                contact={contact}
                links={links}
              >
                {children}
              </Shell>
            </SmoothScroll>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
