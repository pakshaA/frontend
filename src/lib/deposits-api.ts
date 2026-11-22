import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";

export type PayoutType = "monthly" | "daily" | "end_of_term";

export type Deposit = {
  id: string;
  userId: string;
  name: string;
  bank: string;
  initialAmount: number;
  currentAmount: number;
  interestRate: number;
  openDate: string;
  endDate?: string;
  currency: "RUB";
  payoutType: PayoutType;
  payoutDay?: number;
  capitalization: boolean;
  status: "active" | "closed";
  linkedGoalId?: string | null;
  linkedGoal?: { id: string; name: string } | null;
  comment?: string;
  lastInterestAt?: string;
  closedAt?: string;
};

export type InterestPayment = {
  id: string;
  depositId: string;
  amount: number;
  date: string;
  type: string;
  transactionId?: string;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchDeposits(status?: "active" | "closed") {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const data = await apiRequest<{ items: Deposit[] }>(
    qs ? `/api/deposits?${qs}` : "/api/deposits",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function createDeposit(input: {
  name: string;
  bank: string;
  initialAmount: number;
  interestRate: number;
  openDate?: string;
  endDate?: string;
  payoutType: PayoutType;
  payoutDay?: number;
  capitalization?: boolean;
  comment?: string;
}): Promise<Deposit> {
  const data = await apiRequest<{ deposit: Deposit }>("/api/deposits", {
    method: "POST",
    token: authToken(),
    body: input,
  });
  return data.deposit;
}

export async function topupDeposit(
  id: string,
  amount: number,
  comment?: string,
): Promise<Deposit> {
  const data = await apiRequest<{ deposit: Deposit }>(
    `/api/deposits/${id}/topup`,
    {
      method: "POST",
      token: authToken(),
      body: { amount, comment },
    },
  );
  return data.deposit;
}

export async function withdrawDeposit(
  id: string,
  amount: number,
  comment?: string,
): Promise<Deposit> {
  const data = await apiRequest<{ deposit: Deposit }>(
    `/api/deposits/${id}/withdraw`,
    {
      method: "POST",
      token: authToken(),
      body: { amount, comment },
    },
  );
  return data.deposit;
}

export async function closeDeposit(
  id: string,
): Promise<{ deposit: Deposit; payout: number }> {
  return apiRequest(`/api/deposits/${id}/close`, {
    method: "POST",
    token: authToken(),
  });
}

export async function fetchInterestHistory(
  id: string,
): Promise<InterestPayment[]> {
  const data = await apiRequest<{ items: InterestPayment[] }>(
    `/api/deposits/${id}/interest-history`,
    { method: "GET", token: authToken() },
  );
  return data.items;
}
