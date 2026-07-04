import type { StoredSession } from "./types";

/**
 * Local-first session store (v1 has no accounts). Kept small and swappable —
 * when Supabase lands, these four functions become API calls.
 */
const KEY = "interviewme.sessions.v1";
const MAX_SESSIONS = 40;

export function listSessions(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): StoredSession | null {
  return listSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  const rest = listSessions().filter((s) => s.id !== session.id);
  const all = [session, ...rest].slice(0, MAX_SESSIONS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage full — drop oldest transcripts and retry once.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 10)));
    } catch {
      /* give up quietly; the interview itself must not break */
    }
  }
}

export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  const rest = listSessions().filter((s) => s.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(rest));
}
