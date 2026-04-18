import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildQuizPrompt, buildMergeQuizPrompt, safeParseJSON } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { chunkText, HARD_CHAR_LIMIT } from "@/lib/chunker";
import { aiCache, LRUCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { notes, subject = "General", difficulty = "medium" } = body as { notes: string; subject: string; difficulty: string };

  if (!notes || typeof notes !== "string" || notes.trim().length < 30) {
    return NextResponse.json({ error: "Notes are required (min 30 chars)." }, { status: 400 });
  }

  const cacheKey = LRUCache.hashInput(notes, "quiz", subject, difficulty);
  const cached = aiCache.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

  try {
    const text = notes.slice(0, HARD_CHAR_LIMIT);
    const chunks = chunkText(text);

    let raw = "";

    if (chunks.length === 1) {
      raw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildQuizPrompt(text, subject, difficulty) }],
        max_tokens: 2500, temperature: 0.6,
      })).choices[0]?.message?.content || "";
    } else {
      const raws = await Promise.all(chunks.slice(0, 3).map((c) =>
        openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: buildQuizPrompt(c.text, subject, difficulty) }],
          max_tokens: 1500, temperature: 0.6,
        }).then((r) => r.choices[0]?.message?.content || "")
      ));
      raw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildMergeQuizPrompt(raws, subject) }],
        max_tokens: 2500, temperature: 0.4,
      })).choices[0]?.message?.content || "";
    }

    const parsed = safeParseJSON<{ title: string; subject: string; questions: Array<{ id: number; question: string; options: string[]; correct: number; explanation: string }> }>(raw);
    if (!parsed?.questions?.length) {
      return NextResponse.json({ error: "Could not generate valid questions. Please try again." }, { status: 500 });
    }

    const questions = parsed.questions
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q, i) => ({
        id: i + 1, question: q.question, options: q.options.slice(0, 4),
        correct: typeof q.correct === "number" ? Math.min(Math.max(q.correct, 0), 3) : 0,
        explanation: q.explanation || "No explanation.",
      }));

    const result = { title: parsed.title || `${subject} Quiz`, subject, total: questions.length, questions, generatedAt: new Date().toISOString() };
    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false, chunksProcessed: chunks.length });
  } catch (err) {
    console.error("Quiz error:", err);
    return NextResponse.json({ error: "Failed to generate quiz. Please try again." }, { status: 500 });
  }
}
