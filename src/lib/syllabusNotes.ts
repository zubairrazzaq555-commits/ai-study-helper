// ─── Syllabus Notes Helper ────────────────────────────────────
// Load short/detailed notes DIRECTLY from JSON — instant, zero API calls.
// Supports English and Chinese — pre-translated, no real-time translation.

import { getTopicById, getAllTopics } from "./syllabusLoader";
import type { TopicId } from "./syllabusData";

export interface TopicNotes {
  topicId: TopicId;
  topicName: string;
  chapterName: string;
  short: string;
  detailed: string;
}

/** Instantly returns notes for a topic in the requested language — no async, no API call */
export function getTopicNotes(topicId: TopicId, lang: "en" | "zh" = "en"): TopicNotes | null {
  const topic = getTopicById(topicId);
  if (!topic) return null;
  return {
    topicId:     topic.topicId,
    topicName:   lang === "zh" ? topic.name.cn   : topic.name.en,
    chapterName: lang === "zh" ? topic.chapterName.cn : topic.chapterName.en,
    short:       lang === "zh" ? topic.notes.short_cn    : topic.notes.short,
    detailed:    lang === "zh" ? topic.notes.detailed_cn : topic.notes.detailed,
  };
}

/** Build AI context string from topic notes — injected into quiz + chatbot prompts */
export function buildAIContext(topicId: TopicId, lang: "en" | "zh" = "en"): string {
  const notes = getTopicNotes(topicId, lang);
  if (!notes) return "";
  return `TOPIC: ${notes.topicName}
CHAPTER: ${notes.chapterName}

SHORT NOTE:
${notes.short}

DETAILED NOTE:
${notes.detailed}`;
}

/** Get all topics with their notes as a flat list */
export function getAllTopicsWithNotes(lang: "en" | "zh" = "en"): TopicNotes[] {
  return getAllTopics().map((t) => ({
    topicId:     t.topicId,
    topicName:   lang === "zh" ? t.name.cn   : t.name.en,
    chapterName: lang === "zh" ? t.chapterName.cn : t.chapterName.en,
    short:       lang === "zh" ? t.notes.short_cn    : t.notes.short,
    detailed:    lang === "zh" ? t.notes.detailed_cn : t.notes.detailed,
  }));
}
