import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from "@/site/pages/ShopPage";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — Upgrade Talents India" }, { name: "description", content: "Official Upgrade Talents India merchandise." }, { property: "og:title", content: "Shop — Upgrade Talents India" }, { property: "og:description", content: "Official Upgrade Talents India merchandise." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ShopPage,
});
