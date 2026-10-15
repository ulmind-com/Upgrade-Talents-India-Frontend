import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import VipListing, { type Offering } from "@/components/events/VipListing";
import { publicApi, vipApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "VIP Passes",
  description: "VIP and backstage passes for Upgrade Talents events — lounge access, meet & greet and more.",
};
export const revalidate = 60;

export default async function VipPage() {
  const events = await safe(publicApi.upcomingEvents({ limit: 15 }), []);
  const nested = await Promise.all(
    (events || []).map(async (e: any) => {
      const cfgs = await safe(vipApi.forEvent(e._id || e.id), []);
      return (cfgs || []).map((c: any) => ({ event: e, config: c }) as Offering);
    })
  );
  const offerings: Offering[] = nested.flat();

  return (
    <>
      <PageHero title="VIP Access" subtitle="Lounge, backstage and the best seats in the house." image={events?.[0]?.image_url} seed={4} compact />
      <VipListing offerings={offerings} />
    </>
  );
}
