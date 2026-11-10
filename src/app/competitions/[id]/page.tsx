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
  const imageUrl = comp?.card_image_url || comp?.image_url || comp?.banner_image_url || `${siteUrl}/og-image.jpg`;

  return {
    title: `${title} | Upgrade Talents India`,
    description,
    openGraph: {
      title: `${title} — Official Competition`,
      description,
      url: pageUrl,
      siteName: "Upgrade Talents India",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
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
