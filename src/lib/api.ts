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
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  event_cover?: string;
  price?: number;
  base_price?: number;
  qr_token?: string;
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
  leaderboard: (id: string) =>
    apiFetch<{ ranking_mode?: string; leaderboard?: any[] }>(`/api/v1/competitions/${id}/leaderboard`, { cache: "no-store" }),
  verifyCertificate: (token: string) =>
    apiFetch<any>(`/api/public/certificates/verify/${encodeURIComponent(token)}`, { cache: "no-store" }),
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
  verifyPayment: (compId: string, body: {
    registration_reference: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiFetch<any>(`/api/v1/competitions/${compId}/verify-payment`, { method: "POST", auth: true, body }),
  vote: (id: string, participant_id: string) =>
    apiFetch<any>(`/api/v1/competitions/${id}/vote`, { method: "POST", auth: true, body: { participant_id, source: "WEBSITE" } }),
};

/* ─────────────── SHOP (merchandise) ─────────────── */

export const shopApi = {
  products: (p: { skip?: number; limit?: number; search?: string; category?: string } = {}) =>
    apiFetch<any>("/api/merchandise/products", { query: { limit: 60, ...p }, cache: "no-store" }).then(
      (d) => (Array.isArray(d) ? d : d?.products || []) as any[]
    ),
  product: (id: string) =>
    apiFetch<any>(`/api/merchandise/products/${id}`, { cache: "no-store" }).then((d) => d?.product ?? d),
  categories: () => apiFetch<any[]>("/api/merchandise/categories", { revalidate: 300 }),
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
  coins: () => apiFetch<{ total_coins: number; history: any[] }>("/api/rewards/coins", { auth: true, cache: "no-store" }),
  wallet: () => apiFetch<any>("/api/rewards/wallet", { auth: true, cache: "no-store" }),
  referralProfile: () => apiFetch<any>("/api/rewards/referral-profile", { auth: true, cache: "no-store" }),
};

/* ─────────────── CERTIFICATES & BADGES ─────────────── */

export const certificatesApi = {
  myCertificates: () => apiFetch<{ total: number; certificates: any[] }>("/api/users/me/certificates", { auth: true, cache: "no-store" }),
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

/* ─────────────── JUDGE AUTH (OTP-based, passwordless) ─────────────── */

export const judgeAuthApi = {
  /** Step 1: Send OTP to judge's registered email */
  loginStep1: (email: string) =>
    apiFetch<{ message: string }>("/api/judge/auth/login/step1", { method: "POST", body: { email } }),

  /** Step 2: Verify OTP and receive access token */
  loginStep2: (email: string, otp: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string }>(
      "/api/judge/auth/login/step2", { method: "POST", body: { email, otp } }
    ),
};

/* ─────────────── VOLUNTEER AUTH (OTP-based, passwordless) ─────────────── */

export const volunteerAuthApi = {
  /** Step 1: Send OTP to volunteer's registered email */
  loginStep1: (email: string) =>
    apiFetch<{ message: string }>("/api/volunteer/auth/login/step1", { method: "POST", body: { email } }),

  /** Step 2: Verify OTP and receive access token */
  loginStep2: (email: string, otp: string) =>
    apiFetch<{ access_token: string; token_type: string; user_email: string; role: string }>(
      "/api/volunteer/auth/login/step2", { method: "POST", body: { email, otp } }
    ),
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
  title?: string;
  submission_url?: string;
  media_url?: string;
  description?: string;
  status: string;
  submitted_at?: string;
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
    apiFetch<{ message: string }>(`/api/judge/submissions/${subId}/scores`, {
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
    holder_email: string;
    is_checked_in: boolean;
    check_in_time: string | null;
  };
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

  /** Atomically mark ticket as checked in */
  checkInTicket: (qr_token: string) =>
    apiFetch<{ message: string; ticket_ref: string }>("/api/admin/tickets/check-in", {
      method: "POST",
      body: { qr_token },
      auth: true,
    }),
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
