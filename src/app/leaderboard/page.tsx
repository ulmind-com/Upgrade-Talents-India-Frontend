import type { Metadata } from "next";
import { Suspense } from "react";
import PageHero from "@/components/events/PageHero";
import LeaderboardView from "@/components/events/LeaderboardView";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live contestant rankings, scores and results across Upgrade Talents competitions.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LeaderboardPage({ searchParams }: Props) {
  const resolvedParams = searchParams ? await searchParams : {};
  const requestedCompId =
    (typeof resolvedParams?.competition === "string"
      ? resolvedParams.competition
      : typeof resolvedParams?.comp_id === "string"
      ? resolvedParams.comp_id
      : typeof resolvedParams?.id === "string"
      ? resolvedParams.id
      : "") || "";

  const comps = await safe(publicApi.competitions({ limit: 50 }), []);

  // Find if requested competition is already in the fetched list
  let targetComp = requestedCompId
    ? comps.find((c: any) => (c._id || c.id) === requestedCompId)
    : null;

  // If requested competition is not in the list (e.g. older/custom id), fetch directly
  if (!targetComp && requestedCompId) {
    const single = await safe(publicApi.competition(requestedCompId), null);
    if (single && (single._id || single.id)) {
      comps.unshift(single);
      targetComp = single;
    }
  }

  const selectedComp = targetComp || comps?.[0];
  const selectedId = selectedComp?._id || selectedComp?.id || requestedCompId || "";
  const initial = selectedId ? await safe(publicApi.leaderboard(selectedId), { leaderboard: [] }) : { leaderboard: [] };

  return (
    <>
      <PageHero
        title="Leaderboard"
        subtitle="Every vote, every score — ranked in real time."
        seed={3}
        compact
      />
      <Suspense fallback={<div className="container-x py-24 text-center text-sm text-[var(--fg-subtle)]">Loading competition standings…</div>}>
        <LeaderboardView
          competitions={comps || []}
          initialCompId={selectedId}
          initialRows={initial?.leaderboard || []}
        />
      </Suspense>
    </>
  );
}
