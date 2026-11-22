import { apiRequest } from "./api-client";
import { clearAccessToken, setAccessToken } from "./auth";

export type UserPreferences = {
  theme: "light" | "dark" | "system";
  accentColor: string;
  density: "compact" | "normal" | "comfortable";
  dashboardLayout: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  preferences: UserPreferences;
  createdAt?: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export async function register(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>("/api/auth/me", {
    method: "GET",
    token,
  });
  return data.user;
}

export async function logout(token: string | null): Promise<void> {
  try {
    if (token) {
      await apiRequest<void>("/api/auth/logout", {
        method: "POST",
        token,
      });
    }
  } finally {
    clearAccessToken();
  }
}

export function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "body" in error &&
    error.body &&
    typeof error.body === "object" &&
    "error" in error.body &&
    typeof (error.body as { error: unknown }).error === "string"
  ) {
    return (error.body as { error: string }).error;
  }
  if (error instanceof Error) return error.message;
  return "Что-то пошло не так";
}
