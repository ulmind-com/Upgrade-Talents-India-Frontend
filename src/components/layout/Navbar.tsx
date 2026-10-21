"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Menu, X, Sparkles, Ticket, User, LogOut, LayoutDashboard,
  ShoppingBag, ChevronDown, Package, Crown, Award, Coins
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationPanel";
import { useCart } from "@/components/shop/CartProvider";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import { Button, Magnetic } from "@/components/ui/Primitives";
import { useAuth } from "@/components/motion/Providers";
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

export default function Navbar({ brandName = "UPGRADE TALENTS INDIA", logo }: { brandName?: string; logo?: string }) {
  // the last word sits small under the rest — "UPGRADE TALENTS" over "INDIA"
  const words = brandName.trim().split(/\s+/);
  const lead = words.length > 1 ? words.slice(0, -1).join(" ") : words[0];
  const sub = words.length > 1 ? words[words.length - 1] : "INDIA";
  const pathname = usePathname();
  const { count, setOpen: openCart } = useCart();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 30));

  useEffect(() => {
    setOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Click outside listener for user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled ? "py-2.5 sm:py-3" : "py-4 sm:py-5"
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

        {/* Outer container with optimized padding preventing right-side overflow */}
        <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-6 xl:px-8 relative">
          <nav
            className={cn(
              "flex items-center justify-between gap-2.5 sm:gap-4 xl:gap-5 rounded-full px-3.5 py-2 transition-all duration-500 sm:px-4 md:px-5 md:py-2.5",
              scrolled
                ? "glass shadow-[0_20px_60px_-28px_rgba(0,0,0,0.9)]"
                : "on-media border border-white/10 bg-black/25 backdrop-blur-md"
            )}
          >
            {/* Brand */}
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3" aria-label={`${brandName} home`}>
              <span
                className="relative grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl transition-transform duration-500 group-hover:rotate-[12deg]"
                style={{ background: "var(--grad-brand)" }}
              >
                {isUsableImageUrl(logo) ? (
                  <img src={logo} alt="" className="size-6 sm:size-7 rounded-lg object-contain" />
                ) : (
                  <Sparkles className="size-4.5 sm:size-5 text-white" aria-hidden />
                )}
              </span>
              <span className="hidden text-[14px] sm:text-[15px] font-bold uppercase leading-[1.05] tracking-[0.14em] sm:block">
                {lead}
                <span className="block text-[8.5px] sm:text-[9px] font-medium tracking-[0.42em] text-[var(--fg-subtle)]">
                  {sub}
                </span>
              </span>
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden items-center gap-0.5 xl:flex shrink-0">
              {DESKTOP.map((item) => {
                if (item.children) {
                  const active = item.children.some((c) => pathname.startsWith(c.href));
                  return (
                    <li key={item.label} className="group relative">
                      <button
                        className={cn(
                          "relative flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] 2xl:px-3 2xl:text-[13px] font-medium transition-colors duration-300",
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
                                "block rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium transition-colors",
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
                        "relative block whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] 2xl:px-3 2xl:text-[13px] font-medium transition-colors duration-300",
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

            {/* Actions group with shrink-0 protection */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Theme toggle */}
              <ThemeSwitch />

              {/* Notification bell (when logged in) */}
              {user && <NotificationBell />}

              {/* Shopping bag cart button */}
              <button
                data-cart-target
                onClick={() => openCart(true)}
                aria-label={`Open cart${count ? `, ${count} items` : ""}`}
                className="relative grid size-9 sm:size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-all duration-300 hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                <ShoppingBag className="size-4 sm:size-[18px]" aria-hidden />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-[var(--on-accent)]" style={{ background: "var(--grad-brand)" }}>
                    <span aria-hidden>{count}</span>
                    <span role="status" aria-atomic="true" className="sr-only">
                      {count} item{count === 1 ? "" : "s"} in cart
                    </span>
                  </span>
                )}
              </button>

              {/* User Account Menu / Login Button */}
              {user ? (
                <div ref={userDropdownRef} className="relative hidden md:block">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-label="User account menu"
                    className={cn(
                      "flex size-9 sm:size-10 items-center justify-center rounded-full border bg-[var(--surface)] transition-all duration-300 cursor-pointer overflow-hidden",
                      userDropdownOpen ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    {user.profile_photo ? (
                      <img src={user.profile_photo} alt={user.name || "User"} className="size-full object-cover" />
                    ) : (
                      <span className="font-display text-xs font-bold text-[var(--accent)]">
                        {(user.name || user.email || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl z-50 backdrop-blur-xl"
                      >
                        <div className="border-b border-[var(--border)] px-3 py-2.5">
                          <p className="truncate text-xs font-bold text-white">{user.name || "Valued Artist"}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--fg-subtle)]">{user.email}</p>
                        </div>

                        <div className="py-1.5">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <LayoutDashboard className="size-4 text-[var(--accent)]" /> Dashboard
                          </Link>
                          <Link
                            href="/dashboard?tab=orders"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <Package className="size-4 text-[var(--accent)]" /> My Orders & Tracking
                          </Link>
                          <Link
                            href="/dashboard?tab=vip"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <Crown className="size-4 text-[var(--accent)]" /> VIP Passes
                          </Link>
                          <Link
                            href="/dashboard?tab=certificates"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <Award className="size-4 text-[var(--accent)]" /> Certificates
                          </Link>
                        </div>

                        <div className="border-t border-[var(--border)] pt-1.5">
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              logout();
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <LogOut className="size-4" /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  title="Sign in"
                  className="hidden size-9 sm:size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] md:grid"
                >
                  <User className="size-4 sm:size-[18px]" aria-hidden />
                </Link>
              )}

              {/* Tickets Button with shrink-0 protection */}
              <Magnetic className="hidden sm:block shrink-0">
                <Button href="/events" size="sm" className="px-4 text-[12.5px] tracking-wider shrink-0">
                  <Ticket className="size-3.5" aria-hidden /> Tickets
                </Button>
              </Magnetic>

              {/* Hamburger button for screens below xl */}
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="grid size-9 sm:size-10 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] xl:hidden shrink-0"
              >
                <Menu className="size-4 sm:size-[18px]" aria-hidden />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile overlay menu (cleanly active on xl:hidden) */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[95] xl:hidden"
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
