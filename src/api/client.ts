import { API_BASE_URL } from "../config/apiConfig";
import { clearAuth, getToken } from "../utils/authStorage";

export const UNAUTHORIZED_EVENT = "leybedik-unauthorized";

function joinUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text.trim()) return `שגיאת שרת (${res.status})`;
    try {
      const j = JSON.parse(text) as Record<string, unknown>;
      if (typeof j.message === "string") return j.message;
      if (typeof j.title === "string") return j.title;
      if (typeof j.detail === "string") return j.detail;
      return text;
    } catch {
      return text;
    }
  } catch {
    return `שגיאת שרת (${res.status})`;
  }
}

/** קריאות ציבוריות (Login / Register) — ללא Bearer וללא ניקוי סשן על 401 */
export async function publicRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(joinUrl(path), { ...init, headers });
  } catch {
    throw new Error(
      "לא ניתן להתחבר לשרת. ודאי שהשרת רץ בכתובת https://localhost:7299 ושאישור האבטחה מהימן בדפדפן."
    );
  }
}

/** קריאות מוגנות — Bearer מה-localStorage; ב־401 מנקים סשן ומפיצים אירוע */
export async function apiRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(joinUrl(path), { ...init, headers });
  } catch {
    throw new Error(
      "לא ניתן להתחבר לשרת. ודאי שהשרת רץ בכתובת https://localhost:7299 ושאישור האבטחה מהימן בדפדפן."
    );
  }

  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  return res;
}
