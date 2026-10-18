import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import CompetitionDetail from "@/components/events/CompetitionDetail";
import { publicApi, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const all = await safe(publicApi.competitions({ limit: 200 }), []);
  const comp = all.find((c: any) => (c._id || c.id) === id);
  return { title: comp?.title || comp?.name || "Competition" };
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await safe(publicApi.competitions({ limit: 200 }), []);
  const comp = all.find((c: any) => (c._id || c.id) === id) || { _id: id, title: "Competition" };
  const lb = await safe(publicApi.leaderboard(id), { leaderboard: [] });

  return (
    <>
      <PageHero
        title={comp.title || comp.name || "Competition"}
        subtitle={comp.prize ? `Prize pool · ${comp.prize}` : "Register, submit and compete."}
        image={comp.image_url}
        seed={6}
        compact
      />
      <CompetitionDetail comp={comp} initialLeaderboard={lb?.leaderboard || []} />
    </>
  );
}
