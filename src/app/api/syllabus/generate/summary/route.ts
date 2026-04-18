import { NextRequest, NextResponse } from "next/server";
import { aiCall, safeParseJSON } from "@/lib/aiEngine";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getTopicById } from "@/lib/syllabusLoader";
import { buildTopicSummaryPrompt, buildTopicCacheKey } from "@/lib/topicContext";
import { aiCache } from "@/lib/cache";
import type { TopicSummaryResult } from "@/lib/syllabusData";

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
  const { topicId, lang = "en" } = body as { topicId: string; lang?: "en" | "zh" };

  if (!topicId) {
    return NextResponse.json({ error: "topicId is required." }, { status: 400 });
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    return NextResponse.json({ error: `Topic '${topicId}' not found.` }, { status: 404 });
  }

  // Cache check
  const cacheKey = buildTopicCacheKey(topicId, "summary", "medium", lang);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true });
  }

  try {
    const prompt = buildTopicSummaryPrompt(topic, lang);
    const raw = await aiCall("summary", prompt, { maxTokens: 1500, temperature: 0.6 });
    const parsed = safeParseJSON<{
      title: string;
      keyPoints: string[];
      sections: Array<{ heading: string; content: string }>;
      concepts: string[];
      formula?: string;
      example?: string;
    }>(raw);

    if (!parsed) {
      console.error("Topic summary parse error:", raw.slice(0, 300));
      return NextResponse.json(
        { error: "AI returned unexpected format. Please try again." },
        { status: 500 }
      );
    }

    const result: TopicSummaryResult = {
      topicId,
      title:       parsed.title || topic.name.en,
      keyPoints:   Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      sections:    Array.isArray(parsed.sections)  ? parsed.sections  : [],
      concepts:    Array.isArray(parsed.concepts)  ? parsed.concepts  : [],
      formula:     parsed.formula || undefined,
      example:     parsed.example || undefined,
      generatedAt: new Date().toISOString(),
    };

    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false });
  } catch (err) {
    console.error("Topic summary error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
