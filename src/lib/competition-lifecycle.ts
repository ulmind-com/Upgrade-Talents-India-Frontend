import { formatEventDate, parseDate } from "./utils";

export interface CompetitionLifecycleInput {
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  registration_start_date?: string | Date | null;
  registration_deadline?: string | Date | null;
  submission_deadline?: string | Date | null;
  voting_status?: string | null;
  judging_status?: string | null;
  results_published?: boolean | null;
  result_status?: string | null;
  status?: string | null;
  start_time?: string | null;
  time?: string | null;
  end_time?: string | null;
  can_register?: boolean | null;
  is_registration_open?: boolean | null;
  registration_status?: string | null;
  registration_reason?: string | null;
  reason?: string | null;
}

export interface CompetitionLifecycleResult {
  // Registration state
  isRegistrationOpen: boolean;
  isRegUpcoming: boolean;
  isRegClosed: boolean;
  regMessage: string;
  canRegister: boolean;

  // Competition life phase
  isLive: boolean;
  isUpcoming: boolean;
  isEnded: boolean;
  isResultsOut: boolean;
  phase: "UPCOMING" | "LIVE" | "CONCLUDED" | "RESULTS_OUT";
  phaseMessage: string;

  // Visual badge presentation
  badgeText: string;
  badgeTone: "success" | "brand" | "warning" | "neutral" | "rose";
  isLivePulsing: boolean;

  // Parsed dates
  parsedStartDate: Date | null;
  parsedEndDate: Date | null;
  parsedRegDeadline: Date | null;
  parsedRegStartDate: Date | null;
}

/**
 * Parses date + optional time string safely into a Date object.
 * e.g. "2026-10-30" + "18:00" or "6:30 PM"
 */
export function parseDateWithTime(
  dateInput?: string | Date | null,
  timeInput?: string | null,
  defaultEndOfDay: boolean = false
): Date | null {
  if (!dateInput) return null;

  let y: number;
  let m: number;
  let d: number;
  let hr = defaultEndOfDay ? 23 : 0;
  let min = defaultEndOfDay ? 59 : 0;
  let sec = defaultEndOfDay ? 59 : 0;
  let ms = defaultEndOfDay ? 999 : 0;
  let hasSpecificTime = false;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return dateInput;
  }

  const trimmed = String(dateInput).trim();
  if (!trimmed) return null;

  // Handle ISO 8601 strings with timezone directly
  if (trimmed.includes("T") && (trimmed.endsWith("Z") || trimmed.includes("+") || trimmed.lastIndexOf("-") > 10)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Check if standard YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    y = parseInt(ymdMatch[1], 10);
    m = parseInt(ymdMatch[2], 10) - 1;
    d = parseInt(ymdMatch[3], 10);

    const isoTimeMatch = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (isoTimeMatch) {
      hr = parseInt(isoTimeMatch[1], 10);
      min = parseInt(isoTimeMatch[2], 10);
      sec = isoTimeMatch[3] ? parseInt(isoTimeMatch[3], 10) : 0;
      hasSpecificTime = true;
    }
  } else {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  }

  // If separate timeInput was passed (e.g. "18:00", "06:30 PM", "10:00")
  if (timeInput && typeof timeInput === "string") {
    const tm = timeInput.match(/(\d{1,2}):(\d{2})(?:\s*([aApP][mM]))?/);
    if (tm) {
      let h = parseInt(tm[1], 10);
      const mn = parseInt(tm[2], 10);
      const mer = tm[3]?.toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      else if (mer === "AM" && h === 12) h = 0;
      hr = h;
      min = mn;
      sec = 0;
      ms = 0;
      hasSpecificTime = true;
    }
  }

  return new Date(y, m, d, hr, min, sec, ms);
}

/**
 * Computes authoritative competition lifecycle based on start_date, registration_deadline, etc.
 */
