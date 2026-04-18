// ─── Class-Level Roadmap Store ───────────────────────────────
// Saves the full generated subject roadmap to localStorage.
// One roadmap per subject (e.g. PHY-G9).
// Tracks which day the user is on and which topics are done.

const KEY = "studyai_class_roadmap";

export interface RoadmapDay {
  day: number;
  chapterIndex: number;
  chapterName: string;
  topicId: string;
  topicName: string;
  estimatedMinutes: number;
  quizAfterTopic: boolean;   // always true — quiz is mandatory after each topic
  completed: boolean;
  completedAt: string | null;
}

export interface ClassRoadmap {
  id: string;              // e.g. "PHY-G9"
  subject: string;
  grade: string;
  totalDays: number;
  durationLabel: string;  // "30 days" or "2 months"
  startDate: string;      // ISO
  targetDate: string;     // ISO
  currentDay: number;     // which day user is on (1-based)
  days: RoadmapDay[];
  createdAt: string;
}

// ── Read / Write ──────────────────────────────────────────────
function readAll(): Record<string, ClassRoadmap> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeAll(data: Record<string, ClassRoadmap>): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

// ── Save a new roadmap ────────────────────────────────────────
export function saveRoadmap(roadmap: ClassRoadmap): void {
  const all = readAll();
  all[roadmap.id] = roadmap;
  writeAll(all);
}

// ── Get roadmap by subjectId ──────────────────────────────────
export function getRoadmap(subjectId: string): ClassRoadmap | null {
  const all = readAll();
  return all[subjectId] ?? null;
}

// ── Check if roadmap exists ───────────────────────────────────
export function hasRoadmap(subjectId: string): boolean {
  return !!getRoadmap(subjectId);
}

// ── Mark a day complete ───────────────────────────────────────
export function markDayComplete(subjectId: string, day: number): void {
  const all = readAll();
  const rm  = all[subjectId];
  if (!rm) return;
  const d = rm.days.find((d) => d.day === day);
  if (d) {
    d.completed = true;
    d.completedAt = new Date().toISOString();
  }
  // Advance currentDay to next incomplete day
  const nextIncomplete = rm.days.find((d) => !d.completed);
  rm.currentDay = nextIncomplete?.day ?? rm.totalDays;
  all[subjectId] = rm;
  writeAll(all);
}

// ── Get today's task ──────────────────────────────────────────
export function getTodayTask(subjectId: string): RoadmapDay | null {
  const rm = getRoadmap(subjectId);
  if (!rm) return null;
  return rm.days.find((d) => d.day === rm.currentDay) ?? null;
}

// ── Get roadmap stats ─────────────────────────────────────────
export function getRoadmapStats(subjectId: string) {
  const rm = getRoadmap(subjectId);
  if (!rm) return null;
  const completed = rm.days.filter((d) => d.completed).length;
  const total     = rm.totalDays;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const daysLeft  = total - completed;
  return { completed, total, pct, daysLeft, currentDay: rm.currentDay };
}

// ── Delete roadmap ────────────────────────────────────────────
export function deleteRoadmap(subjectId: string): void {
  const all = readAll();
  delete all[subjectId];
  writeAll(all);
}

// ── Build subjectId from syllabus ─────────────────────────────
export function makeSubjectId(subjectCode: string, gradeCode: string): string {
  return `${subjectCode}-${gradeCode}`;
}
