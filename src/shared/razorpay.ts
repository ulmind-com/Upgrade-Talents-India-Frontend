export type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (result: RazorpayResult) => void; modal?: { ondismiss?: () => void } };
type RazorpayCtor = new (options: CheckoutOptions) => { open: () => void };

declare global { interface Window { Razorpay?: RazorpayCtor } }

export async function openRazorpay(options: CheckoutOptions) {
  if (!window.Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-eventora-razorpay]');
      if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.dataset.eventoraRazorpay = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Payment checkout could not load"));
      document.head.appendChild(script);
    });
  }
  if (!window.Razorpay) throw new Error("Payment checkout is unavailable");
  new window.Razorpay(options).open();
}