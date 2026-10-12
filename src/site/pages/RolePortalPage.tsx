import { BRAND } from "@/shared/brand";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { extractToken, idOf, tokenStore, type Side } from "@/shared/api";
import { roleApi } from "@/shared/roleApi";
import { str } from "@/shared/format";
import { useToken } from "@/shared/useToken";
import { JudgingWorkspace } from "../components/JudgingWorkspace";

type Role = Extract<Side, "judge" | "volunteer">;
const field = "w-full rounded-md border border-input bg-background px-4 py-3 outline-none focus:border-primary";

export function RolePortalPage({ role }: { role: Role }) {
  const client = roleApi(role);
  const auth = useToken(role);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const assignments = useQuery({ queryKey: [role, "assignments", auth.token], queryFn: client.assignments, enabled: !!auth.token, retry: false });
  async function request(e: FormEvent<HTMLFormElement>) { e.preventDefault(); try { await client.loginStep1(email); setStep(2); toast.success("OTP sent"); } catch (error) { toast.error((error as Error).message); } }
  async function verify(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const otp=String(new FormData(e.currentTarget).get("otp")); try { const result=await client.loginStep2(email,otp); const token=extractToken(result); if(!token) throw new Error("Access token was not returned"); tokenStore.set(role,token); toast.success("Signed in"); } catch(error){ toast.error((error as Error).message); } }
  if (!auth.ready) return <div className="site-theme min-h-screen"/>;
  if (!auth.token) return <main className="site-theme relative grid min-h-screen place-items-center p-6 text-foreground"><div className="absolute right-6 top-6"><ThemeToggle compact/></div><div className="w-full max-w-md"><Link to="/" className="font-display text-2xl font-bold">{BRAND.mark}{" "}<span className="text-ember">{BRAND.tail}</span></Link><p className="mt-12 text-sm font-semibold uppercase text-primary">Private workspace</p><h1 className="mt-3 font-display text-4xl font-bold capitalize">{role} access</h1><p className="mt-3 text-muted-foreground">Use the email assigned by the Upgrade Talents India operations team.</p>{step===1?<form onSubmit={request} className="mt-8 space-y-3"><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className={field}/><Button className="w-full">Send OTP</Button></form>:<form onSubmit={verify} className="mt-8 space-y-3"><input name="otp" required placeholder="One-time code" className={field}/><Button className="w-full">Verify and continue</Button></form>}</div></main>;
  return <main className="site-theme min-h-screen px-6 py-12 text-foreground"><div className="mx-auto max-w-6xl"><header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><div><p className="text-sm font-semibold uppercase text-primary">Upgrade Talents India workspace</p><h1 className="truncate font-display text-4xl font-bold capitalize">{role} assignments</h1></div><Button variant="outline" onClick={()=>tokenStore.clear(role)}><LogOut/>Sign out</Button></header><div className="mt-10 grid gap-4 md:grid-cols-2">{assignments.data?.map((item,i)=><article key={idOf(item)||i} className="premium-card rounded-lg border border-border bg-card p-6"><ClipboardCheck className="text-primary"/><h2 className="mt-5 text-xl font-bold">{str(item.title ?? item.competition_name ?? item.event_name,"Assignment")}</h2><p className="mt-2 text-sm text-muted-foreground">{str(item.description ?? item.status,"Open the assignment to continue your role-specific work.")}</p>{role === "judge" && <JudgingWorkspace assignment={item}/>}</article>)}</div>{assignments.isLoading&&<p className="mt-10 text-muted-foreground">Loading assignments…</p>}{assignments.isError&&<p className="mt-10 text-destructive">{assignments.error.message}</p>}{!assignments.isLoading&&!assignments.data?.length&&<p className="mt-10 text-muted-foreground">No assignments are available yet.</p>}</div></main>;
}