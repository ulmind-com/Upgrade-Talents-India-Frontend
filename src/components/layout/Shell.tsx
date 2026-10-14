"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import { ScrollProgress } from "@/components/motion/Reveal";

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
  return (
    <>
      <ScrollProgress />
      <Navbar brandName={brandName} logo={logo} />
      <main id="main" className="min-h-dvh">{children}</main>
      <Footer brandName={brandName} tagline={tagline} contact={contact} links={links} />
    </>
  );
}
