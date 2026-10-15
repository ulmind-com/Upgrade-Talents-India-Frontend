/**
 * Eventora API client — Upgrade Talents India
 * Mirrors the FastAPI backend exactly. No backend contract is modified here.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "uti_access_token";
const REG_TOKEN_KEY = "uti_registration_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  getReg: () => (typeof window === "undefined" ? null : localStorage.getItem(REG_TOKEN_KEY)),
  setReg: (t: string) => localStorage.setItem(REG_TOKEN_KEY, t),
  clearReg: () => localStorage.removeItem(REG_TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractDetail(data: any, fallback: string) {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) return d[0]?.msg || fallback;
  return data?.message || fallback;
}

type Opts = {
  method?: string;
  body?: any;
  auth?: boolean;
  regAuth?: boolean;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  cache?: RequestCache;
  revalidate?: number;
};

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, auth, regAuth, form, query, cache, revalidate } = opts;

  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {};
  // Only set Content-Type when a JSON body is actually sent — adding it to a
  // plain GET turns it into a preflighted request for no reason.
  if (!form && body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = tokenStore.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  if (regAuth) {
    const t = tokenStore.getReg();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const init: RequestInit & { next?: { revalidate: number } } = {
    method,
    headers,
    body: form ? form : body ? JSON.stringify(body) : undefined,
  };
  if (cache) init.cache = cache;
  if (revalidate !== undefined) init.next = { revalidate };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Network unreachable. Check your connection and try again.", 0);
  }

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) throw new ApiError(extractDetail(data, `Request failed (${res.status})`), res.status);
  return data as T;
}

/* ─────────────── TYPES (from backend schemas) ─────────────── */

export type EventItem = {
  _id: string;
  title: string;
  description: string;
  image_url?: string;
  date: string;
  time?: string;
  venue: string;
  capacity?: number;
  price?: number;
  registration_deadline?: string;
  event_status?: "upcoming" | "live" | "completed" | "cancelled";
  registration_enabled?: boolean;
  ticket_enabled?: boolean;
  display_order?: number;
};

export type LiveEventItem = {
  _id: string;
  title: string;
  description?: string;
  public_url?: string;
  start_time: string;
  end_time?: string;
  image_url?: string;
};

export type BannerItem = {
  _id: string;
  title: string;
  image_url: string;
  description?: string;
  sponsor_name?: string;
  target_url?: string;
};

export type TestimonialItem = {
  _id: string;
  person_name: string;
  role?: string;
  profile_image?: string;
  message: string;
};

export type CourseItem = {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor_name: string;
  instructor_info?: string;
  start_date?: string;
  end_date?: string;
  price: number;
  available_seats?: number;
  course_type?: "course" | "workshop";
  registration_status?: "OPEN" | "CLOSED" | "UPCOMING";
  can_register?: boolean;
};

export type TicketTier = {
  _id: string;
  event_id: string;
  type: string;
  price: number;
  total_quantity: number;
  available: number;
  sale_start?: string;
  sale_end?: string;
  is_visible?: boolean;
  display_order?: number;
};

export type ContestPromotion = {
  _id: string;
  title: string;
  description?: string;
  image_url?: string;
  target_url?: string;
};

export type HomepagePayload = {
  brand: {
    name?: string; logo?: string; favicon?: string;
    tagline?: string; title?: string; description?: string;
  };
  upcoming_events: EventItem[];
  live_events: LiveEventItem[];
  sponsored_banners: BannerItem[];
  testimonials: TestimonialItem[];
  courses: CourseItem[];
  workshops: CourseItem[];
  contest_promotions: ContestPromotion[];
  app_promotion: Record<string, any> | null;
  contact: {
    contact_email?: string; contact_phone?: string; office_address?: string;
    social_media?: { facebook?: string; instagram?: string; twitter?: string; youtube?: string; linkedin?: string };
  } | null;
  important_links: { _id: string; title?: string; label?: string; url?: string }[];
};

export type MyTicket = {
  ticket_ref: string;
  booking_id: string;
  event_id: string;
  ticket_type: string;
  holder_name: string;
  holder_email: string;
  is_checked_in: boolean;
  issued_at: string;
};

/* ─────────────── PUBLIC (/api/v1) ─────────────── */

export const publicApi = {
  homepage: () => apiFetch<HomepagePayload>("/api/v1/homepage", { revalidate: 60 }),
  settings: () => apiFetch<Record<string, any>>("/api/v1/website-settings", { revalidate: 300 }),
  upcomingEvents: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<EventItem[]>("/api/v1/events/upcoming", { query: p, revalidate: 60 }),
  liveEvents: () => apiFetch<LiveEventItem[]>("/api/v1/events/live", { cache: "no-store" }),
  banners: () => apiFetch<BannerItem[]>("/api/v1/banners", { revalidate: 300 }),
  testimonials: () => apiFetch<TestimonialItem[]>("/api/v1/testimonials", { revalidate: 300 }),
  courses: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<CourseItem[]>("/api/v1/courses", { query: p, revalidate: 120 }),
  workshops: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<CourseItem[]>("/api/v1/workshops", { query: p, revalidate: 120 }),
  contestPromotions: () => apiFetch<ContestPromotion[]>("/api/v1/contest-promotions", { revalidate: 300 }),
  appPromotion: () => apiFetch<Record<string, any>>("/api/v1/app-promotion", { revalidate: 300 }),
  contactInfo: () => apiFetch<Record<string, any>>("/api/v1/contact-info", { revalidate: 300 }),
  importantLinks: () => apiFetch<any[]>("/api/v1/important-links", { revalidate: 300 }),
  competitions: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<any[]>("/api/activities/competitions", { query: { limit: 50, ...p }, cache: "no-store" }),
  leaderboard: (id: string) =>
    apiFetch<{ ranking_mode?: string; leaderboard?: any[] }>(`/api/v1/competitions/${id}/leaderboard`, { cache: "no-store" }),
};

