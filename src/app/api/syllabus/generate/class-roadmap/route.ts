import { NextRequest, NextResponse } from "next/server";
import { aiCall, safeParseJSON } from "@/lib/aiEngine";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { syllabus, getAllTopics } from "@/lib/syllabusLoader";
import { aiCache, LRUCache } from "@/lib/cache";
import {
  buildTemplateRoadmap,
  scaleRoadmapToDays,
  findNearestTemplate,
  TEMPLATE_DAYS,
  type TemplateDuration,
} from "@/lib/roadmapTemplates";
import type { ClassRoadmap, RoadmapDay } from "@/lib/roadmapStore";

// ── Standard template durations that skip AI ─────────────────
const TEMPLATE_THRESHOLDS: Record<string, TemplateDuration> = {
  "60":  "3months",
  "90":  "3months",
  "120": "6months",
  "180": "9months",
};

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    totalDays,
    durationLabel,
    useAI = false,             // only true when "Customize with AI" is selected
    templateKey,               // "3months" | "6months" | "9months" | undefined
  } = body as {
    totalDays: number;
    durationLabel: string;
    useAI?: boolean;
    templateKey?: TemplateDuration;
  };

  if (!totalDays || totalDays < 7 || totalDays > 365) {
    return NextResponse.json({ error: "totalDays must be between 7 and 365." }, { status: 400 });
  }

  // ── FAST PATH: standard template — no AI needed ───────────────
  const cacheKey = LRUCache.hashInput(`roadmap-template-${totalDays}-${templateKey ?? "auto"}`, "roadmap", "medium", "en");
  const cachedTemplate = aiCache.get(cacheKey);
  if (cachedTemplate) {
    return NextResponse.json({ success: true, data: cachedTemplate, cached: true, source: "template" });
  }

  // Determine if this is a standard template day count
  const isStandardTemplate = templateKey || Object.keys(TEMPLATE_THRESHOLDS).includes(String(totalDays));

  if (!useAI && isStandardTemplate) {
    const tmplKey = templateKey || TEMPLATE_THRESHOLDS[String(totalDays)] || findNearestTemplate(totalDays);

    // If exactly matching a template day count → use as-is
    const templateDays = TEMPLATE_DAYS[tmplKey];
    const roadmap = totalDays === templateDays
      ? buildTemplateRoadmap(tmplKey)
      : scaleRoadmapToDays(tmplKey, totalDays);

    // Update label
    roadmap.durationLabel = durationLabel || roadmap.durationLabel;

    aiCache.set(cacheKey, roadmap);
    return NextResponse.json({
      success: true,
      data: roadmap,
      cached: false,
      source: "template",
      message: `Built from ${tmplKey} template — instant, no AI needed`,
    });
  }

  // ── AI PATH: custom duration or "Customize with AI" ───────────
  const aiCacheKey = LRUCache.hashInput(`roadmap-ai-${totalDays}`, "roadmap", "medium", "en");
  const cachedAI = aiCache.get(aiCacheKey);
  if (cachedAI) {
    return NextResponse.json({ success: true, data: cachedAI, cached: true, source: "ai" });
  }

  try {
    const allTopics = getAllTopics();
    const chapters  = syllabus.chapters.map((ch) => ({
      index:  ch.chapterIndex,
      name:   ch.name.en,
      topics: ch.topics.map((t) => ({ id: t.topicId, name: t.name.en })),
    }));

    let topicNum = 0;
    const topicLines: string[] = [];
    chapters.forEach((ch) => {
      ch.topics.forEach((t) => {
        topicNum++;
        topicLines.push(`${topicNum}. [CH${ch.index}] ${ch.name} → ${t.name}`);
      });
    });

    const prompt = `You are a strict study planner. Create a ${totalDays}-day plan for ${syllabus.grade} ${syllabus.subject}.

COMPLETE TOPIC LIST (include ALL ${topicNum} topics):
${topicLines.join("\n")}

RULES:
1. Every topic above MUST appear exactly once
2. Distribute evenly: ~${Math.ceil(topicNum / totalDays)} topic(s) per day
3. estimatedMinutes: 25-40 per topic
4. Keep chapters together
5. Total days = exactly ${totalDays}

Return ONLY this JSON, no markdown:
{"title":"Study Plan","totalDays":${totalDays},"days":[{"day":1,"chapterIndex":1,"chapterName":"...","topicId":"...","topicName":"...","estimatedMinutes":30}]}`;

    const raw = await aiCall("roadmap", prompt, { maxTokens: 5000, temperature: 0.3 });
    const parsed = safeParseJSON<{
      title: string;
      totalDays: number;
      days: Array<{ day: number; chapterIndex: number; chapterName: string; topicId: string; topicName: string; estimatedMinutes: number }>;
    }>(raw);

    if (!parsed?.days?.length) {
      // Fallback to nearest template if AI fails
      const fallbackKey = findNearestTemplate(totalDays);
      const fallback    = scaleRoadmapToDays(fallbackKey, totalDays);
      fallback.durationLabel = durationLabel || fallback.durationLabel;
      return NextResponse.json({ success: true, data: fallback, cached: false, source: "template_fallback" });
    }

    const topicById   = new Map(allTopics.map((t) => [t.topicId, t]));
    const topicByName = new Map(allTopics.map((t) => [t.name.en.toLowerCase().trim(), t]));

    function findTopic(id: string, name: string) {
      if (id && topicById.has(id)) return topicById.get(id)!;
      const lower = name.toLowerCase().trim();
      if (topicByName.has(lower)) return topicByName.get(lower)!;
      for (const [key, t] of topicByName) {
        if (lower.includes(key.slice(0, 12)) || key.includes(lower.slice(0, 12))) return t;
      }
      return null;
    }

    const coveredIds = new Set<string>();
    const days: RoadmapDay[] = [];
    const startDate  = new Date();
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + totalDays);

    for (const d of parsed.days) {
      const match = findTopic(d.topicId, d.topicName);
      const topicId = match?.topicId ?? d.topicId ?? "";
      if (topicId) coveredIds.add(topicId);
      days.push({
        day: d.day,
        chapterIndex: match?.chapterIndex ?? d.chapterIndex ?? 1,
        chapterName:  match?.chapterName.en ?? d.chapterName,
        topicId,
        topicName:        match?.name.en ?? d.topicName,
        estimatedMinutes: d.estimatedMinutes || 30,
        quizAfterTopic:   true,
        completed:        false,
        completedAt:      null,
      });
    }

    // Append any missed topics
    const missed = allTopics.filter((t) => !coveredIds.has(t.topicId));
    missed.forEach((t) => {
      days.push({
        day: days.length + 1,
        chapterIndex: t.chapterIndex,
        chapterName:  t.chapterName.en,
        topicId:      t.topicId,
        topicName:    t.name.en,
        estimatedMinutes: 30,
        quizAfterTopic:   true,
        completed:        false,
        completedAt:      null,
      });
    });

    const roadmap: ClassRoadmap = {
      id:            `${syllabus.subjectCode}-${syllabus.gradeCode}`,
      subject:       syllabus.subject,
      grade:         syllabus.grade,
      totalDays:     days.length,
      durationLabel: durationLabel || `${totalDays} days`,
      startDate:     startDate.toISOString(),
      targetDate:    targetDate.toISOString(),
      currentDay:    1,
      days,
      createdAt:     new Date().toISOString(),
    };

    aiCache.set(aiCacheKey, roadmap);
    return NextResponse.json({ success: true, data: roadmap, cached: false, source: "ai" });
  } catch (err) {
    console.error("Roadmap error:", err);
    // Always fallback to template rather than failing
    const fallbackKey = findNearestTemplate(totalDays);
    const fallback    = scaleRoadmapToDays(fallbackKey, totalDays);
    fallback.durationLabel = durationLabel || fallback.durationLabel;
    return NextResponse.json({ success: true, data: fallback, cached: false, source: "template_fallback" });
  }
}
