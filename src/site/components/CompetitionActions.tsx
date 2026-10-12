import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { siteApi } from "../api";
import { str } from "@/shared/format";

export function CompetitionActions({ id, signedIn, rules }: { id: string; signedIn: boolean; rules?: unknown }) {
  const [accepted, setAccepted] = useState(false);
  const qc = useQueryClient();
  const eligibility = useQuery({ queryKey: ["eligibility", id], queryFn: () => siteApi.competitionEligibility(id), enabled: signedIn, retry: false });
  const register = useMutation({ mutationFn: () => siteApi.registerCompetition(id), onSuccess: () => { toast.success("Registration received"); qc.invalidateQueries({ queryKey: ["eligibility", id] }); }, onError: (e: Error) => toast.error(e.message) });
  const submission = useMutation({ mutationFn: (form: FormData) => siteApi.submitCompetition(id, form), onSuccess: () => toast.success("Entry submitted for review"), onError: (e: Error) => toast.error(e.message) });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); submission.mutate(new FormData(e.currentTarget)); }
  if (!signedIn) return <Button asChild><Link to="/login">Sign in to participate</Link></Button>;
  return <div className="space-y-8">
    <section className="space-y-4"><h2 className="text-xl font-bold">Registration</h2>{Boolean(rules) && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{str(rules)}</p>}{eligibility.data && <p className="text-sm text-muted-foreground">{str(eligibility.data.message ?? eligibility.data.reason)}</p>}<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 accent-primary"/>I accept the competition rules</label><Button disabled={!accepted || register.isPending} onClick={() => register.mutate()}>{register.isPending ? "Registering…" : "Register"}</Button></section>
    <form onSubmit={submit} className="space-y-4 border-t border-border pt-6"><h2 className="text-xl font-bold">Your entry</h2><label className="block text-sm">Submission field names<input name="field_names" required placeholder="portfolio" className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"/></label><label className="block text-sm">Files<input name="files" type="file" multiple required className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground"/></label><Button type="submit" disabled={submission.isPending}>{submission.isPending ? "Uploading…" : "Submit entry"}</Button></form>
  </div>;
}

export function VoteButton({ competitionId, participantId, signedIn }: { competitionId: string; participantId: string; signedIn: boolean }) {
  const qc = useQueryClient();
  const vote = useMutation({ mutationFn: () => siteApi.vote(competitionId, participantId), onSuccess: () => { toast.success("Vote recorded"); qc.invalidateQueries({ queryKey: ["leaderboard", competitionId] }); }, onError: (e: Error) => toast.error(e.message) });
  return signedIn ? <Button size="sm" variant="outline" disabled={vote.isPending} onClick={() => vote.mutate()}>Vote</Button> : <Button size="sm" variant="outline" asChild><Link to="/login">Sign in to vote</Link></Button>;
}