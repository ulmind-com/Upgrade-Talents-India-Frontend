import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingFlow from "@/components/events/BookingFlow";
import { getEventById, getRelatedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEventById(id);
  return { title: ev ? `Seats & Tickets — ${ev.title}` : "Book tickets" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const related = await getRelatedEvents(id);

  return <BookingFlow event={event} related={related} />;
}
