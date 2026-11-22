import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";

export type SubscriptionFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type Subscription = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: "RUB";
  startDate: string;
  nextPaymentDate: string;
  frequency: SubscriptionFrequency;
  categoryId: string;
  cardId?: string | null;
  status: SubscriptionStatus;
  autoCreateTransaction: boolean;
  notifyBeforeDays: number;
  lastPaidAt?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduledPaymentStatus = "pending" | "paid" | "cancelled";
export type ScheduledPaymentPriority = "required" | "optional";

export type ScheduledPayment = {
  id: string;
  userId: string;
  amount: number;
  dueDate: string;
  description: string;
  priority: ScheduledPaymentPriority;
  status: ScheduledPaymentStatus;
  categoryId: string | null;
  cardId?: string | null;
  relatedTransactionId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AvailableBalance = {
  balance: number;
  reservedRequired: number;
  reservedOptional: number;
  availableBalance: number;
  pendingCount: number;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchSubscriptions(status?: SubscriptionStatus) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const data = await apiRequest<{ items: Subscription[] }>(
    qs ? `/api/subscriptions?${qs}` : "/api/subscriptions",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function createSubscription(input: {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  categoryId: string;
  startDate?: string;
  nextPaymentDate?: string;
  autoCreateTransaction?: boolean;
  notifyBeforeDays?: number;
  comment?: string;
  cardId?: string | null;
}): Promise<Subscription> {
  const data = await apiRequest<{ subscription: Subscription }>(
    "/api/subscriptions",
    { method: "POST", token: authToken(), body: input },
  );
  return data.subscription;
}

export async function updateSubscription(
  id: string,
  input: {
    name?: string;
    amount?: number;
    nextPaymentDate?: string;
    frequency?: SubscriptionFrequency;
    categoryId?: string;
    status?: SubscriptionStatus;
    autoCreateTransaction?: boolean;
    notifyBeforeDays?: number;
    comment?: string | null;
  },
): Promise<Subscription> {
  const data = await apiRequest<{ subscription: Subscription }>(
    `/api/subscriptions/${id}`,
    { method: "PUT", token: authToken(), body: input },
  );
  return data.subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiRequest<void>(`/api/subscriptions/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}

export async function paySubscriptionManual(
  id: string,
): Promise<{ subscription: Subscription; transactionId?: string }> {
  return apiRequest(`/api/subscriptions/${id}/pay`, {
    method: "POST",
    token: authToken(),
  });
}

export async function fetchScheduledPayments(
  status?: ScheduledPaymentStatus,
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const data = await apiRequest<{ items: ScheduledPayment[] }>(
    qs ? `/api/scheduled-payments?${qs}` : "/api/scheduled-payments",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function createScheduledPayment(input: {
  amount: number;
  dueDate: string;
  description: string;
  priority?: ScheduledPaymentPriority;
  categoryId?: string | null;
  cardId?: string | null;
}): Promise<ScheduledPayment> {
  const data = await apiRequest<{ payment: ScheduledPayment }>(
    "/api/scheduled-payments",
    { method: "POST", token: authToken(), body: input },
  );
  return data.payment;
}

export async function updateScheduledPayment(
  id: string,
  input: {
    amount?: number;
    dueDate?: string;
    description?: string;
    priority?: ScheduledPaymentPriority;
    status?: ScheduledPaymentStatus;
    categoryId?: string | null;
  },
): Promise<ScheduledPayment> {
  const data = await apiRequest<{ payment: ScheduledPayment }>(
    `/api/scheduled-payments/${id}`,
    { method: "PUT", token: authToken(), body: input },
  );
  return data.payment;
}

export async function deleteScheduledPayment(id: string): Promise<void> {
  await apiRequest<void>(`/api/scheduled-payments/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}

export async function payScheduledPayment(
  id: string,
): Promise<{ payment: ScheduledPayment; transactionId: string }> {
  return apiRequest(`/api/scheduled-payments/${id}/pay`, {
    method: "PUT",
    token: authToken(),
  });
}

export async function fetchAvailableBalance(): Promise<AvailableBalance> {
  return apiRequest("/api/scheduled-payments/available-balance", {
    method: "GET",
    token: authToken(),
  });
}
