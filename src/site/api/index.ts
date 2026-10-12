import { api, asList } from "@/shared/api";
import type { HomepageContent } from "@/shared/cms";

export type EventItem = Record<string, unknown> & { _id: string; title?: string };

export const siteApi = {
  homepage: () => api<HomepageContent>("/api/v1/homepage"),
  publicList: (path: string) => api(path).then((r) => asList(r)),
  events: (search?: string) =>
    api("/api/activities/events", { query: { limit: 50, search } }).then((r) => asList<EventItem>(r)),
  activity: (kind: "competitions" | "courses" | "tickets") =>
    api(`/api/activities/${kind}`, { query: { limit: 50 } }).then((r) => asList(r)),
  vipPasses: (eventId: string) =>
    api(`/api/events/${eventId}/vip-passes`, { side: "user" }).then((r) => asList(r)),
  products: () => api("/api/merchandise/products").then((r) => asList(r)),
  product: (id: string) => api<Record<string, unknown>>(`/api/merchandise/products/${id}`),
  login: (email: string, password: string) => api("/api/auth/login", { method: "POST", body: { email, password } }),
  regStep1: (email: string, referral_code?: string) =>
    api("/api/auth/register/step1", { method: "POST", body: { email, referral_code: referral_code || null } }),
  regStep2: (email: string, otp: string) => api("/api/auth/register/step2", { method: "POST", body: { email, otp } }),
  regStep3: (form: FormData) => api("/api/auth/register/step3", { method: "POST", form }),
  me: () => api<Record<string, unknown>>("/api/profile/me", { side: "user" }),
  updateProfile: (form: FormData) => api("/api/profile/me", { method: "PUT", side: "user", form }),
  shareCertificate: (id: string) => api<Record<string, unknown>>(`/api/users/me/certificates/${id}/share`, { side: "user" }),
  dashboard: () => api<Record<string, unknown>>("/api/profile/dashboard", { side: "user" }),
  myBookings: () => api("/api/bookings/my", { side: "user" }).then((r) => asList(r)),
  myTickets: () => api("/api/bookings/my-tickets", { side: "user" }).then((r) => asList(r)),
  myVipPasses: () => api("/api/users/me/vip-passes", { side: "user" }).then((r) => asList(r)),
  myOrders: () => api("/api/merchandise/orders", { side: "user" }).then((r) => asList(r)),
  wallet: () => api<Record<string, unknown>>("/api/rewards/wallet", { side: "user" }),
  certificates: () => api("/api/users/me/certificates", { side: "user" }).then((r) => asList(r)),
  notifications: () => api("/api/notifications", { side: "user" }).then((r) => asList(r)),
  notificationCount: () => api<Record<string, unknown>>("/api/notifications/unread-count", { side: "user" }),
  readNotification: (id: string) => api(`/api/notifications/${id}/read`, { method: "PATCH", side: "user" }),
  readAllNotifications: () => api("/api/notifications/read-all", { method: "PATCH", side: "user" }),
  rewardCoins: () => api<Record<string, unknown>>("/api/rewards/coins", { side: "user" }),
  rewardLots: () => api("/api/rewards/lots", { side: "user" }).then((r) => asList(r)),
  rewardTransactions: () => api("/api/rewards/transactions", { side: "user" }).then((r) => asList(r)),
  referralProfile: () => api<Record<string, unknown>>("/api/rewards/referral-profile", { side: "user" }),
  badges: () => api("/api/users/me/badges", { side: "user" }).then((r) => asList(r)),
  competitions: () => api("/api/activities/competitions", { query: { limit: 100 } }).then((r) => asList(r)),
  competitionEligibility: (id: string) => api<Record<string, unknown>>(`/api/v1/competitions/${id}/eligibility`, { side: "user" }),
  competitionLeaderboard: (id: string) => api(`/api/v1/competitions/${id}/leaderboard`).then((r) => asList(r)),
  competitionResults: (id: string) => api(`/api/v1/competitions/${id}/results`).then((r) => asList(r)),
  registerCompetition: (id: string) => api<Record<string, unknown>>(`/api/v1/competitions/${id}/register`, { method: "POST", side: "user", query: { rules_accepted: true } }),
  submitCompetition: (id: string, form: FormData) => api(`/api/v1/competitions/${id}/submissions`, { method: "POST", side: "user", form }),
  vote: (id: string, participantId: string) => api(`/api/v1/competitions/${id}/vote`, { method: "POST", side: "user", body: { participant_id: participantId, source: "WEBSITE", is_paid_pack: false } }),
  verifyCertificate: (token: string) => api<Record<string, unknown>>(`/api/public/certificates/verify/${encodeURIComponent(token)}`),
  registerActivity: (activityId: string, activityType: "course" | "workshop") => api<Record<string, unknown>>("/api/registrations/", { method: "POST", side: "user", body: { activity_id: activityId, activity_type: activityType } }),
  verifyActivityPayment: (body: Record<string, unknown>) => api("/api/registrations/verify-payment", { method: "POST", side: "user", body }),
  courses: () => api("/api/v1/courses").then((r) => asList(r)),
  workshops: () => api("/api/v1/workshops").then((r) => asList(r)),
  createOrder: (body: Record<string, unknown>) => api<Record<string, unknown>>("/api/merchandise/orders", { method: "POST", side: "user", body }),
  orderTracking: (id: string) => api<Record<string, unknown>>(`/api/merchandise/orders/${id}/tracking`, { side: "user" }),
  createBooking: (body: { event_id: string; ticket_id: string; quantity: number }) =>
    api<Record<string, unknown>>("/api/bookings/", { method: "POST", side: "user", body }),
  createPaymentOrder: (bookingId: string) => api<Record<string, unknown>>(`/api/payments/create-order/${bookingId}`, { method: "POST", side: "user" }),
  verifyRazorpay: (body: { booking_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => api("/api/payments/verify-razorpay", { method: "POST", side: "user", body }),
  mockPay: (bookingId: string) => api(`/api/payments/verify-mock/${bookingId}`, { method: "POST", side: "user" }),
  cancelBooking: (id: string) => api(`/api/bookings/${id}/cancel`, { method: "POST", side: "user" }),
  bookVip: (eventId: string, configId: string) =>
    api<Record<string, unknown>>(`/api/events/${eventId}/vip-passes/${configId}/book`, {
      method: "POST",
      side: "user",
      body: {},
    }),
};
