import { publicRequest, readApiError } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const res = await publicRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (res.status === 409) {
    throw new Error(await readApiError(res));
  }

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as AuthResponse;
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const res = await publicRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as AuthResponse;
}
