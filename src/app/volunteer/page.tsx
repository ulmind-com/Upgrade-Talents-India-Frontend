"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Camera, Flashlight, CheckCircle2, AlertTriangle, XCircle,
  RotateCw, ArrowLeft, LogOut, Search, Clock, User, QrCode, Sparkles,
  Volume2, VolumeX, ShieldCheck, ShieldAlert, Zap, X, ChevronRight,
  Calendar, MapPin, Users, Ticket, ArrowRight, RefreshCw, Check, Banknote
} from "lucide-react";
import jsQR from "jsqr";
import {
  volunteerScannerApi,
  tokenStore,
  type TicketScanVerifyResult
} from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";
import { cn } from "@/lib/utils";

// Web Audio sound synthesizer for instant ultra-premium gate chimes
function playGateSound(type: "success" | "error" | "warning", enabled = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "success") {
      // ── Ultra-premium 4-tone harmonic crystal chime (Ascending VIP Gate Chime) ──
      const notes = [
        { freq: 523.25, time: 0, dur: 0.35, gain: 0.20 },
        { freq: 659.25, time: 0.05, dur: 0.35, gain: 0.22 },
        { freq: 783.99, time: 0.10, dur: 0.40, gain: 0.24 },
        { freq: 1046.50, time: 0.16, dur: 0.55, gain: 0.28 },
        { freq: 2093.00, time: 0.18, dur: 0.35, gain: 0.10 },
      ];

      notes.forEach(({ freq, time, dur, gain: targetGain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gainNode.gain.setValueAtTime(0.0001, ctx.currentTime + time);
        gainNode.gain.exponentialRampToValueAtTime(targetGain, ctx.currentTime + time + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } else if (type === "warning") {
      // Alert chime (A4 -> E4)
      const notes = [
        { freq: 440, time: 0, dur: 0.18, gain: 0.2 },
        { freq: 330, time: 0.12, dur: 0.25, gain: 0.2 },
      ];
      notes.forEach(({ freq, time, dur, gain: targetGain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gainNode.gain.setValueAtTime(targetGain, ctx.currentTime + time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } else {
      // Low dual error buzz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.type = "sawtooth";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(150, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      osc2.frequency.setValueAtTime(154, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(102, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

interface ScanHistoryItem {
  id: string;
  ticket_ref: string;
  name: string;
  time: string;
  status: "CHECKED_IN" | "ALREADY_CHECKED" | "INVALID";
  isCash?: boolean;
  amount?: number;
}

export default function VolunteerScannerPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // App Screen Mode: "home" | "scanner" | "details"
  const [screen, setScreen] = useState<"home" | "scanner" | "details">("home");

  // Audio & Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  // Camera references & state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectorRef = useRef<any>(null);
  const scanTickRef = useRef<() => void>(() => {});
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Verification & Ticket Data
  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentVerification, setCurrentVerification] = useState<{
    result: TicketScanVerifyResult;
    rawToken: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  // Shift Statistics & History
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [admittedCount, setAdmittedCount] = useState(0);
  const [cashCollectedTotal, setCashCollectedTotal] = useState<number>(0);
  const [cashCollectedCount, setCashCollectedCount] = useState<number>(0);
  const [onlineCheckinsCount, setOnlineCheckinsCount] = useState<number>(0);

  // Assigned Events for this Volunteer
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Auth Protection
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace("/volunteer/login");
    }
  }, [router]);

  // Load Real-time Stats & Recent Check-in History from Server
  const loadStatsAndHistory = useCallback(async (eventId?: string) => {
    try {
      const stats = await volunteerScannerApi.getStats(eventId || undefined);
      if (stats) {
        setAdmittedCount(stats.total_checkins || 0);
        setOnlineCheckinsCount(stats.online_checkins_count || 0);
        setCashCollectedCount(stats.cash_collected_count || 0);
        setCashCollectedTotal(stats.total_cash_collected || 0);
      }
    } catch {}

    try {
      const hist = await volunteerScannerApi.getHistory(15, eventId || undefined);
      if (Array.isArray(hist) && hist.length > 0) {
        setHistory(
          hist.map((h: any) => ({
            id: h.ticket_ref || Math.random().toString(),
            ticket_ref: h.ticket_ref || "",
            name: h.holder_name || "Guest",
            time: h.check_in_time
              ? new Date(h.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Just now",
            status: "CHECKED_IN",
            isCash: Boolean(h.cash_collect_done || h.cash_status === "COLLECTED" || String(h.payment_method).toUpperCase() === "CASH"),
            amount: h.cash_amount || h.total_amount,
          }))
        );
      }
    } catch {}
  }, []);

  // Load Assigned Events
  useEffect(() => {
    let mounted = true;
    volunteerScannerApi
      .getAssignedEvents()
      .then((evs) => {
        if (!mounted) return;
        const list = Array.isArray(evs) ? evs : [];
        setAssignedEvents(list);
        if (list.length > 0) {
          const initialId = list[0].event_id || list[0].id || "";
          setSelectedEventId(initialId);
          loadStatsAndHistory(initialId);
        } else {
          loadStatsAndHistory();
        }
      })
      .catch(() => {
        loadStatsAndHistory();
      })
      .finally(() => {
        if (mounted) setLoadingEvents(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadStatsAndHistory]);

  // Sync stats whenever selected event changes
  useEffect(() => {
    if (selectedEventId) {
      loadStatsAndHistory(selectedEventId);
    }
  }, [selectedEventId, loadStatsAndHistory]);

  const activeEvent =
    assignedEvents.find((e) => (e.event_id || e.id) === selectedEventId) || assignedEvents[0];

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
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

  // Process a scanned / entered token
  const processQrToken = useCallback(
    async (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken) return;

      setVerifying(true);
      setVerifyError(null);
      setCheckInSuccess(null);
      setCurrentVerification(null);
      setScreen("details"); // Immediately switch to Ticket Details screen

      try {
        const result = await volunteerScannerApi.verifyTicket(cleanToken, selectedEventId || undefined);
        setCurrentVerification({ result, rawToken: cleanToken });

        if (result.ticket.is_checked_in) {
          playGateSound("warning", soundEnabled);
          setHistory((h) => [
            {
              id: Math.random().toString(),
              ticket_ref: result.ticket.ticket_ref,
              name: result.ticket.holder_name,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              status: "ALREADY_CHECKED",
            },
            ...h.slice(0, 19),
          ]);
        } else {
          playGateSound("success", soundEnabled);
        }
      } catch (err: any) {
        playGateSound("error", soundEnabled);
        const errMsg = err?.message || "Invalid or unrecognized ticket QR code.";
        setVerifyError(errMsg);
        setHistory((h) => [
          {
            id: Math.random().toString(),
            ticket_ref: cleanToken.slice(0, 12) + "…",
            name: "Rejected",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "INVALID",
          },
          ...h.slice(0, 19),
        ]);
      } finally {
        setVerifying(false);
      }
    },
    [soundEnabled, selectedEventId]
  );

  // Scanning loop: Fast native BarcodeDetector with jsQR fallback on downscaled frame
  const scanTick = useCallback(async () => {
    const schedule = (ms: number) => {
      if (!streamRef.current) return;
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => scanTickRef.current(), ms);
    };

    const video = videoRef.current;
    if (!streamRef.current || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      schedule(150);
      return;
    }

    let found: string | null = null;

    // 1) GPU-backed BarcodeDetector
    const detector = detectorRef.current;
    if (detector) {
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length) found = codes[0].rawValue || null;
      } catch {
        detectorRef.current = null;
      }
    }

    // 2) jsQR fallback
    if (!found) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (canvas && ctx && vw && vh) {
        const MAX = 640;
        const scale = Math.min(1, MAX / Math.max(vw, vh));
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (code && code.data) found = code.data;
      }
    }

    // IMMEDIATELY CLOSE SCANNER CAMERA UPON SUCCESSFUL DETECTION
    if (found) {
      stopCamera();
      processQrToken(found);
      return;
    }

    schedule(120);
  }, [stopCamera, processQrToken]);

  useEffect(() => {
    scanTickRef.current = scanTick;
  }, [scanTick]);

  // Start Camera Function
  const startCamera = async (targetFacing?: "environment" | "user") => {
    stopCamera();
    setCameraError(null);
    const facing = targetFacing || cameraFacing;

    try {
      let stream: MediaStream | null = null;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing === "environment" ? { ideal: "environment" } : "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ focusMode: "continuous" } as any],
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (!detectorRef.current && typeof (window as any).BarcodeDetector !== "undefined") {
        try {
          const BD = (window as any).BarcodeDetector;
          const fmts = BD.getSupportedFormats ? await BD.getSupportedFormats() : null;
          if (!fmts || fmts.includes("qr_code")) {
            detectorRef.current = new BD({ formats: ["qr_code"] });
          }
        } catch {
          detectorRef.current = null;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => scanTickRef.current(), 100);
      }
    } catch {
      setCameraError("Camera permission denied or camera not accessible. You can enter ticket codes manually below.");
    }
  };

  const handleOpenScanner = () => {
    setCameraError(null);
    setScreen("scanner");
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const handleCloseScanner = () => {
    stopCamera();
    setScreen("home");
  };

  const handleToggleFacing = () => {
    const next = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(next);
    startCamera(next);
  };

  // Perform Final Check-In (Admit Attendees & Handle Cash Collection)
  const handleConfirmAdmission = async (collectCash: boolean = false) => {
    if (!currentVerification) return;
    setCheckingIn(true);
    setVerifyError(null);

    const ticket = currentVerification.result.ticket;
    const quantity = ticket.quantity || 1;
    const cashAmount = Number(ticket.total_amount || 0);

    try {
      const res = await volunteerScannerApi.checkInTicket(
        currentVerification.rawToken,
        quantity,
        selectedEventId || undefined,
        collectCash
      );

      playGateSound("success", soundEnabled);
      const admittedNow = res.admitted_now || quantity;

      if (collectCash) {
        setCheckInSuccess(`✅ ₹${cashAmount.toLocaleString("en-IN")} Cash Collected & Admitted ${admittedNow} attendee(s)!`);
        setCashCollectedTotal((prev) => prev + cashAmount);
        setCashCollectedCount((prev) => prev + admittedNow);
      } else {
        setCheckInSuccess(res.message || `Entry Confirmed! Admitted ${admittedNow} attendee(s).`);
        setOnlineCheckinsCount((prev) => prev + admittedNow);
      }
      setAdmittedCount((c) => c + admittedNow);

      // Refresh shift stats in background
      loadStatsAndHistory(selectedEventId);

      setHistory((h) => [
        {
          id: Math.random().toString(),
          ticket_ref: ticket.ticket_ref,
          name: ticket.holder_name,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "CHECKED_IN",
          isCash: collectCash || ticket.is_cash,
          amount: collectCash ? cashAmount : undefined,
        },
        ...h.slice(0, 19),
      ]);

      // Update current verification state to reflect admission and payment
      setCurrentVerification((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          result: {
            ...prev.result,
            is_cash_pending: false,
            cash_collect_done: true,
            cash_status: "COLLECTED",
            cash_collected_display: "Cash Collect Done",
            ticket: {
              ...prev.result.ticket,
              is_checked_in: true,
              is_fully_used: true,
              is_cash_pending: false,
              cash_collect_done: true,
              cash_status: "COLLECTED",
              cash_collected_display: "Cash Collect Done",
              payment_status: "PAID",
              admitted_count: res.total_admitted || quantity,
              remaining_count: 0,
              status: "USED",
            },
          },
        };
      });
    } catch (err: any) {
      playGateSound("error", soundEnabled);
      setVerifyError(err?.message || "Check-in failed. Please verify with event supervisor.");
    } finally {
      setCheckingIn(false);
    }
  };

  // Manual code entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    processQrToken(manualToken.trim());
    setManualToken("");
  };

  // Reset to home or next scan
  const handleScanNext = () => {
    setCurrentVerification(null);
    setVerifyError(null);
    setCheckInSuccess(null);
    handleOpenScanner();
  };

  const handleBackToHome = () => {
    stopCamera();
    setCurrentVerification(null);
    setVerifyError(null);
    setCheckInSuccess(null);
    setScreen("home");
  };

  // Compile full attendee list from ticket or booking
  const attendeesList: string[] = (() => {
    if (!currentVerification?.result?.ticket) return [];
    const t = currentVerification.result.ticket;
    if (t.holder_names && t.holder_names.length > 0) {
      return t.holder_names;
    }
    if (t.holder_name) {
      return [t.holder_name];
    }
    return ["Guest Attendee"];
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Hidden processing canvas for QR detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR (Always visible, clean and mobile-friendly)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-500/20">
            UT
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Volunteer Scanner</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gate Pass
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
              {user?.name || user?.email || "Authorized Volunteer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label="Toggle Sound"
            className={cn(
              "p-2 rounded-xl border transition-colors",
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
            )}
            title={soundEnabled ? "Gate Chime Enabled" : "Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              tokenStore.clear();
              logout?.();
              router.replace("/volunteer/login");
            }}
            aria-label="Sign Out"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT BODY (Switches between Home, Scanner & Details)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-lg w-full mx-auto p-4 sm:p-5">
        <AnimatePresence mode="wait">
          {/* ═════════════════════════════════════════════════════════
              STATE 1: HOME SCREEN (Default Standby Mode)
          ═════════════════════════════════════════════════════════ */}
          {screen === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* Active Event Card */}
                {loadingEvents ? (
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-3">
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-6 bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-800 rounded w-1/2" />
                  </div>
                ) : assignedEvents.length > 0 ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        Active Gate Assignment
                      </span>
                      {assignedEvents.length > 1 && (
                        <span className="text-xs text-slate-400 font-medium">
                          {assignedEvents.length} events assigned
                        </span>
                      )}
                    </div>

                    {/* Event Selector if Multiple */}
                    {assignedEvents.length > 1 ? (
                      <div className="mb-3">
                        <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                          Switch Gate / Event:
                        </label>
                        <select
                          value={selectedEventId}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                          className="w-full bg-slate-800/90 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {assignedEvents.map((ev) => (
                            <option key={ev.event_id || ev.id} value={ev.event_id || ev.id}>
                              {ev.title} ({ev.date || "Date TBA"})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <h2 className="text-lg sm:text-xl font-black text-white leading-tight mb-2">
                        {activeEvent?.title || "Assigned Event"}
                      </h2>
                    )}

                    <div className="space-y-1.5 text-xs text-slate-300">
                      {activeEvent?.date && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{activeEvent.date} {activeEvent.time ? `• ${activeEvent.time}` : ""}</span>
                        </div>
                      )}
                      {activeEvent?.venue && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{activeEvent.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">No Specific Event Assigned</p>
                      <p className="mt-0.5 text-amber-200/80">
                        Ask your Super Admin to assign your email to an event. If you are an Admin, you can scan all active events.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── LIVE SHIFT DASHBOARD (Requirement: Cash & Check-in Tracking) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Metric 1: Total Admitted */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Admitted Today
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white truncate">
                        {admittedCount} Attendee{admittedCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: Online Passes */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Online Paid
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white truncate">
                        {onlineCheckinsCount} Pass{onlineCheckinsCount === 1 ? "" : "es"}
                      </div>
                    </div>
                  </div>

                  {/* Metric 3: Cash Collected Total */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                        Cash Collected
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-amber-300 truncate font-mono">
                        ₹{cashCollectedTotal.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-amber-400/80 font-medium">
                        {cashCollectedCount} Cash Pass{cashCollectedCount === 1 ? "" : "es"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── GIANT HERO SCAN BUTTON (Mobile First) ── */}
              <div className="py-6 space-y-4">
                <button
                  type="button"
                  onClick={handleOpenScanner}
                  className="w-full py-6 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-emerald-600/30 border border-emerald-400/40 flex items-center justify-center gap-3.5 active:scale-[0.98] transition-all duration-150"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight font-black tracking-wide">
                      Scan Ticket QR Code
                    </span>
                    <span className="block text-xs text-emerald-100 font-medium">
                      Tap to open camera viewfinder
                    </span>
                  </div>
                </button>

                {/* Manual Code Entry Toggle */}
                <div className="pt-2">
                  {!showManualInput ? (
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Keyboard entry / Booking Ref</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-medium">Enter Ticket or Booking Code:</span>
                        <button
                          type="button"
                          onClick={() => setShowManualInput(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="e.g. BK-12345 or TKT-XXXX"
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                        />
                        <button
                          type="submit"
                          disabled={!manualToken.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Recent Scan History */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Recent Scans</span>
                    <span>{history.length} logged</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {history.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {item.status === "CHECKED_IN" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : item.status === "ALREADY_CHECKED" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          )}
                          <span className="font-medium text-slate-200 truncate">{item.name}</span>
                          {item.isCash && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                              Cash {item.amount ? `₹${item.amount.toLocaleString("en-IN")}` : ""}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════
              STATE 2: CAMERA SCANNER OVERLAY
          ═════════════════════════════════════════════════════════ */}
          {screen === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black flex flex-col justify-between"
            >
              {/* Camera Header Bar */}
              <div className="bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={handleCloseScanner}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={cn(
                      "p-2.5 rounded-xl border transition-colors active:scale-95",
                      torchOn
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-900/80 border-slate-700 text-white"
                    )}
                    title="Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleFacing}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white active:scale-95 transition-transform"
                    title="Switch Camera"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewfinder Center with Video */}
              <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Laser Targeting Overlay */}
                <div className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 border-2 border-emerald-400/80 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/20">
                  {/* Corner Accent brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-300 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-300 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-300 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-300 rounded-br-xl" />

                  {/* Animated Scanning Beam */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-pulse" />
                </div>

                {cameraError && (
                  <div className="absolute inset-x-4 top-20 z-20 p-4 rounded-xl bg-rose-950/90 border border-rose-600 text-white text-xs">
                    <p className="font-bold mb-1">Camera Notice:</p>
                    <p>{cameraError}</p>
                    <button
                      onClick={handleCloseScanner}
                      className="mt-2 px-3 py-1 bg-rose-700 text-white font-bold rounded"
                    >
                      Use Manual Entry
                    </button>
                  </div>
                )}
              </div>

              {/* Viewfinder Footer Hint */}
              <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 text-center z-10">
                <p className="text-sm font-bold text-white mb-1">
                  Point camera at attendee ticket QR
                </p>
                <p className="text-xs text-slate-400">
                  Scanner closes automatically once code is read
                </p>
              </div>
            </motion.div>
          )}

          {/* ═════════════════════════════════════════════════════════
              STATE 3: TICKET DETAILS SCREEN (Clear & Full Information)
          ═════════════════════════════════════════════════════════ */}
          {screen === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col justify-between space-y-4"
            >
              {/* Back to Home Button */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Standby</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanNext}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>

              {/* Loading Verification Spinner */}
              {verifying ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-bold text-base text-white">Verifying Ticket with Gate Server…</p>
                  <p className="text-xs text-slate-400">Checking event authorization and validity</p>
                </div>
              ) : verifyError ? (
                /* ── ERROR / UNAUTHORIZED / REJECTED SCREEN ── */
                <div className="space-y-4 py-4">
                  <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-center space-y-2.5">
                    <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-rose-400 uppercase tracking-wide">
                      Entry Rejected / Access Denied
                    </h3>
                    <p className="text-sm text-rose-200/90 leading-relaxed font-medium">
                      {verifyError}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Assigned Event:</span>
                      <span className="font-bold text-slate-200">{activeEvent?.title || "None"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gate Volunteer:</span>
                      <span className="font-bold text-slate-200">{user?.email}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Scan Next Ticket</span>
                  </button>
                </div>
              ) : currentVerification ? (
                /* ── VERIFIED TICKET DETAILS CARD ── */
                (() => {
                  const t = currentVerification.result.ticket;
                  const isCash = Boolean(
                    currentVerification.result.is_cash ||
                    t.is_cash ||
                    String(t.payment_method).toUpperCase() === "CASH" ||
                    String(t.payment_method).toUpperCase() === "OFFLINE"
                  );
                  const isCashPending = Boolean(
                    currentVerification.result.is_cash_pending ||
                    t.is_cash_pending ||
                    (isCash && !t.cash_collect_done && t.cash_status !== "COLLECTED")
                  );
                  const cashAmount = Number(t.total_amount || 0);

                  return (
                    <div className="space-y-4">
                      {/* Status Banner */}
                      {t.is_checked_in ? (
                        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/20 border-2 border-rose-500/70 flex items-start sm:items-center gap-3.5 shadow-xl shadow-rose-950/40 animate-in fade-in">
                          <div className="w-12 h-12 rounded-xl bg-rose-500/30 text-rose-300 flex items-center justify-center flex-shrink-0 border border-rose-400/50">
                            <XCircle className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-black text-rose-300 uppercase tracking-wide">
                                Already Checked In — Ticket Already Scanned
                              </span>
                              <span className="bg-rose-500/30 border border-rose-400/60 text-rose-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                                DUPLICATE SCAN REJECTED
                              </span>
                            </div>
                            <div className="text-xs text-rose-200/90 mt-1 font-medium">
                              This pass was already scanned and used for entry. Do not admit holder again.
                            </div>
                            {(t.check_in_time || t.checked_in_by) && (
                              <div className="mt-2 pt-2 border-t border-rose-500/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-rose-200 font-mono">
                                {t.check_in_time && (
                                  <span>Admitted at: <strong>{new Date(t.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong></span>
                                )}
                                {(t.checked_in_by_name || t.checked_in_by) && (
                                  <span>Scanner: <strong>{t.checked_in_by_name || t.checked_in_by}</strong></span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : checkInSuccess ? (
                        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-300 uppercase tracking-wide">
                              Entry Confirmed!
                            </div>
                            <div className="text-xs text-emerald-200/80">
                              {checkInSuccess}
                            </div>
                          </div>
                        </div>
                      ) : isCashPending ? (
                        /* ── HIGH VISIBILITY CASH PENDING ALERT ── */
                        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/10">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/25 text-amber-300 flex items-center justify-center flex-shrink-0 border border-amber-400/40">
                              <Banknote className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                                  ⚠️ CASH SPOT PASS — COLLECTION REQUIRED
                                </span>
                              </div>
                              <div className="text-xs text-amber-200/90 mt-1 font-medium">
                                Collect cash from attendee before admitting into venue.
                              </div>
                            </div>
                          </div>
                          <div className="sm:text-right self-end sm:self-auto bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/40">
                            <div className="text-[9px] uppercase font-bold text-amber-200">Amount Due</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight font-mono">
                              ₹{cashAmount.toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                              {isCash ? "Cash Collected — Ready to Admit" : "Paid Online — Ready to Admit"}
                            </div>
                            <div className="text-xs text-emerald-300/80">
                              Pass matches this event. Please verify attendees below.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Event & Category Card */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Event / Competition
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight">
                          {currentVerification.result.event_title || activeEvent?.title || "Event"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                            {t.category || "General Admission"}
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                            {t.ticket_type || "Gate Entry"}
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                            {attendeesList.length} Ticket{attendeesList.length === 1 ? "" : "s"}
                          </span>
                          {isCash && (
                            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                              {isCashPending ? "Cash Pending" : "Cash Done"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── COMPLETE LIST OF PARTICIPANTS / ATTENDEES (Requirement #3) ── */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-400" />
                            <span>All Attendees in Booking ({attendeesList.length})</span>
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-400">
                            Admit All
                          </span>
                        </div>

                        <div className="space-y-2">
                          {attendeesList.map((attendeeName, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80"
                            >
                              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm sm:text-base truncate">
                                  {attendeeName}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Attendee {index + 1} • {t.category || "General"}
                                </div>
                              </div>
                              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking Contact Details */}
                      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
                        <div className="flex justify-between">
                          <span>Booked By:</span>
                          <span className="font-semibold text-slate-200">
                            {t.holder_name}
                          </span>
                        </div>
                        {t.holder_email && (
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span className="font-mono text-slate-300 truncate max-w-[200px]">
                              {t.holder_email}
                            </span>
                          </div>
                        )}
                        {currentVerification.result.booking_reference && (
                          <div className="flex justify-between">
                            <span>Booking Ref:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              #{currentVerification.result.booking_reference}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-800/60">
                          <span>Payment Mode:</span>
                          <span className={cn(
                            "font-bold font-mono text-[11px] px-1.5 py-0.5 rounded",
                            isCash ? "text-amber-300 bg-amber-500/15 border border-amber-500/30" : "text-sky-300 bg-sky-500/15 border border-sky-500/30"
                          )}>
                            {isCash ? "CASH SPOT PASS" : "ONLINE PAYMENT"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="font-bold text-white font-mono">
                            ₹{cashAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* ── BIG ACTION BUTTON (Requirement #2 & #3 & Cash Collection) ── */}
                      <div className="pt-2">
                        {!t.is_checked_in && !checkInSuccess ? (
                          isCashPending ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmAdmission(true)}
                              disabled={checkingIn}
                              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-base sm:text-lg shadow-xl shadow-amber-600/30 border border-amber-300/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 ring-2 ring-amber-400/40"
                            >
                              {checkingIn ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                  <span>Collecting Cash & Admitting…</span>
                                </div>
                              ) : (
                                <>
                                  <Banknote className="w-6 h-6 text-slate-950" />
                                  <span>COLLECT ₹{cashAmount.toLocaleString("en-IN")} CASH & ADMIT ({attendeesList.length} Person{attendeesList.length === 1 ? "" : "s"})</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConfirmAdmission(false)}
                              disabled={checkingIn}
                              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg shadow-xl shadow-emerald-600/30 border border-emerald-400/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                              {checkingIn ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Confirming Entry…</span>
                                </div>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-6 h-6" />
                                  <span>Confirm Entry ({attendeesList.length} Person{attendeesList.length === 1 ? "" : "s"})</span>
                                </>
                              )}
                            </button>
                          )
                        ) : (
                          <div className="space-y-3">
                            {t.is_checked_in && (
                              <div className="w-full py-4 px-6 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 text-rose-300 font-black text-sm text-center flex items-center justify-center gap-2">
                                <XCircle className="w-5 h-5 shrink-0" />
                                <span>ENTRY REFUSED — ALREADY CHECKED IN</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleScanNext}
                              className="w-full py-5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-base border border-slate-700 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                            >
                              <Camera className="w-5 h-5 text-emerald-400" />
                              <span>Scan Next Ticket</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
