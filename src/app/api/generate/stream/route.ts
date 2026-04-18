import { NextRequest } from "next/server";
import { openrouter, MODEL, buildSummaryPrompt, buildQuizPrompt, buildStudyPlanPrompt, buildChunkSummaryPrompt, buildMergeSummaryPrompt, buildMergeQuizPrompt, buildMergePlanPrompt, safeParseJSON } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { chunkText, HARD_CHAR_LIMIT } from "@/lib/chunker";
import { aiCache, LRUCache } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 min max for large docs

type OutputType = "summary" | "quiz" | "plan";

// ── SSE helpers ───────────────────────────────────────────────
function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

function makeStream() {
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) { controller = c; },
  });
  const send = (type: string, data: Record<string, unknown>) => {
    controller.enqueue(new TextEncoder().encode(sseEvent(type, data)));
  };
  const close = () => controller.close();
  return { stream, send, close };
}

// ── POST /api/generate/stream ─────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(ip);

  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { notes, subject = "General", difficulty = "medium", type = "summary" } = body as {
    notes: string; subject: string; difficulty: string; type: OutputType;
  };

  if (!notes || typeof notes !== "string" || notes.trim().length < 30) {
    return new Response(
      JSON.stringify({ error: "Notes are required (min 30 chars)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Cache check ───────────────────────────────────────────
  const cacheKey = LRUCache.hashInput(notes, type, subject, difficulty);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    // Return cached result immediately as a stream event
    const { stream, send, close } = makeStream();
    setTimeout(() => {
      send("status", { message: "⚡ Loaded from cache", step: 1, total: 1 });
      send("done", { success: true, data: cached, cached: true });
      close();
    }, 50);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // ── Stream setup ──────────────────────────────────────────
  const { stream, send, close } = makeStream();

  // Process async — don't await, let stream flow
  (async () => {
    try {
      const text   = notes.slice(0, HARD_CHAR_LIMIT);
      const chunks = chunkText(text);
      const total  = chunks.length;

      send("status", {
        message: total > 1
          ? `📄 Splitting into ${total} chunks for parallel processing...`
          : "🧠 Analyzing your notes...",
        step: 0, total,
      });

      let result: unknown = null;

      // ── Single chunk ────────────────────────────────────
      if (total === 1) {
        send("status", { message: "✍️ Generating with AI...", step: 1, total: 2 });

        const prompt =
          type === "summary" ? buildSummaryPrompt(text, subject, difficulty)
          : type === "quiz"  ? buildQuizPrompt(text, subject, difficulty)
          :                    buildStudyPlanPrompt(text, subject, difficulty);

        const completion = await openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: type === "quiz" ? 2500 : 2000,
          temperature: 0.6,
        });

        const raw    = completion.choices[0]?.message?.content || "";
        const parsed = safeParseJSON<Record<string, unknown>>(raw);

        if (!parsed) {
          send("error", { message: "AI returned unexpected format. Please try again." });
          close();
          return;
        }

        result = buildFinalResult(parsed, type, subject);

      // ── Multi chunk — parallel ─────────────────────────
      } else {
        // Phase 1: Process chunks in parallel batches
        send("status", { message: `⚡ Processing ${total} chunks in parallel...`, step: 1, total: total + 1 });

        const CONCURRENCY = 3;
        const chunkRaws: string[] = new Array(total).fill("");

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
          const batch = chunks.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(
            batch.map(async (chunk) => {
              const prompt =
                type === "summary"
                  ? buildChunkSummaryPrompt(chunk.text, subject, chunk.index, total)
                  : type === "quiz"
                  ? buildQuizPrompt(chunk.text, subject, difficulty)
                  : buildStudyPlanPrompt(chunk.text, subject, difficulty);

              const comp = await openrouter.chat.completions.create({
                model: MODEL,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
                temperature: 0.6,
              });
              return { index: chunk.index, raw: comp.choices[0]?.message?.content || "" };
            })
          );

          batchResults.forEach(({ index, raw }) => { chunkRaws[index] = raw; });

          const processed = Math.min(i + CONCURRENCY, total);
          send("status", {
            message: `✅ Processed ${processed}/${total} chunks...`,
            step: processed,
            total: total + 1,
          });
        }

        // Phase 2: Merge
        send("status", { message: "🔀 Merging results into final output...", step: total, total: total + 1 });

        const days = difficulty === "hard" ? 7 : difficulty === "easy" ? 3 : 5;
        const mergePrompt =
          type === "summary" ? buildMergeSummaryPrompt(chunkRaws, subject)
          : type === "quiz"  ? buildMergeQuizPrompt(chunkRaws, subject)
          :                    buildMergePlanPrompt(chunkRaws, subject, days);

        const mergeCompletion = await openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: mergePrompt }],
          max_tokens: 2000,
          temperature: 0.4,
        });

        const mergedRaw = mergeCompletion.choices[0]?.message?.content || "";
        const merged    = safeParseJSON<Record<string, unknown>>(mergedRaw);

        if (!merged) {
          send("error", { message: "Failed to merge chunk results. Please try again." });
          close();
          return;
        }

        result = buildFinalResult(merged, type, subject);
      }

      // Cache the result
      aiCache.set(cacheKey, result);

      send("status", { message: "✅ Done!", step: total + 1, total: total + 1 });
      send("done", { success: true, data: result, cached: false, chunksProcessed: total });

    } catch (err: unknown) {
      console.error("Stream generate error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      send("error", { message: `Generation failed: ${msg}` });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ── Result normalizer ─────────────────────────────────────────
function buildFinalResult(
  parsed: Record<string, unknown>,
  type: OutputType,
  subject: string
): unknown {
  const now = new Date().toISOString();

  if (type === "summary") {
    return {
      title:     String(parsed.title || "Study Summary"),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints as string[] : [],
      sections:  Array.isArray(parsed.sections)  ? parsed.sections  as Array<{ heading: string; content: string }> : [],
      concepts:  Array.isArray(parsed.concepts)  ? parsed.concepts  as string[] : [],
      subject,
      generatedAt: now,
    };
  }

  if (type === "quiz") {
    const rawQ = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = (rawQ as Array<Record<string, unknown>>)
      .filter((q) => q.question && Array.isArray(q.options) && (q.options as unknown[]).length === 4)
      .map((q, i) => ({
        id:          i + 1,
        question:    String(q.question),
        options:     (q.options as string[]).slice(0, 4),
        correct:     typeof q.correct === "number" ? Math.min(Math.max(q.correct, 0), 3) : 0,
        explanation: String(q.explanation || "No explanation."),
      }));

    return {
      title:    String(parsed.title || `${subject} Quiz`),
      subject,
      total:    questions.length,
      questions,
      generatedAt: now,
    };
  }

  // plan
  const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
  const days = (rawDays as Array<Record<string, unknown>>)
    .filter((d) => d.day && d.title && Array.isArray(d.tasks))
    .map((d, i) => ({
      day:      i + 1,
      title:    String(d.title),
      duration: String(d.duration || "1.5 hrs"),
      tasks:    (d.tasks as string[])
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => ({ text: t.trim(), done: false })),
    }));

  return {
    title:          String(parsed.title || `${subject} Study Plan`),
    subject,
    totalDays:      days.length,
    estimatedHours: typeof parsed.estimatedHours === "number" ? parsed.estimatedHours : days.length * 1.5,
    days,
    generatedAt: now,
  };
}
