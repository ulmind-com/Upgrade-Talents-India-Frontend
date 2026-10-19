"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { notificationsApi, tokenStore, type NotificationItem, type NotificationPrefs } from "@/lib/api";
import { useAuth } from "@/components/motion/Providers";

type State = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  hasNext: boolean;
  open: boolean;
  live: boolean;
  setOpen: (v: boolean) => void;
  load: (opts?: { unreadOnly?: boolean; page?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  prefs: NotificationPrefs | null;
  loadPrefs: () => Promise<void>;
  savePrefs: (patch: NotificationPrefs) => Promise<void>;
};

const Ctx = createContext<State | null>(null);
export const useNotifications = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotifications must be used inside NotificationProvider");
  return c;
};

const PAGE = 15;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  const page = useRef(1);
  const unreadOnly = useRef(false);
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);

  const load = useCallback(async (opts: { unreadOnly?: boolean; page?: number } = {}) => {
    if (!tokenStore.get()) return;
    unreadOnly.current = opts.unreadOnly ?? unreadOnly.current;
    page.current = opts.page ?? 1;
    setLoading(true);
    try {
      const res = await notificationsApi.list({
        page: page.current,
        page_size: PAGE,
        ...(unreadOnly.current ? { is_read: false } : {}),
      });
      setItems(res.items || []);
      setUnread(res.unread_count ?? 0);
      setHasNext(!!res.has_next);
    } catch {
      /* A failed poll shouldn't blank the bell — keep the last good list. */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasNext || loading) return;
    setLoading(true);
    try {
      const res = await notificationsApi.list({
        page: page.current + 1,
        page_size: PAGE,
        ...(unreadOnly.current ? { is_read: false } : {}),
      });
      page.current += 1;
      setItems((prev) => [...prev, ...(res.items || [])]);
      setHasNext(!!res.has_next);
    } catch {
      /* keep what is already on screen */
    } finally {
      setLoading(false);
    }
  }, [hasNext, loading]);

  const refreshCount = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      const { unread_count } = await notificationsApi.unreadCount();
      setUnread(unread_count ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  /* Optimistic: the row flips immediately, the server call just confirms. */
  const markRead = useCallback(async (id: string) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markUnread = useCallback(async (id: string) => {
    setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
    setUnread((u) => u + 1);
    try {
      await notificationsApi.markUnread(id);
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setItems((p) => p.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      refreshCount();
    }
  }, [refreshCount]);

  const loadPrefs = useCallback(async () => {
    try {
      setPrefs(await notificationsApi.preferences());
    } catch {
      /* ignore */
    }
  }, []);

  const savePrefs = useCallback(async (patch: NotificationPrefs) => {
    setPrefs((p) => ({ ...(p || {}), ...patch }));
    try {
      setPrefs(await notificationsApi.updatePreferences(patch));
    } catch {
      loadPrefs();
    }
  }, [loadPrefs]);

  /* ── Live stream, with a backoff reconnect and a polling fallback ── */
  useEffect(() => {
    if (!user) {
      socket.current?.close();
      socket.current = null;
      setItems([]);
      setUnread(0);
      setLive(false);
      return;
    }

    load();

    let stopped = false;
    const connect = () => {
      const token = tokenStore.get();
      if (!token || stopped) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(notificationsApi.socketUrl(token));
      } catch {
        return;
      }
      socket.current = ws;

      ws.onopen = () => {
        attempts.current = 0;
        setLive(true);
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const n: NotificationItem | undefined = data?.notification || (data?.id ? data : undefined);
          if (!n?.id) {
            refreshCount();
            return;
          }
          setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
          if (!n.is_read) setUnread((u) => u + 1);
        } catch {
          refreshCount();
        }
      };
      ws.onclose = () => {
        setLive(false);
        if (stopped) return;
        attempts.current += 1;
        const wait = Math.min(30000, 1000 * 2 ** attempts.current);
        retry.current = setTimeout(connect, wait);
      };
      ws.onerror = () => ws.close();
    };

    connect();

    /* The socket is the primary path; this only catches what it missed. */
    const poll = setInterval(() => {
      if (!socket.current || socket.current.readyState !== WebSocket.OPEN) refreshCount();
    }, 60000);

    return () => {
      stopped = true;
      if (retry.current) clearTimeout(retry.current);
      clearInterval(poll);
      socket.current?.close();
      socket.current = null;
    };
  }, [user, load, refreshCount]);

  return (
    <Ctx.Provider
      value={{
        items, unread, loading, hasNext, open, live, setOpen,
        load, loadMore, markRead, markUnread, markAllRead,
        prefs, loadPrefs, savePrefs,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
