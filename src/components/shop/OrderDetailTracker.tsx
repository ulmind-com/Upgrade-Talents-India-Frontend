"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, Truck, CheckCircle2, Clock, MapPin, CreditCard,
  ChevronRight, ArrowLeft, AlertCircle, Copy, Check, ExternalLink,
  Printer, XCircle, ShoppingBag, ShieldCheck, Box, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { shopApi, type ApiError } from "@/lib/api";
import { formatINR, formatEventDate, cn } from "@/lib/utils";
import { useAuth } from "@/components/motion/Providers";
import { Reveal } from "@/components/motion/Reveal";

interface OrderDetailTrackerProps {
  orderId: string;
}

const ORDER_STEPS = [
  { key: "CONFIRMED", label: "Order Confirmed", desc: "Payment verified, order received" },
  { key: "PROCESSING", label: "Processing", desc: "Order details sent to fulfillment team" },
  { key: "PACKED", label: "Packed", desc: "Items packed and ready for dispatch" },
  { key: "SHIPPED", label: "Shipped", desc: "Handed over to courier partner" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "Package out with delivery agent" },
  { key: "DELIVERED", label: "Delivered", desc: "Order successfully delivered" },
];

export default function OrderDetailTracker({ orderId }: OrderDetailTrackerProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState("");

  // Copy tracking number
  const [copied, setCopied] = useState(false);

  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [ordData, trackData] = await Promise.allSettled([
        shopApi.orderDetail(orderId),
        shopApi.orderTracking(orderId),
      ]);

      if (ordData.status === "fulfilled" && ordData.value) {
        setOrder(ordData.value);
      } else {
        throw new Error("Unable to locate order details. Please verify your order number.");
      }

      if (trackData.status === "fulfilled" && trackData.value) {
        setTracking(trackData.value);
      }
    } catch (err: any) {
      console.error("Order load error:", err);
      setError(err?.message || "Failed to load order. Please ensure you are logged in.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!authLoading) {
      fetchOrderData();
    }
  }, [authLoading, fetchOrderData]);

  const handleCopyTracking = () => {
    const trackingNo = order?.tracking_number || tracking?.tracking_number;
    if (trackingNo) {
      navigator.clipboard.writeText(trackingNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setCancelErr("Please enter a valid cancellation reason.");
      return;
    }
    setCancelling(true);
    setCancelErr("");
    try {
      await shopApi.cancelOrder(orderId, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason("");
      await fetchOrderData();
    } catch (err: any) {
      setCancelErr(err?.message || "Could not cancel order at this stage.");
    } finally {
      setCancelling(false);
    }
  };

  const status = (order?.status || "").toUpperCase();
  const isCancelled = status === "CANCELLED" || status === "REFUNDED" || status === "REFUND_PENDING";
  const isPaid = order?.payment_status === "PAID";
  const isEligibleToCancel = !isCancelled && ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(status);

  // Stepper calculations
  const currentStepIndex = useMemo(() => {
    if (isCancelled) return -1;
    const idx = ORDER_STEPS.findIndex((s) => s.key === status);
    if (idx !== -1) return idx;
    if (status === "PENDING_PAYMENT") return 0;
    return 0;
  }, [status, isCancelled]);

  if (loading) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <RefreshCw className="size-8 animate-spin text-[var(--accent)]" />
        <p className="mt-4 font-display text-lg font-bold">Retrieving Order Details...</p>
        <p className="text-xs text-[var(--fg-muted)]">Querying authoritative inventory & fulfillment logs</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-x py-24 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
          <AlertCircle className="mx-auto size-12 text-[var(--danger)]" />
          <h2 className="mt-4 font-display text-xl font-bold">Order Not Found</h2>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{error || "We could not find the requested merchandise order."}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-full py-3 text-xs font-bold uppercase tracking-wider text-[var(--on-accent)]"
              style={{ background: "var(--grad-brand)" }}
            >
              <ShoppingBag className="size-4" /> Return to Shop
            </Link>
            <Link
              href="/dashboard?tab=orders"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] py-3 text-xs font-semibold hover:border-[var(--border-strong)]"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const trackingNumber = order.tracking_number || tracking?.tracking_number;
  const courierName = order.courier_name || tracking?.courier_name;
  const timeline = tracking?.timeline || order.status_history || [];

  return (
    <div className="container-x relative pb-28 pt-28 md:pt-36">
      {/* ── Breadcrumb & Navigation ── */}
      <nav className="flex items-center justify-between text-xs text-[var(--fg-subtle)]">
        <div className="flex items-center gap-2">
          <Link href="/shop" className="hover:text-[var(--fg)]">Shop</Link>
          <ChevronRight className="size-3.5" />
          <Link href="/dashboard?tab=orders" className="hover:text-[var(--fg)]">Orders</Link>
          <ChevronRight className="size-3.5" />
          <span className="font-mono font-semibold text-[var(--accent)]">#{order.order_number}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] sm:inline-flex"
        >
          <Printer className="size-3.5" /> Print Receipt
        </button>
      </nav>

      {/* ── Order Header Banner ── */}
      <Reveal className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                  Order #{order.order_number}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                    isCancelled
                      ? "border border-red-500/30 bg-red-500/10 text-red-400"
                      : isPaid
                      ? "border border-green-500/30 bg-green-500/10 text-green-400"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                  )}
                >
                  {status}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <Clock className="size-3.5 text-[var(--fg-subtle)]" />
                Placed on {formatEventDate(order.created_at)}
                {order.paid_at && <span>· Paid on {formatEventDate(order.paid_at)}</span>}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isEligibleToCancel && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Cancel Order
                </button>
              )}
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-accent)] shadow-md transition-transform hover:scale-105 active:scale-95"
                style={{ background: "var(--grad-brand)" }}
              >
                <ShoppingBag className="size-3.5" /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* ── Status Stepper ── */}
          {!isCancelled && (
            <div className="mt-8 border-t border-[var(--border)] pt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)]">Fulfillment Status</h3>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {ORDER_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div key={step.key} className="flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-full text-xs font-bold transition-all",
                            isCurrent
                              ? "bg-[var(--accent)] text-black ring-4 ring-[var(--accent)]/20"
                              : isDone
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-[var(--surface-2)] text-[var(--fg-subtle)] border border-[var(--border)]"
                          )}
                        >
                          {isDone && !isCurrent ? <Check className="size-4" /> : idx + 1}
                        </span>
                        <div
                          className={cn(
                            "hidden h-0.5 w-12 flex-1 lg:block",
                            idx === ORDER_STEPS.length - 1 ? "hidden" : "",
                            isDone ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                          )}
                        />
                      </div>
                      <div>
                        <p className={cn("text-xs font-semibold", isCurrent ? "text-[var(--accent)] font-bold" : isDone ? "text-white" : "text-[var(--fg-subtle)]")}>
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-tight text-[var(--fg-subtle)]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
              <XCircle className="size-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Order Cancelled</p>
                <p className="mt-1">
                  This order was cancelled. Reserved stock was safely returned to inventory, and any applicable refund is processed back to the original payment source.
                </p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Main Order Grid ── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Items & Live Tracking Details */}
        <div className="flex flex-col gap-6">
          {/* Courier & Tracking Card (If Available) */}
          {(trackingNumber || courierName) && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4 font-display text-base font-bold">
                <Truck className="size-5 text-[var(--accent)]" /> Shipment & Courier Dispatch
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">Courier Partner</span>
                  <p className="mt-0.5 text-sm font-bold text-white">{courierName || "Standard Expedited Delivery"}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">AWB Tracking Number</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[var(--accent)]">{trackingNumber || "Assigned on dispatch"}</span>
                    {trackingNumber && (
                      <button
                        onClick={handleCopyTracking}
                        className="rounded p-1 text-[var(--fg-subtle)] hover:text-white"
                        title="Copy Tracking Number"
                      >
                        {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ordered Products Table */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <h3 className="font-display text-base font-bold">
                Items in this Order ({items.reduce((s: number, i: any) => s + (i.quantity || 1), 0)})
              </h3>
            </div>
            <div className="divide-y divide-[var(--border)] px-6">
              {items.map((it: any, idx: number) => {
                const img = it.images?.[0] || it.image || it.image_url || "";
                const variantText = it.variant
                  ? [it.variant.color, it.variant.size].filter(Boolean).join(" · ")
                  : null;

                return (
                  <div key={idx} className="flex items-center gap-4 py-4">
                    {img ? (
                      <img
                        src={img}
                        alt={it.product_name || "Merchandise"}
                        className="size-16 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] object-cover"
                      />
                    ) : (
                      <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-subtle)]">
                        <Box className="size-7" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-1 font-semibold text-sm hover:text-[var(--accent)]">
                        {it.product_name || "Official Event Merchandise"}
                      </h4>
                      {variantText && (
                        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                          Variant: <span className="font-medium text-white">{variantText}</span>
                        </p>
                      )}
                      {it.sku && (
                        <p className="font-mono text-[11px] text-[var(--fg-subtle)]">
                          SKU: {it.sku}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">
                        Qty: <span className="font-bold text-white">{it.quantity}</span> × {formatINR(it.unit_price || it.price || 0)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-base font-bold text-white">
                        {formatINR((it.unit_price || it.price || 0) * (it.quantity || 1))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Milestones */}
          {timeline.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
              <h3 className="font-display text-base font-bold">Activity Log & Milestones</h3>
              <div className="mt-4 space-y-4">
                {timeline.map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{entry.status || "STATUS_UPDATE"}</span>
                        <span className="text-[11px] text-[var(--fg-subtle)] font-mono">
                          {formatEventDate(entry.timestamp)}
                        </span>
                      </div>
                      {entry.notes && <p className="mt-0.5 text-[var(--fg-muted)]">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing, Shipping Address & Payment Details */}
        <div className="flex flex-col gap-6">
          {/* Order Summary Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
            <h3 className="border-b border-[var(--border)] pb-3 font-display text-base font-bold">
              Payment Summary
            </h3>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[var(--fg-muted)]">
                <span>Subtotal</span>
                <span className="font-mono text-white">{formatINR(order.subtotal || order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-[var(--fg-muted)]">
                <span>Shipping & Handling</span>
                <span className="font-mono text-white">
                  {order.shipping_fee && Number(order.shipping_fee) > 0 ? formatINR(order.shipping_fee) : "FREE"}
                </span>
              </div>
              {order.discount_amount && Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount Applied</span>
                  <span className="font-mono">-{formatINR(order.discount_amount)}</span>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between text-sm font-bold">
                <span className="text-white">Total Amount</span>
                <span className="font-display text-lg text-gradient">{formatINR(order.total_amount)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mt-6 rounded-xl bg-[var(--surface-2)]/60 p-4 text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                <CreditCard className="size-4 text-[var(--accent)]" /> Payment Details
              </div>
              <div className="mt-2.5 space-y-1.5 text-[var(--fg-muted)]">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={cn("font-bold uppercase", isPaid ? "text-green-400" : "text-amber-400")}>
                    {order.payment_status || "PENDING"}
                  </span>
                </div>
                {order.payment_reference && (
                  <div className="flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-mono text-white">{order.payment_reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="text-white">Razorpay Secure Online Payment</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          {order.shipping_address && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 font-display text-base font-bold">
                <MapPin className="size-4 text-[var(--accent)]" /> Delivery Address
              </div>
              <div className="mt-4 text-xs">
                <p className="text-sm font-bold text-white">
                  {order.shipping_address.full_name || order.user_name}
                </p>
                {order.shipping_address.phone && (
                  <p className="mt-1 font-mono text-[var(--fg-muted)]">
                    Phone: {order.shipping_address.phone}
                  </p>
                )}
                <p className="mt-2 leading-relaxed text-[var(--fg-muted)]">
                  {[
                    order.shipping_address.address_line1,
                    order.shipping_address.address_line2,
                    order.shipping_address.city,
                    order.shipping_address.state,
                    order.shipping_address.postal_code,
                    order.shipping_address.country || "India",
                  ].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Need Assistance Card */}
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--fg-muted)]">
            <ShieldCheck className="mx-auto size-7 text-[var(--accent)]" />
            <p className="mt-2 font-bold text-sm text-white">100% Genuine Merchandise Guarantee</p>
            <p className="mt-1">
              Have questions about your order delivery or tracking? Our support team is here to help.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
            >
              Contact Support <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cancel Order Modal ── */}
      <AnimatePresence>
        {cancelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCancelOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold text-white">Cancel Merchandise Order</h3>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Are you sure you want to cancel order #{order.order_number}?
              </p>

              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                  Reason for Cancellation <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Ordered wrong size, changed mind, duplicate order"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs outline-none focus:border-[var(--accent)]"
                />
              </div>

              {cancelErr && (
                <p className="mt-2 text-xs font-semibold text-red-400">{cancelErr}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--fg-muted)] hover:text-white"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
