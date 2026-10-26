import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import CompetitionResults from "@/components/events/CompetitionResults";
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
  return {
    title: `${comp?.title || comp?.name || "Competition"} — Official Results`,
    description: `Official leaderboard and final rankings for ${comp?.title || "Competition"}.`,
  };
}

export default async function CompetitionResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let comp = await safe(publicApi.competition(id), null);
  if (!comp) {
    const all = await safe(publicApi.competitions({ limit: 200 }), []);
    comp = all.find((c: any) => (c._id || c.id) === id) || { _id: id, title: "Competition" };
  }

  const snapshot = await safe(publicApi.results(id), null);

  return (
    <>
      <PageHero
        title={`${comp.title || comp.name || "Competition"} — Official Results`}
        subtitle="Certified rankings, scores and judge reviews."
        image={comp.image_url}
        seed={7}
        compact
      />
      <CompetitionResults compId={id} comp={comp} initialSnapshot={snapshot} />
    </>
  );
}
