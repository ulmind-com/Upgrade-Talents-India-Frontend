/**
 * Upgrade Talents India API client
 * Mirrors the FastAPI backend exactly. No backend contract is modified here.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "uti_access_token";
const ROLE_KEY = "uti_user_role";
const REG_TOKEN_KEY = "uti_registration_token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
  },
  getRole: () => (typeof window === "undefined" ? null : localStorage.getItem(ROLE_KEY)),
  setRole: (r: string) => {
    if (typeof window !== "undefined") localStorage.setItem(ROLE_KEY, r);
  },
  clearRole: () => {
    if (typeof window !== "undefined") localStorage.removeItem(ROLE_KEY);
  },
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

/* Long enough for a cold start, short enough that nobody stares at a
   skeleton forever. */
const READ_TIMEOUT_MS = 12_000;

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
    cache: cache || (revalidate !== undefined ? undefined : "no-store"),
  };
  if (cache) init.cache = cache;
  if (revalidate !== undefined) init.next = { revalidate };
  /* A sleeping API instance must not hold a page render hostage — reads give
     up so the caller can fall back to its empty state. Writes are untouched:
     an order must never be abandoned mid-flight. */
  if (method === "GET" && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    init.signal = AbortSignal.timeout(READ_TIMEOUT_MS);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.", 0);
    }
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
  image_url_desktop?: string;
  image_url_mobile?: string;
  mobile_image_url?: string;
  description?: string;
  sponsor_name?: string;
  target_url?: string;
  display_order?: number;
  is_published?: boolean;
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
  booking_ref?: string;
  event_id: string;
  ticket_type: string;
  holder_name: string;
  holder_names?: string[];
  holder_email: string;
  quantity?: number;
  admitted_count?: number;
  remaining_count?: number;
  is_checked_in: boolean;
  is_fully_used?: boolean;
  status?: string;
  check_in_time?: string | null;
  issued_at: string;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  event_cover?: string;
  price?: number;
  base_price?: number;
  total_booking_amount?: number;
  payment_method?: string;
  payment_status?: string;
  qr_token?: string;
};

/* ─────────────── PUBLIC (/api/v1) ─────────────── */

export const publicApi = {
  homepage: () => apiFetch<HomepagePayload>("/api/v1/homepage", { cache: "no-store" }),
  settings: () => apiFetch<Record<string, any>>("/api/v1/website-settings", { cache: "no-store" }),
  upcomingEvents: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<EventItem[]>("/api/v1/events/upcoming", { query: p, cache: "no-store" }),
  liveEvents: () => apiFetch<LiveEventItem[]>("/api/v1/events/live", { cache: "no-store" }),
  banners: () => apiFetch<BannerItem[]>("/api/v1/banners", { cache: "no-store" }),
  testimonials: () => apiFetch<TestimonialItem[]>("/api/v1/testimonials", { cache: "no-store" }),
  courses: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<CourseItem[]>("/api/v1/courses", { query: p, cache: "no-store" }),
  workshops: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<CourseItem[]>("/api/v1/workshops", { query: p, cache: "no-store" }),
  contestPromotions: () => apiFetch<ContestPromotion[]>("/api/v1/contest-promotions", { cache: "no-store" }),
  appPromotion: () => apiFetch<Record<string, any>>("/api/v1/app-promotion", { cache: "no-store" }),
  contactInfo: () => apiFetch<Record<string, any>>("/api/v1/contact-info", { cache: "no-store" }),
  importantLinks: () => apiFetch<any[]>("/api/v1/important-links", { cache: "no-store" }),
  competitions: (p: { skip?: number; limit?: number; search?: string } = {}) =>
    apiFetch<any[]>("/api/activities/competitions", { query: { limit: 200, ...p }, cache: "no-store" }).then(
      (list) =>
        Array.isArray(list)
          ? [...list].sort(
              (a, b) =>
                new Date(b.created_at || b.start_date || 0).getTime() -
                new Date(a.created_at || a.start_date || 0).getTime()
            )
          : []
    ),
  competition: (id: string) =>
    apiFetch<any>(`/api/activities/competitions/${id}`, { cache: "no-store" }).catch(() =>
      apiFetch<any>(`/api/v1/competitions/${id}`, { cache: "no-store" })
    ),
  results: (id: string) =>
    apiFetch<any>(`/api/v1/competitions/${id}/results`, { cache: "no-store" }),
  contestantFeedbacks: (compId: string, submissionId: string) =>
    apiFetch<any[]>(`/api/v1/competitions/${compId}/contestants/${submissionId}/feedbacks`, { cache: "no-store" }),
  liveVoting: () =>
    apiFetch<any[]>("/api/v1/users/me/home/live-voting", { auth: true, cache: "no-store" }).catch(() =>
      apiFetch<any[]>("/api/public/users/me/home/live-voting", { cache: "no-store" }).catch(() => [])
    ),
  leaderboard: (id: string) =>
    apiFetch<{ ranking_mode?: string; leaderboard?: any[] }>(`/api/v1/competitions/${id}/leaderboard`, { cache: "no-store" }).catch(() =>
      apiFetch<{ ranking_mode?: string; leaderboard?: any[] }>(`/api/public/competitions/${id}/leaderboard`, { cache: "no-store" })
    ),
  verifyCertificate: (token: string) =>
    apiFetch<any>(`/api/public/certificates/verify/${encodeURIComponent(token)}`, { cache: "no-store" }),
};

