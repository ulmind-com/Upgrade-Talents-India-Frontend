import { createFileRoute } from "@tanstack/react-router";
import { EventsPage } from "@/site/pages/EventsPage";

export const Route = createFileRoute("/events/")({
  head: () => ({ meta: [{ title: "All Events — Upgrade Talents India" }, { name: "description", content: "Browse every upcoming Upgrade Talents India event and book your tickets." }, { property: "og:title", content: "All Events — Upgrade Talents India" }, { property: "og:description", content: "Browse every upcoming Upgrade Talents India event and book your tickets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: EventsPage,
});
