import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import LeaderboardView from "@/components/events/LeaderboardView";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live contestant rankings, scores and results across Upgrade Talents competitions.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage() {
  const comps = await safe(publicApi.competitions({ limit: 50 }), []);
  const first = comps?.[0];
  const firstId = first?._id || first?.id || "";
  const initial = firstId ? await safe(publicApi.leaderboard(firstId), { leaderboard: [] }) : { leaderboard: [] };

  return (
    <>
      <PageHero
        title="Leaderboard"
        subtitle="Every vote, every score — ranked in real time."
        seed={3}
        compact
      />
      <LeaderboardView competitions={comps || []} initialCompId={firstId} initialRows={initial?.leaderboard || []} />
    </>
  );
}
