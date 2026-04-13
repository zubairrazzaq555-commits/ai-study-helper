import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildQuizPrompt, safeParseJSON } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { chunkText, buildMergePrompt, HARD_CHAR_LIMIT } from "@/lib/chunker";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { notes, subject = "General", difficulty = "medium" } = body;

    if (!notes || typeof notes !== "string" || notes.trim().length < 30) {
      return NextResponse.json({ error: "Notes are required (min 30 characters)." }, { status: 400 });
    }

    const text = notes.slice(0, HARD_CHAR_LIMIT);
    const chunks = chunkText(text);

    // Generate quiz from each chunk
    const partialRaws: string[] = [];
    for (const chunk of chunks) {
      const prompt = buildQuizPrompt(chunk.text, subject, difficulty);
      const completion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: chunks.length === 1 ? 3000 : 2000,
        temperature: 0.7,
      });
      partialRaws.push(completion.choices[0]?.message?.content || "");
    }

    let finalRaw = partialRaws[0];

    // Merge if multiple chunks
    if (chunks.length > 1) {
      const mergePrompt = buildMergePrompt(partialRaws, subject, "quiz");
      const mergeCompletion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: mergePrompt }],
        max_tokens: 3000,
        temperature: 0.5,
      });
      finalRaw = mergeCompletion.choices[0]?.message?.content || finalRaw;
    }

    const parsed = safeParseJSON<{ title: string; subject: string; questions: Array<{ id: number; question: string; options: string[]; correct: number; explanation: string }> }>(finalRaw);

    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return NextResponse.json({ error: "Could not generate valid questions. Please try again." }, { status: 500 });
    }

    const questions = parsed.questions
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q, i) => ({
        id: i + 1,
        question: q.question,
        options: q.options.slice(0, 4),
        correct: typeof q.correct === "number" ? Math.min(Math.max(q.correct, 0), 3) : 0,
        explanation: q.explanation || "No explanation provided.",
      }));

    if (questions.length === 0) {
      return NextResponse.json({ error: "Could not generate valid questions. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chunked: chunks.length > 1,
      chunksProcessed: chunks.length,
      data: {
        title: parsed.title || `${subject} Quiz`,
        subject: parsed.subject || subject,
        total: questions.length,
        questions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Quiz API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to generate quiz. Please try again.", details: message }, { status: 500 });
  }
}
