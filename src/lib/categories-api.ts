import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";

export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

export async function fetchCategories(options?: {
  type?: CategoryType;
  includeDeleted?: boolean;
}): Promise<Category[]> {
  const params = new URLSearchParams();
  if (options?.type) params.set("type", options.type);
  if (options?.includeDeleted) params.set("includeDeleted", "true");

  const qs = params.toString();
  const path = qs ? `/api/categories?${qs}` : "/api/categories";

  const data = await apiRequest<{ items: Category[] }>(path, {
    method: "GET",
    token: authToken(),
  });
  return data.items;
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  parentId?: string | null;
}): Promise<Category> {
  const data = await apiRequest<{ category: Category }>("/api/categories", {
    method: "POST",
    token: authToken(),
    body: input,
  });
  return data.category;
}

export async function updateCategory(
  id: string,
  input: { name?: string; parentId?: string | null },
): Promise<Category> {
  const data = await apiRequest<{ category: Category }>(
    `/api/categories/${id}`,
    {
      method: "PUT",
      token: authToken(),
      body: input,
    },
  );
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest<void>(`/api/categories/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}
