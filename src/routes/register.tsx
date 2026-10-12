import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/site/pages/AuthPages";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Upgrade Talents India" }, { name: "description", content: "Join Upgrade Talents India to book events and VIP passes." }, { property: "og:title", content: "Create account — Upgrade Talents India" }, { property: "og:description", content: "Join Upgrade Talents India to book events and VIP passes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: RegisterPage,
});
