import { NextRequest, NextResponse } from "next/server";
import { aiCall, safeParseJSON } from "@/lib/aiEngine";
import { buildDetailedExplanationPrompt } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getTopicById } from "@/lib/syllabusLoader";
import { buildTopicCacheKey } from "@/lib/topicContext";
import { aiCache } from "@/lib/cache";

export interface DetailedResult {
  topicId: string;
  title: string;
  introduction: string;
  coreContent: Array<{ heading: string; content: string }>;
  workedExamples: Array<{ problem: string; solution: string; steps: string[] }>;
  commonMistakes: string[];
  memoryTip: string;
  generatedAt: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { topicId, lang = "en" } = body as { topicId: string; lang?: "en" | "zh" };

  if (!topicId) return NextResponse.json({ error: "topicId is required." }, { status: 400 });

  const topic = getTopicById(topicId);
  if (!topic) return NextResponse.json({ error: `Topic '${topicId}' not found.` }, { status: 404 });

  const cacheKey = buildTopicCacheKey(topicId, "summary", "hard", `${lang}-detailed`);
  const cached = aiCache.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

  try {
    const prompt = buildDetailedExplanationPrompt(
      topic.name.en,
      topic.chapterName.en,
      topic.subject,
      topic.grade,
      lang
    );

    const raw = await aiCall("detailed", prompt, { maxTokens: 2500, temperature: 0.6 });
    const parsed = safeParseJSON<{
      title: string;
      introduction: string;
      coreContent: Array<{ heading: string; content: string }>;
      workedExamples: Array<{ problem: string; solution: string; steps: string[] }>;
      commonMistakes: string[];
      memoryTip: string;
    }>(raw);

    if (!parsed) {
      console.error("Detailed parse error:", raw.slice(0, 300));
      return NextResponse.json({ error: "AI returned unexpected format. Please try again." }, { status: 500 });
    }

    const result: DetailedResult = {
      topicId,
      title:           parsed.title || topic.name.en,
      introduction:    parsed.introduction || "",
      coreContent:     Array.isArray(parsed.coreContent)    ? parsed.coreContent    : [],
      workedExamples:  Array.isArray(parsed.workedExamples) ? parsed.workedExamples : [],
      commonMistakes:  Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
      memoryTip:       parsed.memoryTip || "",
      generatedAt:     new Date().toISOString(),
    };

    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false });
  } catch (err) {
    console.error("Detailed explanation error:", err);
    return NextResponse.json({ error: "Failed to generate explanation. Please try again." }, { status: 500 });
  }
}
