import type { Metadata } from "next";
import OrderDetailTracker from "@/components/shop/OrderDetailTracker";

export const metadata: Metadata = {
  title: "Order Details & Tracking",
  description: "Track your official Upgrade Talents India merchandise order and view fulfillment status.",
};

export default async function ShopOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailTracker orderId={id} />;
}
