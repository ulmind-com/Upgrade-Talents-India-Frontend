"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Camera, Flashlight, CheckCircle2, AlertTriangle, XCircle,
  RotateCw, ArrowLeft, LogOut, Search, Clock, User, QrCode, Sparkles,
  Volume2, VolumeX, Maximize2, Minimize2, Copy, Check, ShieldCheck,
  Zap, Radio, Trash2, ClipboardPaste, X
} from "lucide-react";
import jsQR from "jsqr";
import {
  volunteerScannerApi,
  tokenStore,
  type TicketScanVerifyResult
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { cn } from "@/lib/utils";

// Web Audio sound synthesizer for instant gate chimes
function playGateSound(type: "success" | "error" | "warning", enabled = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant futuristic double-chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === "warning") {
      // Distinct double warning buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Deep error buzz
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
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

const GATES = ["Gate 1 — Main", "Gate 2 — North", "Gate 3 — Stage", "VIP Gate"];

export default function VolunteerScannerPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Gate selection & Clock
  const [gate, setGate] = useState("Gate 1 — Main");
  const [currentTime, setCurrentTime] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);

  // Camera states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

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

  // Stats & History
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, duplicate: 0 });

  // Real-time ticking clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

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
    setTorchOn(false);
  }, []);

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
      if (caps.torch) {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      }
    } catch {}
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Process a detected QR token
  const processQrToken = useCallback(
    async (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken || verifying || checkingIn) return;

      setVerifying(true);
      setVerifyError(null);
      setCheckInSuccess(null);
      setScanPulse(true);
      setTimeout(() => setScanPulse(false), 600);

      try {
        const result = await volunteerScannerApi.verifyTicket(cleanToken);
        setCurrentVerification({ result, rawToken: cleanToken });

        if (result.ticket.is_checked_in) {
          playGateSound("warning", soundEnabled);
          setStats((s) => ({ ...s, total: s.total + 1, duplicate: s.duplicate + 1 }));
          setHistory((h) => [
            {
              id: Math.random().toString(),
              ticket_ref: result.ticket.ticket_ref,
              name: result.ticket.holder_name,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              status: "ALREADY_CHECKED",
            },
            ...h.slice(0, 29),
          ]);
        } else {
          playGateSound("success", soundEnabled);
          setStats((s) => ({ ...s, total: s.total + 1 }));
        }
      } catch (err: any) {
        playGateSound("error", soundEnabled);
        setVerifyError(err?.message || "Invalid or unrecognized ticket QR code.");
        setStats((s) => ({ ...s, total: s.total + 1 }));
        setHistory((h) => [
          {
            id: Math.random().toString(),
            ticket_ref: cleanToken.slice(0, 14) + "…",
            name: "Unknown Attendee",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            status: "INVALID",
          },
          ...h.slice(0, 29),
        ]);
      } finally {
        setVerifying(false);
      }
    },
    [verifying, checkingIn, soundEnabled]
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
      // Small pause before reading next
      setTimeout(() => {
        if (cameraActive) {
          animationFrameRef.current = requestAnimationFrame(scanLoop);
        }
      }, 1200);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  }, [cameraActive, processQrToken]);

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
    } catch {
      setCameraError("Camera permission denied or camera unavailable. Please allow camera or use manual input.");
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
      playGateSound("success", soundEnabled);
      setCheckInSuccess(`ACCESS GRANTED — Ref: ${res.ticket_ref}`);
      setStats((s) => ({ ...s, successful: s.successful + 1 }));
      setHistory((h) => [
        {
          id: Math.random().toString(),
          ticket_ref: currentVerification.result.ticket.ticket_ref,
          name: currentVerification.result.ticket.holder_name,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "CHECKED_IN",
        },
        ...h.slice(0, 29),
      ]);
      // Clear after 3 seconds
      setTimeout(() => {
        setCurrentVerification(null);
        setCheckInSuccess(null);
      }, 3000);
    } catch (err: any) {
      playGateSound("error", soundEnabled);
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

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualToken(text);
        processQrToken(text);
      }
    } catch {}
  };

  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setHasCopiedRef(true);
    setTimeout(() => setHasCopiedRef(false), 2000);
  };

  const handleLogout = () => {
    stopCamera();
    tokenStore.clear();
    logout();
    router.replace("/volunteer/login");
  };

  const handleClearHistory = () => {
    if (confirm("Reset current session statistics and scan history?")) {
      setHistory([]);
      setStats({ total: 0, successful: 0, duplicate: 0 });
    }
  };

  return (
    <div className="relative min-h-dvh bg-[#070913] text-zinc-100 selection:bg-cyan-500 selection:text-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* Subtle Ambient Background Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -right-40 top-1/4 size-[550px] rounded-full bg-emerald-500/10 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 size-[500px] rounded-full bg-indigo-500/10 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COMMAND BAR HEADER (No navbar collision!)
         ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070913]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: Terminal Brand & Gate Selector */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400"
              title="Exit to Main Website"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
                <ScanLine className="size-4" />
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400" />
              </span>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-sm font-bold uppercase tracking-wider text-white sm:text-base">
                    Gate Commander
                  </h1>
                  <select
                    value={gate}
                    onChange={(e) => setGate(e.target.value)}
                    className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 outline-none hover:border-cyan-400 transition-colors cursor-pointer"
                  >
                    {GATES.map((g) => (
                      <option key={g} value={g} className="bg-zinc-900 text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {user?.email || "volunteer@upgradetalents.com"}
                </p>
              </div>
            </div>
          </div>

          {/* Center / Right: Live Clock & Quick Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentTime && (
              <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-xs text-zinc-300 md:flex">
                <Clock className="size-3.5 text-cyan-400" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl border transition-all",
                soundEnabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-white/10 bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
              )}
              title={soundEnabled ? "Sound Effects: ON" : "Sound Effects: MUTED"}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-all hover:border-white/20 hover:text-white"
              title="Toggle Fullscreen Kiosk Mode"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN SCANNER OPERATING CONSOLE
         ═══════════════════════════════════════════════════════════════════ */}
      <main className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
        {/* Metric Cards Ribbon */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Total Scanned */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 via-zinc-900/40 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-cyan-400">
                Total Scanned
              </span>
              <ScanLine className="size-4 text-cyan-400 opacity-80" />
            </div>
            <p className="mt-2 font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {stats.total}
            </p>
            <span className="mt-1 block font-mono text-[10px] text-zinc-400">Gate entries checked</span>
          </div>

          {/* Admitted */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/20 via-zinc-900/40 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">
                Admitted
              </span>
              <CheckCircle2 className="size-4 text-emerald-400 opacity-80" />
            </div>
            <p className="mt-2 font-display text-2xl sm:text-4xl font-extrabold text-emerald-300 tracking-tight">
              {stats.successful}
            </p>
            <span className="mt-1 block font-mono text-[10px] text-emerald-400/80">Valid admissions</span>
          </div>

          {/* Alerts / Duplicates */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-950/20 via-zinc-900/40 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                Alerts / Flags
              </span>
              <AlertTriangle className="size-4 text-amber-400 opacity-80" />
            </div>
            <p className="mt-2 font-display text-2xl sm:text-4xl font-extrabold text-amber-300 tracking-tight">
              {stats.duplicate}
            </p>
            <span className="mt-1 block font-mono text-[10px] text-amber-400/80">Duplicates or invalid</span>
          </div>
        </div>

        {/* Console Working Deck */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ─────────────────────────────────────────────────────────────
              LEFT DECK: Live Camera Viewfinder & Manual Input
             ───────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Camera Viewport Frame */}
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border bg-black shadow-2xl transition-all duration-300",
                scanPulse
                  ? "border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)] scale-[1.008]"
                  : cameraActive
                  ? "border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
                  : "border-white/10"
              )}
            >
              <div className="relative aspect-[4/3] w-full bg-[#05060d] flex items-center justify-center overflow-hidden">
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={cn("size-full object-cover", !cameraActive && "hidden")}
                />

                {/* Inactive Standby Screen */}
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-sm">
                    <div className="relative">
                      <span className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-400 shadow-xl shadow-cyan-500/10">
                        <Camera className="size-8" />
                      </span>
                      <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-black bg-zinc-600" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">Scanner Standby</h3>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        Activate your camera scanner to automatically detect and verify attendee QR admission passes.
                      </p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-xs font-bold text-black shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Camera className="size-4" /> Start Camera Scanner
                    </button>
                  </div>
                )}

                {/* Tactical Cyber Target Reticle & Laser Sweep */}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <div className="relative size-60 sm:size-72 rounded-2xl border border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.25)]">
                      {/* Laser scanning sweep line */}
                      <motion.div
                        animate={{ y: [0, 230, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#22d3ee]"
                      />

                      {/* Neon Target Corners */}
                      <div className="absolute -left-1 -top-1 size-5 border-l-4 border-t-4 border-cyan-400" />
                      <div className="absolute -right-1 -top-1 size-5 border-r-4 border-t-4 border-cyan-400" />
                      <div className="absolute -bottom-1 -left-1 size-5 border-b-4 border-l-4 border-cyan-400" />
                      <div className="absolute -bottom-1 -right-1 size-5 border-b-4 border-r-4 border-cyan-400" />

                      {/* Center Crosshair Target */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="size-8 rounded-full border border-dashed border-cyan-300" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Camera HUD Controls */}
                {cameraActive && (
                  <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-xl">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-[11px] font-semibold tracking-wide">RADAR ACTIVE</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Torch Button */}
                      <button
                        onClick={toggleTorch}
                        className={cn(
                          "grid size-9 place-items-center rounded-full backdrop-blur-xl transition-all",
                          torchOn
                            ? "bg-yellow-400 text-black shadow-lg shadow-yellow-500/40"
                            : "bg-black/70 border border-white/10 text-white hover:bg-black/90"
                        )}
                        title="Toggle Torch / Flashlight"
                      >
                        <Flashlight className="size-4" />
                      </button>

                      {/* Flip Camera */}
                      <button
                        onClick={toggleCameraFacing}
                        className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-xl hover:bg-black/90 transition-all"
                        title="Flip Camera (Front / Rear)"
                      >
                        <RotateCw className="size-4" />
                      </button>

                      {/* Stop Camera */}
                      <button
                        onClick={stopCamera}
                        className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/70 text-zinc-300 backdrop-blur-xl hover:bg-rose-950/80 hover:text-rose-400 transition-all"
                        title="Pause / Stop Scanner"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="flex items-center gap-2 border-t border-rose-500/30 bg-rose-950/90 p-3 text-center text-xs text-rose-300">
                  <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                  <p className="flex-1">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Manual Token / Reference Entry Dock */}
            <form
              onSubmit={handleManualSubmit}
              className="group relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl transition-all focus-within:border-cyan-500/50 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
            >
              <div className="flex items-center pl-3 text-zinc-500 group-focus-within:text-cyan-400 transition-colors">
                <Search className="size-4" />
              </div>

              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Enter or paste token / Ticket Ref (e.g. TKT-F6D676CF)…"
                className="h-10 flex-1 bg-transparent px-2 font-mono text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />

              {manualToken && (
                <button
                  type="button"
                  onClick={() => setManualToken("")}
                  className="grid size-7 place-items-center rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="hidden sm:flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition-all"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="size-3" /> Paste
              </button>

              <button
                type="submit"
                disabled={verifying}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                <QrCode className="size-3.5" /> Verify
              </button>
            </form>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT DECK: Instant Validation Feed & Check-In Action
             ───────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            {/* Verification State Container */}
            <AnimatePresence mode="wait">
              {currentVerification ? (
                <motion.div
                  key={currentVerification.rawToken}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={cn(
                    "flex flex-col gap-4 rounded-3xl border p-5 sm:p-6 shadow-2xl backdrop-blur-2xl transition-all",
                    currentVerification.result.ticket.is_checked_in
                      ? "border-amber-500/50 bg-gradient-to-b from-amber-950/40 via-zinc-900/60 to-black/80 shadow-amber-500/10"
                      : "border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-zinc-900/60 to-black/80 shadow-emerald-500/15"
                  )}
                >
                  {/* Status Banner */}
                  <div className="flex items-center gap-3">
                    {currentVerification.result.ticket.is_checked_in ? (
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-black shadow-lg shadow-amber-500/30">
                        <AlertTriangle className="size-6" />
                      </span>
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 animate-bounce">
                        <CheckCircle2 className="size-6" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {currentVerification.result.ticket.is_checked_in
                          ? "GATE ADMISSION WARNING"
                          : "GATE ENTRY VERIFIED"}
                      </span>
                      <h3
                        className={cn(
                          "font-display text-lg sm:text-xl font-bold uppercase tracking-tight truncate",
                          currentVerification.result.ticket.is_checked_in
                            ? "text-amber-300"
                            : "text-emerald-300"
                        )}
                      >
                        {currentVerification.result.ticket.is_checked_in
                          ? "ALREADY CHECKED IN"
                          : "AUTHORIZED ENTRY — READY"}
                      </h3>
                    </div>
                  </div>

                  {/* Attendee Data Card */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Attendee Profile
                      </span>
                      <button
                        onClick={() => handleCopyRef(currentVerification.result.ticket.ticket_ref)}
                        className="flex items-center gap-1 font-mono text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <span>{currentVerification.result.ticket.ticket_ref}</span>
                        {hasCopiedRef ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white">
                        <User className="size-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-bold text-white uppercase truncate">
                          {currentVerification.result.ticket.holder_name || "Guest Attendee"}
                        </p>
                        <p className="font-mono text-xs text-zinc-400 truncate">
                          {currentVerification.result.ticket.holder_email || "No email"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-1 grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold">Booking</span>
                        <p className="font-mono text-xs font-semibold text-emerald-400">
                          {currentVerification.result.booking_status || "CONFIRMED"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold">Admit Gate</span>
                        <p className="font-mono text-xs font-semibold text-zinc-300">{gate}</p>
                      </div>
                    </div>

                    {currentVerification.result.ticket.check_in_time && (
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 font-medium">
                        <Clock className="size-4 shrink-0 text-amber-400" />
                        <span>
                          Prior entry recorded at:{" "}
                          <strong className="text-white">
                            {new Date(currentVerification.result.ticket.check_in_time).toLocaleTimeString()}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Check-In Success Toast */}
                  {checkInSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-emerald-400/50 bg-emerald-500/20 p-3 text-center text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/20"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="size-4 text-emerald-300" /> {checkInSuccess}
                      </span>
                    </motion.div>
                  )}

                  {/* Primary Gate Action Button */}
                  <div className="flex flex-col gap-2 pt-1">
                    {!currentVerification.result.ticket.is_checked_in && (
                      <button
                        disabled={checkingIn}
                        onClick={handleConfirmCheckIn}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-black shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all"
                      >
                        <CheckCircle2 className="size-5" />
                        {checkingIn ? "Checking In Attendee…" : "Confirm Entry & Admit"}
                      </button>
                    )}

                    <button
                      onClick={() => setCurrentVerification(null)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-zinc-300 hover:border-white/20 hover:text-white transition-all"
                    >
                      Scan Next Attendee
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Idle Radar Screen */
                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
                  <div className="relative">
                    <span className="grid size-16 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                      <ScanLine className="size-8 animate-pulse" />
                    </span>
                    <span className="absolute -bottom-1 -right-1 size-3 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                      Awaiting Ticket QR
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400 max-w-xs leading-relaxed">
                      Align the attendee&apos;s digital gate pass or printed QR code inside the camera viewfinder to instantly authorize admission.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                    <ShieldCheck className="size-3.5 text-cyan-400" /> Instant cryptographic validation
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Error Message Toast */}
            {verifyError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-xs font-semibold text-rose-300 shadow-lg shadow-rose-500/10"
              >
                <XCircle className="size-5 shrink-0 text-rose-400" />
                <p className="flex-1">{verifyError}</p>
                <button
                  onClick={() => setVerifyError(null)}
                  className="grid size-6 place-items-center rounded-full text-rose-400 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            )}

            {/* ── Recent Scans Live Terminal ── */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio className="size-3.5 text-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Live Gate Stream ({history.length})
                  </h3>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="size-3" /> Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-500 font-mono">
                  No gate scans logged yet in this session.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/40 px-3 py-2 text-xs transition-colors hover:border-white/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.status === "CHECKED_IN" && (
                          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        )}
                        {item.status === "ALREADY_CHECKED" && (
                          <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                        )}
                        {item.status === "INVALID" && (
                          <span className="size-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="font-mono text-[10px] text-zinc-400 truncate">{item.ticket_ref}</p>
                        </div>
                      </div>

                      <span className="shrink-0 font-mono text-[10px] text-zinc-500">{item.time}</span>
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
