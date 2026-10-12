export function fmtDate(d?: unknown) {
  if (!d || typeof d !== "string") return "Date TBA";
  const x = new Date(d);
  if (isNaN(x.getTime())) return d;
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtPrice(p?: unknown) {
  const n = Number(p ?? 0);
  return n <= 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`;
}
export function str(v: unknown, fallback = "") {
  return typeof v === "string" || typeof v === "number" ? String(v) : fallback;
}
