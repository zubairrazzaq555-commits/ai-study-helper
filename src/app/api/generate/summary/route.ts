import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildSummaryPrompt, buildChunkSummaryPrompt, buildMergeSummaryPrompt, safeParseJSON } from "@/lib/openrouter";
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

  // Cache check
  const cacheKey = LRUCache.hashInput(notes, "summary", subject, difficulty);
  const cached = aiCache.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

  try {
    const text = notes.slice(0, HARD_CHAR_LIMIT);
    const chunks = chunkText(text);

    let parsed: { title: string; keyPoints: string[]; sections: Array<{ heading: string; content: string }>; concepts: string[] } | null = null;

    if (chunks.length === 1) {
      const raw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildSummaryPrompt(text, subject, difficulty) }],
        max_tokens: 2000, temperature: 0.6,
      })).choices[0]?.message?.content || "";
      parsed = safeParseJSON(raw);
    } else {
      // Parallel chunk processing
      const raws = await Promise.all(chunks.map((c) =>
        openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: buildChunkSummaryPrompt(c.text, subject, c.index, chunks.length) }],
          max_tokens: 1200, temperature: 0.6,
        }).then((r) => r.choices[0]?.message?.content || "")
      ));
      const mergedRaw = (await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: buildMergeSummaryPrompt(raws, subject) }],
        max_tokens: 2000, temperature: 0.4,
      })).choices[0]?.message?.content || "";
      parsed = safeParseJSON(mergedRaw);
    }

    if (!parsed) return NextResponse.json({ error: "AI returned unexpected format. Please try again." }, { status: 500 });

    const result = {
      title: parsed.title || "Study Summary",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      subject, generatedAt: new Date().toISOString(),
    };

    aiCache.set(cacheKey, result);
    return NextResponse.json({ success: true, data: result, cached: false, chunksProcessed: chunks.length });
  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Failed to generate summary. Please try again." }, { status: 500 });
  }
}
