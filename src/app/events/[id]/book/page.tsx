import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TicketsHero from "@/components/events/TicketsHero";
import BookingFlow from "@/components/events/BookingFlow";
import { getEventById } from "@/lib/events";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEventById(id);
  return { title: ev ? `Tickets — ${ev.title}` : "Book tickets" };
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <>
      <TicketsHero
        left="Event"
        right="Tickets"
        blurb="A flexible system. Choose the best option and start your dance journey with us!"
        image={event.image_url}
        seed={3}
      />
      <BookingFlow event={event} />
    </>
  );
}
