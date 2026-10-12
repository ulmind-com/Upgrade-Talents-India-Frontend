import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE, idOf, tokenStore } from "@/shared/api";
import { str } from "@/shared/format";
import { safePublicUrl } from "@/shared/cms";
import { siteApi } from "../api";

export function AccountActions({ kind, item }: { kind: string; item: Record<string, unknown> }) {
  const qc = useQueryClient();
  const action = useMutation({ mutationFn: async (mode: string) => {
    const id = idOf(item);
    if (mode === "cancel") { await siteApi.cancelBooking(id); return "Booking cancelled"; }
    if (mode === "read") { await siteApi.readNotification(id); return "Notification marked read"; }
    if (mode === "track") { const r = await siteApi.orderTracking(id); return str(r.tracking_status ?? r.status ?? r.message, "Tracking not available yet"); }
    if (mode === "share") { const r = await siteApi.shareCertificate(id); const url = safePublicUrl(r.share_url ?? r.verification_url ?? r.url); if (!url) throw new Error("Share link unavailable"); await navigator.clipboard.writeText(url); return "Certificate link copied"; }
    const token = tokenStore.get("user");
    if (!token) throw new Error("Please sign in again");
    const res = await fetch(`${API_BASE}/api/users/me/certificates/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Certificate download unavailable");
    if (res.headers.get("content-type")?.includes("json")) { const r = await res.json(); const url = safePublicUrl(r.download_url ?? r.url); if (!url) throw new Error("Download link unavailable"); window.open(url, "_blank", "noopener,noreferrer"); }
    else { const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href=url; a.download=`certificate-${id}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return "Certificate downloaded";
  }, onSuccess: message => { toast.success(message); qc.invalidateQueries({ queryKey: ["acct"] }); }, onError: (e: Error) => toast.error(e.message) });
  return <div className="mt-3 flex flex-wrap gap-2">{kind === "Bookings" && !/cancelled|completed/i.test(str(item.status ?? item.booking_status)) && <Button variant="outline" size="sm" disabled={action.isPending} onClick={() => { if (confirm("Cancel this booking?")) action.mutate("cancel"); }}>Cancel</Button>}{kind === "Notifications" && item.is_read !== true && <Button variant="outline" size="sm" disabled={action.isPending} onClick={() => action.mutate("read")}>Mark read</Button>}{kind === "Orders" && <Button variant="outline" size="sm" disabled={action.isPending} onClick={() => action.mutate("track")}>Track order</Button>}{kind === "Certificates" && <><Button variant="outline" size="sm" disabled={action.isPending} onClick={() => action.mutate("download")}>Download</Button><Button variant="outline" size="sm" disabled={action.isPending} onClick={() => action.mutate("share")}>Copy share link</Button></>}</div>;
}