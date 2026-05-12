import type { AuthResponse } from "../api/authApi";

const AUTH_KEY = "leybedik-auth";

export interface StoredAuthPayload {
  token: string;
  email: string;
  displayName: string;
}

export function saveAuth(authResponse: AuthResponse): void {
  const payload: StoredAuthPayload = {
    token: authResponse.token,
    email: authResponse.email,
    displayName: authResponse.displayName,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
}

export function getToken(): string | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredAuthPayload;
    return typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): StoredAuthPayload | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredAuthPayload;
    if (
      typeof data.token === "string" &&
      typeof data.email === "string" &&
      typeof data.displayName === "string"
    ) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
