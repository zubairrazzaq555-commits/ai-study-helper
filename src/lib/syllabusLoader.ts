// ─── Syllabus Loader ─────────────────────────────────────────
// Loads the raw JSON and normalizes it into the app's type system
// Generates deterministic topic IDs: PHY-G9-CH01-T01

import type { RawSyllabus, Syllabus, Chapter, Topic, TopicId } from "./syllabusData";
import rawData from "../../public/data/physics-grade9.json";

// ── ID generator ──────────────────────────────────────────────
export function makeTopicId(
  subjectCode: string,
  gradeCode: string,
  chapterIndex: number,
  topicIndex: number
): TopicId {
  const ch = String(chapterIndex).padStart(2, "0");
  const tp = String(topicIndex).padStart(2, "0");
  return `${subjectCode}-${gradeCode}-CH${ch}-T${tp}`;
}

// ── Parse topicId back into parts ────────────────────────────
export function parseTopicId(id: TopicId): {
  subjectCode: string;
  gradeCode: string;
  chapterIndex: number;
  topicIndex: number;
} | null {
  // Format: PHY-G9-CH01-T01
  const match = id.match(/^([A-Z]+)-([A-Z0-9]+)-CH(\d+)-T(\d+)$/);
  if (!match) return null;
  return {
    subjectCode:   match[1],
    gradeCode:     match[2],
    chapterIndex:  parseInt(match[3], 10),
    topicIndex:    parseInt(match[4], 10),
  };
}

// ── Main loader ───────────────────────────────────────────────
export function loadSyllabus(raw: RawSyllabus = rawData as RawSyllabus): Syllabus {
  let totalTopics = 0;

  const chapters: Chapter[] = raw.chapters.map((rawCh, ci) => {
    const chapterIndex = ci + 1;

    const topics: Topic[] = rawCh.topics.map((rawT, ti) => {
      const topicIndex = ti + 1;
      totalTopics++;
      return {
        topicId:      makeTopicId(raw.subjectCode, raw.gradeCode, chapterIndex, topicIndex),
        topicIndex,
        name:         { en: rawT.topic_en, cn: rawT.topic_cn },
        chapterIndex,
        chapterName:  { en: rawCh.chapter_name_en, cn: rawCh.chapter_name_cn },
        grade:        raw.grade,
        gradeCode:    raw.gradeCode,
        subject:      raw.subject,
        subjectCode:  raw.subjectCode,
        notes: {
          short:       rawT.short       || "",
          short_cn:    rawT.short_cn    || rawT.short    || "", // fallback to EN if CN missing
          detailed:    rawT.detailed    || "",
          detailed_cn: rawT.detailed_cn || rawT.detailed || "", // fallback to EN if CN missing
        },
      };
    });

    return {
      chapterIndex,
      name:        { en: rawCh.chapter_name_en, cn: rawCh.chapter_name_cn },
      topics,
      grade:       raw.grade,
      gradeCode:   raw.gradeCode,
      subject:     raw.subject,
      subjectCode: raw.subjectCode,
    };
  });

  return {
    subject:     raw.subject,
    subjectCode: raw.subjectCode,
    grade:       raw.grade,
    gradeCode:   raw.gradeCode,
    chapters,
    totalTopics,
  };
}

// ── Singleton (imported everywhere) ──────────────────────────
export const syllabus = loadSyllabus();

// ── Helper queries ────────────────────────────────────────────

/** Get a single topic by its topicId */
export function getTopicById(topicId: TopicId): Topic | null {
  for (const chapter of syllabus.chapters) {
    const found = chapter.topics.find((t) => t.topicId === topicId);
    if (found) return found;
  }
  return null;
}

/** Get a chapter by its 1-based index */
export function getChapterByIndex(index: number): Chapter | null {
  return syllabus.chapters.find((c) => c.chapterIndex === index) ?? null;
}

/** Get all topics as a flat array */
export function getAllTopics(): Topic[] {
  return syllabus.chapters.flatMap((c) => c.topics);
}

/** Get topics of a specific chapter */
export function getTopicsByChapter(chapterIndex: number): Topic[] {
  return getChapterByIndex(chapterIndex)?.topics ?? [];
}

/** Build URL slug from topicId (safe for Next.js routes) */
export function topicIdToSlug(topicId: TopicId): string {
  return topicId.toLowerCase();
}

/** Parse URL slug back to topicId */
export function slugToTopicId(slug: string): TopicId {
  return slug.toUpperCase();
}
