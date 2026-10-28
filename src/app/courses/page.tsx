import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import LearnListing from "@/components/events/LearnListing";
import { publicApi, safe } from "@/lib/api";

export const metadata: Metadata = { title: "Courses", description: "Dance courses and masterclasses led by professional choreographers." };
export const revalidate = 15;

export default async function CoursesPage() {
  const items = await safe(publicApi.courses({ limit: 50 }), []);
  return (
    <>
      <PageHero title="Courses" subtitle="Train with choreographers who build champions." image={items[0]?.thumbnail} seed={5} compact />
      <LearnListing items={items} kind="course" />
    </>
  );
}
