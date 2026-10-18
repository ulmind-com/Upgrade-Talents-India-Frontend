import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearnDetail from "@/components/events/LearnDetail";
import { publicApi, safe } from "@/lib/api";

export const revalidate = 120;

async function findWorkshop(id: string) {
  const items = await safe(publicApi.workshops({ limit: 200 }), []);
  return items.find((w) => w._id === id) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const workshop = await findWorkshop(id);
  if (!workshop) return { title: "Workshop" };
  return { title: workshop.title, description: workshop.description?.slice(0, 160) };
}

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workshop = await findWorkshop(id);
  if (!workshop) notFound();
  return <LearnDetail item={workshop} kind="workshop" />;
}
