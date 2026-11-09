import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingFlow from "@/components/events/BookingFlow";
import { getEventById, getRelatedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEventById(id);
  return {
    title: ev ? `${ev.title} — BookMyShow Cinema Experience` : "Event Tickets",
    description: ev?.description?.slice(0, 150) || "Interactive visual seat booking and event passes.",
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = await getEventById(id);
  if (!ev) notFound();

  const related = await getRelatedEvents(id);

  return <BookingFlow event={ev} related={related} />;
}
