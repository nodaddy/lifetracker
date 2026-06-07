export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";
export type HabitTimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export const HABIT_FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom days" },
];

export const HABIT_TIME_OPTIONS: { value: HabitTimeOfDay; label: string }[] = [
  { value: "anytime", label: "Anytime" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function scheduleDaysForFrequency(
  frequency: HabitFrequency,
  customDays: number[] = [],
): number[] {
  switch (frequency) {
    case "daily":
      return [0, 1, 2, 3, 4, 5, 6];
    case "weekdays":
      return [1, 2, 3, 4, 5];
    case "weekends":
      return [0, 6];
    case "custom":
      return [...new Set(customDays)].sort((a, b) => a - b);
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

export function frequencyLabel(frequency: HabitFrequency, scheduleDays: number[]) {
  if (frequency === "daily") {
    return "Every day";
  }
  if (frequency === "weekdays") {
    return "Weekdays";
  }
  if (frequency === "weekends") {
    return "Weekends";
  }

  return scheduleDays.map((day) => DAY_LABELS[day] ?? "?").join(", ");
}

export function timeOfDayLabel(timeOfDay: HabitTimeOfDay) {
  return HABIT_TIME_OPTIONS.find((option) => option.value === timeOfDay)?.label ?? "Anytime";
}

export function isValidScheduleDay(day: number) {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const ROUTINE_DRAFT_STORAGE_KEY = "ltrack-routine-draft";
export const DAYY_COOLDOWN_STORAGE_KEY = "ltrack-dayy-cooldown-until";
export const DAYY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function readDayyCooldownUntil() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(DAYY_COOLDOWN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    window.localStorage.removeItem(DAYY_COOLDOWN_STORAGE_KEY);
    return null;
  }

  return timestamp;
}

export function writeDayyCooldownUntil(until: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DAYY_COOLDOWN_STORAGE_KEY, String(until));
}

export function clearDayyCooldown() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DAYY_COOLDOWN_STORAGE_KEY);
}

export function isDayyOnCooldown(until: number | null) {
  return until !== null && until > Date.now();
}
