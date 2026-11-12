import { cache } from "react";
import { activitiesApi, publicApi, safe, type EventItem } from "@/lib/api";

/**
 * The backend exposes event collections (not a single-event endpoint),
 * so a detail lookup resolves against the published list first and
 * falls back to the broader activities feed.
 */
/* Cached per request so generateMetadata and the page share one lookup. */
export const getEventById = cache(async (id: string): Promise<EventItem | null> => {
  const direct = await safe(activitiesApi.eventById(id), null);
  if (direct) return direct;

  const published = await safe(publicApi.upcomingEvents({ limit: 100 }), [] as EventItem[]);
  const hit = published.find((e) => e._id === id);
  if (hit) return hit;

  const all = await safe(activitiesApi.events({ limit: 100 }), [] as EventItem[]);
  return all.find((e) => e._id === id) ?? null;
});

export async function getRelatedEvents(id: string, limit = 3): Promise<EventItem[]> {
  const published = await safe(publicApi.upcomingEvents({ limit: 20 }), [] as EventItem[]);
  return published.filter((e) => e._id !== id).slice(0, limit);
}
