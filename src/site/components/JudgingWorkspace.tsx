import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { asList, idOf } from "@/shared/api";
import { roleApi } from "@/shared/roleApi";
import { str } from "@/shared/format";
import { toast } from "sonner";

const client = roleApi("judge");
export function JudgingWorkspace({ assignment }: { assignment: Record<string, unknown> }) {
  const id = str(assignment.competition_id ?? assignment.comp_id, idOf(assignment));
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const qc = useQueryClient();
  const contestants = useQuery({ queryKey: ["judge-contestants", id], queryFn: () => client.contestants(id), enabled: verified, retry: false });
  const unlock = useMutation({ mutationFn: () => client.verifyPin(id,pin), onSuccess: () => setVerified(true), onError: (e: Error) => toast.error(e.message) });
  const criteria = asList(assignment.judging_criteria ?? assignment.criteria);
  return <div className="mt-6 border-t border-border pt-6">{!verified ? <form className="flex gap-2" onSubmit={e => { e.preventDefault(); unlock.mutate(); }}><input aria-label="Session PIN" type="password" value={pin} onChange={e => setPin(e.target.value)} required placeholder="Session PIN" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2"/><Button disabled={unlock.isPending}>Unlock</Button></form> : <div className="space-y-8">{contestants.isError && <p className="text-destructive">{contestants.error.message}</p>}{contestants.isLoading && <p>Loading contestants…</p>}{contestants.data?.map(item => <ScoreForm key={idOf(item)} competitionId={id} item={item} criteria={criteria} onSaved={() => qc.invalidateQueries({ queryKey: ["judge-contestants", id] })}/>)}{contestants.data?.length === 0 && <p className="text-muted-foreground">No approved entries in this session.</p>}</div>}</div>;
}

function ScoreForm({competitionId,item,criteria,onSaved}: {competitionId:string;item:Record<string,unknown>;criteria:Record<string,unknown>[];onSaved:()=>void}) {
  const submission = str(item.submission_id, idOf(item));
  const [scores,setScores] = useState<Record<string,number>>({});
  const [comments,setComments] = useState("");
  const [reason,setReason] = useState("");
  const fields = criteria.length ? criteria : asList(item.judging_criteria ?? item.criteria);
  const save = useMutation({mutationFn: async (mode:string) => {
    if (mode === "skip") { await client.skip(competitionId,submission,reason); return; }
    if (mode === "feedback") { await client.feedback(competitionId,submission,comments); return; }
    const body = {scores,comments};
    if (mode === "draft") await client.saveDraft(competitionId,submission,body);
    else await client.submitScores(submission,body);
  },onSuccess:()=> {toast.success("Saved");onSaved();},onError:(e:Error)=>toast.error(e.message)});
  function submit(e:FormEvent) {e.preventDefault();if(confirm("Submit these final scores?"))save.mutate("final");}
  const locked = item.is_locked === true || item.scoring_locked === true;
  return <form onSubmit={submit} className="space-y-4 border-b border-border pb-6"><h3 className="text-lg font-bold">{str(item.participant_name ?? item.name ?? item.title,"Contestant")}</h3>{fields.map((criterion,i) => {const name=str(criterion.name ?? criterion.id,String(i));return <label key={name} className="block text-sm">{str(criterion.label ?? criterion.name)}<input type="number" required min={0} max={Number(criterion.max_score)} step="any" disabled={locked} value={scores[name] ?? ""} onChange={e=>setScores(s=>({...s,[name]:Number(e.target.value)}))} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"/></label>;})}{!fields.length && <p className="text-sm text-muted-foreground">Judging criteria have not been supplied for this assignment.</p>}<label className="block text-sm">Feedback<textarea value={comments} onChange={e=>setComments(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"/></label><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={save.isPending || locked || !fields.length} onClick={()=>save.mutate("draft")}>Save draft</Button><Button type="submit" disabled={save.isPending || locked || !fields.length}>{locked ? "Scoring locked" : "Submit scores"}</Button><Button type="button" variant="outline" disabled={!comments || save.isPending} onClick={()=>save.mutate("feedback")}>Send feedback</Button></div><div className="flex flex-wrap gap-2"><input aria-label="Conflict of interest reason" placeholder="Conflict of interest reason" value={reason} onChange={e=>setReason(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2"/><Button type="button" variant="outline" disabled={!reason || save.isPending} onClick={()=>save.mutate("skip")}>Skip contestant</Button></div></form>;
}