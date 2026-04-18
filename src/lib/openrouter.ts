import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "StudyAI",
  },
});

export const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

// ── Optimized token-efficient prompts ────────────────────────
// Shorter prompts = faster response + fewer tokens used

export function buildSummaryPrompt(notes: string, subject: string, difficulty: string): string {
  return `Summarize these ${subject} notes (${difficulty} level). Be concise.

${notes}

JSON only, no markdown:
{"title":"...","keyPoints":["..."],"sections":[{"heading":"...","content":"..."}],"concepts":["..."]}

Rules: 5-7 keyPoints, 2-4 sections, 6-10 concepts.`;
}

export function buildQuizPrompt(notes: string, subject: string, difficulty: string): string {
  const n = difficulty === "hard" ? 8 : difficulty === "easy" ? 4 : 6;
  return `Create ${n} MCQ questions from these ${subject} notes (${difficulty}).

${notes}

JSON only, no markdown:
{"title":"...","subject":"${subject}","questions":[{"id":1,"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}

Rules: exactly 4 options per question, correct=index 0-3.`;
}

export function buildStudyPlanPrompt(notes: string, subject: string, difficulty: string): string {
  const days = difficulty === "hard" ? 7 : difficulty === "easy" ? 3 : 5;
  return `Create a ${days}-day study plan for these ${subject} notes (${difficulty}).

${notes}

JSON only, no markdown:
{"title":"...","subject":"${subject}","totalDays":${days},"estimatedHours":8,"days":[{"day":1,"title":"...","duration":"1.5 hrs","tasks":["..."]}]}

Rules: 3-5 tasks per day, be specific and actionable.`;
}

export function buildChunkSummaryPrompt(notes: string, subject: string, chunkIndex: number, totalChunks: number): string {
  return `Summarize part ${chunkIndex + 1}/${totalChunks} of ${subject} notes.

${notes}

JSON only:
{"keyPoints":["..."],"sections":[{"heading":"...","content":"..."}],"concepts":["..."]}`;
}

export function buildMergeSummaryPrompt(parts: string[], subject: string): string {
  const combined = parts.map((p, i) => `[Part ${i + 1}]: ${p}`).join("\n\n");
  return `Merge these ${subject} summaries into one unified summary.

${combined}

JSON only:
{"title":"...","keyPoints":["..."],"sections":[{"heading":"...","content":"..."}],"concepts":["..."]}

Rules: 5-7 keyPoints, 2-4 sections, 6-10 concepts. Remove duplicates.`;
}

export function buildMergeQuizPrompt(parts: string[], subject: string): string {
  const combined = parts.map((p, i) => `[Part ${i + 1}]: ${p}`).join("\n\n");
  return `Select best 6-8 unique MCQ questions from these ${subject} quiz sets. Remove duplicates.

${combined}

JSON only:
{"title":"${subject} Quiz","subject":"${subject}","questions":[{"id":1,"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}`;
}

export function buildMergePlanPrompt(parts: string[], subject: string, days: number): string {
  const combined = parts.map((p, i) => `[Part ${i + 1}]: ${p}`).join("\n\n");
  return `Merge these ${subject} study plans into one coherent ${days}-day plan. Remove duplicates.

${combined}

JSON only:
{"title":"...","subject":"${subject}","totalDays":${days},"estimatedHours":8,"days":[{"day":1,"title":"...","duration":"1.5 hrs","tasks":["..."]}]}`;
}

// ── Safe JSON extractor ───────────────────────────────────────
export function safeParseJSON<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try extracting JSON object from noisy text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { return null; }
    }
    return null;
  }
}

// ── Parallel chunk processor ──────────────────────────────────
export async function processChunksInParallel(
  chunks: Array<{ text: string; index: number }>,
  buildPrompt: (text: string, index: number, total: number) => string,
  maxTokens: number,
  concurrency = 3
): Promise<string[]> {
  const results: string[] = new Array(chunks.length).fill("");

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (chunk) => {
        const prompt = buildPrompt(chunk.text, chunk.index, chunks.length);
        const completion = await openrouter.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.6, // slightly lower = faster + more consistent
        });
        return { index: chunk.index, raw: completion.choices[0]?.message?.content || "" };
      })
    );
    batchResults.forEach(({ index, raw }) => { results[index] = raw; });
  }

  return results;
}

// ── Class-level roadmap prompt ────────────────────────────────
export function buildClassRoadmapPrompt(
  subject: string,
  grade: string,
  totalDays: number,
  chapters: Array<{ name: string; topics: string[] }>
): string {
  const topicList = chapters.map((ch, ci) =>
    `Chapter ${ci + 1}: ${ch.name}\n  Topics: ${ch.topics.join(", ")}`
  ).join("\n");

  return `You are an expert study planner. Create a ${totalDays}-day study roadmap for ${grade} ${subject}.

SYLLABUS:
${topicList}

Rules:
- Distribute ALL topics across exactly ${totalDays} days
- Each day has exactly 1 topic (for short plans) or 1-2 topics (for longer plans)
- estimatedMinutes should be 20-45 per topic
- Be practical — spread evenly, don't rush

JSON only, no markdown:
{"title":"...","totalDays":${totalDays},"days":[{"day":1,"chapterName":"...","topicName":"...","estimatedMinutes":30}]}`;
}

// ── Detailed explanation prompt ───────────────────────────────
export function buildDetailedExplanationPrompt(
  topicName: string,
  chapterName: string,
  subject: string,
  grade: string,
  lang: "en" | "zh" = "en"
): string {
  if (lang === "zh") {
    return `你是一位经验丰富的${grade}${subject}老师。请对"${topicName}"（${chapterName}章节）进行详细讲解。

要求：
1. 详细解释（3-5段）
2. 核心原理或定律
3. 公式推导（如适用）
4. 2-3个详细例题（含解题步骤）
5. 常见错误与注意事项
6. 记忆技巧

仅返回 JSON（不含 markdown）：
{"title":"...","introduction":"...","coreContent":[{"heading":"...","content":"..."}],"workedExamples":[{"problem":"...","solution":"...","steps":["..."]}],"commonMistakes":["..."],"memoryTip":"..."}`;
  }

  return `You are an experienced ${grade} ${subject} teacher. Give a DETAILED explanation of "${topicName}" from chapter "${chapterName}".

Include:
1. Thorough explanation (3-5 paragraphs)
2. Core principle or law
3. Formula derivation if applicable
4. 2-3 worked examples with step-by-step solutions
5. Common mistakes students make
6. Memory tip or mnemonic

JSON only, no markdown:
{"title":"...","introduction":"...","coreContent":[{"heading":"...","content":"..."}],"workedExamples":[{"problem":"...","solution":"...","steps":["..."]}],"commonMistakes":["..."],"memoryTip":"..."}`;
}