/* ─────────────── COMPETE (register / submit / vote — auth) ─────────────── */

export const competeApi = {
  myRegistration: (id: string) =>
    apiFetch<{
      is_registered: boolean;
      is_confirmed: boolean;
      status: string;
      payment_status: string;
      payment_method?: string;
      cash_payment?: boolean;
      cash_status?: string;
      registration_reference?: string;
      has_submitted?: boolean;
      submission_id?: string;
      registered_at?: string;
    }>(`/api/v1/competitions/${id}/my-registration`, { auth: true, cache: "no-store" }),
  eligibility: (id: string) =>
    apiFetch<{ eligible: boolean; status: string; reason: string }>(`/api/v1/competitions/${id}/eligibility`, { auth: true, cache: "no-store" }),
  register: (id: string, rules_accepted = true, payment_method: "ONLINE" | "CASH" = "ONLINE") =>
    apiFetch<any>(`/api/v1/competitions/${id}/register`, {
      method: "POST",
      auth: true,
      query: { rules_accepted, payment_method },
      body: { rules_accepted, payment_method },
    }),
  submit: (id: string, files: File[], fieldNames: string[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("field_names", JSON.stringify(fieldNames));
    return apiFetch<any>(`/api/v1/competitions/${id}/submissions`, { method: "POST", auth: true, form: fd });
  },
  verifyPayment: (compId: string, body: {
    registration_reference: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiFetch<any>(`/api/v1/competitions/${compId}/verify-payment`, { method: "POST", auth: true, body }),
  vote: (id: string, participant_id: string, source: "WEBSITE" | "MOBILE_APP" = "WEBSITE") =>
    apiFetch<any>(`/api/v1/competitions/${id}/vote`, { method: "POST", auth: true, body: { participant_id, source } }),
  results: (id: string) =>
    apiFetch<any>(`/api/v1/competitions/${id}/results`, { cache: "no-store" }),
  feedbacks: (compId: string, submissionId: string) =>
    apiFetch<any[]>(`/api/v1/competitions/${compId}/contestants/${submissionId}/feedbacks`, { cache: "no-store" }),
  socketUrl: (compId: string) => {
    const wsProto = API_BASE.startsWith("https") ? "wss" : "ws";
    const host = API_BASE.replace(/^https?:\/\//, "");
    return `${wsProto}://${host}/ws/competitions/${compId}/public`;
  },
};

/* ─────────────── SHOP (merchandise) ─────────────── */

export const shopApi = {
  products: (p: { skip?: number; limit?: number; search?: string; category?: string } = {}) =>
    apiFetch<any>("/api/merchandise/products", { query: { limit: 60, ...p }, cache: "no-store" }).then(
      (d) => (Array.isArray(d) ? d : d?.products || []) as any[]
    ),
  product: (id: string) =>
    apiFetch<any>(`/api/merchandise/products/${id}`, { cache: "no-store" }).then((d) => d?.product ?? d),
  categories: () => apiFetch<any[]>("/api/merchandise/categories", { cache: "no-store" }),
  createOrder: (payload: { items: { product_id: string; variant_id?: string; quantity: number }[]; shipping_address: Record<string, string> }) =>
    apiFetch<any>("/api/merchandise/orders", { method: "POST", auth: true, body: payload }),
  verifyPayment: (body: {
    order_number: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiFetch<any>("/api/merchandise/orders/verify-payment", { method: "POST", auth: true, body }),
  myOrders: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<any>("/api/merchandise/orders", { auth: true, cache: "no-store", query: p }),
  orderDetail: (orderId: string) =>
    apiFetch<any>(`/api/merchandise/orders/${orderId}`, { auth: true, cache: "no-store" }),
  orderTracking: (orderId: string) =>
    apiFetch<any>(`/api/merchandise/orders/${orderId}/tracking`, { auth: true, cache: "no-store" }),
  cancelOrder: (orderId: string, reason: string) =>
    apiFetch<any>(`/api/merchandise/orders/${orderId}/cancel`, { method: "POST", auth: true, body: { reason } }),
};

/* ─────────────── VIP PASSES ─────────────── */

export const vipApi = {
  forEvent: (eventId: string) => apiFetch<any[]>(`/api/events/${eventId}/vip-passes`, { cache: "no-store" }),
  book: (eventId: string, configId: string, quantity = 1, holder_names?: string[]) =>
    apiFetch<any>(`/api/events/${eventId}/vip-passes/${configId}/book`, { method: "POST", auth: true, body: { quantity, holder_names } }),
  verifyPayment: (body: {
    booking_reference: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiFetch<any>("/api/vip/verify-payment", { method: "POST", body, auth: true }),
  myBookings: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<any>("/api/users/me/vip-bookings", { auth: true, cache: "no-store", query: p }),
  myPasses: (p: { skip?: number; limit?: number } = {}) =>
    apiFetch<any>("/api/users/me/vip-passes", { auth: true, cache: "no-store", query: p }),
  passQr: (passId: string) =>
    apiFetch<any>(`/api/users/me/vip-passes/${passId}/qr`, { auth: true, cache: "no-store" }),
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
  update: (form: FormData) => apiFetch<any>("/api/profile/me", { method: "PUT", form, auth: true }),
  dashboard: () => apiFetch<any>("/api/profile/dashboard", { auth: true, cache: "no-store" }),
};

/* ─────────────── REWARDS & COINS ─────────────── */

export const rewardsApi = {
  coins: () => apiFetch<{ total_coins: number; total_earned_coins?: number; total_redeemed_coins?: number; history: any[] }>("/api/rewards/coins", { auth: true, cache: "no-store" }),
  wallet: () => apiFetch<any>("/api/rewards/wallet", { auth: true, cache: "no-store" }),
  referralProfile: () => apiFetch<any>("/api/rewards/referral-profile", { auth: true, cache: "no-store" }),
  transactions: (p: { limit?: number; skip?: number } = {}) =>
    apiFetch<any>("/api/rewards/transactions", { auth: true, cache: "no-store", query: { limit: 50, ...p } }),
  /** Un-expired coin lots, so the wallet can warn before coins lapse. */
  lots: () => apiFetch<any>("/api/rewards/lots", { auth: true, cache: "no-store" }),
  calculateDiscount: (body: { item_id: string; item_type: "course" | "workshop"; coins_to_use?: number }) =>
    apiFetch<any>("/api/rewards/calculate-discount", { method: "POST", auth: true, body }),
  reserveDiscount: (body: { item_id: string; item_type: "course" | "workshop"; coins_to_reserve: number; order_reference: string }) =>
    apiFetch<any>("/api/rewards/reserve-discount", { method: "POST", auth: true, body }),
};

/* ─────────────── NOTIFICATIONS ─────────────── */

export type NotificationItem = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  resource_type?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, any> | null;
};

export type NotificationPrefs = {
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  web_push_enabled?: boolean;
  sound_enabled?: boolean;
  event_reminders?: boolean;
  voting_reminders?: boolean;
  leaderboard_updates?: boolean;
  competition_results?: boolean;
};

export const notificationsApi = {
  list: (p: { is_read?: boolean; notification_type?: string; page?: number; page_size?: number } = {}) =>
    apiFetch<{ items: NotificationItem[]; total: number; unread_count: number; page: number; page_size: number; has_next: boolean }>(
      "/api/notifications", { auth: true, cache: "no-store", query: { page: 1, page_size: 20, ...p } }
    ),
  unreadCount: () => apiFetch<{ unread_count: number }>("/api/notifications/unread-count", { auth: true, cache: "no-store" }),
  markRead: (id: string) => apiFetch<any>(`/api/notifications/${id}/read`, { method: "PATCH", auth: true }),
  markUnread: (id: string) => apiFetch<any>(`/api/notifications/${id}/unread`, { method: "PATCH", auth: true }),
  markAllRead: () => apiFetch<any>("/api/notifications/read-all", { method: "PATCH", auth: true }),
  preferences: () => apiFetch<NotificationPrefs>("/api/notifications/preferences", { auth: true, cache: "no-store" }),
  updatePreferences: (body: NotificationPrefs) =>
    apiFetch<NotificationPrefs>("/api/notifications/preferences", { method: "PATCH", auth: true, body }),
  /** Live stream; the backend reads the JWT off the query string. */
  socketUrl: (token: string) =>
    `${API_BASE.replace(/^http/, "ws")}/api/notifications/ws?token=${encodeURIComponent(token)}`,
};

/* ─────────────── CERTIFICATES & BADGES ─────────────── */

export const certificatesApi = {
  myCertificates: (p: { activity_id?: string; cert_type?: string; limit?: number; skip?: number } = {}) =>
    apiFetch<{ total: number; certificates: any[] }>("/api/users/me/certificates", { auth: true, query: p, cache: "no-store" }),
  myBadges: () => apiFetch<{ total: number; badges: any[] }>("/api/users/me/badges", { auth: true, cache: "no-store" }),
  downloadPdf: async (certId: string) => {
    const res = await fetch(`${API_BASE}/api/users/me/certificates/${certId}/download`, {
      headers: { Authorization: `Bearer ${tokenStore.get() || ""}` },
    });
    if (!res.ok) throw new Error("Could not download certificate");
    return res.blob();
  },
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

/* ─────────────── WALLET & REWARDS ─────────────── */

export const walletApi = {
  wallet: () => apiFetch<any>("/api/rewards/wallet", { auth: true, cache: "no-store" }),
  coins: () => apiFetch<any>("/api/rewards/coins", { auth: true, cache: "no-store" }),
  calculateDiscount: (body: { item_id: string; item_type: string; coins_to_use?: number }) =>
    apiFetch<any>("/api/rewards/calculate-discount", { method: "POST", auth: true, body }),
  transactions: (p: { limit?: number; skip?: number } = {}) =>
    apiFetch<any>("/api/rewards/transactions", { query: p, auth: true, cache: "no-store" }),
  referralProfile: () => apiFetch<any>("/api/rewards/referral-profile", { auth: true, cache: "no-store" }),
};

/* ─────────────── AADHAAR KYC (DigiLocker) ─────────────── */

export type KycStatus = {
  email?: string;
  user_email?: string;
  status?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | string;
  kyc_status?: "NOT_VERIFIED" | "VERIFIED" | "PENDING" | "REJECTED" | string;
  aadhaar_masked?: string | null;
  source?: string;
  verification_source?: string;
  verification_id?: string | null;
  doc_uri?: string | null;
  verified_at?: string | null;
  is_verified?: boolean;
  verified?: boolean;
  verified_name?: string | null;
  verified_dob?: string | null;
  verified_address?: string | null;
  message?: string;
};

export const kycApi = {
  status: () => apiFetch<KycStatus>("/api/kyc/status", { auth: true }),
  sendOtp: (aadhaar_number: string) =>
    apiFetch<{
      success: boolean;
      message: string;
      reference_id: string;
      masked_mobile?: string;
      mode?: string;
      sandbox_otp?: string;
    }>(
      "/api/kyc/digilocker/send-otp",
      { method: "POST", body: { aadhaar_number }, auth: true }
    ),
  verifyOtp: (reference_id: string, otp: string) =>
    apiFetch<{
      success: boolean;
      kyc_status: string;
      aadhaar_masked?: string;
      message: string;
      verification_id?: string;
      verified_details?: { name?: string; date_of_birth?: string; gender?: string; address?: string };
    }>("/api/kyc/digilocker/verify-otp", { method: "POST", body: { reference_id, otp }, auth: true }),
};

/* Official DigiLocker OAuth 2.0 (MeitY Govt of India) */
export const digilockerApi = {
  getAuthorizeUrl: (user_email?: string, redirect_uri?: string) =>
    apiFetch<{
      success: boolean;
      authorization_url: string;
      state: string;
      redirect_uri: string;
      message: string;
    }>("/api/digilocker/authorize", {
      query: {
        format: "json",
        ...(user_email ? { user_email } : {}),
        ...(redirect_uri ? { redirect_uri } : {}),
      },
      auth: true,
    }),
  status: (user_email?: string) =>
    apiFetch<KycStatus>("/api/digilocker/status", {
      query: user_email ? { user_email } : undefined,
      auth: true,
    }),
  revoke: (user_email?: string) =>
    apiFetch<{ success: boolean; user_email: string; message: string }>(
      "/api/digilocker/revoke",
      { method: "POST", body: user_email ? { user_email } : {}, auth: true }
    ),
};

/* ─────────────── JUDGE AUTH (Password & OTP) ─────────────── */

export const judgeAuthApi = {
  /** Step 1: Send OTP to judge's registered email */
  loginStep1: (email: string) =>
    apiFetch<{ message: string }>("/api/judge/auth/login/step1", { method: "POST", body: { email } }),

  /** Step 2: Verify OTP and receive access token (returns has_password status) */
  loginStep2: (email: string, otp: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string; has_password?: boolean }>(
      "/api/judge/auth/login/step2", { method: "POST", body: { email, otp } }
    ),

  /** Direct Login with Email and Permanent Password */
  loginPassword: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string; has_password: boolean }>(
      "/api/judge/auth/login/password", { method: "POST", body: { email, password } }
    ),

  /** Set permanent password for Judge after first OTP login */
  setPassword: (password: string, confirm_password?: string) =>
    apiFetch<{ message: string; has_password: boolean }>("/api/judge/auth/set-password", {
      method: "POST",
      body: { password, confirm_password: confirm_password ?? password },
      auth: true,
    }),

  /** Change existing password */
  changePassword: (current_password: string, new_password: string, confirm_password?: string) =>
    apiFetch<{ message: string }>("/api/judge/auth/change-password", {
      method: "POST",
      body: { current_password, new_password, confirm_password: confirm_password ?? new_password },
      auth: true,
    }),
};

/* ─────────────── VOLUNTEER AUTH (Password & OTP) ─────────────── */

export const volunteerAuthApi = {
  /** Step 1: Send OTP to volunteer's registered email */
  loginStep1: (email: string) =>
    apiFetch<{ message: string }>("/api/volunteer/auth/login/step1", { method: "POST", body: { email } }),

  /** Step 2: Verify OTP and receive access token (returns has_password status) */
  loginStep2: (email: string, otp: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string; has_password?: boolean }>(
      "/api/volunteer/auth/login/step2", { method: "POST", body: { email, otp } }
    ),

  /** Direct Login with Email and Permanent Password */
  loginPassword: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string; has_password: boolean }>(
      "/api/volunteer/auth/login/password", { method: "POST", body: { email, password } }
    ),

  /** Set permanent password for Volunteer after first OTP login */
  setPassword: (password: string, confirm_password?: string) =>
    apiFetch<{ message: string; has_password: boolean }>("/api/volunteer/auth/set-password", {
      method: "POST",
      body: { password, confirm_password: confirm_password ?? password },
      auth: true,
    }),

  /** Change existing password */
  changePassword: (current_password: string, new_password: string, confirm_password?: string) =>
    apiFetch<{ message: string }>("/api/volunteer/auth/change-password", {
      method: "POST",
      body: { current_password, new_password, confirm_password: confirm_password ?? new_password },
      auth: true,
    }),
};

/* ─────────────── JUDGE COMPETITIONS & SCORING ─────────────── */

export interface JudgingCriterion {
  name: string;
  max_score: number;
  weight?: number;
  description?: string;
}

export interface JudgeCompetition {
  _id: string;
  title: string;
  category: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  time?: string;
  registration_start_date?: string;
  registration_deadline?: string;
  judge_scoring_enabled?: boolean;
  judging_status?: string;
  judging_criteria?: JudgingCriterion[];
  banner_url?: string;
}

export interface JudgeContestant {
  _id: string;
  competition_id: string;
  user_email: string;
  user_name?: string;
  full_name?: string;
  profile_photo?: string;
  avatar?: string;
  title?: string;
  submission_url?: string;
  media_url?: string;
  description?: string;
  status: string;
  submitted_at?: string;
  files?: Record<string, string>;
  parsed_files?: Array<{ label: string; url: string }>;
  registration_reference?: string;
  registration_number?: string;
  reg_no?: string;
  user_phone?: string;
  rank?: number | null;
  is_scored?: boolean;
  has_scored?: boolean;
  is_locked?: boolean;
  total_score?: number;
  my_score?: number;
  my_scores?: Record<string, number>;
  scores?: Record<string, number>;
  my_comments?: string;
  comments?: string;
  scored_at?: string;
}

export interface JudgeScoreboardResponse {
  competition_id: string;
  competition_title: string;
  total_contestants: number;
  scored_count: number;
  pending_count: number;
  criteria: Array<{ name: string; max_score: number; weight?: number; description?: string }>;
  podium: {
    first: JudgeContestant | null;
    second: JudgeContestant | null;
    third: JudgeContestant | null;
  };
  standings: JudgeContestant[];
}

export const judgeCompetitionsApi = {
  /** List assigned competitions for current judge */
  listAssigned: () =>
    apiFetch<JudgeCompetition[]>("/api/judge/", { auth: true }),

  /** List scorable contestants/submissions for a competition */
  listContestants: (compId: string) =>
    apiFetch<JudgeContestant[]>(`/api/judge/${compId}/contestants`, { auth: true }),

  /** Verify live session PIN to unlock scoring */
  verifyPin: (compId: string, pin: string) =>
    apiFetch<{ message: string }>(`/api/judge/${compId}/verify-pin`, {
      method: "POST",
      body: { pin },
      auth: true,
    }),

  /** Auto-save partial draft score */
  saveDraft: (compId: string, subId: string, scores: Record<string, number>, comments?: string) =>
    apiFetch<{ message: string }>(`/api/judge/${compId}/contestants/${subId}/draft`, {
      method: "POST",
      body: { scores, comments },
      auth: true,
    }),

  /** Retrieve saved draft score */
  getDraft: (compId: string, subId: string) =>
    apiFetch<{ scores?: Record<string, number>; comments?: string }>(
      `/api/judge/${compId}/contestants/${subId}/draft`,
      { auth: true }
    ),

  /** Declare Conflict of Interest (COI) and skip contestant */
  skipContestant: (compId: string, subId: string, reason: string) =>
    apiFetch<{ message: string }>(`/api/judge/${compId}/contestants/${subId}/skip`, {
      method: "POST",
      body: { reason },
      auth: true,
    }),

  /** Final score submission */
  submitScore: (subId: string, scores: Record<string, number>, comments?: string) =>
    apiFetch<{ message: string; total_score?: number; is_locked?: boolean }>(`/api/judge/submissions/${subId}/scores`, {
      method: "POST",
      body: { scores, comments },
      auth: true,
    }),
};

/* ─────────────── VOLUNTEER GATE CHECK-IN & SCANNER ─────────────── */

export interface TicketScanVerifyResult {
  is_valid: boolean;
  ticket: {
    ticket_ref: string;
    holder_name: string;
    holder_names?: string[];
    holder_email: string;
    ticket_type?: string;
    quantity: number;
    admitted_count: number;
    remaining_count: number;
    is_checked_in: boolean;
    is_fully_used: boolean;
    status: string;
    check_in_time: string | null;
    payment_method?: string;
    payment_status?: string;
  };
  event_title?: string;
  booking_reference?: string;
  booking_status: string;
}

export const volunteerScannerApi = {
  /** Scan or enter QR token to verify ticket validity */
  verifyTicket: (qr_token: string) =>
    apiFetch<TicketScanVerifyResult>("/api/admin/tickets/verify", {
      method: "POST",
      body: { qr_token },
      auth: true,
    }),

  /** Atomically mark attendees on this ticket as checked in */
  checkInTicket: (qr_token: string, admit_count?: number) =>
    apiFetch<{
      message: string;
      ticket_ref: string;
      admitted_now: number;
      total_admitted: number;
      total_quantity: number;
      remaining: number;
      is_fully_used: boolean;
    }>("/api/admin/tickets/check-in", {
      method: "POST",
      body: { qr_token, admit_count },
      auth: true,
    }),
};

/* ─────────────── EXTRAS ─────────────── */

export const extrasApi = {
  notifications: () => apiFetch<any>("/api/notifications/", { auth: true, cache: "no-store" }),
  rewards: () => apiFetch<any>("/api/rewards/", { auth: true, cache: "no-store" }),
  myCertificates: () => apiFetch<any>("/api/users/me/certificates", { auth: true, cache: "no-store" }),
  publicCompetitions: () => apiFetch<any[]>("/api/v1/competitions", { cache: "no-store" }),
};

/** Safe fetch — returns fallback instead of throwing (for optional homepage sections). */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}
