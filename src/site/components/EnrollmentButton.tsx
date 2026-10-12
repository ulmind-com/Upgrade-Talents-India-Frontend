import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useToken } from "@/shared/useToken";
import { openRazorpay } from "@/shared/razorpay";
import { siteApi } from "../api";

export function EnrollmentButton({ id, kind, enabled }: { id: string; kind: "course" | "workshop"; enabled: boolean }) {
  const { token } = useToken("user");
  const qc = useQueryClient();
  const enroll = useMutation({ mutationFn: async () => {
    const response = await siteApi.registerActivity(id, kind);
    const order = (response.payment_order ?? response.order ?? response) as Record<string, unknown>;
    if (order.razorpay_order_id) {
      const key = order.key_id ?? order.razorpay_key_id ?? response.key_id;
      if (typeof key !== "string") throw new Error("Registration saved; online payment is not configured yet.");
      await new Promise<void>((resolve, reject) => { openRazorpay({ key, amount: Number(order.amount), currency: String(order.currency ?? "INR"), name: "Upgrade Talents India", description: `${kind} registration`, order_id: String(order.razorpay_order_id), modal: { ondismiss: () => reject(new Error("Payment cancelled; registration remains pending.")) }, handler: result => { siteApi.verifyActivityPayment({ order_reference: response.order_reference ?? order.order_reference, ...result }).then(() => resolve()).catch(reject); } }).catch(reject); });
    } else if (response.payment_required === true || response.payment_status === "pending") throw new Error("Registration saved; payment instructions are not available yet.");
    return response;
  }, onSuccess: () => { toast.success("Enrollment received"); qc.invalidateQueries({ queryKey: ["acct"] }); }, onError: (e: Error) => toast.error(e.message) });
  if (!enabled) return <Button disabled variant="outline">Registration closed</Button>;
  return token ? <Button disabled={enroll.isPending} onClick={() => enroll.mutate()}>{enroll.isPending ? "Enrolling…" : "Enroll"}</Button> : <Button asChild><Link to="/login">Sign in to enroll</Link></Button>;
}