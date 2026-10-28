import type { Metadata } from "next";
import ShopListing from "@/components/shop/ShopListing";
import { shopApi, safe } from "@/lib/api";

export const metadata: Metadata = {
  title: "Shop",
  description: "Official Upgrade Talents merchandise — hoodies, tees, caps and more.",
};
export const revalidate = 15;

export default async function ShopPage() {
  const items = await safe(shopApi.products({ limit: 60 }), []);
  return (
    <ShopListing items={items || []} />
  );
}
