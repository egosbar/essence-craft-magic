import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "egos-distilling-auth-v1";
const SESSION_KEY = "egos-distilling-session-v1";

async function hashPassword(pw: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${pw}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type StoredAuth = { salt: string; hash: string };

export function LoginGate({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(null);
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw));
      if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  if (authed) return <>{children}</>;

  const isFirstTime = !stored;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isFirstTime) {
        if (pw.length < 4) {
          setError("Password must be at least 4 characters.");
          return;
        }
        if (pw !== pw2) {
          setError("Passwords do not match.");
          return;
        }
        const salt = makeSalt();
        const hash = await hashPassword(pw, salt);
        const rec: StoredAuth = { salt, hash };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
        sessionStorage.setItem(SESSION_KEY, "1");
        setStored(rec);
        setAuthed(true);
      } else {
        const hash = await hashPassword(pw, stored!.salt);
        if (hash !== stored!.hash) {
          setError("Incorrect password.");
          return;
        }
        sessionStorage.setItem(SESSION_KEY, "1");
        setAuthed(true);
      }
    } finally {
      setBusy(false);
      setPw("");
      setPw2("");
    }
  }

  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "#0b0d10", color: "#e6e6e6" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #14171c 0%, #0f1216 100%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="grid h-11 w-11 place-items-center rounded-full text-lg"
            style={{
              background: "linear-gradient(135deg,#b87333,#e8a86b)",
              color: "#1a1207",
            }}
            aria-hidden
          >
            ⚗︎
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Ego's Distilling
            </h1>
            <p
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{ color: "rgba(230,230,230,0.55)" }}
            >
              Spirit Tracker
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-1">
          {isFirstTime ? "Set your password" : "Enter your password"}
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "rgba(230,230,230,0.6)" }}
        >
          {isFirstTime
            ? "Protect this device. Your key stays local — data never leaves your browser."
            : "Unlock to access your batches, recipes, calculators and inventory."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "rgba(230,230,230,0.6)" }}>
              Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              autoComplete={isFirstTime ? "new-password" : "current-password"}
              className="w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2"
              style={{
                background: "#0a0c0f",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e6e6e6",
              }}
              required
            />
          </div>
          {isFirstTime && (
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "rgba(230,230,230,0.6)" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2"
                style={{
                  background: "#0a0c0f",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e6e6e6",
                }}
                required
              />
            </div>
          )}

          {error && (
            <div
              className="text-sm rounded-lg px-3 py-2"
              style={{
                background: "rgba(220,60,60,0.12)",
                border: "1px solid rgba(220,60,60,0.3)",
                color: "#ff9b9b",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-2.5 font-semibold transition disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg,#b87333,#e8a86b)",
              color: "#1a1207",
            }}
          >
            {busy ? "Working…" : isFirstTime ? "Set password & enter" : "Unlock"}
          </button>
        </form>

        {!isFirstTime && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Reset password? This clears the local access key on this device. Your batches and data are NOT deleted."
                )
              ) {
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.removeItem(SESSION_KEY);
                setStored(null);
                setError(null);
              }
            }}
            className="mt-4 text-xs underline"
            style={{ color: "rgba(230,230,230,0.5)" }}
          >
            Forgot password? Reset local key
          </button>
        )}

        <p
          className="mt-6 text-[11px] leading-relaxed"
          style={{ color: "rgba(230,230,230,0.4)" }}
        >
          Data stays on your device. This gate secures access on this browser only.
        </p>
      </div>
    </div>
  );
}
