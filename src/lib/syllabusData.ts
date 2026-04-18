// ─── Syllabus Type Definitions ───────────────────────────────
// Central types for the Grade-based Study Mode

export interface RawTopic {
  topic_en: string;
  topic_cn: string;
  short?: string;       // English short note
  short_cn?: string;    // Chinese short note (pre-translated)
  detailed?: string;    // English detailed note
  detailed_cn?: string; // Chinese detailed note (pre-translated)
}

export interface RawChapter {
  chapter_name_en: string;
  chapter_name_cn: string;
  topics: RawTopic[];
}

export interface RawSyllabus {
  subject: string;
  subjectCode: string;
  grade: string;
  gradeCode: string;
  chapters: RawChapter[];
}

// ── Normalized (enriched) types used throughout the app ───────

export interface TopicName {
  en: string;
  cn: string;
}

/** Unique topic identifier: PHY-G9-CH01-T01 */
export type TopicId = string;

export interface Topic {
  topicId: TopicId;
  topicIndex: number;           // 1-based
  name: TopicName;
  chapterIndex: number;         // 1-based
  chapterName: TopicName;
  grade: string;                // "Grade 9"
  gradeCode: string;            // "G9"
  subject: string;              // "Physics"
  subjectCode: string;          // "PHY"
  notes: {
    short: string;              // English short note — instant, NO AI needed
    short_cn: string;           // Chinese short note — instant, NO AI needed
    detailed: string;           // English detailed note — instant, NO AI needed
    detailed_cn: string;        // Chinese detailed note — instant, NO AI needed
  };
}

export interface Chapter {
  chapterIndex: number;         // 1-based
  name: TopicName;
  topics: Topic[];
  grade: string;
  gradeCode: string;
  subject: string;
  subjectCode: string;
}

export interface Syllabus {
  subject: string;
  subjectCode: string;
  grade: string;
  gradeCode: string;
  chapters: Chapter[];
  totalTopics: number;
}

// ── Topic feature types (AI output per topic) ─────────────────

export type TopicFeature = "summary" | "quiz" | "roadmap";

export interface TopicSummaryResult {
  topicId: TopicId;
  title: string;
  keyPoints: string[];
  sections: Array<{ heading: string; content: string }>;
  concepts: string[];
  formula?: string;
  example?: string;
  generatedAt: string;
}

export interface TopicQuizResult {
  topicId: TopicId;
  title: string;
  total: number;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
  generatedAt: string;
}

export interface TopicRoadmapStep {
  step: number;
  title: string;
  action: string;
  duration: string;
  tip?: string;
}

export interface TopicRoadmapResult {
  topicId: TopicId;
  title: string;
  totalSteps: number;
  estimatedMinutes: number;
  steps: TopicRoadmapStep[];
  prerequisiteTopics: string[];
  generatedAt: string;
}

// ── Progress tracking ─────────────────────────────────────────

export type FeatureStatus = "not_started" | "in_progress" | "completed";

export interface TopicProgress {
  topicId: TopicId;
  summaryRead: boolean;
  detailedRead: boolean;
  quizScore: number | null;
  quizAttempted: boolean;
  roadmapProgress: number;
  completed: boolean;
  lastStudied: string | null;
}

export interface ChapterProgress {
  chapterIndex: number;
  completedTopics: number;
  totalTopics: number;
  percentComplete: number;
}
