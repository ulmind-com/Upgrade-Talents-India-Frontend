import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowUpRight, Award, BookOpen, CalendarDays, CheckCircle2, Coins, Medal, Trophy, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { idOf } from "@/shared/api";
import { fmtDate, fmtPrice, str } from "@/shared/format";
import { useToken } from "@/shared/useToken";
import { siteApi } from "../api";
import { SiteLayout } from "../layouts/SiteLayout";
import { CompetitionActions, VoteButton } from "../components/CompetitionActions";
import { EnrollmentButton } from "../components/EnrollmentButton";
export { CertificateVerificationPage as CertificateVerifyPage } from "./CertificateVerificationPage";

function PageTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="max-w-3xl"><p className="mb-4 text-sm font-semibold uppercase text-primary">{eyebrow}</p><h1 className="page-heading font-display font-extrabold">{title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{copy}</p></div>;
}
function BrowseCard({ item, to }: { item: Record<string, unknown>; to?: string }) {
  const image = str(item.image_url ?? item.cover_image ?? item.banner_url);
  const content = <>{image && <div className="-mx-6 -mt-6 mb-6 aspect-[16/10] overflow-hidden bg-muted"><img src={image} alt={str(item.title ?? item.name)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/></div>}<p className="text-xs font-semibold uppercase text-primary">{str(item.category ?? item.status, "Open")}</p><h2 className="mt-2 font-display text-2xl font-bold">{str(item.title ?? item.name, "Untitled")}</h2><p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{str(item.description ?? item.subtitle, "Details will be announced soon.")}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0"/>{fmtDate(item.start_date ?? item.date)}</span><span className="font-semibold text-primary">{fmtPrice(item.price ?? item.registration_fee)}</span></div></>;
  return to ? <Link to={to} className="premium-card group block h-full overflow-hidden rounded-lg border border-border bg-card p-6">{content}</Link> : <article className="premium-card h-full overflow-hidden rounded-lg border border-border bg-card p-6">{content}</article>;
}

export function CompetitionsPage() {
  const q = useQuery({ queryKey: ["competitions"], queryFn: siteApi.competitions, retry: false });
  return <SiteLayout><main className="mx-auto max-w-7xl px-5 pb-20 pt-32 lg:px-8"><PageTitle eyebrow="Compete" title="Take the stage." copy="Register, submit your work, earn audience votes and follow the live rankings."/><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{q.data?.map((x) => <BrowseCard key={idOf(x)} item={x} to={`/competitions/${idOf(x)}`} />)}</div>{q.isLoading && <p className="mt-12 text-muted-foreground">Loading competitions…</p>}{q.isError && <p className="mt-12 text-destructive">{q.error.message}</p>}{!q.isLoading && !q.data?.length && <p className="mt-12 text-muted-foreground">No competitions are open right now.</p>}</main></SiteLayout>;
}

export function CompetitionDetailPage() {
  const { id } = useParams({ from: "/competitions/$id" });
  const { token } = useToken("user");
  const all = useQuery({ queryKey: ["competitions"], queryFn: siteApi.competitions });
  const leaderboard = useQuery({ queryKey: ["leaderboard", id], queryFn: () => siteApi.competitionLeaderboard(id), retry: false, refetchInterval: 30000 });
  const results = useQuery({ queryKey: ["competition-results", id], queryFn: () => siteApi.competitionResults(id), retry: false });
  const item = all.data?.find((x) => idOf(x) === id);
  return <SiteLayout><section className="mx-auto max-w-6xl px-5 pb-20 pt-32 lg:px-8"><Link to="/competitions" className="text-sm text-primary">← All competitions</Link><div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]"><div><PageTitle eyebrow={str(item?.status, "Competition")} title={str(item?.title ?? item?.name, "Competition")} copy={str(item?.description)}/><section className="mt-12"><h2 className="font-display text-3xl font-bold">Live leaderboard</h2><div className="mt-5 divide-y divide-border border-y border-border">{leaderboard.data?.map((row, i) => <div key={idOf(row) || i} className="flex flex-wrap items-center gap-3 py-4"><strong className="w-8">{str(row.rank, String(i + 1))}</strong><span className="min-w-0 flex-1 break-words">{str(row.name ?? row.participant_name ?? row.title, "Participant")}</span><span>{str(row.score ?? row.total_score ?? row.votes, "—")}</span>{typeof row.participant_id === "string" && <VoteButton competitionId={id} participantId={row.participant_id} signedIn={!!token}/>}</div>)}{!leaderboard.data?.length && <p className="py-6 text-muted-foreground">Rankings are not published yet.</p>}{leaderboard.isError && <p className="py-4 text-destructive">{leaderboard.error.message}</p>}</div></section><section className="mt-10"><h2 className="font-display text-3xl font-bold">Published results</h2>{results.data?.map((row,i) => <div key={idOf(row) || i} className="flex gap-4 border-b border-border py-4"><strong>{str(row.rank, String(i+1))}</strong><span>{str(row.name ?? row.participant_name, "Participant")}</span><span className="ml-auto">{str(row.total_score ?? row.score)}</span></div>)}{!results.data?.length && <p className="mt-4 text-muted-foreground">Results have not been published.</p>}</section></div><aside className="h-fit border-l border-border pl-6"><CompetitionActions id={id} signedIn={!!token} rules={item?.rules ?? item?.rules_text}/></aside></div></section></SiteLayout>;
}

