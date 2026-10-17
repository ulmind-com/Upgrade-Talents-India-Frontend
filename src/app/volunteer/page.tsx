"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Camera, Flashlight, CheckCircle2, AlertTriangle, XCircle,
  RotateCw, ArrowLeft, LogOut, Search, Clock, User, QrCode, Sparkles
} from "lucide-react";
import jsQR from "jsqr";
import {
  volunteerScannerApi,
  tokenStore,
  type TicketScanVerifyResult
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { Badge, Button, Spotlights } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

// Web Audio sound effects for gate scanners
function playSound(type: "success" | "error" | "warning") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "warning") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.setValueAtTime(280, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

interface ScanHistoryItem {
  id: string;
  ticket_ref: string;
  name: string;
  time: string;
  status: "CHECKED_IN" | "ALREADY_CHECKED" | "INVALID";
}

export default function VolunteerScannerPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Verification & Checkin states
  const [manualToken, setManualToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentVerification, setCurrentVerification] = useState<{
    result: TicketScanVerifyResult;
    rawToken: string;
  } | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // History & counters
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, duplicate: 0 });

  // Auth check
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace("/volunteer/login");
    }
  }, [router]);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Process a detected QR token
  const processQrToken = useCallback(
    async (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken || verifying || checkingIn) return;

      setVerifying(true);
      setVerifyError(null);
      setCheckInSuccess(null);

      try {
        const result = await volunteerScannerApi.verifyTicket(cleanToken);
        setCurrentVerification({ result, rawToken: cleanToken });

        if (result.ticket.is_checked_in) {
          playSound("warning");
          setStats((s) => ({ ...s, total: s.total + 1, duplicate: s.duplicate + 1 }));
          setHistory((h) => [
            {
              id: Math.random().toString(),
              ticket_ref: result.ticket.ticket_ref,
              name: result.ticket.holder_name,
              time: new Date().toLocaleTimeString(),
              status: "ALREADY_CHECKED",
            },
            ...h.slice(0, 19),
          ]);
        } else {
          playSound("success");
          setStats((s) => ({ ...s, total: s.total + 1 }));
        }
      } catch (err: any) {
        playSound("error");
        setVerifyError(err?.message || "Invalid or tampered ticket QR code.");
        setStats((s) => ({ ...s, total: s.total + 1 }));
        setHistory((h) => [
          {
            id: Math.random().toString(),
            ticket_ref: cleanToken.slice(0, 12) + "…",
            name: "Unknown Attendee",
            time: new Date().toLocaleTimeString(),
            status: "INVALID",
          },
          ...h.slice(0, 19),
        ]);
      } finally {
        setVerifying(false);
      }
    },
    [verifying, checkingIn]
  );

  // Scan frame loop using requestAnimationFrame + jsQR
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      processQrToken(code.data);
      // Small pause before reading next to prevent duplicate triggers
      setTimeout(() => {
        if (cameraActive) {
          animationFrameRef.current = requestAnimationFrame(scanLoop);
        }
      }, 1000);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  }, [processQrToken, cameraActive]);

  // Start Camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      setCameraError(
        "Camera permission denied or camera not found. Use manual token input below."
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Toggle Camera Facing
  const toggleCameraFacing = () => {
    const next = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(next);
    if (cameraActive) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  // Perform Final Check-In
  const handleConfirmCheckIn = async () => {
    if (!currentVerification) return;
    setCheckingIn(true);
    setCheckInSuccess(null);
    try {
      const res = await volunteerScannerApi.checkInTicket(currentVerification.rawToken);
      playSound("success");
      setCheckInSuccess(`Successfully checked in! Ref: ${res.ticket_ref}`);
      setStats((s) => ({ ...s, successful: s.successful + 1 }));
      setHistory((h) => [
        {
          id: Math.random().toString(),
          ticket_ref: currentVerification.result.ticket.ticket_ref,
          name: currentVerification.result.ticket.holder_name,
          time: new Date().toLocaleTimeString(),
          status: "CHECKED_IN",
        },
        ...h.slice(0, 19),
      ]);
      // Clear verification after 2 seconds
      setTimeout(() => {
        setCurrentVerification(null);
        setCheckInSuccess(null);
      }, 2500);
    } catch (err: any) {
      playSound("error");
      setVerifyError(err?.message || "Failed to mark ticket as checked in.");
    } finally {
      setCheckingIn(false);
    }
  };

  // Manual token verify submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    processQrToken(manualToken);
    setManualToken("");
  };

  const handleLogout = () => {
    stopCamera();
    tokenStore.clear();
    logout();
    router.replace("/volunteer/login");
  };

  return (
    <div className="relative min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <Spotlights />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors hover:border-[var(--cyan)]"
            >
              <ArrowLeft className="size-4 text-[var(--fg-subtle)] transition-transform group-hover:-translate-x-0.5 group-hover:text-[var(--cyan)]" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
                <ScanLine className="size-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-[var(--fg)] sm:text-base">
                    Volunteer Gate Pass Scanner
                  </h1>
                  <Badge tone="brand">Gate 1</Badge>
                </div>
                <p className="text-[11px] text-[var(--fg-subtle)]">
                  {user?.email || "Check-In Scanner Session"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-[var(--fg-subtle)] hover:text-[var(--error)]"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Scanner Interface ── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Quick Session Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">Scans</p>
            <p className="mt-1 text-2xl font-black text-[var(--fg)]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--success)]">Admitted</p>
            <p className="mt-1 text-2xl font-black text-[var(--success)]">{stats.successful}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--warning)]">Alerts</p>
            <p className="mt-1 text-2xl font-black text-[var(--warning)]">{stats.duplicate}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left Column: Live Camera & Scanner Viewfinder ── */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-2xl">
              {/* Camera Video Feed */}
              <div className="relative aspect-[4/3] w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={cn("size-full object-cover", !cameraActive && "hidden")}
                />

                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">
                      <Camera className="size-7" />
                    </span>
                    <p className="text-sm font-semibold text-zinc-400">
                      Camera Scanner is inactive
                    </p>
                    <Button onClick={startCamera} size="md" className="gap-2 bg-cyan-600 hover:bg-cyan-500">
                      <Camera className="size-4" /> Start Camera
                    </Button>
                  </div>
                )}

                {/* Viewfinder Target Overlay */}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative size-64 sm:size-72 rounded-2xl border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                      {/* Laser sweep animation */}
                      <motion.div
                        animate={{ y: [0, 250, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                        className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                      />
                      {/* Corner markers */}
                      <div className="absolute -left-1 -top-1 size-4 border-l-4 border-t-4 border-cyan-400" />
                      <div className="absolute -right-1 -top-1 size-4 border-r-4 border-t-4 border-cyan-400" />
                      <div className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-cyan-400" />
                      <div className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-cyan-400" />
                    </div>
                  </div>
                )}

                {/* Camera Top Controls */}
                {cameraActive && (
                  <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Scanning…</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleCameraFacing}
                        className="grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                        title="Switch Camera"
                      >
                        <RotateCw className="size-4" />
                      </button>
                      <button
                        onClick={stopCamera}
                        className="grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-red-900"
                        title="Stop Camera"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="bg-red-950/80 p-3 text-center text-xs text-red-300 border-t border-red-800">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual Token / Reference Entry */}
            <form
              onSubmit={handleManualSubmit}
              className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2"
            >
              <Search className="ml-2.5 size-4 text-[var(--fg-subtle)]" />
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste or type QR token / Ticket Ref…"
                className="h-10 flex-1 bg-transparent px-2 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none"
              />
              <Button type="submit" size="sm" loading={verifying} className="gap-1.5 bg-cyan-600 hover:bg-cyan-500">
                <QrCode className="size-3.5" /> Verify Pass
              </Button>
            </form>
          </div>

          {/* ── Right Column: Verification Result & Check-In Action ── */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            {/* Verification Result Card */}
            <AnimatePresence mode="wait">
              {currentVerification ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "flex flex-col gap-5 rounded-3xl border p-6 shadow-2xl transition-all",
                    currentVerification.result.ticket.is_checked_in
                      ? "border-[var(--warning)]/50 bg-[color-mix(in_srgb,var(--warning)_10%,var(--bg-elevated))]"
                      : "border-[var(--success)]/50 bg-[color-mix(in_srgb,var(--success)_10%,var(--bg-elevated))]"
                  )}
                >
                  {/* Status Banner */}
                  <div className="flex items-center gap-3">
                    {currentVerification.result.ticket.is_checked_in ? (
                      <span className="grid size-12 place-items-center rounded-2xl bg-[var(--warning)] text-black">
                        <AlertTriangle className="size-6" />
                      </span>
                    ) : (
                      <span className="grid size-12 place-items-center rounded-2xl bg-[var(--success)] text-white">
                        <CheckCircle2 className="size-6" />
                      </span>
                    )}

                    <div>
                      <h3 className="text-base font-black tracking-tight text-[var(--fg)]">
                        {currentVerification.result.ticket.is_checked_in
                          ? "ALREADY CHECKED IN"
                          : "VALID TICKET — READY"}
                      </h3>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {currentVerification.result.ticket.is_checked_in
                          ? "This pass was already used at the entrance."
                          : "Authorized participant / ticket holder."}
                      </p>
                    </div>
                  </div>

                  {/* Attendee Details Card */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/80 p-4">
                    <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
                        Attendee
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--accent)]">
                        {currentVerification.result.ticket.ticket_ref}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--fg-muted)]">
                        <User className="size-4" />
                      </span>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-[var(--fg)] truncate">
                          {currentVerification.result.ticket.holder_name}
                        </p>
                        <p className="text-xs text-[var(--fg-subtle)] truncate">
                          {currentVerification.result.ticket.holder_email}
                        </p>
                      </div>
                    </div>

                    {currentVerification.result.ticket.check_in_time && (
                      <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-[var(--warning)]/15 px-3 py-1.5 text-xs text-[var(--warning)]">
                        <Clock className="size-3.5" /> Checked in at:{" "}
                        {new Date(currentVerification.result.ticket.check_in_time).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  {/* Check-In Success Alert */}
                  {checkInSuccess && (
                    <div className="rounded-xl border border-[var(--success)] bg-[var(--success)]/20 p-3 text-center text-xs font-bold text-[var(--success)]">
                      {checkInSuccess}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {!currentVerification.result.ticket.is_checked_in && (
                      <Button
                        size="lg"
                        loading={checkingIn}
                        onClick={handleConfirmCheckIn}
                        className="w-full gap-2 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white font-bold"
                      >
                        <CheckCircle2 className="size-5" /> Confirm Entry & Check In
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentVerification(null)}
                      className="w-full"
                    >
                      Clear / Scan Next Ticket
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/60 p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-subtle)]">
                    <ScanLine className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)]">Awaiting QR Pass</h3>
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      Align the attendee&apos;s ticket QR code within the viewfinder or paste the token to verify.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {verifyError && (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--error)]/40 bg-[color-mix(in_srgb,var(--error)_10%,transparent)] p-4 text-xs font-semibold text-[var(--error)]">
                <XCircle className="size-5 shrink-0" />
                <p>{verifyError}</p>
              </div>
            )}

            {/* ── Recent Scans Feed ── */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-subtle)] mb-3">
                Recent Scans Log
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">No scans in this session yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)]/60 bg-[var(--bg)] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {item.status === "CHECKED_IN" && (
                          <span className="size-2 rounded-full bg-[var(--success)]" />
                        )}
                        {item.status === "ALREADY_CHECKED" && (
                          <span className="size-2 rounded-full bg-[var(--warning)]" />
                        )}
                        {item.status === "INVALID" && (
                          <span className="size-2 rounded-full bg-[var(--error)]" />
                        )}
                        <div>
                          <p className="font-semibold text-[var(--fg)]">{item.name}</p>
                          <p className="font-mono text-[10px] text-[var(--fg-subtle)]">{item.ticket_ref}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-[var(--fg-subtle)]">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
