import { useEffect, useRef } from "react";
import { API_BASE, clearClientApiCache } from "./api";

export type RealtimeEvent = {
  channel: string;
  event: string;
  data: any;
  timestamp: string;
};

type EventCallback = (event: RealtimeEvent) => void;

class WebsiteRealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimeout: any = null;
  private reconnectAttempts: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.connect());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.connect();
          this.notifyAll({
            channel: "client:sync",
            event: "TAB_VISIBLE",
            data: {},
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  public connect() {
    if (typeof window === "undefined" || this.isConnecting) return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;

    this.isConnecting = true;
    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      const streamUrl = `${API_BASE}/api/realtime/stream?channels=global,admin:events,admin:competitions,admin:volunteers,*`;
      const es = new EventSource(streamUrl);

      es.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyAll({ channel: "system", event: "CONNECTED", data: {}, timestamp: new Date().toISOString() });
      };

      es.onmessage = (e) => {
        try {
          const payload: RealtimeEvent = JSON.parse(e.data);
          this.handleEvent(payload);
        } catch {
          // ignore keepalive
        }
      };

      const eventNames = [
        "TICKET_CHECKED_IN",
        "BOOKING_CREATED",
        "PAYMENT_CONFIRMED",
        "CASH_COLLECTED",
        "STAGE_UPDATE",
        "COMPETITION_UPDATE",
        "COMPETITION_REGISTRATION_CONFIRMED",
        "score_submitted",
        "LEADERBOARD_UPDATED",
        "round_advanced",
        "results_published",
        "scores_visibility_changed",
        "VOLUNTEER_ASSIGNED",
        "VOLUNTEER_REMOVED",
        "VOLUNTEER_ENTRY"
      ];

      eventNames.forEach((evtName) => {
        es.addEventListener(evtName, (e: any) => {
          try {
            const parsed = JSON.parse(e.data);
            const payload: RealtimeEvent = {
              channel: parsed.channel || "global",
              event: parsed.event || evtName,
              data: parsed.data || parsed,
              timestamp: parsed.timestamp || new Date().toISOString(),
            };
            this.handleEvent(payload);
          } catch {}
        });
      });

      es.onerror = () => {
        this.isConnecting = false;
        es.close();
        this.eventSource = null;
        this.scheduleReconnect();
      };

      this.eventSource = es;
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleEvent(payload: RealtimeEvent) {
    // Invalidate client API memory cache on real-time mutations so fetches return fresh data
    clearClientApiCache();
    this.notify(payload);
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 12000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notify(event: RealtimeEvent) {
    const chListeners = this.listeners.get(event.channel);
    if (chListeners) {
      chListeners.forEach((cb) => {
        try { cb(event); } catch (e) { console.warn("Realtime listener error:", e); }
      });
    }

    const starListeners = this.listeners.get("*");
    if (starListeners) {
      starListeners.forEach((cb) => {
        try { cb(event); } catch (e) { console.warn("Realtime listener error:", e); }
      });
    }
  }

  private notifyAll(event: RealtimeEvent) {
    this.listeners.forEach((set) => {
      set.forEach((cb) => {
        try { cb(event); } catch {}
      });
    });
  }

  public isConnected(): boolean {
    return Boolean(this.eventSource && this.eventSource.readyState === EventSource.OPEN);
  }

  public subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    this.connect();

    return () => {
      const set = this.listeners.get(channel);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(channel);
      }
    };
  }
}

export const websiteRealtime = new WebsiteRealtimeClient();

export function useRealtimeSubscription(
  channels: string | string[],
  onEvent: (event: RealtimeEvent) => void,
  fallbackIntervalMs: number = 0
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const chList = Array.isArray(channels) ? channels : [channels];
    const unsubs = chList.map((ch) =>
      websiteRealtime.subscribe(ch, (e) => cbRef.current(e))
    );

    let interval: any = null;
    if (fallbackIntervalMs > 0) {
      interval = setInterval(() => {
        if (!websiteRealtime.isConnected() && typeof document !== "undefined" && document.visibilityState === "visible") {
          cbRef.current({
            channel: "poll:fallback",
            event: "SYNC_PULSE",
            data: {},
            timestamp: new Date().toISOString(),
          });
        }
      }, fallbackIntervalMs);
    }

    return () => {
      unsubs.forEach((u) => u());
      if (interval) clearInterval(interval);
    };
  }, [Array.isArray(channels) ? channels.join(",") : channels, fallbackIntervalMs]);
}
