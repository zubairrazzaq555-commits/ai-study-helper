import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildStudyPlanPrompt, buildMergePlanPrompt, safeParseJSON } from "@/lib/openrouter";
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

  const cacheKey = LRUCache.hashInput(notes, "plan", subject, difficulty);
  const cached = aiCache.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

  try {
    const text = notes.slice(0, HARD_CHAR_LIMIT);
    const chunks = chunkText(text);
    const days = difficulty === "hard" ? 7 : difficulty === "easy" ? 3 : 5;

    let raw = "";
    if (chunks.length <= 2) {
      raw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildStudyPlanPrompt(chunks[0].text, subject, difficulty) }],
        max_tokens: 2000, temperature: 0.6,
      })).choices[0]?.message?.content || "";
    } else {
      const raws = await Promise.all(chunks.slice(0, 2).map((c) =>
        openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: buildStudyPlanPrompt(c.text, subject, difficulty) }],
          max_tokens: 1500, temperature: 0.6,
        }).then((r) => r.choices[0]?.message?.content || "")
      ));
      raw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildMergePlanPrompt(raws, subject, days) }],
        max_tokens: 2000, temperature: 0.4,
      })).choices[0]?.message?.content || "";
    }

    const parsed = safeParseJSON<{ title: string; subject: string; totalDays: number; estimatedHours: number; days: Array<{ day: number; title: string; duration: string; tasks: string[] }> }>(raw);
    if (!parsed?.days?.length) {
      return NextResponse.json({ error: "Could not generate a valid study plan. Please try again." }, { status: 500 });
    }

    const planDays = parsed.days
      .filter((d) => d.day && d.title && Array.isArray(d.tasks))
      .map((d, i) => ({
        day: i + 1, title: d.title, duration: d.duration || "1.5 hrs",
        tasks: d.tasks.filter((t) => typeof t === "string" && t.trim()).map((t) => ({ text: t.trim(), done: false })),
      }));

    const result = {
      title: parsed.title || `${subject} Study Plan`, subject,
      totalDays: planDays.length, estimatedHours: parsed.estimatedHours || planDays.length * 1.5,
      days: planDays, generatedAt: new Date().toISOString(),
    };
    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false, chunksProcessed: chunks.length });
  } catch (err) {
    console.error("Plan error:", err);
    return NextResponse.json({ error: "Failed to generate study plan. Please try again." }, { status: 500 });
  }
}
