"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap, CalendarRange, User2, Clock, Loader2, CheckCircle2,
  AlertCircle, LogIn, ArrowUpRight, IndianRupee, Coins, Sparkles,
} from "lucide-react";
import type { CourseItem } from "@/lib/api";
import { registrationsApi, profileApi, walletApi } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, SectionLabel } from "@/components/ui/Primitives";
import { Reveal } from "@/components/motion/Reveal";
import { formatEventDate, formatINR, imageFor } from "@/lib/utils";
import CoinRedeem from "@/components/account/CoinRedeem";

declare global {
  interface Window { Razorpay?: any }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

type Tone = "ok" | "err" | "info";

export default function LearnDetail({ item, kind }: { item: CourseItem; kind: "course" | "workshop" }) {
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [coinsToUse, setCoinsToUse] = useState(0);
  // What the backend says is payable once coins are applied; null until quoted.
  const [payable, setPayable] = useState<number | null>(null);

  const label = kind === "course" ? "Course" : "Workshop";
  const isFree = !item.price || item.price <= 0;
  const soldOut = typeof item.available_seats === "number" && item.available_seats <= 0;
  const closed = item.registration_status === "CLOSED";
  const upcoming = item.registration_status === "UPCOMING";

  // Check existing enrollment status
  useEffect(() => {
    if (!user || !item._id) return;
    profileApi.dashboard().then((d) => {
      const myCourses = Array.isArray(d?.my_courses) ? d.my_courses : [];
      const match = myCourses.find((c: any) => {
        if (String(c.activity_id || "") === String(item._id)) return true;
        const cTitle = String(c.activity_title || c.title || "").trim().toLowerCase();
        const itemTitle = String(item.title || "").trim().toLowerCase();
        return (
          cTitle.length > 3 &&
          itemTitle.length > 3 &&
          !["course", "workshop", "event"].includes(cTitle) &&
          cTitle === itemTitle
        );
      });
      if (match) {
        const isConfirmed =
          match.status === "CONFIRMED" ||
          match.payment_status === "PAID" ||
          match.payment_status === "NOT_REQUIRED" ||
          match.is_confirmed === true;
        if (isConfirmed) {
          setDone(true);
          setMsg({ tone: "ok", text: `You are enrolled in this ${label.toLowerCase()}.` });
        } else {
          setDone(false);
          setMsg({
            tone: "err",
            text: `You have a pending registration. Click "Enrol Now" below to complete payment and secure your seat.`,
          });
        }
      }
    }).catch(() => {});
  }, [user, item._id, item.title, label]);

  async function enrol() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await registrationsApi.create({
        activity_id: item._id,
        activity_type: kind,
        ...(coinsToUse > 0 ? { coins_to_use: coinsToUse } : {}),
      });

      if (res.status === "CONFIRMED" || !res.payment_info) {
        setDone(true);
        setMsg({ tone: "ok", text: `You're enrolled in this ${kind}.` });
        return;
      }

      const info = res.payment_info;
      const checkout = info.checkout_data || {};
      const keyId = checkout.key || info.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) {
        setMsg({ tone: "err", text: "Payment gateway is being configured. Please try again shortly." });
        return;
      }
      if (!(await loadRazorpay())) {
        setMsg({ tone: "err", text: "Could not reach the Razorpay gateway. Check your connection." });
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: checkout.amount || Math.round((res.payable_amount ?? item.price) * 100),
        currency: checkout.currency || "INR",
        name: "Upgrade Talents India",
        description: `${label} fee — ${item.title}`,
        order_id: checkout.order_id || info.order_id,
        prefill: { email: user?.email || "", name: user?.name || "", contact: user?.phone_number || "" },
        theme: { color: "#f97316" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setDone(false);
            setMsg({ tone: "err", text: "Payment cancelled — your seat is not confirmed yet. Click Enrol to retry." });
          },
        },
        handler: async (resp: any) => {
          try {
            setBusy(true);
            setMsg({ tone: "info", text: "Verifying payment…" });
            await registrationsApi.verifyPayment({
              order_reference: res.order_reference,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setDone(true);
            setMsg({ tone: "ok", text: "Payment confirmed — your seat is booked." });
          } catch (e: any) {
            setMsg({ tone: "err", text: e?.message || "Payment verification failed. Contact support with your payment id." });
          } finally {
            setBusy(false);
          }
        },
      });
      rzp.open();
      return;
    } catch (e: any) {
      const text = e?.message || `Could not enrol in this ${kind}.`;
      if (/already registered and confirmed/i.test(text) || (/already registered/i.test(text) && !/pending/i.test(text))) {
        setDone(true);
        setMsg({ tone: "ok", text: `You're already enrolled in this ${kind}.` });
      } else {
        setDone(false);
        setMsg({ tone: "err", text });
      }
    } finally {
      setBusy(false);
    }
  }

  const blocked = closed || upcoming || soldOut;

  return (
    <section className="relative py-14 md:py-20">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <Reveal>
          <div>
            <SectionLabel>{label}</SectionLabel>

            <div className="mt-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
              <img src={imageFor(item.thumbnail, 3)} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>

            <h1 className="mt-8 font-display text-3xl font-bold uppercase leading-tight md:text-4xl">
              {item.title}
            </h1>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
              <li className="inline-flex items-center gap-1.5">
                <User2 className="size-4 text-[var(--accent)]" aria-hidden />{item.instructor_name}
              </li>
              {item.start_date && (
                <li className="inline-flex items-center gap-1.5">
                  <CalendarRange className="size-4 text-[var(--accent)]" aria-hidden />
                  {formatEventDate(item.start_date)}
                  {item.end_date ? ` – ${formatEventDate(item.end_date)}` : ""}
                </li>
              )}
              {typeof item.available_seats === "number" && (
                <li className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-[var(--accent)]" aria-hidden />{item.available_seats} seats
                </li>
              )}
            </ul>

            <p className="mt-7 whitespace-pre-line text-[15px] leading-relaxed text-[var(--fg-muted)]">
              {item.description}
            </p>

            {item.instructor_info && (
              <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
                  <GraduationCap className="size-5 text-[var(--accent)]" aria-hidden /> About the instructor
                </h2>
                <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[var(--fg-muted)]">
                  {item.instructor_info}
                </p>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal>
          <aside className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-7 lg:sticky lg:top-28">
            {item.registration_status && (
              <Badge tone={item.can_register ? "success" : upcoming ? "warning" : "neutral"}>
                {item.registration_status}
              </Badge>
            )}

            <div className="mt-5">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Fee</span>
              <span className="mt-1 inline-flex items-center font-display text-3xl font-bold">
                {isFree ? "Free" : formatINR(item.price)}
              </span>
            </div>

            {user && !isFree && !done && !blocked && item._id && (
              <CoinRedeem
                itemId={String(item._id)}
                itemType={kind}
                disabled={busy}
                onChange={(c, p) => { setCoinsToUse(c); if (p !== null) setPayable(p); }}
              />
            )}

            {msg && (
              <div
                className={`mt-6 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  msg.tone === "ok"
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : msg.tone === "info"
                      ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                {msg.tone === "ok" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {done ? (
                <Button href="/dashboard">
                  View in your dashboard <ArrowUpRight className="size-4" aria-hidden />
                </Button>
              ) : authLoading ? (
                <Button disabled>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Loading
                </Button>
              ) : !user ? (
                <Button href={`/login?next=/${kind}s/${item._id}`}>
                  <LogIn className="size-4" aria-hidden /> Sign in to enrol
                </Button>
              ) : (
                <Button onClick={enrol} disabled={busy || blocked}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <IndianRupee className="size-4" aria-hidden />}
                  {busy ? "Processing…" : soldOut ? "Seats full" : closed ? "Registration closed" : upcoming ? "Opens soon" : isFree ? "Enrol for free" : payable !== null && payable <= 0 ? "Enrol with coins" : `Pay ${formatINR(payable ?? item.price)}`}
                </Button>
              )}

              <Link
                href={`/${kind}s`}
                className="text-center text-[12px] font-semibold text-[var(--fg-subtle)] transition-colors hover:text-[var(--accent)]"
              >
                Back to all {kind}s
              </Link>
            </div>

            <p className="mt-6 border-t border-[var(--border)] pt-5 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
              Your seat is confirmed once payment clears. Track it any time under
              {" "}<Link href="/dashboard" className="text-[var(--accent)] hover:underline">Events &amp; Courses</Link>{" "}
              in your dashboard.
            </p>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
