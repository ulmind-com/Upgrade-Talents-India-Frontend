export const API_BASE = "https://event-management-backend-nijj.onrender.com";

export type Side = "user" | "admin" | "judge" | "volunteer";
const KEY: Record<Side, string> = {
  user: "eventora_user_token",
  admin: "eventora_admin_token",
  judge: "eventora_judge_token",
  volunteer: "eventora_volunteer_token",
};

export const tokenStore = {
  get(side: Side) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY[side]);
  },
  set(side: Side, t: string) {
    localStorage.setItem(KEY[side], t);
    window.dispatchEvent(new Event("eventora-auth"));
  },
  clear(side: Side) {
    localStorage.removeItem(KEY[side]);
    window.dispatchEvent(new Event("eventora-auth"));
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function detailMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "Request failed";
  const d = (body as { detail?: unknown; message?: unknown }).detail ?? (body as { message?: unknown }).message;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x as { msg?: string }).msg ?? "Invalid").join(", ");
  return "Request failed";
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; side?: Side; query?: Record<string, unknown> | undefined; form?: FormData } = {},
): Promise<T> {
  const url = new URL(API_BASE + path);
  if (opts.query)
    Object.entries(opts.query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  const headers: Record<string, string> = {};
  const token = opts.side ? tokenStore.get(opts.side) : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | null = null;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { method: opts.method ?? "GET", headers, body });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    if (res.status === 401 && opts.side) tokenStore.clear(opts.side);
    throw new ApiError(res.status, detailMessage(data));
  }
  return data as T;
}

/** Pull a token out of whatever shape the login endpoint returns. */
export function extractToken(r: unknown): string | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  for (const k of ["access_token", "token", "accessToken"]) if (typeof o[k] === "string") return o[k] as string;
  if (o.data) return extractToken(o.data);
  return null;
}

/** Normalise list responses: array, {items}, {data}, {results}, {events}... */
export function asList<T = Record<string, unknown>>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === "object") {
    for (const v of Object.values(r as Record<string, unknown>)) if (Array.isArray(v)) return v as T[];
  }
  return [];
}

export const idOf = (o: Record<string, unknown>) => String(o._id ?? o.id ?? "");