export function LearningPage() {
  const courses = useQuery({ queryKey: ["courses"], queryFn: siteApi.courses, retry: false });
  const workshops = useQuery({ queryKey: ["workshops"], queryFn: siteApi.workshops, retry: false });
  return <SiteLayout><main className="mx-auto max-w-7xl px-5 pb-20 pt-32 lg:px-8"><PageTitle eyebrow="Learn together" title="Courses & workshops" copy="Build new skills with expert-led programmes from the Upgrade Talents India community."/><h2 className="mt-14 flex items-center gap-3 font-display text-3xl font-bold"><BookOpen className="text-primary"/>Courses</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{courses.data?.map((x) => <div key={idOf(x)} className="space-y-4"><BrowseCard item={x}/><EnrollmentButton id={idOf(x)} kind="course" enabled={x.registration_enabled !== false}/></div>)}</div><h2 className="mt-14 font-display text-3xl font-bold">Workshops</h2><div className="mt-6 grid gap-5 md:grid-cols-3">{workshops.data?.map((x) => <div key={idOf(x)} className="space-y-4"><BrowseCard item={x}/><EnrollmentButton id={idOf(x)} kind="workshop" enabled={x.registration_enabled !== false}/></div>)}</div>{!courses.isLoading && !workshops.isLoading && !courses.data?.length && !workshops.data?.length && <p className="mt-10 text-muted-foreground">New learning experiences are coming soon.</p>}</main></SiteLayout>;
}

export function LeaderboardPage() {
  const q = useQuery({ queryKey: ["competitions"], queryFn: siteApi.competitions });
  return <SiteLayout><main className="mx-auto max-w-6xl px-5 pb-20 pt-32 lg:px-8"><PageTitle eyebrow="Results" title="The leaderboard" copy="Follow published competition rankings and celebrate this season's standout talent."/><div className="mt-12 grid gap-4">{q.data?.map((x) => <Link key={idOf(x)} to="/competitions/$id" params={{ id: idOf(x) }} className="premium-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-lg border border-border bg-card p-5"><Medal className="text-primary"/><div className="min-w-0"><h2 className="truncate font-bold">{str(x.title ?? x.name, "Competition")}</h2><p className="text-sm text-muted-foreground">View ranking and results</p></div><ArrowUpRight className="h-5 w-5 text-primary"/></Link>)}</div></main></SiteLayout>;
}

export function RewardsPage() {
  const { token } = useToken("user");
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: siteApi.wallet, enabled: !!token, retry: false });
  const referral = useQuery({ queryKey: ["referral"], queryFn: siteApi.referralProfile, enabled: !!token, retry: false });
  const transactions = useQuery({ queryKey: ["reward-transactions"], queryFn: siteApi.rewardTransactions, enabled: !!token, retry: false });
  const w = wallet.data ?? {};
  const r = referral.data ?? {};
  return <SiteLayout><main className="mx-auto max-w-6xl px-5 pb-20 pt-32 lg:px-8"><PageTitle eyebrow="Loyalty" title="Rewards that follow you." copy="Earn coins through events, referrals and achievements, then use eligible rewards at checkout."/>{!token ? <div className="mt-10"><Button asChild><Link to="/login">Sign in to view rewards</Link></Button></div> : <><div className="mt-12 grid gap-5 md:grid-cols-3"><div className="premium-card h-full overflow-hidden rounded-lg border border-border bg-card p-6"><Coins className="text-primary"/><p className="mt-5 text-sm text-muted-foreground">Available coins</p><p className="font-display text-4xl font-bold">{str(w.available_coins ?? w.balance ?? w.coins, "0")}</p></div><div className="premium-card h-full overflow-hidden rounded-lg border border-border bg-card p-6"><Award className="text-primary"/><p className="mt-5 text-sm text-muted-foreground">Referral code</p><p className="font-display text-2xl font-bold">{str(r.referral_code ?? r.code, "—")}</p></div><div className="premium-card h-full overflow-hidden rounded-lg border border-border bg-card p-6"><CheckCircle2 className="text-primary"/><p className="mt-5 text-sm text-muted-foreground">Successful referrals</p><p className="font-display text-4xl font-bold">{str(r.successful_referrals ?? r.referral_count, "0")}</p></div></div><h2 className="mt-12 font-display text-3xl font-bold">Recent activity</h2><div className="mt-5 divide-y divide-border rounded-lg border border-border bg-card">{transactions.data?.map((x, i) => <div key={idOf(x) || i} className="flex justify-between gap-4 p-4"><span>{str(x.description ?? x.type, "Reward activity")}</span><strong className="text-primary">{str(x.amount ?? x.coins, "—")}</strong></div>)}{!transactions.data?.length && <p className="p-6 text-muted-foreground">No reward activity yet.</p>}</div></>}</main></SiteLayout>;
}

