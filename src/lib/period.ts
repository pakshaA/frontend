export type PeriodPreset =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "year"
  | "custom";

export type DateRange = {
  from: string;
  to: string;
};

export type PeriodGranularity = "day" | "week" | "month";

function toInputDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getPresetRange(preset: PeriodPreset, now = new Date()): DateRange {
  if (preset === "current_month") {
    return {
      from: toInputDate(startOfMonth(now)),
      to: toInputDate(endOfMonth(now)),
    };
  }

  if (preset === "previous_month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      from: toInputDate(startOfMonth(prev)),
      to: toInputDate(endOfMonth(prev)),
    };
  }

  if (preset === "last_3_months") {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return {
      from: toInputDate(startOfMonth(from)),
      to: toInputDate(endOfMonth(now)),
    };
  }

  if (preset === "last_6_months") {
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return {
      from: toInputDate(startOfMonth(from)),
      to: toInputDate(endOfMonth(now)),
    };
  }

  if (preset === "year") {
    return {
      from: toInputDate(new Date(now.getFullYear(), 0, 1)),
      to: toInputDate(new Date(now.getFullYear(), 11, 31)),
    };
  }

  return getPresetRange("current_month", now);
}

export function daysInRange(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function resolveGranularity(from: string, to: string): PeriodGranularity {
  const days = daysInRange(from, to);
  if (days <= 45) return "day";
  if (days <= 120) return "week";
  return "month";
}

export function resolveTimelineLimit(
  from: string,
  to: string,
  granularity: PeriodGranularity,
): number {
  const days = daysInRange(from, to);
  if (granularity === "day") return Math.min(100, Math.max(1, days));
  if (granularity === "week") {
    return Math.min(100, Math.max(1, Math.ceil(days / 7)));
  }
  return Math.min(100, Math.max(1, Math.ceil(days / 28)));
}

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  current_month: "Текущий месяц",
  previous_month: "Прошлый месяц",
  last_3_months: "3 месяца",
  last_6_months: "6 месяцев",
  year: "Этот год",
  custom: "Свой период",
};