export function getCompetitionLifecycle(comp: CompetitionLifecycleInput): CompetitionLifecycleResult {
  const now = Date.now();

  const parsedStartDate = parseDateWithTime(comp.start_date, comp.start_time || comp.time, false);
  const parsedEndDate = parseDateWithTime(comp.end_date, comp.end_time, true);
  const parsedRegStartDate = parseDateWithTime(comp.registration_start_date, null, false);
  const parsedRegDeadline = parseDateWithTime(comp.registration_deadline, null, true);

  const startMs = parsedStartDate?.getTime() ?? null;
  const endMs = parsedEndDate?.getTime() ?? null;
  const regStartMs = parsedRegStartDate?.getTime() ?? null;
  const regDeadlineMs = parsedRegDeadline?.getTime() ?? null;

  const isResultsOut = Boolean(
    comp.results_published === true ||
    comp.result_status === "PUBLISHED"
  );

  // 1. Competition execution phase
  let isStarted = false;
  let isEnded = false;
  let isLive = false;
  let isUpcoming = false;

  if (isResultsOut) {
    isEnded = true;
    isLive = false;
    isStarted = true;
    isUpcoming = false;
  } else if (endMs && now > endMs) {
    isEnded = true;
    isLive = false;
    isStarted = true;
    isUpcoming = false;
  } else if (startMs && now < startMs) {
    // Scheduled start date is in the future - competition has NOT commenced yet!
    isUpcoming = true;
    isLive = false;
    isStarted = false;
    isEnded = false;
  } else if (startMs && now >= startMs) {
    // Scheduled start date has arrived and competition has not ended
    isLive = true;
    isStarted = true;
    isEnded = false;
    isUpcoming = false;
  } else {
    // No start_date defined: check explicit live status
    const isExplicitLive = String(comp.status || "").toUpperCase() === "LIVE";
    if (isExplicitLive) {
      isLive = true;
      isStarted = true;
      isEnded = false;
    } else {
      isUpcoming = true;
      isLive = false;
    }
  }

  // 2. Registration Window
  let isRegUpcoming = false;
  let isRegClosed = false;
  let regMessage = "Registration is open.";

  const isExplicitClosed =
    comp.can_register === false ||
    comp.is_registration_open === false ||
    String(comp.registration_status || "").toUpperCase() === "CLOSED";

  const isExplicitUpcoming =
    String(comp.registration_status || "").toUpperCase() === "UPCOMING";

  if (isResultsOut || isEnded) {
    isRegClosed = true;
    regMessage = "Competition has concluded. Registration is closed.";
  } else if (regDeadlineMs && now >= regDeadlineMs) {
    // Deadline passed: strictly prevent registration
    isRegClosed = true;
    regMessage = `Registration closed on ${formatEventDate(comp.registration_deadline)}.`;
  } else if (isExplicitClosed) {
    isRegClosed = true;
    regMessage =
      comp.registration_reason ||
      comp.reason ||
      "Registration for this competition is closed.";
  } else if (isExplicitUpcoming || (regStartMs && now < regStartMs)) {
    isRegUpcoming = true;
    regMessage =
      comp.registration_reason ||
      comp.reason ||
      (comp.registration_start_date
        ? `Registration opens on ${formatEventDate(comp.registration_start_date)}.`
        : "Registration opens soon.");
  } else if (startMs && now >= startMs) {
    isRegClosed = true;
    regMessage = "Competition has commenced. Registration is closed.";
  } else {
    isRegClosed = false;
    isRegUpcoming = false;
    regMessage = regDeadlineMs
      ? `Registration closes on ${formatEventDate(comp.registration_deadline)}.`
      : "Registration is open.";
  }

  const isRegistrationOpen = !isRegClosed && !isRegUpcoming;
  const canRegister = isRegistrationOpen;

  // 3. Presentation Badges
  let badgeText = "Upcoming";
  let badgeTone: "success" | "brand" | "warning" | "neutral" | "rose" = "neutral";
  let isLivePulsing = false;
  let phase: "UPCOMING" | "LIVE" | "CONCLUDED" | "RESULTS_OUT" = "UPCOMING";
  let phaseMessage = "Competition details";

  if (isResultsOut) {
    badgeText = "Results Out";
    badgeTone = "success";
    phase = "RESULTS_OUT";
    phaseMessage = "Certified results have been officially published.";
  } else if (isLive) {
    badgeText = "Live Now";
    badgeTone = "rose";
    isLivePulsing = true;
    phase = "LIVE";
    phaseMessage = "Competition is live! Live scoring and performances active.";
  } else if (isRegistrationOpen) {
    badgeText = "Registration Open";
    badgeTone = "success";
    phase = "UPCOMING";
    phaseMessage = regDeadlineMs
      ? `Registration closes on ${formatEventDate(comp.registration_deadline)}.`
      : "Registration is open.";
  } else if (isRegUpcoming) {
    badgeText = "Reg Opens Soon";
    badgeTone = "neutral";
    phase = "UPCOMING";
    phaseMessage = `Registration opens on ${formatEventDate(comp.registration_start_date)}.`;
  } else if (isRegClosed && !isEnded) {
    badgeText = "Starts Soon";
    badgeTone = "warning";
    phase = "UPCOMING";
    phaseMessage = startMs
      ? `Registration closed. Competition commences on ${formatEventDate(comp.start_date)}.`
      : "Registration is closed.";
  } else {
    badgeText = "Concluded";
    badgeTone = "neutral";
    phase = "CONCLUDED";
    phaseMessage = "Competition has concluded. Awaiting results.";
  }

  return {
    isRegistrationOpen,
    isRegUpcoming,
    isRegClosed,
    regMessage,
    canRegister,
    isLive,
    isUpcoming,
    isEnded,
    isResultsOut,
    phase,
    phaseMessage,
    badgeText,
    badgeTone,
    isLivePulsing,
    parsedStartDate,
    parsedEndDate,
    parsedRegDeadline,
    parsedRegStartDate,
  };
}
