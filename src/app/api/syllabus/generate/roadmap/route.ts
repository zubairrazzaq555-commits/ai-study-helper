import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, safeParseJSON } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getTopicById } from "@/lib/syllabusLoader";
import { buildTopicRoadmapPrompt, buildTopicCacheKey } from "@/lib/topicContext";
import { aiCache } from "@/lib/cache";
import type { TopicRoadmapResult } from "@/lib/syllabusData";

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

  const cacheKey = buildTopicCacheKey(topicId, "roadmap", "medium", lang);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true });
  }

  try {
    const prompt = buildTopicRoadmapPrompt(topic, lang);
    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.6,
    });

    const raw    = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJSON<{
      title: string;
      totalSteps: number;
      estimatedMinutes: number;
      steps: Array<{
        step: number;
        title: string;
        action: string;
        duration: string;
        tip?: string;
      }>;
      prerequisiteTopics: string[];
    }>(raw);

    if (!parsed?.steps?.length) {
      return NextResponse.json(
        { error: "Could not generate a valid roadmap. Please try again." },
        { status: 500 }
      );
    }

    const steps = parsed.steps.map((s, i) => ({
      step:     i + 1,
      title:    s.title || `Step ${i + 1}`,
      action:   s.action || "",
      duration: s.duration || "5 min",
      tip:      s.tip,
    }));

    const result: TopicRoadmapResult = {
      topicId,
      title:              parsed.title || `${topic.name.en} Roadmap`,
      totalSteps:         steps.length,
      estimatedMinutes:   parsed.estimatedMinutes || steps.length * 6,
      steps,
      prerequisiteTopics: Array.isArray(parsed.prerequisiteTopics) ? parsed.prerequisiteTopics : [],
      generatedAt:        new Date().toISOString(),
    };

    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false });
  } catch (err) {
    console.error("Topic roadmap error:", err);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 500 }
    );
  }
}
