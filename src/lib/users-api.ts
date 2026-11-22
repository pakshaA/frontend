import { apiRequest } from "./api-client";
import { getAccessToken } from "./auth";
import type { AuthUser, UserPreferences } from "./auth-api";

function authToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function fetchProfile(): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>("/api/users/me", {
    method: "GET",
    token: authToken(),
  });
  return data.user;
}

export async function updateProfile(email: string): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>("/api/users/me", {
    method: "PUT",
    token: authToken(),
    body: { email },
  });
  return data.user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<void>("/api/users/me/password", {
    method: "PUT",
    token: authToken(),
    body: { currentPassword, newPassword },
  });
}

export async function updatePreferences(
  preferences: Partial<UserPreferences>,
): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>(
    "/api/users/me/preferences",
    {
      method: "PUT",
      token: authToken(),
      body: preferences,
    },
  );
  return data.user;
}
