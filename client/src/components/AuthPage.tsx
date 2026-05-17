import { useState, type FormEvent } from "react";
import { login, register } from "../api/authApi";
import { saveAuth } from "../utils/authStorage";
import "./AuthPage.css";

interface Props {
  onSuccess: () => void;
}
export function AuthPage({ onSuccess }: Props) {
  const enableRegister = import.meta.env.VITE_ENABLE_REGISTER === "true";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
function validateRegisterPassword(password: string): string | null {
  if (password.length < 8) {
    return "הסיסמה חייבת להכיל לפחות 8 תווים";
  }

  if (!/[A-Z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות גדולה באנגלית";
  }

  if (!/[a-z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות קטנה באנגלית";
  }

  if (!/[0-9]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות ספרה";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות תו מיוחד";
  }

  return null;
}
  async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);

  if (mode === "register" && !enableRegister) {
  setError("הרשמה אינה זמינה כרגע.");
  return;
}

  if (mode === "register") {
    const passwordError = validateRegisterPassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }
  }

  setLoading(true);

  try {
    if (mode === "register") {
      const auth = await register({ email, displayName, password });
      saveAuth(auth);
    } else {
      const auth = await login({ email, password });
      saveAuth(auth);
    }

    onSuccess();
  } catch (err) {
    setError(err instanceof Error ? err.message : "אירעה שגיאה");
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">לייבעדיק Studio</p>
        <h1>{mode === "login" ? "כניסה" : "הרשמה"}</h1>
        <p className="auth-lead">
          {mode === "login"
            ? "הזיני אימייל וסיסמה כדי לגשת למסמכים שלך בשרת."
            : "צרי חשבון כדי לשמור מסמכים בענן."}
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`auth-tab ${mode === "login" ? "auth-tab-active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            כניסה
          </button>
          {enableRegister ? (
  <button
    type="button"
    role="tab"
    className={`auth-tab ${mode === "register" ? "auth-tab-active" : ""}`}
    onClick={() => {
      setMode("register");
      setError(null);
    }}
  >
    הרשמה
  </button>
) : null}
        </div>

        <form onSubmit={handleSubmit}>
          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="auth-email">אימייל</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              disabled={loading}
            />
          </div>

          {mode === "register" ? (
            <div className="auth-field">
              <label htmlFor="auth-display">שם תצוגה</label>
              <input
                id="auth-display"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(ev) => setDisplayName(ev.target.value)}
                required
                disabled={loading}
              />
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="auth-password">סיסמה</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              disabled={loading}
              minLength={mode === "register" ? 8 : undefined}   
         />
           <p className="auth-field-hint">
  הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, ספרה ותו מיוחד.
</p> 
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "ממתין לשרת…" : mode === "login" ? "כניסה" : "הרשמה"}
          </button>
        </form>
      </section>
    </main>
  );
}
