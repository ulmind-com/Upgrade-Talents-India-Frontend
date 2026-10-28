import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import CompetitionsListing from "@/components/events/CompetitionsListing";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Competitions",
  description: "Enter talent competitions and contests — register, submit your entry and climb the leaderboard.",
};
export const revalidate = 15;

export default async function CompetitionsPage() {
  const items = await safe(publicApi.competitions({ limit: 200 }), []);
  return (
    <>
      <PageHero
        title="Competitions"
        subtitle="Register, perform, submit — and climb the leaderboard."
        image={items?.[0]?.image_url}
        seed={6}
        compact
      />
      <CompetitionsListing items={items || []} />
    </>
  );
}
