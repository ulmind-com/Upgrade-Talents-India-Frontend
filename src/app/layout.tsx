import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider, SmoothScroll, ThemeProvider } from "@/components/motion/Providers";
import { CartProvider } from "@/components/shop/CartProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
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
  /* Both calls sit on every page render, so they go out together rather
     than one after the other. */
  const [settings, links] = await Promise.all([
    safe(publicApi.settings(), {} as Record<string, any>),
    safe(publicApi.importantLinks(), [] as Awaited<ReturnType<typeof publicApi.importantLinks>>),
  ]);
  const contact = {
    contact_email: settings?.contact_email,
    contact_phone: settings?.contact_phone,
    office_address: settings?.office_address,
    social_media: settings?.social_media,
  };

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&family=Anton&family=Oswald:wght@400;500;600;700&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-display:'Cormorant Garamond',Georgia,serif;--font-sans:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono',ui-monospace,monospace;--font-hero:'Cormorant Garamond',Georgia,serif;--font-street:'Anton',system-ui,sans-serif;--font-cond:'Oswald','Inter',system-ui,sans-serif;--font-marker:'Permanent Marker',cursive;--font-serif:'Playfair Display',Georgia,serif;}`}</style>
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
            <NotificationProvider>
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
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
