import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Crown, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import hero from "@/assets/hero.jpg";
import { idOf } from "@/shared/api";
import { fmtDate, fmtPrice, str } from "@/shared/format";
import { useToken } from "@/shared/useToken";
import { openRazorpay } from "@/shared/razorpay";
import { Button } from "@/components/ui/button";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";

export function EventDetailPage({ id }: { id: string }) {
  const nav = useNavigate();
  const { token } = useToken("user");
  const [qty, setQty] = useState(1);
  const events = useQuery({ queryKey: ["site-events"], queryFn: () => siteApi.events() });
  const tickets = useQuery({ queryKey: ["site-tickets"], queryFn: () => siteApi.activity("tickets") });
  const vip = useQuery({ queryKey: ["vip", id], queryFn: () => siteApi.vipPasses(id), retry: false });
  const e = events.data?.find((x) => x._id === id);
  const evTickets = (tickets.data ?? []).filter((t) => str(t.event_id) === id);

  const book = useMutation({
    mutationFn: async (ticketId: string) => {
      const b = await siteApi.createBooking({ event_id: id, ticket_id: ticketId, quantity: qty });
      const bid = idOf(b) || str(b.booking_id);
      if (!bid) throw new Error("Booking reference was not returned");
      const payment = await siteApi.createPaymentOrder(bid);
      const order = (payment.data ?? payment) as Record<string, unknown>;
      const orderId = str(order.razorpay_order_id ?? order.order_id ?? order.id);
      const key = str(order.key_id ?? order.razorpay_key_id ?? order.key);
      const amount = Number(order.amount ?? 0);
      if (!orderId || !key || !amount) throw new Error("Live payment is not configured by the backend");
      await new Promise<void>((resolve, reject) => openRazorpay({
        key, amount, currency: str(order.currency, "INR"), name: "Upgrade Talents India", description: str(e?.title, "Event ticket"), order_id: orderId,
        handler: async (result) => { try { await siteApi.verifyRazorpay({ booking_id: bid, ...result }); resolve(); } catch (error) { reject(error); } },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      }).catch(reject));
      return b;
    },
    onSuccess: () => {
      toast.success("Booked! Your ticket is in your account.");
      nav({ to: "/account" });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const bookVip = useMutation({
    mutationFn: (cid: string) => siteApi.bookVip(id, cid),
    onSuccess: () => { toast.success("VIP pass booked."); nav({ to: "/account" }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const requireLogin = (fn: () => void) => (token ? fn() : nav({ to: "/login" }));

  if (events.isLoading) return <SiteLayout><div className="h-screen animate-pulse bg-card" /></SiteLayout>;
  if (!e) return <SiteLayout><div className="px-6 pt-40 text-center"><h1 className="text-4xl font-bold">Event not found</h1><Link to="/events" className="mt-4 inline-block text-primary">Back to events</Link></div></SiteLayout>;

  return (
    <SiteLayout>
      <section className="relative mt-20 flex min-h-[min(480px,60svh)] items-end overflow-hidden text-on-media">
        <img src={str(e.image_url) || hero} alt={str(e.title)} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fade" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-12 pt-16 lg:px-8">
          <h1 className="max-w-4xl page-heading font-display font-extrabold">{str(e.title)}</h1>
          <div className="mt-6 flex flex-wrap gap-6 text-on-media-muted">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{fmtDate(e.date)} {str(e.time)}</span>
            {e.venue ? <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{str(e.venue)}</span> : null}
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{str(e.registered_count, "0")} / {str(e.capacity, "—")}</span>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 className="mb-4 text-2xl font-bold">About</h2>
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{str(e.description, "Details coming soon.")}</p>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="premium-card rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">From</p>
            <p className="font-display text-4xl font-bold">{fmtPrice(e.price)}</p>
            <label className="mt-4 flex items-center justify-between text-sm">Quantity
              <input type="number" min={1} max={10} value={qty} onChange={(x) => setQty(Math.min(10, Math.max(1, +x.target.value)))} className="w-20 rounded-lg border border-input bg-background px-3 py-1.5" />
            </label>
            <div className="mt-4 space-y-2">
              {evTickets.length === 0 && <p className="text-sm text-muted-foreground">{e.ticket_enabled ? "Tickets loading or not yet released." : "Ticketing not enabled for this event."}</p>}
              {evTickets.map((t) => (
                <Button key={idOf(t)} disabled={book.isPending} onClick={() => requireLogin(() => book.mutate(idOf(t)))}
                  className="flex w-full items-center justify-between h-auto min-h-12 whitespace-normal rounded-full bg-ember px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">
                  <span>{str(t.name ?? t.title ?? t.ticket_type, "Ticket")}</span><span>{fmtPrice(t.price)}</span>
                </Button>
              ))}
            </div>
          </div>
          {(vip.data ?? []).length > 0 && (
            <div className="premium-card rounded-lg border border-primary/40 bg-card p-6 shadow-glow">
              <p className="mb-4 flex items-center gap-2 font-bold"><Crown className="h-5 w-5 text-primary" />VIP passes</p>
              {(vip.data ?? []).map((v) => (
                <Button variant="outline" key={idOf(v)} onClick={() => requireLogin(() => bookVip.mutate(idOf(v)))}
                  className="mb-2 flex w-full justify-between h-auto min-h-12 whitespace-normal rounded-full border border-border px-4 py-3 text-left hover:bg-secondary">
                  <span>{str(v.name ?? v.title ?? v.tier, "VIP")}</span><span className="text-primary">{fmtPrice(v.price)}</span>
                </Button>
              ))}
            </div>
          )}
        </aside>
      </section>
    </SiteLayout>
  );
}
