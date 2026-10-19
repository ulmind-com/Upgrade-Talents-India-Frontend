"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Moon, Sparkles, Ticket, User, LogOut, LayoutDashboard, ShoppingBag, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationPanel";
import { useCart } from "@/components/shop/CartProvider";
import { Button, Magnetic } from "@/components/ui/Primitives";
import { useAuth, useTheme } from "@/components/motion/Providers";
import { cn, isUsableImageUrl } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Competitions", href: "/competitions" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Shop", href: "/shop" },
  { label: "VIP", href: "/vip" },
  { label: "Courses", href: "/courses" },
  { label: "Workshops", href: "/workshops" },
  { label: "Contact", href: "/contact" },
];

// Desktop groups the learning pages into a dropdown to keep the bar uncluttered.
const DESKTOP: { label: string; href?: string; children?: { label: string; href: string }[] }[] = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Competitions", href: "/competitions" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Shop", href: "/shop" },
  { label: "VIP", href: "/vip" },
  { label: "Learn", children: [{ label: "Courses", href: "/courses" }, { label: "Workshops", href: "/workshops" }] },
  { label: "Contact", href: "/contact" },
];

export default function Navbar({ brandName = "UPGRADE TALENTS", logo }: { brandName?: string; logo?: string }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { count, setOpen: openCart } = useCart();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled ? "py-3" : "py-5"
        )}
      >
        {/* Top scrim — keeps nav legible over bright hero imagery (both themes) */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-32 transition-opacity duration-500",
            scrolled ? "opacity-0" : "opacity-100"
          )}
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.34) 45%, transparent 100%)",
          }}
        />
        <div className="container-x relative">
          <nav
            className={cn(
              "flex items-center justify-between gap-6 rounded-full px-4 py-2.5 transition-all duration-500 md:px-5",
              scrolled
                ? "glass shadow-[0_20px_60px_-28px_rgba(0,0,0,0.9)]"
                : "on-media border border-transparent bg-transparent"
            )}
          >
            {/* Brand */}
            <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label={`${brandName} home`}>
              <span
                className="relative grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-500 group-hover:rotate-[12deg]"
                style={{ background: "var(--grad-brand)" }}
              >
                {isUsableImageUrl(logo) ? (
                  <img src={logo} alt="" className="size-7 rounded-lg object-contain" />
                ) : (
                  <Sparkles className="size-5 text-white" aria-hidden />
                )}
              </span>
              <span className="hidden text-[15px] font-bold uppercase leading-[1.05] tracking-[0.14em] sm:block">
                {brandName.split(" ")[0]}
                <span className="block text-[9px] font-medium tracking-[0.42em] text-[var(--fg-subtle)]">
                  {brandName.split(" ").slice(1).join(" ") || "INDIA"}
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <ul className="hidden items-center gap-0.5 xl:flex">
              {DESKTOP.map((item) => {
                if (item.children) {
                  const active = item.children.some((c) => pathname.startsWith(c.href));
                  return (
                    <li key={item.label} className="group relative">
                      <button
                        className={cn(
                          "relative flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition-colors duration-300",
                          active ? "text-[var(--fg)]" : "text-[var(--fg-muted)] group-hover:text-[var(--fg)]"
                        )}
                      >
                        {item.label}
                        <ChevronDown className="size-3.5 transition-transform duration-300 group-hover:rotate-180" aria-hidden />
                      </button>
                      <div className="invisible absolute left-1/2 top-full z-50 w-44 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.55)]">
                          {item.children.map((c) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={cn(
                                "block rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                                pathname.startsWith(c.href) ? "bg-[var(--surface-2)] text-[var(--fg)]" : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                              )}
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                }
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href!}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative block whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition-colors duration-300",
                        active ? "text-[var(--fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 -z-10 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                aria-label={`Switch to ${theme === "dark" ? "blue" : "dark"} theme`}
                className="grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                  {theme === "dark" ? <Moon className="size-[18px]" aria-hidden /> : <Sparkles className="size-[18px]" aria-hidden />}
                </motion.span>
              </button>

              {user && <NotificationBell />}

              <button
                onClick={() => openCart(true)}
                aria-label={`Open cart${count ? `, ${count} items` : ""}`}
                className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                <ShoppingBag className="size-[18px]" aria-hidden />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                    <span aria-hidden>{count}</span>
                    <span role="status" aria-atomic="true" className="sr-only">
                      {count} item{count === 1 ? "" : "s"} in cart
                    </span>
                  </span>
                )}
              </button>

              {user ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link
                    href="/dashboard"
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                    aria-label="My dashboard"
                  >
                    <LayoutDashboard className="size-[18px]" aria-hidden />
                  </Link>
                  <button
                    onClick={logout}
                    aria-label="Log out"
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:text-[var(--danger)]"
                  >
                    <LogOut className="size-[18px]" aria-hidden />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  title="Sign in"
                  className="hidden size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] md:grid"
                >
                  <User className="size-[18px]" aria-hidden />
                </Link>
              )}

              <Magnetic className="hidden sm:block">
                <Button href="/events" size="sm" className="px-5">
                  <Ticket className="size-4" aria-hidden /> Tickets
                </Button>
              </Magnetic>

              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="grid size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] xl:hidden"
              >
                <Menu className="size-[18px]" aria-hidden />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[95] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-2xl" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col gap-8 overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-elevated)] px-7 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--fg-subtle)]">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-11 cursor-pointer place-items-center rounded-full border border-[var(--border)]"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <ul className="flex flex-col gap-1">
                {NAV.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={item.href}
                      className="flex min-h-[56px] items-center justify-between border-b border-[var(--border)] font-display text-3xl font-bold tracking-tight transition-colors hover:text-[var(--accent)]"
                    >
                      {item.label}
                      <span className="font-mono text-[11px] text-[var(--fg-subtle)]">0{i + 1}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3">
                {user ? (
                  <>
                    <Button href="/dashboard" variant="outline" size="lg" className="w-full">
                      <LayoutDashboard className="size-4" aria-hidden /> Dashboard
                    </Button>
                    <Button onClick={logout} variant="ghost" size="lg" className="w-full">
                      <LogOut className="size-4" aria-hidden /> Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href="/login" variant="outline" size="lg" className="w-full">Sign in</Button>
                    <Button href="/register" size="lg" className="w-full">Create account</Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
