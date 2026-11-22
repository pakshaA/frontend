import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";
import type { CategoryType } from "./categories-api";

export type BalanceScope = "all" | "cards" | "deposits";

export type BalanceBreakdownItem = {
  kind: "card" | "deposit";
  id: string;
  name: string;
  bank?: string;
  amount: number;
};

export type AnalyticsSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  periodNet?: number;
  balanceScope?: BalanceScope;
  depositsCount?: number;
  breakdown?: BalanceBreakdownItem[];
};

export type CategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  type: CategoryType;
  total: number;
};

export type TimelineItem = {
  period: string;
  income: number;
  expense: number;
};

export type BalanceTrendItem = {
  period: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type ForecastItem = {
  period: string;
  projectedIncome: number;
  projectedExpense: number;
  subscriptionExpense: number;
  scheduledExpense: number;
  projectedBalance: number;
};

export type CashflowForecast = {
  basedOnMonths: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  currentBalance: number;
  items: ForecastItem[];
};

export type AnalyticsInsights = {
  period: { from: string; to: string };
  goals: {
    activeCount: number;
    atRiskCount: number;
    items: Array<{
      id: string;
      name: string;
      progress: number;
      priority: string;
      daysLeft: number | null;
      atRisk: boolean;
      currentAmount: number;
      targetAmount: number;
    }>;
  };
  subscriptions: {
    upcomingCount: number;
    estimatedMonthlySpend: number;
    upcoming: Array<{
      id: string;
      name: string;
      amount: number;
      nextPaymentDate: string;
      autoCreateTransaction: boolean;
    }>;
  };
  scheduledPayments: {
    upcomingCount: number;
    upcomingTotal: number;
    upcoming: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      priority: string;
    }>;
  };
};

export type AnalyticsRange = {
  from: string;
  to: string;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

function withRange(params: URLSearchParams, range?: AnalyticsRange) {
  if (!range) return;
  params.set("from", range.from);
  params.set("to", range.to);
}

export async function fetchAnalyticsSummary(options?: {
  range?: AnalyticsRange;
  balanceScope?: BalanceScope;
  cardId?: string;
}): Promise<AnalyticsSummary> {
  const params = new URLSearchParams();
  withRange(params, options?.range);
  if (options?.balanceScope) params.set("balanceScope", options.balanceScope);
  if (options?.cardId) params.set("cardId", options.cardId);
  const qs = params.toString();
  return apiRequest(
    qs ? `/api/analytics/summary?${qs}` : "/api/analytics/summary",
    {
      method: "GET",
      token: authToken(),
    },
  );
}

export async function fetchByCategory(options?: {
  type?: CategoryType;
  range?: AnalyticsRange;
  balanceScope?: BalanceScope;
  cardId?: string;
}): Promise<CategoryBreakdownItem[]> {
  const params = new URLSearchParams();
  if (options?.type) params.set("type", options.type);
  withRange(params, options?.range);
  if (options?.balanceScope) params.set("balanceScope", options.balanceScope);
  if (options?.cardId) params.set("cardId", options.cardId);
  const qs = params.toString();
  const data = await apiRequest<{ items: CategoryBreakdownItem[] }>(
    qs ? `/api/analytics/by-category?${qs}` : "/api/analytics/by-category",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function fetchTimeline(options?: {
  granularity?: "day" | "week" | "month";
  limit?: number;
  range?: AnalyticsRange;
  balanceScope?: BalanceScope;
  cardId?: string;
}): Promise<{ granularity: string; items: TimelineItem[] }> {
  const params = new URLSearchParams();
  params.set("granularity", options?.granularity ?? "month");
  params.set("limit", String(options?.limit ?? 6));
  withRange(params, options?.range);
  if (options?.balanceScope) params.set("balanceScope", options.balanceScope);
  if (options?.cardId) params.set("cardId", options.cardId);
  return apiRequest(`/api/analytics/timeline?${params}`, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchBalanceTrend(
  range?: AnalyticsRange,
  options?: { balanceScope?: BalanceScope; cardId?: string },
): Promise<{ items: BalanceTrendItem[] }> {
  const params = new URLSearchParams();
  withRange(params, range);
  if (options?.balanceScope) params.set("balanceScope", options.balanceScope);
  if (options?.cardId) params.set("cardId", options.cardId);
  const qs = params.toString();
  return apiRequest(
    qs ? `/api/analytics/balance-trend?${qs}` : "/api/analytics/balance-trend",
    { method: "GET", token: authToken() },
  );
}

export async function fetchCashflowForecast(
  months = 3,
): Promise<CashflowForecast> {
  return apiRequest(`/api/analytics/forecast?months=${months}`, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchInsights(
  range?: AnalyticsRange,
): Promise<AnalyticsInsights> {
  const params = new URLSearchParams();
  withRange(params, range);
  const qs = params.toString();
  return apiRequest(
    qs ? `/api/analytics/insights?${qs}` : "/api/analytics/insights",
    { method: "GET", token: authToken() },
  );
}
