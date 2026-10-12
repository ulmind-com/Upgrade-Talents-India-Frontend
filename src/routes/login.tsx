import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/site/pages/AuthPages";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Upgrade Talents India" }, { name: "description", content: "Sign in to your Upgrade Talents India account." }, { property: "og:title", content: "Sign in — Upgrade Talents India" }, { property: "og:description", content: "Sign in to your Upgrade Talents India account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: LoginPage,
});
