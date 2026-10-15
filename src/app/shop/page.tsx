import type { Metadata } from "next";
import PageHero from "@/components/events/PageHero";
import ShopListing from "@/components/shop/ShopListing";
import { shopApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Shop",
  description: "Official Upgrade Talents merchandise — hoodies, tees, caps and more.",
};
export const revalidate = 120;

export default async function ShopPage() {
  const items = await safe(shopApi.products({ limit: 60 }), []);
  return (
    <>
      <PageHero title="Shop" subtitle="Wear the movement. Official event merch." image={items?.[0]?.images?.[0]} seed={7} compact />
      <ShopListing items={items || []} />
    </>
  );
}
