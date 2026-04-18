"use client";
// ─── Auth Store ───────────────────────────────────────────────
// Lightweight guest-vs-signedin state stored in localStorage.
// No backend required — just tracks if user has given an email.
// Replace with NextAuth/Firebase when real auth is needed.

const KEY = "studyai_auth";

export interface AuthUser {
  email: string;
  name: string;
  createdAt: string;
  isGuest: boolean;
}

// ── Read / Write ──────────────────────────────────────────────
export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

export function isSignedIn(): boolean {
  const u = getAuthUser();
  return !!u && !u.isGuest;
}

export function isGuest(): boolean {
  return !isSignedIn();
}

// ── Sign up (saves email + name locally) ─────────────────────
export function signUp(email: string, name: string): AuthUser {
  const user: AuthUser = {
    email: email.trim().toLowerCase(),
    name:  name.trim() || email.split("@")[0],
    createdAt: new Date().toISOString(),
    isGuest: false,
  };
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(user)); } catch {}
  }
  return user;
}

// ── Sign out ──────────────────────────────────────────────────
export function signOut(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch {}
}

// ── Validate email ────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
