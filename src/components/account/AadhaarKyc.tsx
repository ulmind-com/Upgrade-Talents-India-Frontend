"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Lock, Loader2, X, ArrowRight,
  AlertCircle, CheckCircle2, FileCheck2, UserCheck, CalendarDays,
  Sparkles, Upload, FileText, Image as ImageIcon
} from "lucide-react";
import { kycApi, type KycStatus } from "@/lib/api";
import { Button } from "@/components/ui/Primitives";
import { formatEventDate } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   AADHAAR KYC PANEL — Lives in the dashboard profile tab
   ═══════════════════════════════════════════════════════════════════ */

export default function AadhaarKyc() {
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await kycApi.status();
      setKyc(res);
    } catch {
      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verified = Boolean(
    kyc?.is_verified ||
    kyc?.status === "VERIFIED" ||
    kyc?.kyc_status === "VERIFIED" ||
    kyc?.verified === true
  );

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-lg transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            {verified ? (
              <ShieldCheck className="size-4.5 text-green-400" aria-hidden />
            ) : (
              <ShieldAlert className="size-4.5 text-[var(--accent)]" aria-hidden />
            )}
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-[var(--fg)]">
              Aadhaar ID Verification
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Government Identity Verification
            </p>
          </div>
        </div>

        {verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-semibold text-green-400">
            <CheckCircle2 className="size-3.5" aria-hidden /> Verified
          </span>
        ) : (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
            Not verified
          </span>
        )}
      </div>

      {notice && (
        <div className="mx-7 mt-5 flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-xs text-[var(--accent)]">
          <Sparkles className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 px-7 py-8 text-sm text-[var(--fg-muted)]">
          <Loader2 className="size-4 animate-spin text-[var(--accent)]" aria-hidden />
          Checking Aadhaar verification status…
        </div>
      ) : verified ? (
        <>
          <dl className="divide-y divide-[var(--border)]">
            {[
              { k: "Masked Aadhaar", v: kyc?.aadhaar_masked, icon: Lock, mono: true },
              { k: "Verified Name", v: kyc?.verified_name, icon: UserCheck },
              { k: "Date of Birth", v: kyc?.verified_dob ? formatEventDate(kyc.verified_dob) : null, icon: CalendarDays },
              { k: "Verification Source", v: kyc?.source || kyc?.verification_source || "Aadhaar Document", icon: FileCheck2 },
              { k: "Verified On", v: kyc?.verified_at ? formatEventDate(kyc.verified_at) : null, icon: FileCheck2 },
            ]
              .filter((row) => row.v)
              .map((row) => (
                <div key={row.k} className="flex items-start justify-between gap-6 px-7 py-4.5">
                  <dt className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    <row.icon className="size-3.5 text-green-400" aria-hidden /> {row.k}
                  </dt>
                  <dd className={`text-right text-sm font-semibold [overflow-wrap:anywhere] ${row.mono ? "font-mono tracking-[0.12em]" : ""}`}>
                    {row.v}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="border-t border-[var(--border)] px-7 py-4 text-[11px] text-[var(--fg-subtle)]">
            <span>
              Verified securely using Aadhaar document checksum verification. Raw Aadhaar numbers are never stored in plain text.
            </span>
          </div>
        </>
      ) : (
        <div className="px-7 py-6">
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            Verify your government ID to unlock prize disbursements, verified contestant certificates, and official competition eligibility.
          </p>

          <ul className="mt-5 flex flex-col gap-2.5">
            {[
              { icon: FileCheck2, text: "Upload your Aadhaar card photo (JPG, PNG) or e-Aadhaar PDF document" },
              { icon: Lock, text: "Only a permanently masked identity (XXXX-XXXX-1234) is retained for duplicate prevention" },
              { icon: ShieldCheck, text: "Strict UIDAI Verhoeff algorithm ensures valid and secure authentication" },
            ].map((row) => (
              <li key={row.text} className="flex items-start gap-2.5 text-[13px] text-[var(--fg-muted)]">
                <row.icon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden />
                {row.text}
              </li>
            ))}
          </ul>

          {/* Action button */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setModalOpen(true)}
              className="flex-1 shadow-lg shadow-[var(--accent)]/15"
            >
              <Upload className="size-4" aria-hidden />
              <span>Verify Aadhaar ID</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Document Upload Modal ── */}
      <AadhaarUploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onVerified={async () => {
          setModalOpen(false);
          setNotice("Aadhaar KYC verified successfully!");
          await load();
          setTimeout(() => setNotice(null), 5000);
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AADHAAR UPLOAD MODAL
   ═══════════════════════════════════════════════════════════════════ */

function AadhaarUploadModal({
  isOpen,
  onClose,
  onVerified,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setErr(null);
      setSuccessMsg(null);
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (f: File) => {
    const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (!validExts.includes(ext)) {
      setErr("Please upload a valid Aadhaar PDF document or image file (.pdf, .jpg, .png, .webp).");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErr("File size exceeds 15MB limit.");
      return;
    }
    setSelectedFile(f);
    setErr(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErr("Please select your Aadhaar document first.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("govt_id_proof", selectedFile);
      const res = await kycApi.verifyDocument(fd);
      setSuccessMsg(res.message || "Aadhaar verified successfully!");
      setTimeout(() => {
        onVerified();
      }, 1200);
    } catch (e: any) {
      setErr(e?.message || "Verification failed. Please make sure the Aadhaar card number is clearly legible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 backdrop-blur-md bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label="Upload Aadhaar document"
        className="relative flex max-h-[min(90dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl z-10"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase text-[var(--fg)]">
              <ShieldCheck className="size-4.5 text-[var(--accent)]" aria-hidden /> Aadhaar Verification
            </h3>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Document Upload & Verhoeff Check
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col p-6 space-y-5">
          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{err}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-400">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{successMsg}</span>
            </div>
          )}

          <p className="text-[13px] text-[var(--fg-muted)] leading-relaxed">
            Upload your original Aadhaar card image (front side showing 12-digit number) or downloaded e-Aadhaar PDF.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : selectedFile
                ? "border-emerald-500/50 bg-emerald-500/10"
                : "border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)]"
            }`}
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)]">
              {selectedFile?.name.endsWith(".pdf") ? (
                <FileText className="size-6 text-emerald-400" />
              ) : selectedFile ? (
                <ImageIcon className="size-6 text-emerald-400" />
              ) : (
                <Upload className="size-6" />
              )}
            </div>

            {selectedFile ? (
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[var(--fg)] truncate max-w-[280px]">
                  {selectedFile.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--fg-subtle)]">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to choose different file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm text-[var(--fg)]">
                  Click or drag file to upload
                </p>
                <p className="mt-0.5 text-xs text-[var(--fg-subtle)]">
                  PDF, PNG, JPG or WEBP (Max 15MB)
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
            <Lock className="size-3.5 shrink-0" />
            <span>Secure 256-bit encryption. Raw Aadhaar numbers are never stored in database.</span>
          </div>

          <div className="mt-auto pt-2">
            <Button
              type="submit"
              disabled={!selectedFile || busy}
              loading={busy}
              className="w-full"
            >
              Verify Document <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
