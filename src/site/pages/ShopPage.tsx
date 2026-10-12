import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { idOf } from "@/shared/api";
import { fmtPrice, str } from "@/shared/format";
import { useToken } from "@/shared/useToken";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";

export function ShopPage() {
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: siteApi.products });
  const { token } = useToken("user");
  const [chosen, setChosen] = useState<Record<string, unknown> | null>(null);
  const order = useMutation({ mutationFn: siteApi.createOrder, onSuccess: () => { toast.success("Order created. Continue payment from My account."); setChosen(null); }, onError: (e: Error) => toast.error(e.message) });
  function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen) return;
    const f = new FormData(e.currentTarget);
    order.mutate({ items: [{ product_id: idOf(chosen), quantity: Number(f.get("quantity") ?? 1) }], shipping_address: { full_name: String(f.get("full_name")), phone: String(f.get("phone")), address_line1: String(f.get("address_line1")), city: String(f.get("city")), state: String(f.get("state")), postal_code: String(f.get("postal_code")), country: "India" }, idempotency_key: crypto.randomUUID() });
  }
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 lg:px-8">
        <p className="mb-4 text-xs font-semibold uppercase text-primary">Merchandise</p><h1 className="page-heading font-display font-extrabold">The <span className="text-ember">shop</span></h1>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-card" />)}
          {data?.map((p) => {
            const imgs = p.images as unknown;
            const img = str(p.image_url) || (Array.isArray(imgs) ? str(imgs[0]) : "");
            return (
              <div key={idOf(p)} className="premium-card product-card group overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-square bg-muted">{img && <img src={img} alt={str(p.name)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
                 <div className="p-5"><p className="font-display text-lg font-bold">{str(p.name ?? p.title, "Product")}</p><p className="mt-2 font-semibold text-primary">{fmtPrice(p.price ?? p.base_price)}</p><Button className="mt-4 w-full" disabled={!token} onClick={() => setChosen(p)}>{token ? "Buy now" : "Sign in to buy"}</Button></div>
              </div>
            );
          })}
        </div>
        {!isLoading && data?.length === 0 && <p className="mt-8 text-muted-foreground">No merchandise available yet.</p>}
        {chosen && <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4 backdrop-blur"><form onSubmit={checkout} className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-glow"><h2 className="font-display text-2xl font-bold">Ship {str(chosen.name ?? chosen.title, "your order")}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["full_name","Full name"],["phone","Phone"],["address_line1","Address"],["city","City"],["state","State"],["postal_code","Postal code"]].map(([name,label]) => <input key={name} name={name} required placeholder={label} className="rounded-md border border-input bg-background px-3 py-2"/>)}<input name="quantity" type="number" min="1" max="20" defaultValue="1" className="rounded-md border border-input bg-background px-3 py-2"/></div><div className="mt-5 flex gap-2"><Button disabled={order.isPending}>{order.isPending ? "Creating order…" : "Continue"}</Button><Button type="button" variant="ghost" onClick={() => setChosen(null)}>Cancel</Button></div></form></div>}
      </section>
    </SiteLayout>
  );
}
