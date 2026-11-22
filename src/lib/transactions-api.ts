import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";
import type { CategoryType } from "./categories-api";

export type Transaction = {
  id: string;
  userId: string;
  type: CategoryType;
  amount: number;
  date: string;
  categoryId: string;
  category: { id: string; name: string; type: string };
  comment?: string;
  tags: string[];
  source: string;
  cardId?: string | null;
  isDeleted: boolean;
};

export type TransactionsSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchTransactions(options?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  balanceScope?: "all" | "cards" | "deposits";
  cardId?: string;
}): Promise<{
  items: Transaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("limit", String(options?.limit ?? 20));
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.balanceScope) params.set("balanceScope", options.balanceScope);
  if (options?.cardId) params.set("cardId", options.cardId);

  return apiRequest(`/api/transactions?${params}`, {
    method: "GET",
    token: authToken(),
  });
}

export async function fetchTransactionsSummary(): Promise<TransactionsSummary> {
  return apiRequest("/api/transactions/summary", {
    method: "GET",
    token: authToken(),
  });
}

export async function createTransaction(input: {
  type: CategoryType;
  amount: number;
  categoryId: string;
  date?: string;
  comment?: string;
  cardId?: string | null;
}): Promise<Transaction> {
  const data = await apiRequest<{ transaction: Transaction }>(
    "/api/transactions",
    {
      method: "POST",
      token: authToken(),
      body: input,
    },
  );
  return data.transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiRequest<void>(`/api/transactions/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}
