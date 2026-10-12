import { BRAND } from "@/shared/brand";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import hero from "@/assets/hero.jpg";
import { extractToken, tokenStore } from "@/shared/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/ThemeToggle";
import { siteApi } from "../api";

const input = "w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:border-primary";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="site-theme grid min-h-screen text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fade" />
        <Link to="/" className="absolute left-10 top-10 font-display text-2xl font-bold text-on-media">{BRAND.mark}{" "}<span className="text-ember">{BRAND.tail}</span></Link>
      </div>
      <div className="relative flex items-center justify-center px-6 py-24 sm:p-12"><div className="absolute inset-x-6 top-6 flex items-center justify-between"><Link to="/" className="font-display text-xl font-bold lg:invisible">{BRAND.mark}{" "}<span className="text-primary">{BRAND.tail}</span></Link><ThemeToggle compact/></div>
        <div className="w-full max-w-md animate-rise">
          <h1 className="mb-8 font-display text-4xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await siteApi.login(String(f.get("email")), String(f.get("password")));
      const t = extractToken(r);
      if (!t) throw new Error("Login succeeded but no token returned");
      tokenStore.set("user", t);
      toast.success("Welcome back");
      nav({ to: "/account" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="Sign in">
      <form onSubmit={submit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className={input} />
        <input name="password" type="password" required placeholder="Password" className={input} />
        <Button disabled={busy} className="h-12 w-full bg-ember py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">New here? <Link to="/register" className="text-primary">Create an account</Link></p>
    </Shell>
  );
}

export function RegisterPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Join Upgrade Talents India">
      <div className="mb-6 flex gap-2">{[1, 2, 3].map((s) => <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-ember" : "bg-muted"}`} />)}</div>
      {step === 1 && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => { const em = String(f.get("email")); await siteApi.regStep1(em, String(f.get("ref") ?? "")); setEmail(em); toast.success("OTP sent to your email"); setStep(2); }); }}>
          <input name="email" type="email" required placeholder="Email" className={input} />
          <input name="ref" placeholder="Referral code (optional)" className={input} />
          <Button disabled={busy} className="h-12 w-full bg-ember py-3 font-semibold text-primary-foreground">Send OTP</Button>
        </form>
      )}
      {step === 2 && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => { await siteApi.regStep2(email, String(f.get("otp"))); setStep(3); }); }}>
          <p className="text-sm text-muted-foreground">Enter the code sent to {email}</p>
          <input name="otp" required placeholder="OTP" className={input} />
          <Button disabled={busy} className="h-12 w-full bg-ember py-3 font-semibold text-primary-foreground">Verify</Button>
        </form>
      )}
      {step === 3 && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); f.set("email", email); run(async () => { await siteApi.regStep3(f); toast.success("Account created — please sign in"); nav({ to: "/login" }); }); }}>
          <input name="name" required placeholder="Full name" className={input} />
          <input name="phone_number" required inputMode="numeric" placeholder="Phone number" className={input} />
          <input name="date_of_birth" type="date" required className={input} />
          <input name="address" required placeholder="Address" className={input} />
          <input name="password" type="password" required placeholder="Password" className={input} />
          <input name="confirm_password" type="password" required placeholder="Confirm password" className={input} />
          <label className="block text-sm text-muted-foreground">Government ID proof
            <input name="govt_id_proof" type="file" required className="mt-1 block w-full text-sm" />
          </label>
          <Button disabled={busy} className="h-12 w-full bg-ember py-3 font-semibold text-primary-foreground">Create account</Button>
        </form>
      )}
    </Shell>
  );
}
