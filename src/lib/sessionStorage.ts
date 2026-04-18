// Client-side session storage utility
// Saves generated sessions to localStorage so Dashboard can show history

export interface SavedSession {
  id: string;
  title: string;
  subject: string;
  type: "summary" | "quiz" | "plan";
  difficulty: string;
  createdAt: string;
  wordCount: number;
}

const STORAGE_KEY = "studyai_sessions";
const MAX_SESSIONS = 20; // keep last 20

export function saveSesionToStorage(session: Omit<SavedSession, "id">): SavedSession {
  const newSession: SavedSession = {
    ...session,
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  try {
    const existing = getSessionsFromStorage();
    const updated = [newSession, ...existing].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (SSR or private mode)
  }

  return newSession;
}

export function getSessionsFromStorage(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSession[];
  } catch {
    return [];
  }
}

export function deleteSessionFromStorage(id: string): void {
  try {
    const existing = getSessionsFromStorage();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
