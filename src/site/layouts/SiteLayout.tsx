import { BRAND, brandName } from "@/shared/brand";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useToken } from "@/shared/useToken";
import { ThemeToggle } from "@/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { siteApi } from "../api";
import { publishedContent, safePublicUrl } from "@/shared/cms";
import { str } from "@/shared/format";

const links = [
  ["/events", "Events"], ["/competitions", "Competitions"], ["/learning", "Courses"],
  ["/leaderboard", "Results"], ["/shop", "Shop"], ["/rewards", "Rewards"],
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const { token } = useToken("user");
  const [open, setOpen] = useState(false);
  const { data: home } = useQuery({ queryKey: ["homepage"], queryFn: siteApi.homepage, staleTime: 30000, refetchOnWindowFocus: true, retry: false });
  return (
    <div className="site-theme min-h-screen text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <nav className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:flex lg:justify-between lg:px-8" aria-label="Main navigation">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 font-display text-xl font-bold">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ember text-primary-foreground"><Sparkles className="h-5 w-5"/></span>
            <span className="truncate">{brandName(home?.brand?.name)}</span>
          </Link>
          <div className="hidden min-w-0 items-center gap-6 text-[13px] font-semibold text-muted-foreground lg:flex">
            {links.map(([to, label]) => <Link key={to} to={to} className="nav-link hover:text-foreground" activeProps={{ className: "text-foreground" }}>{label}</Link>)}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle compact />
            <Button asChild variant={token ? "default" : "outline"} className="hidden sm:inline-flex"><Link to={token ? "/account" : "/login"}>{token ? "My account" : "Sign in"}<ArrowUpRight/></Link></Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="site-mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</Button>
          </div>
        </nav>
        {open && <div id="site-mobile-menu" className="border-t border-border bg-background px-5 py-4 lg:hidden"><div className="grid gap-1">{links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold hover:bg-secondary">{label}</Link>)}<Button asChild className="mt-3"><Link to={token ? "/account" : "/login"}>{token ? "My account" : "Sign in"}</Link></Button></div></div>}
      </header>
      <main>{children}</main>
      <footer className="site-footer border-t border-border px-5 pb-6 pt-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[minmax(0,2fr)_1fr_1fr]">
          <div className="min-w-0"><Link to="/" className="font-display text-3xl font-bold">{brandName(home?.brand?.name)}<span className="text-primary">.</span></Link><p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{home?.brand?.tagline}</p>{home?.contact && <div className="mt-6 space-y-2 text-sm text-muted-foreground"><p className="break-words">{str(home.contact.contact_email)}</p><p>{str(home.contact.contact_phone)}</p><p className="max-w-sm">{str(home.contact.office_address)}</p></div>}</div>
          <div className="space-y-3 text-sm"><p className="mb-5 font-semibold">Discover</p>{links.slice(0,4).map(([to,label])=><Link key={to} to={to} className="block text-muted-foreground hover:text-primary">{label}</Link>)}</div>
          <div className="space-y-3 text-sm"><p className="mb-5 font-semibold">Your account</p><Link to="/shop" className="block text-muted-foreground hover:text-primary">Shop</Link><Link to="/rewards" className="block text-muted-foreground hover:text-primary">Rewards</Link><Link to="/account" className="block text-muted-foreground hover:text-primary">My account</Link><Link to="/certificate/verify" className="block text-muted-foreground hover:text-primary">Verify certificate</Link></div>
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row"><p>© 2026 {brandName(home?.brand?.name)}</p><div className="flex flex-wrap gap-5">{publishedContent(home?.important_links).map(item => <a key={str(item._id ?? item.url)} href={safePublicUrl(item.url)} target="_blank" rel="noreferrer" className="hover:text-primary">{str(item.label)}</a>)}</div></div>
      </footer>
    </div>
  );
}
