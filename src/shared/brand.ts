/**
 * Single source of truth for the platform identity.
 * The platform was renamed from "Eventora" to "Upgrade Talents India".
 */
export const BRAND = {
  name: "Upgrade Talents India",
  mark: "Upgrade Talents",
  tail: "India",
  legacy: "Eventora",
} as const;

/**
 * The external backend can still publish the legacy brand in its site settings,
 * so the new identity wins until that value is updated in the admin panel.
 */
export function brandName(fromCms?: string | null) {
  const value = fromCms?.trim();
  if (!value || value.toLowerCase().includes(BRAND.legacy.toLowerCase())) return BRAND.name;
  return value;
}

/** Swap the legacy brand anywhere published copy still mentions it. */
export function replaceBrand(text?: string | null) {
  if (!text) return "";
  return text.replace(new RegExp(BRAND.legacy, "gi"), BRAND.name);
}
