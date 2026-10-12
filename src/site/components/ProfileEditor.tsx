import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { str } from "@/shared/format";
import { siteApi } from "../api";

export function ProfileEditor({ profile }: { profile: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({ mutationFn: siteApi.updateProfile, onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); setOpen(false); toast.success("Profile updated"); }, onError: (e: Error) => toast.error(e.message) });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); for (const [k,v] of f.entries()) if (v === "" || (v instanceof File && v.size === 0)) f.delete(k); save.mutate(f); }
  return <><Button variant="outline" onClick={() => setOpen(true)}><Pencil className="h-4 w-4"/>Edit profile</Button>{open && <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-background/90 p-4"><form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Edit profile" className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Edit profile</h2><Button type="button" size="icon" variant="ghost" aria-label="Close profile editor" onClick={() => setOpen(false)}><X/></Button></div>{[["name","Name"],["phone_number","Phone number"],["address","Address"],["parent_phone_number","Parent phone number"]].map(([name,label]) => <label key={name} className="block text-sm">{label}<input name={name} defaultValue={str(profile[name ?? ""])} inputMode={name?.includes("phone") ? "numeric" : "text"} pattern={name?.includes("phone") ? "[0-9]+" : undefined} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"/></label>)}<label className="block text-sm">Profile photo<input name="profile_photo" type="file" accept="image/*" className="mt-2 block w-full text-sm"/></label><Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? "Saving…" : "Save profile"}</Button></form></div>}</>;
}