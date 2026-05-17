import { API_BASE_URL } from "../config/apiConfig";
import { clearAuth, getToken } from "../utils/authStorage";

export const UNAUTHORIZED_EVENT = "leybedik-unauthorized";

function joinUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function readApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data === "string") {
      return data;
    }

    if (data?.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors)
        .flat()
        .filter((message): message is string => typeof message === "string");

      if (messages.length > 0) {
        return messages.join("\n");
      }
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (typeof data?.title === "string") {
      return data.title;
    }
  } catch {
    // Ignore JSON parsing errors and fallback below.
  }

  return `שגיאת שרת (${response.status})`;
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
"לא ניתן להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב."    );
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
      "לא ניתן להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב."
    );
  }

  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  return res;
}
