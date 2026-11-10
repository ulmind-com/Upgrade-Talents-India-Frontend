import type { Metadata } from "next";
import CompetitionHero from "@/components/events/CompetitionHero";
import CompetitionDetail from "@/components/events/CompetitionDetail";
import { publicApi, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let comp = await safe(publicApi.competition(id), null);
  if (!comp) {
    const all = await safe(publicApi.competitions({ limit: 200 }), []);
    comp = all.find((c: any) => (c._id || c.id) === id);
  }

  const title = comp?.title || comp?.name || "Official Talent Competition";
  const descRaw = comp?.description || "Join the official talent competition on Upgrade Talents India! Register now, showcase your talent on stage, and win exciting prizes.";
  const description = descRaw
    .replace(/[━─—_\-=*#✨🏆💎💰🔥\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://upgradetalentsindia.in";
  const pageUrl = `${siteUrl.replace(/\/$/, "")}/competitions/${id}`;
  
  // Prefer dedicated social share image, then mobile banner/poster, then card/cover image
  const rawImage =
    comp?.share_image_url ||
    comp?.banner_image_url ||
    comp?.card_image_url ||
    comp?.image_url;

  let imageUrl = rawImage;
  if (!imageUrl) {
    imageUrl = `${siteUrl.replace(/\/$/, "")}/assets/og-poster-fallback.jpg`;
  } else if (imageUrl.startsWith("/")) {
    imageUrl = `${siteUrl.replace(/\/$/, "")}${imageUrl}`;
  }

  return {
    title: `${title} | Upgrade Talents India`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${title} — Official Talent Competition`,
      description,
      url: pageUrl,
      siteName: "Upgrade Talents India",
      locale: "en_IN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Upgrade Talents India`,
      description,
      images: [imageUrl],
      creator: "@UpgradeTalents",
    },
  };
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let comp = await safe(publicApi.competition(id), null);
  if (!comp) {
    const all = await safe(publicApi.competitions({ limit: 200 }), []);
    comp = all.find((c: any) => (c._id || c.id) === id) || { _id: id, title: "Competition" };
  }
  const lb = await safe(publicApi.leaderboard(id), { leaderboard: [] });

  return (
    <>
      <CompetitionHero comp={comp} />
      <CompetitionDetail comp={comp} initialLeaderboard={lb?.leaderboard || []} />
    </>
  );
}
