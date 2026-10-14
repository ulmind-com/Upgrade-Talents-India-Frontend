import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import LearnListing from "@/components/events/LearnListing";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Workshops", description: "Intensive dance workshops, bootcamps and technique labs." };
export const revalidate = 120;

export default async function WorkshopsPage() {
  const items = await safe(publicApi.workshops({ limit: 50 }), []);
  return (
    <>
      <PageHero title="Workshops" subtitle="Short, intense, transformative." image={items[0]?.thumbnail} seed={2} compact />
      <LearnListing items={items} kind="workshop" />
    </>
  );
}
