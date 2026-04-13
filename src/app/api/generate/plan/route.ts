import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL, buildStudyPlanPrompt, safeParseJSON } from "@/lib/openrouter";
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

    // For study plan, use first 2 chunks max (plan doesn't need all content)
    const planChunks = chunks.slice(0, 2);
    const partialRaws: string[] = [];

    for (const chunk of planChunks) {
      const prompt = buildStudyPlanPrompt(chunk.text, subject, difficulty);
      const completion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2500,
        temperature: 0.7,
      });
      partialRaws.push(completion.choices[0]?.message?.content || "");
    }

    let finalRaw = partialRaws[0];

    if (planChunks.length > 1) {
      const mergePrompt = buildMergePrompt(partialRaws, subject, "plan");
      const mergeCompletion = await openrouter.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: mergePrompt }],
        max_tokens: 2500,
        temperature: 0.5,
      });
      finalRaw = mergeCompletion.choices[0]?.message?.content || finalRaw;
    }

    const parsed = safeParseJSON<{ title: string; subject: string; totalDays: number; estimatedHours: number; days: Array<{ day: number; title: string; duration: string; tasks: string[] }> }>(finalRaw);

    if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      return NextResponse.json({ error: "Could not generate a valid study plan. Please try again." }, { status: 500 });
    }

    const days = parsed.days
      .filter((d) => d.day && d.title && Array.isArray(d.tasks))
      .map((d, i) => ({
        day: i + 1,
        title: d.title,
        duration: d.duration || "1.5 hrs",
        tasks: d.tasks.filter((t) => typeof t === "string" && t.trim()).map((t) => ({ text: t.trim(), done: false })),
      }));

    if (days.length === 0) {
      return NextResponse.json({ error: "Could not generate valid plan days. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      chunked: planChunks.length > 1,
      data: {
        title: parsed.title || `${subject} Study Plan`,
        subject: parsed.subject || subject,
        totalDays: days.length,
        estimatedHours: parsed.estimatedHours || days.length * 1.5,
        days,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Plan API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to generate study plan. Please try again.", details: message }, { status: 500 });
  }
}
