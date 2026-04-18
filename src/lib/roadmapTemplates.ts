// ─── Pre-built Roadmap Templates ─────────────────────────────
// These templates are static — NO AI call needed for standard plans.
// AI is only used for "Customize with AI" option.
// Covers 3-month, 6-month, and 9-month plans.

import { syllabus, getAllTopics } from "./syllabusLoader";
import type { ClassRoadmap, RoadmapDay } from "./roadmapStore";
import { makeSubjectId } from "./roadmapStore";

export type TemplateDuration = "3months" | "6months" | "9months";

// Topics per day for each template
const TOPICS_PER_DAY: Record<TemplateDuration, number> = {
  "3months": 2,   // ~60 days, ~40 topics → ~0.67 topics/day → round to 1-2
  "6months": 1,   // ~120 days, ~40 topics → 1 every 3 days
  "9months": 1,   // ~180 days, ~40 topics → 1 every 4-5 days (with review days)
};

// Total days per template
export const TEMPLATE_DAYS: Record<TemplateDuration, number> = {
  "3months": 60,
  "6months": 120,
  "9months": 180,
};

export const TEMPLATE_LABELS: Record<TemplateDuration, { en: string; cn: string }> = {
  "3months": { en: "3 Months Plan",  cn: "3个月计划" },
  "6months": { en: "6 Months Plan",  cn: "6个月计划" },
  "9months": { en: "9 Months Plan",  cn: "9个月计划" },
};

// Minutes per topic based on duration (shorter plan = more intense)
const MINUTES_PER_TOPIC: Record<TemplateDuration, number> = {
  "3months": 35,
  "6months": 30,
  "9months": 25,
};

/**
 * Build a complete roadmap from a pre-built template.
 * No AI call needed — purely mathematical distribution.
 */
export function buildTemplateRoadmap(duration: TemplateDuration): ClassRoadmap {
  const allTopics = getAllTopics();
  const totalTopics = allTopics.length; // 40
  const totalDays = TEMPLATE_DAYS[duration];
  const minutesPerTopic = MINUTES_PER_TOPIC[duration];
  const label = TEMPLATE_LABELS[duration].en;

  // Calculate how to spread topics across days
  // For 3-month (60 days, 40 topics): 2 topics on some days, 1 on others
  // For 6-month (120 days, 40 topics): 1 topic every 3 days
  // For 9-month (180 days, 40 topics): 1 topic every 4.5 days (with review gaps)

  const days: RoadmapDay[] = [];
  let topicIndex = 0;
  let dayIndex   = 1;

  // Calculate the stride (days between topic assignments)
  const stride = totalDays / totalTopics; // e.g. 3 for 6-month, 1.5 for 3-month

  for (let t = 0; t < totalTopics && dayIndex <= totalDays; t++) {
    const topic   = allTopics[t];
    const dayNum  = Math.min(Math.round(1 + t * stride), totalDays);

    days.push({
      day:              dayNum,
      chapterIndex:     topic.chapterIndex,
      chapterName:      topic.chapterName.en,
      topicId:          topic.topicId,
      topicName:        topic.name.en,
      estimatedMinutes: minutesPerTopic,
      quizAfterTopic:   true,
      completed:        false,
      completedAt:      null,
    });
  }

  // Re-number days sequentially (some may have collided due to rounding)
  let currentDay = 1;
  const finalDays: RoadmapDay[] = days.map((d, i) => {
    if (i > 0) {
      const prev = days[i - 1];
      const gap  = Math.max(1, Math.round(stride));
      currentDay = days[i - 1].day + gap;
    }
    return { ...d, day: i === 0 ? 1 : currentDay };
  });

  const startDate  = new Date();
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + totalDays);

  return {
    id:            makeSubjectId(syllabus.subjectCode, syllabus.gradeCode),
    subject:       syllabus.subject,
    grade:         syllabus.grade,
    totalDays,
    durationLabel: label,
    startDate:     startDate.toISOString(),
    targetDate:    targetDate.toISOString(),
    currentDay:    1,
    days:          finalDays,
    createdAt:     new Date().toISOString(),
  };
}

/**
 * Find the nearest template for a custom duration in days.
 * e.g. 75 days → 3-month template (60 days, closest)
 */
export function findNearestTemplate(customDays: number): TemplateDuration {
  const distances: Array<{ key: TemplateDuration; distance: number }> = [
    { key: "3months", distance: Math.abs(customDays - TEMPLATE_DAYS["3months"]) },
    { key: "6months", distance: Math.abs(customDays - TEMPLATE_DAYS["6months"]) },
    { key: "9months", distance: Math.abs(customDays - TEMPLATE_DAYS["9months"]) },
  ];
  distances.sort((a, b) => a.distance - b.distance);
  return distances[0].key;
}

/**
 * Scale a template roadmap to a custom number of days.
 * Proportionally adjusts day numbers, keeps all topics.
 */
export function scaleRoadmapToDays(baseDuration: TemplateDuration, customDays: number): ClassRoadmap {
  const base   = buildTemplateRoadmap(baseDuration);
  const ratio  = customDays / base.totalDays;

  const scaledDays: RoadmapDay[] = base.days.map((d) => ({
    ...d,
    day: Math.max(1, Math.min(customDays, Math.round(d.day * ratio))),
  }));

  const startDate  = new Date();
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + customDays);

  return {
    ...base,
    totalDays:     customDays,
    durationLabel: `${customDays} days`,
    targetDate:    targetDate.toISOString(),
    days:          scaledDays,
  };
}
