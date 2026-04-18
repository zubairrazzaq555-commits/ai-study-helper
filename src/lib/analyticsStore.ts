// ─── Analytics Store ─────────────────────────────────────────
// Tracks quiz performance per topic.
// Powers "Strong topics" / "Needs improvement" report.

const KEY = "studyai_analytics";

export interface TopicAnalytics {
  topicId: string;
  topicName: string;
  chapterName: string;
  attempts: number;
  bestScore: number;       // 0–100
  lastScore: number;       // 0–100
  allScores: number[];
  avgScore: number;        // 0–100
  lastAttemptAt: string;
}

export interface AnalyticsStore {
  topics: Record<string, TopicAnalytics>;
  totalQuizzesTaken: number;
  totalTopicsAttempted: number;
}

// ── Read / Write ──────────────────────────────────────────────
function read(): AnalyticsStore {
  if (typeof window === "undefined") return { topics: {}, totalQuizzesTaken: 0, totalTopicsAttempted: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { topics: {}, totalQuizzesTaken: 0, totalTopicsAttempted: 0 };
  } catch { return { topics: {}, totalQuizzesTaken: 0, totalTopicsAttempted: 0 }; }
}

function write(data: AnalyticsStore): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

// ── Record a quiz attempt ─────────────────────────────────────
export function recordQuizAttempt(
  topicId: string,
  topicName: string,
  chapterName: string,
  score: number,    // raw score (e.g. 4)
  total: number     // total questions (e.g. 6)
): void {
  const store = read();
  const pct   = Math.round((score / total) * 100);
  const existing = store.topics[topicId];

  if (existing) {
    const newScores = [...existing.allScores, pct];
    store.topics[topicId] = {
      ...existing,
      attempts:      existing.attempts + 1,
      bestScore:     Math.max(existing.bestScore, pct),
      lastScore:     pct,
      allScores:     newScores,
      avgScore:      Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length),
      lastAttemptAt: new Date().toISOString(),
    };
  } else {
    store.topics[topicId] = {
      topicId, topicName, chapterName,
      attempts: 1, bestScore: pct, lastScore: pct,
      allScores: [pct], avgScore: pct,
      lastAttemptAt: new Date().toISOString(),
    };
    store.totalTopicsAttempted++;
  }

  store.totalQuizzesTaken++;
  write(store);
}

// ── Get all analytics ─────────────────────────────────────────
export function getAnalytics(): AnalyticsStore {
  return read();
}

// ── Get overall stats ─────────────────────────────────────────
export function getOverallStats() {
  const store  = read();
  const topics = Object.values(store.topics);
  if (topics.length === 0) {
    return { totalQuizzes: 0, topicsAttempted: 0, avgScore: 0, strongTopics: [], weakTopics: [] };
  }
  const avgScore    = Math.round(topics.reduce((s, t) => s + t.avgScore, 0) / topics.length);
  const strongTopics = topics.filter((t) => t.avgScore >= 80).sort((a, b) => b.avgScore - a.avgScore);
  const weakTopics   = topics.filter((t) => t.avgScore < 60).sort((a, b) => a.avgScore - b.avgScore);
  return {
    totalQuizzes:    store.totalQuizzesTaken,
    topicsAttempted: store.totalTopicsAttempted,
    avgScore,
    strongTopics,
    weakTopics,
  };
}

// ── Get analytics for a single topic ─────────────────────────
export function getTopicAnalytics(topicId: string): TopicAnalytics | null {
  return read().topics[topicId] ?? null;
}

// ── Clear all analytics ───────────────────────────────────────
export function clearAnalytics(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch {}
}
