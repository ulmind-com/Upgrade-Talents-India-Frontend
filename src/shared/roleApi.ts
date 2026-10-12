import { api, asList, type Side } from "./api";

export function roleApi(role: Extract<Side, "judge" | "volunteer">) {
  const root = `/api/${role}`;
  return {
    loginStep1: (email: string) => api(`${root}/auth/login/step1`, { method: "POST", body: { email } }),
    loginStep2: (email: string, otp: string) => api(`${root}/auth/login/step2`, { method: "POST", body: { email, otp } }),
    assignments: () => role === "judge" ? api(root + "/", { side: role }).then((r) => asList(r)) : Promise.resolve([]),
    contestants: (id: string) => api(`/api/judge/${encodeURIComponent(id)}/contestants`, { side: "judge" }).then(r => asList(r)),
    verifyPin: (id: string, pin: string) => api(`/api/judge/${encodeURIComponent(id)}/verify-pin`, { method: "POST", side: "judge", body: { pin } }),
    saveDraft: (id: string, submission: string, body: Record<string, unknown>) => api(`/api/judge/${encodeURIComponent(id)}/contestants/${encodeURIComponent(submission)}/draft`, { method: "POST", side: "judge", body }),
    submitScores: (submission: string, body: Record<string, unknown>) => api(`/api/judge/submissions/${encodeURIComponent(submission)}/scores`, { method: "POST", side: "judge", body }),
    feedback: (id: string, submission: string, text: string) => api(`/api/judge/${encodeURIComponent(id)}/contestants/${encodeURIComponent(submission)}/feedback`, { method: "POST", side: "judge", body: { text_feedback: text } }),
    skip: (id: string, submission: string, reason: string) => api(`/api/judge/${encodeURIComponent(id)}/contestants/${encodeURIComponent(submission)}/skip`, { method: "POST", side: "judge", body: { reason } }),
  };
}