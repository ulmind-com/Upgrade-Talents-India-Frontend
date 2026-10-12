import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/site/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Upgrade Talents India — Premium Events & VIP Experiences" }, { name: "description", content: "Discover cinematic concerts, summits and festivals. Book tickets and VIP passes in seconds." }, { property: "og:title", content: "Upgrade Talents India — Premium Events & VIP Experiences" }, { property: "og:description", content: "Discover cinematic concerts, summits and festivals. Book tickets and VIP passes in seconds." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: HomePage,
});
