import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { str } from "@/shared/format";
import { SiteLayout } from "../layouts/SiteLayout";
import { siteApi } from "../api";

export function CertificateVerificationPage() {
  const [token, setToken] = useState("");
  const verify = useMutation({ mutationFn: siteApi.verifyCertificate });
  function submit(e: FormEvent) { e.preventDefault(); verify.mutate(token.trim()); }
  const result = verify.data;
  const certificate = (result?.certificate ?? result?.data ?? result) as Record<string, unknown> | undefined;
  return <SiteLayout><section className="mx-auto min-h-[70vh] max-w-3xl px-5 pb-24 pt-32"><ShieldCheck className="mb-6 h-10 w-10 text-primary"/><h1 className="page-heading font-display font-bold">Verify a certificate</h1><form onSubmit={submit} className="mt-10 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input aria-label="Verification token" value={token} onChange={e => setToken(e.target.value)} required placeholder="Verification token" className="min-w-0 flex-1 rounded-md border border-input bg-background px-4 py-3"/><Button type="submit" disabled={verify.isPending}>{verify.isPending ? "Checking…" : "Verify"}</Button></form>{verify.isError && <p role="alert" className="mt-6 text-destructive">{verify.error.message}</p>}{certificate && <div role="status" className="mt-8 border-t border-border pt-6"><h2 className="text-2xl font-bold">{result?.valid === false || result?.is_valid === false ? "Certificate not valid" : "Verification result"}</h2><dl className="mt-5 space-y-3">{Object.entries(certificate).filter(([,v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean").map(([k,v]) => <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 text-sm"><dt className="capitalize text-muted-foreground">{k.replaceAll("_", " ")}</dt><dd className="break-words">{str(v)}</dd></div>)}</dl></div>}</section></SiteLayout>;
}