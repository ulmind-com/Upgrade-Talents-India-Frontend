import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { API_BASE, idOf, tokenStore } from "@/shared/api";
import { fmtDate, str } from "@/shared/format";
import { useToken } from "@/shared/useToken";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "../components/ProfileEditor";
import { AccountActions } from "../components/AccountActions";

const TABS = ["Bookings", "Tickets", "VIP passes", "Orders", "Certificates", "Badges", "Notifications"] as const;
type Tab = (typeof TABS)[number];
const fetchers: Record<Tab, () => Promise<Record<string, unknown>[]>> = {
  Bookings: siteApi.myBookings,
  Tickets: siteApi.myTickets,
  "VIP passes": siteApi.myVipPasses,
  Orders: siteApi.myOrders,
  Certificates: siteApi.certificates,
  Badges: siteApi.badges,
  Notifications: siteApi.notifications,
};

function QrImage({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url = "";
    fetch(API_BASE + path, { headers: { Authorization: `Bearer ${tokenStore.get("user")}` } })
      .then(async (r) => {
        const ct = r.headers.get("content-type") ?? "";
        if (ct.includes("image")) { url = URL.createObjectURL(await r.blob()); setSrc(url); }
        else { const j = await r.json(); setSrc(j.qr_code ?? j.qr ?? j.qr_image ?? null); }
      })
      .catch(() => setSrc(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return src ? <img src={src} alt="QR pass" className="h-32 w-32 rounded-xl bg-foreground p-2" /> : <div className="h-32 w-32 animate-pulse rounded-xl bg-muted" />;
}

export function AccountPage() {
  const nav = useNavigate();
  const { ready, token } = useToken("user");
  const [tab, setTab] = useState<Tab>("Bookings");
  useEffect(() => { if (ready && !token) nav({ to: "/login" }); }, [ready, token, nav]);
  const me = useQuery({ queryKey: ["me"], queryFn: siteApi.me, enabled: !!token });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: siteApi.wallet, enabled: !!token, retry: false });
  const list = useQuery({ queryKey: ["acct", tab], queryFn: fetchers[tab], enabled: !!token, retry: false });
  const profile = (me.data?.data ?? me.data ?? {}) as Record<string, unknown>;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 lg:px-8">
        <div className="grid min-w-0 items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-sm text-muted-foreground">Welcome</p>
            <h1 className="page-heading font-display font-bold">{str(profile.name, "Your account")}</h1>
            <p className="text-muted-foreground">{str(profile.email)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="premium-card rounded-lg border border-border bg-card px-5 py-3"><p className="text-xs text-muted-foreground">Coins</p><p className="font-display text-2xl font-bold text-ember">{str(wallet.data?.coins ?? wallet.data?.balance ?? wallet.data?.total_coins, "0")}</p></div>
            <ProfileEditor profile={profile}/>
            <Button variant="outline" onClick={() => { tokenStore.clear("user"); nav({ to: "/" }); }}>Sign out</Button>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>{t}</Button>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {list.isLoading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-lg bg-card" />)}
          {list.isError && <p className="text-muted-foreground">Couldn't load {tab.toLowerCase()}.</p>}
          {!list.isLoading && list.data?.length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
          {list.data?.map((item) => {
            const ref = str(item.ticket_ref ?? item.ticket_reference);
            return (
              <div key={idOf(item) || ref} className="premium-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-border bg-card p-6">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{str(item.event_title ?? item.title ?? item.name ?? item.message ?? item.product_name, tab.slice(0, -1))}</p>
                  <p className="text-sm text-muted-foreground">{fmtDate(item.created_at ?? item.date)}</p>
                  <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs">{str(item.status ?? item.payment_status ?? item.booking_status, "—")}</span>
                  <AccountActions kind={tab} item={item}/>
                </div>
                {tab === "Tickets" && ref && <QrImage path={`/api/bookings/tickets/${ref}/qr`} />}
                {tab === "VIP passes" && idOf(item) && <QrImage path={`/api/users/me/vip-passes/${idOf(item)}/qr`} />}
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
