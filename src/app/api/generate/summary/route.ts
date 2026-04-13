import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildSummaryPrompt, safeParseJSON } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { chunkText, buildMergePrompt, HARD_CHAR_LIMIT } from "@/lib/chunker";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please wait ${Math.ceil(rl.resetIn / 1000)} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { notes, subject = "General", difficulty = "medium" } = body;

    if (!notes || typeof notes !== "string" || notes.trim().length < 30) {
      return NextResponse.json({ error: "Notes are required (min 30 characters)." }, { status: 400 });
    }

    // Trim to absolute hard limit
    const text = notes.slice(0, HARD_CHAR_LIMIT);
    const chunks = chunkText(text);

    // Single chunk — process normally
    if (chunks.length === 1) {
      const prompt = buildSummaryPrompt(chunks[0].text, subject, difficulty);
      const completion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });
      const raw = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJSON<{ title: string; keyPoints: string[]; sections: Array<{ heading: string; content: string }>; concepts: string[] }>(raw);
      if (!parsed) {
        console.error("Summary parse error:", raw.slice(0, 300));
        return NextResponse.json({ error: "AI returned unexpected format. Please try again." }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        chunked: false,
        data: {
          title: parsed.title || "Study Summary",
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          sections: Array.isArray(parsed.sections) ? parsed.sections : [],
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
          subject,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Multi-chunk: process each chunk then merge
    const partialRaws: string[] = [];
    for (const chunk of chunks) {
      const prompt = buildSummaryPrompt(chunk.text, subject, difficulty);
      const completion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.7,
      });
      partialRaws.push(completion.choices[0]?.message?.content || "");
    }

    // Merge
    const mergePrompt = buildMergePrompt(partialRaws, subject, "summary");
    const mergeCompletion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: mergePrompt }],
      max_tokens: 2000,
      temperature: 0.5,
    });
    const mergedRaw = mergeCompletion.choices[0]?.message?.content || "";
    const merged = safeParseJSON<{ title: string; keyPoints: string[]; sections: Array<{ heading: string; content: string }>; concepts: string[] }>(mergedRaw);

    if (!merged) {
      return NextResponse.json({ error: "Failed to merge chunked summaries. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chunked: true,
      chunksProcessed: chunks.length,
      data: {
        title: merged.title || "Study Summary",
        keyPoints: Array.isArray(merged.keyPoints) ? merged.keyPoints : [],
        sections: Array.isArray(merged.sections) ? merged.sections : [],
        concepts: Array.isArray(merged.concepts) ? merged.concepts : [],
        subject,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Summary API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to generate summary. Please try again.", details: message }, { status: 500 });
  }
}
