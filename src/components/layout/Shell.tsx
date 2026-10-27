"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { ScrollProgress } from "@/components/motion/Reveal";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useAuth } from "@/components/motion/Providers";

export default function Shell({
  children,
  brandName,
  logo,
  tagline,
  contact,
  links,
}: {
  children: React.ReactNode;
  brandName?: string;
  logo?: string;
  tagline?: string;
  contact?: any;
  links?: any[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isJudge, isVolunteer, loading } = useAuth();

  const isKiosk = pathname.startsWith("/volunteer") || pathname.startsWith("/judge");

  // Keep Judges and Volunteers strictly confined to their dedicated portals
  useEffect(() => {
    if (loading) return;
    if (isJudge) {
      const isAllowed =
        pathname.startsWith("/judge") ||
        pathname.startsWith("/competitions") ||
        pathname.startsWith("/leaderboard");
      if (!isAllowed) {
        router.replace("/judge");
      }
    } else if (isVolunteer) {
      const isAllowed = pathname.startsWith("/volunteer");
      if (!isAllowed) {
        router.replace("/volunteer");
      }
    }
  }, [isJudge, isVolunteer, pathname, loading, router]);

  if (isKiosk) {
    return <main id="main" className="min-h-dvh">{children}</main>;
  }

  const isStaffRole = isJudge || isVolunteer;

  return (
    <>
      <ScrollProgress />
      <Navbar brandName={brandName} logo={logo} />
      {!isStaffRole && <NotificationPanel />}
      <main id="main" className="min-h-dvh">{children}</main>
      {!isStaffRole && <Footer brandName={brandName} tagline={tagline} contact={contact} links={links} />}
    </>
  );
}
