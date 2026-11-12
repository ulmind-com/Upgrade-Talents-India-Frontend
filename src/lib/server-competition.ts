import "server-only";
import { cache } from "react";
import { publicApi, safe } from "@/lib/api";

/**
 * generateMetadata and the page body both need the competition. React's cache
 * keeps that to a single API round trip per request instead of two, which is
 * most of the delay between clicking a card and the page appearing.
 */
export const getCompetition = cache(async (id: string) => {
  const direct = await safe(publicApi.competition(id), null);
  if (direct) return direct;

  const all = await safe(publicApi.competitions({ limit: 200 }), []);
  return all.find((c: any) => (c._id || c.id) === id) || null;
});
