import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";

export type GoalStatus = "active" | "completed" | "archived";
export type GoalPriority = "high" | "medium" | "low";
export type GoalSourceType = "virtual" | "deposit";

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  priority: GoalPriority;
  color: string;
  description?: string;
  sourceType: GoalSourceType;
  linkedDepositId: string | null;
  status: GoalStatus;
  progressPercent: number;
  forecastMonths?: number | null;
};

export type GoalHistoryItem = {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  date: string;
  comment?: string;
};

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchGoals(status?: GoalStatus): Promise<Goal[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const data = await apiRequest<{ items: Goal[] }>(
    qs ? `/api/goals?${qs}` : "/api/goals",
    { method: "GET", token: authToken() },
  );
  return data.items;
}

export async function createGoal(input: {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
  priority?: GoalPriority;
  color?: string;
  description?: string;
  linkedDepositId?: string | null;
}): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>("/api/goals", {
    method: "POST",
    token: authToken(),
    body: input,
  });
  return data.goal;
}

export async function updateGoal(
  id: string,
  input: Partial<{
    name: string;
    targetAmount: number;
    deadline: string | null;
    priority: GoalPriority;
    color: string;
    description: string | null;
    status: GoalStatus;
  }>,
): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>(`/api/goals/${id}`, {
    method: "PUT",
    token: authToken(),
    body: input,
  });
  return data.goal;
}

export async function archiveGoal(id: string): Promise<void> {
  await apiRequest<void>(`/api/goals/${id}`, {
    method: "DELETE",
    token: authToken(),
  });
}

export async function contributeGoal(
  id: string,
  amount: number,
  comment?: string,
): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>(`/api/goals/${id}/contribute`, {
    method: "POST",
    token: authToken(),
    body: { amount, comment },
  });
  return data.goal;
}

export async function withdrawGoal(
  id: string,
  amount: number,
  comment?: string,
): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>(`/api/goals/${id}/withdraw`, {
    method: "POST",
    token: authToken(),
    body: { amount, comment },
  });
  return data.goal;
}

export async function linkGoalDeposit(
  id: string,
  depositId: string,
): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>(
    `/api/goals/${id}/link-deposit`,
    {
      method: "POST",
      token: authToken(),
      body: { depositId },
    },
  );
  return data.goal;
}

export async function unlinkGoalDeposit(id: string): Promise<Goal> {
  const data = await apiRequest<{ goal: Goal }>(
    `/api/goals/${id}/unlink-deposit`,
    {
      method: "DELETE",
      token: authToken(),
    },
  );
  return data.goal;
}

export async function fetchGoalDetails(id: string): Promise<{
  goal: Goal;
  history: GoalHistoryItem[];
}> {
  return apiRequest(`/api/goals/${id}`, {
    method: "GET",
    token: authToken(),
  });
}
