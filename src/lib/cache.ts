// ─── Input Hash Cache ────────────────────────────────────────
// Stores AI results based on a hash of the input.
// Same input → instant return, no API call needed.
// TTL: 1 hour per entry. Max 200 entries (LRU eviction).

import { createHash } from "crypto";

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  hits: number;
}

const TTL_MS      = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

class LRUCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  /** SHA-256 hash of input string — used as cache key */
  static hashInput(text: string, type: string, subject: string, difficulty: string): string {
    return createHash("sha256")
      .update(`${type}:${subject}:${difficulty}:${text}`)
      .digest("hex")
      .slice(0, 32); // first 32 chars is plenty
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > TTL_MS) {
      this.store.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.store.delete(key);
    entry.hits++;
    this.store.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.store.size >= MAX_ENTRIES) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { data, createdAt: Date.now(), hits: 0 });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  stats() {
    return {
      size: this.store.size,
      maxSize: MAX_ENTRIES,
      ttlMinutes: TTL_MS / 60000,
    };
  }
}

// Global singleton cache instances (survive across requests in same process)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const aiCache = new LRUCache<any>();
export { LRUCache };
