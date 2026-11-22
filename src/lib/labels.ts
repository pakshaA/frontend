import type { PayoutType } from "./deposits-api";

export const DEPOSIT_STATUS_LABELS: Record<"active" | "closed", string> = {
  active: "Активен",
  closed: "Закрыт",
};

export const PAYOUT_TYPE_LABELS: Record<PayoutType, string> = {
  monthly: "Ежемесячно",
  daily: "Ежедневно",
  end_of_term: "В конце срока",
};

export const INTEREST_TYPE_LABELS: Record<string, string> = {
  monthly: "Ежемесячное",
  daily: "Ежедневное",
  capitalization: "Капитализация",
  end_of_term: "В конце срока",
};

export const GOAL_STATUS_LABELS: Record<
  "active" | "completed" | "archived",
  string
> = {
  active: "Активна",
  completed: "Завершена",
  archived: "В архиве",
};

export const GOAL_PRIORITY_LABELS: Record<"high" | "medium" | "low", string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export const GOAL_SOURCE_LABELS: Record<"virtual" | "deposit", string> = {
  virtual: "Виртуальный счёт",
  deposit: "Привязка к вкладу",
};

export const FREQUENCY_LABELS: Record<
  "weekly" | "monthly" | "quarterly" | "yearly",
  string
> = {
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
  quarterly: "Ежеквартально",
  yearly: "Ежегодно",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<
  "active" | "paused" | "cancelled",
  string
> = {
  active: "Активна",
  paused: "На паузе",
  cancelled: "Отменена",
};

export const SCHEDULED_STATUS_LABELS: Record<
  "pending" | "paid" | "cancelled",
  string
> = {
  pending: "Ожидает",
  paid: "Оплачен",
  cancelled: "Отменён",
};

export const SCHEDULED_PRIORITY_LABELS: Record<"required" | "optional", string> =
  {
    required: "Обязательный",
    optional: "Опциональный",
  };

export function labelOrRaw(
  map: Record<string, string>,
  value: string | undefined,
): string {
  if (!value) return "—";
  return map[value] ?? value;
}
