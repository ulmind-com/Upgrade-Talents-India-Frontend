"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, Ticket, Trophy, Crown, User, ShoppingBag,
  Gavel, ScanLine, LogOut, Award
} from "lucide-react";
import { useAuth } from "@/components/motion/Providers";
import { useCart } from "@/components/shop/CartProvider";
import { cn } from "@/lib/utils";

export default function MobileAppTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isJudge, isVolunteer } = useAuth();
  const { count } = useCart();

  const handleHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const handleSignOut = () => {
    handleHaptic();
    logout();
    if (isJudge) router.replace("/judge/login");
    else if (isVolunteer) router.replace("/volunteer/login");
    else router.replace("/login");
  };

  // ── Role: JUDGE ──
  if (isJudge) {
    const judgeTabs = [
      {
        id: "judge-scoring",
        label: "Scoring",
        href: "/judge",
        Icon: Gavel,
        active: pathname.startsWith("/judge"),
      },
      {
        id: "judge-competitions",
        label: "Contests",
        href: "/competitions",
        Icon: Award,
        active: pathname.startsWith("/competitions"),
      },
      {
        id: "judge-leaderboard",
        label: "Standings",
        href: "/leaderboard",
        Icon: Trophy,
        active: pathname.startsWith("/leaderboard"),
      },
    ];

    return (
      <nav
        aria-label="Judge mobile app navigation"
        className="fixed inset-x-0 bottom-0 z-[70] block md:hidden border-t border-[var(--border)] bg-[var(--bg)]/92 backdrop-blur-2xl shadow-[0_-10px_35px_rgba(0,0,0,0.55)] px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around">
          {judgeTabs.map((tab) => {
            const { Icon } = tab;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={handleHaptic}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center py-1.5 text-center transition-transform active:scale-90",
                  tab.active ? "text-[var(--accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                )}
              >
                <span className="relative flex size-6 items-center justify-center">
                  <Icon className={cn("size-5 transition-transform duration-300", tab.active && "scale-110 drop-shadow-[0_0_8px_var(--accent)]")} />
                </span>
                <span className={cn("mt-1 font-sans text-[10px] tracking-tight", tab.active ? "font-bold text-[var(--accent)]" : "font-medium")}>
                  {tab.label}
                </span>
                {tab.active && (
                  <motion.span
                    layoutId="mobile-app-tab-active"
                    className="absolute -top-1.5 h-1 w-6 rounded-full"
                    style={{ background: "var(--grad-brand)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex flex-1 flex-col items-center justify-center py-1.5 text-center text-red-400 active:scale-90 transition-transform cursor-pointer"
          >
            <span className="relative flex size-6 items-center justify-center">
              <LogOut className="size-5" />
            </span>
            <span className="mt-1 font-sans text-[10px] font-semibold tracking-tight text-red-400">
              Sign Out
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // ── Role: VOLUNTEER ──
  if (isVolunteer) {
    return (
      <nav
        aria-label="Volunteer mobile app navigation"
        className="fixed inset-x-0 bottom-0 z-[70] block md:hidden border-t border-white/10 bg-[#070913]/95 backdrop-blur-2xl shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around">
          <Link
            href="/volunteer"
            onClick={handleHaptic}
            className="relative flex flex-1 flex-col items-center justify-center py-1.5 text-center text-cyan-400 active:scale-90 transition-transform"
          >
            <span className="relative flex size-6 items-center justify-center">
              <ScanLine className="size-5.5 scale-110 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
            </span>
            <span className="mt-1 font-sans text-[10.5px] font-bold tracking-tight text-cyan-300">
              Scanner Terminal
            </span>
            <motion.span
              layoutId="mobile-app-tab-active"
              className="absolute -top-1.5 h-1 w-8 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </Link>

          <button
            onClick={handleSignOut}
            className="flex flex-1 flex-col items-center justify-center py-1.5 text-center text-red-400 active:scale-90 transition-transform cursor-pointer"
          >
            <span className="relative flex size-6 items-center justify-center">
              <LogOut className="size-5" />
            </span>
            <span className="mt-1 font-sans text-[10px] font-semibold tracking-tight text-red-400">
              Sign Out
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // ── Role: REGULAR AUDIENCE / PARTICIPANT (Consumer Native App Dock) ──
  const consumerTabs = [
    {
      id: "tab-home",
      label: "Home",
      href: "/",
      Icon: Home,
      active: pathname === "/",
    },
    {
      id: "tab-events",
      label: "Events",
      href: "/events",
      Icon: Ticket,
      active: pathname.startsWith("/events"),
    },
    {
      id: "tab-competitions",
      label: "Compete",
      href: "/competitions",
      Icon: Trophy,
      active: pathname.startsWith("/competitions"),
    },
    {
      id: "tab-leaderboard",
      label: "Ranks",
      href: "/leaderboard",
      Icon: Crown,
      active: pathname.startsWith("/leaderboard"),
    },
    {
      id: "tab-account",
      label: user ? "Account" : "Sign In",
      href: user ? "/dashboard" : "/login",
      Icon: User,
      active: pathname.startsWith("/dashboard") || pathname.startsWith("/login") || pathname.startsWith("/register"),
      badge: count > 0 ? count : undefined,
    },
  ];

  return (
    <nav
      aria-label="Mobile app dock navigation"
      className="fixed inset-x-0 bottom-0 z-[70] block md:hidden border-t border-[var(--border)] bg-[var(--bg)]/92 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.55)] px-1.5 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between">
        {consumerTabs.map((tab) => {
          const { Icon } = tab;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={handleHaptic}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-200 active:scale-90",
                tab.active ? "text-[var(--accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              )}
            >
              <span className="relative flex size-6 items-center justify-center">
                <Icon className={cn("size-5 transition-transform duration-300", tab.active && "scale-110 drop-shadow-[0_0_8px_var(--accent)]")} />
                {tab.badge !== undefined && (
                  <span
                    className="absolute -right-2 -top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>

              <span className={cn("mt-1 font-sans text-[10px] tracking-tight transition-colors", tab.active ? "font-bold text-[var(--accent)]" : "font-medium text-[var(--fg-subtle)]")}>
                {tab.label}
              </span>

              {tab.active && (
                <motion.span
                  layoutId="mobile-app-tab-active"
                  className="absolute -top-2 h-1 w-6 rounded-full"
                  style={{ background: "var(--grad-brand)" }}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
