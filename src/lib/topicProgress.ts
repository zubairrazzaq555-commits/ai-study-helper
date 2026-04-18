"use client";
// ─── Topic Progress Tracker ───────────────────────────────────
// Saves/loads per-topic progress to localStorage.
// Used by chapter list (progress rings) and topic pages (completion state).

import type { TopicProgress, ChapterProgress } from "./syllabusData";
import { syllabus } from "./syllabusLoader";

const KEY = "studyai_topic_progress";

// ── Read / Write ──────────────────────────────────────────────

function readAll(): Record<string, TopicProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, TopicProgress>) : {};
  } catch { return {}; }
}

function writeAll(data: Record<string, TopicProgress>): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ── Per-topic helpers ─────────────────────────────────────────

export function getTopicProgress(topicId: string): TopicProgress {
  const all = readAll();
  return all[topicId] ?? {
    topicId,
    summaryRead:            false,
    detailedRead:           false,
    quizScore:              null,
    quizAttempted:          false,
    roadmapProgress:        0,
    completed:              false,
    lastStudied:            null,
  };
}

export function markDetailedRead(topicId: string): void {
  const all = readAll();
  const tp  = getTopicProgress(topicId);
  all[topicId] = { ...tp, detailedRead: true, lastStudied: new Date().toISOString() };
  writeAll(all);
}

export function markSummaryRead(topicId: string): void {
  const all = readAll();
  const tp  = getTopicProgress(topicId);
  all[topicId] = {
    ...tp,
    summaryRead: true,
    lastStudied: new Date().toISOString(),
  };
  writeAll(all);
}

export function saveQuizScore(topicId: string, score: number, total: number): void {
  const all  = readAll();
  const tp   = getTopicProgress(topicId);
  const pct  = Math.round((score / total) * 100);
  all[topicId] = {
    ...tp,
    quizScore:     pct,
    quizAttempted: true,
    completed:     tp.summaryRead && pct >= 60,
    lastStudied:   new Date().toISOString(),
  };
  writeAll(all);
}

export function saveRoadmapProgress(topicId: string, stepsCompleted: number, total: number): void {
  const all = readAll();
  const tp  = getTopicProgress(topicId);
  const pct = total > 0 ? Math.round((stepsCompleted / total) * 100) : 0;
  all[topicId] = {
    ...tp,
    roadmapProgress: pct,
    lastStudied:     new Date().toISOString(),
  };
  writeAll(all);
}

export function markTopicComplete(topicId: string): void {
  const all = readAll();
  const tp  = getTopicProgress(topicId);
  all[topicId] = {
    ...tp,
    completed:   true,
    lastStudied: new Date().toISOString(),
  };
  writeAll(all);
}

// ── Chapter-level progress ────────────────────────────────────

export function getChapterProgress(chapterIndex: number): ChapterProgress {
  const chapter = syllabus.chapters.find((c) => c.chapterIndex === chapterIndex);
  if (!chapter) return { chapterIndex, completedTopics: 0, totalTopics: 0, percentComplete: 0 };

  const all            = readAll();
  const totalTopics    = chapter.topics.length;
  const completedTopics = chapter.topics.filter((t) => all[t.topicId]?.completed).length;
  const percentComplete = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return { chapterIndex, completedTopics, totalTopics, percentComplete };
}

// ── Overall progress ──────────────────────────────────────────

export function getOverallProgress(): { completed: number; total: number; pct: number } {
  const all   = readAll();
  const total = syllabus.totalTopics;
  const completed = syllabus.chapters
    .flatMap((c) => c.topics)
    .filter((t) => all[t.topicId]?.completed).length;
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

// ── Reset ─────────────────────────────────────────────────────

export function clearAllProgress(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
