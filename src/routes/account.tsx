import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/site/pages/AccountPage";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — Upgrade Talents India" }, { name: "description", content: "Your bookings, tickets, VIP passes and rewards." }, { property: "og:title", content: "My account — Upgrade Talents India" }, { property: "og:description", content: "Your bookings, tickets, VIP passes and rewards." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AccountPage,
});
