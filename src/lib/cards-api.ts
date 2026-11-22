import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";

export type Card = {
  id: string;
  userId: string;
  name: string;
  bank: string;
  comment?: string;
  isDefault?: boolean;
  balance: number;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchCards(includeDeleted = false): Promise<Card[]> {
  const params = new URLSearchParams();
  if (includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const data = await apiRequest<{ items: Card[] }>(
    qs ? `/api/cards?${qs}` : "/api/cards",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function createCard(input: {
  name: string;
  bank: string;
  comment?: string;
}): Promise<Card> {
  const data = await apiRequest<{ card: Card }>("/api/cards", {
    method: "POST",
    token: authToken(),
    body: input,
  });
  return data.card;
}

export async function updateCard(
  id: string,
  input: { name?: string; bank?: string; comment?: string | null },
): Promise<Card> {
  const data = await apiRequest<{ card: Card }>(`/api/cards/${id}`, {
    method: "PUT",
    token: authToken(),
    body: input,
  });
  return data.card;
}

export async function deleteCard(id: string): Promise<void> {
  await apiRequest<void>(`/api/cards/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}