/* ─────────────── COMPETE (register / submit / vote — auth) ─────────────── */

export const competeApi = {
  eligibility: (id: string) =>
    apiFetch<{ eligible: boolean; status: string; reason: string }>(`/api/v1/competitions/${id}/eligibility`, { auth: true, cache: "no-store" }),
  register: (id: string, rules_accepted = true) =>
    apiFetch<any>(`/api/v1/competitions/${id}/register`, { method: "POST", auth: true, query: { rules_accepted } }),
  submit: (id: string, files: File[], fieldNames: string[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("field_names", fieldNames.join(", "));
    return apiFetch<any>(`/api/v1/competitions/${id}/submissions`, { method: "POST", auth: true, form: fd });
  },
  vote: (id: string, participant_id: string) =>
    apiFetch<any>(`/api/v1/competitions/${id}/vote`, { method: "POST", auth: true, body: { participant_id, source: "WEBSITE" } }),
};

/* ─────────────── ACTIVITIES (events + ticket tiers) ─────────────── */

export const activitiesApi = {
  events: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<EventItem[]>("/api/activities/events", { query: p, cache: "no-store" }),
  tickets: (event_id: string, p: { skip?: number; limit?: number } = {}) =>
    apiFetch<TicketTier[]>("/api/activities/tickets", {
      query: { event_id, limit: p.limit ?? 20, skip: p.skip ?? 0 },
      cache: "no-store",
    }),
  competitions: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<any[]>("/api/activities/competitions", { query: p, cache: "no-store" }),
  merchandise: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<any[]>("/api/activities/merchandise", { query: p, cache: "no-store" }),
};

/* ─────────────── AUTH ─────────────── */

export const authApi = {
  registerStep1: (email: string, referral_code?: string) =>
    apiFetch<any>("/api/auth/register/step1", { method: "POST", body: { email, referral_code } }),

  registerStep2: (email: string, otp: string) =>
    apiFetch<any>("/api/auth/register/step2", { method: "POST", body: { email, otp } }),

  registerStep3: (form: FormData) =>
    apiFetch<any>("/api/auth/register/step3", { method: "POST", form, regAuth: true }),

  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  googleLogin: (id_token: string, referral_code?: string) =>
    apiFetch<{ access_token: string; token_type: string }>("/api/auth/google-login", {
      method: "POST",
      body: { id_token, referral_code },
    }),

  me: () => apiFetch<any>("/api/auth/me", { auth: true, cache: "no-store" }),
};

/* ─────────────── PROFILE ─────────────── */

export const profileApi = {
  get: () => apiFetch<any>("/api/profile/me", { auth: true, cache: "no-store" }),
  update: (body: any) => apiFetch<any>("/api/profile/me", { method: "PUT", body, auth: true }),
  dashboard: () => apiFetch<any>("/api/profile/dashboard", { auth: true, cache: "no-store" }),
};

/* ─────────────── BOOKINGS + TICKETS ─────────────── */

export const bookingsApi = {
  create: (body: { event_id: string; ticket_id: string; quantity: number; holder_names?: string[] }) =>
    apiFetch<any>("/api/bookings/", { method: "POST", body, auth: true }),
  my: () => apiFetch<any[]>("/api/bookings/my", { auth: true, cache: "no-store" }),
  cancel: (booking_id: string) =>
    apiFetch<any>(`/api/bookings/${booking_id}/cancel`, { method: "POST", auth: true }),
  myTickets: () => apiFetch<MyTicket[]>("/api/bookings/my-tickets", { auth: true, cache: "no-store" }),
  ticketQr: (ticket_ref: string) =>
    apiFetch<any>(`/api/bookings/tickets/${ticket_ref}/qr`, { auth: true, cache: "no-store" }),
};

/* ─────────────── PAYMENTS (Razorpay) ─────────────── */

export const paymentsApi = {
  createOrder: (booking_id: string) =>
    apiFetch<any>(`/api/payments/create-order/${booking_id}`, { method: "POST", auth: true }),
  verifyRazorpay: (body: {
    booking_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiFetch<any>("/api/payments/verify-razorpay", { method: "POST", body, auth: true }),
  verifyMock: (booking_id: string) =>
    apiFetch<any>(`/api/payments/verify-mock/${booking_id}`, { method: "POST", auth: true }),
};

/* ─────────────── REGISTRATIONS (free events / courses) ─────────────── */

export const registrationsApi = {
  create: (body: any) => apiFetch<any>("/api/registrations/", { method: "POST", body, auth: true }),
  remove: (id: string) => apiFetch<any>(`/api/registrations/${id}`, { method: "DELETE", auth: true }),
  verifyPayment: (body: any) =>
    apiFetch<any>("/api/registrations/verify-payment", { method: "POST", body, auth: true }),
};

/* ─────────────── EXTRAS ─────────────── */

export const extrasApi = {
  notifications: () => apiFetch<any>("/api/notifications/", { auth: true, cache: "no-store" }),
  rewards: () => apiFetch<any>("/api/rewards/", { auth: true, cache: "no-store" }),
  myCertificates: () => apiFetch<any>("/api/users/me/certificates", { auth: true, cache: "no-store" }),
  publicCompetitions: () => apiFetch<any[]>("/api/v1/competitions", { revalidate: 60 }),
};

/** Safe fetch — returns fallback instead of throwing (for optional homepage sections). */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}
