import { createFileRoute } from "@tanstack/react-router";
import { EventDetailPage } from "@/site/pages/EventDetailPage";

export const Route = createFileRoute("/events/$id")({
  head: () => ({ meta: [{ title: "Event details — Upgrade Talents India" }, { name: "description", content: "Event details, tickets and VIP passes on Upgrade Talents India." }, { property: "og:title", content: "Event details — Upgrade Talents India" }, { property: "og:description", content: "Event details, tickets and VIP passes on Upgrade Talents India." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <EventDetailPage id={id} />;
}
