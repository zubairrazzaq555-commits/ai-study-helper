import { NextRequest, NextResponse } from "next/server";
import { aiCall, safeParseJSON } from "@/lib/aiEngine";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getTopicById } from "@/lib/syllabusLoader";
import { buildTopicQuizPrompt, buildTopicCacheKey } from "@/lib/topicContext";
import { aiCache } from "@/lib/cache";
import type { TopicQuizResult } from "@/lib/syllabusData";

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
    topicId,
    difficulty = "medium",
    lang = "en",
  } = body as { topicId: string; difficulty?: "easy" | "medium" | "hard"; lang?: "en" | "zh" };

  if (!topicId) {
    return NextResponse.json({ error: "topicId is required." }, { status: 400 });
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    return NextResponse.json({ error: `Topic '${topicId}' not found.` }, { status: 404 });
  }

  const cacheKey = buildTopicCacheKey(topicId, "quiz", difficulty, lang);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true });
  }

  try {
    const prompt = buildTopicQuizPrompt(topic, difficulty, lang);
    const raw = await aiCall("quiz", prompt, { maxTokens: 2000, temperature: 0.6 });
    const parsed = safeParseJSON<{
      title: string;
      questions: Array<{
        id: number;
        question: string;
        options: string[];
        correct: number;
        explanation: string;
      }>;
    }>(raw);

    if (!parsed?.questions?.length) {
      return NextResponse.json(
        { error: "Could not generate valid questions. Please try again." },
        { status: 500 }
      );
    }

    const questions = parsed.questions
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q, i) => ({
        id:          i + 1,
        question:    q.question,
        options:     q.options.slice(0, 4),
        correct:     typeof q.correct === "number" ? Math.min(Math.max(q.correct, 0), 3) : 0,
        explanation: q.explanation || "No explanation.",
      }));

    const result: TopicQuizResult = {
      topicId,
      title:       parsed.title || `${topic.name.en} Quiz`,
      total:       questions.length,
      questions,
      generatedAt: new Date().toISOString(),
    };

    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false });
  } catch (err) {
    console.error("Topic quiz error:", err);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again." },
      { status: 500 }
    );
  }
}
