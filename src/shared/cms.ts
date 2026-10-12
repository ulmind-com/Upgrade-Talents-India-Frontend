export type ContentRecord = Record<string, unknown>;
export type HomepageContent = {
  brand?: { name?: string; tagline?: string; logo?: string; title?: string; description?: string };
  upcoming_events?: ContentRecord[];
  live_events?: ContentRecord[];
  sponsored_banners?: ContentRecord[];
  testimonials?: ContentRecord[];
  courses?: ContentRecord[];
  workshops?: ContentRecord[];
  contest_promotions?: ContentRecord[];
  app_promotion?: ContentRecord;
  contact?: ContentRecord;
  important_links?: ContentRecord[];
};

export function safePublicUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined; } catch { return undefined; }
}

export function publishedContent(items: ContentRecord[] | undefined) {
  return (items ?? []).filter((item) => item.is_published !== false && item.is_visible !== false && item.is_enabled !== false).sort((a,b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0));
}