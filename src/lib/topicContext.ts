// ─── Topic Context Builder ────────────────────────────────────
// Builds AI prompts with JSON notes injected as context.
// Chinese (zh) prompts enforce 简体中文 output.
// English (en) prompts enforce English output.

import type { Topic, TopicFeature } from "./syllabusData";

// ── Quiz prompt — injects bilingual JSON notes, enforces lang ──
export function buildTopicQuizPrompt(
  topic: Topic,
  difficulty: "easy" | "medium" | "hard" = "medium",
  lang: "en" | "zh" = "zh"
): string {
  const n = difficulty === "hard" ? 8 : difficulty === "easy" ? 4 : 6;

  if (lang === "zh") {
    // Use Chinese notes as context for more accurate Chinese questions
    const cnContext = `学习笔记（参考资料）：
简短说明：${topic.notes?.short_cn || topic.notes?.short || topic.name.cn}
详细说明：${(topic.notes?.detailed_cn || topic.notes?.detailed || "").slice(0, 700)}`;

    return `你是一位九年级物理老师。请严格根据以下课程笔记，为"${topic.name.cn}"（${topic.chapterName.cn}）出 ${n} 道选择题。

${cnContext}

【重要要求】：
- 所有题目和选项必须用简体中文编写
- 题目内容必须来自以上笔记
- 每题恰好4个选项（A/B/C/D），correct为正确答案的索引（0-3）
- 包含简明的中文解析

仅返回以下JSON格式，不含markdown：
{"title":"${topic.name.cn}测验","questions":[{"id":1,"question":"（中文题目）","options":["选项A","选项B","选项C","选项D"],"correct":0,"explanation":"（中文解析）"}]}`;
  }

  // English prompt
  const enContext = `STUDY NOTES (use as reference):
Short: ${topic.notes?.short || topic.name.en}
Detailed: ${(topic.notes?.detailed || "").slice(0, 600)}`;

  return `You are a Grade 9 Physics teacher. Based on the following syllabus notes, create ${n} MCQ questions on "${topic.name.en}" (${difficulty} difficulty).

${enContext}

Rules:
- Questions must be based on the notes above
- Exactly 4 options per question, correct=index 0-3
- Include a brief explanation

JSON only, no markdown:
{"title":"${topic.name.en} Quiz","questions":[{"id":1,"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}`;
}

// ── Summary prompt ────────────────────────────────────────────
export function buildTopicSummaryPrompt(topic: Topic, lang: "en" | "zh" = "zh"): string {
  if (lang === "zh") {
    return `你是一位九年级物理老师。请用简体中文为"${topic.name.cn}"（${topic.chapterName.cn}）写一份清晰的学习摘要。

参考资料：${topic.notes?.short_cn || topic.name.cn}

要求：
1. 定义和解释（2-3句话，简体中文）
2. 关键公式（如有）
3. 3-5个要点（简体中文）
4. 2-3个实际例子
5. 5-8个核心概念

【所有内容必须用简体中文】

仅返回 JSON（不含 markdown）：
{"title":"...","keyPoints":["..."],"sections":[{"heading":"...","content":"..."}],"concepts":["..."],"formula":"...（如无则为null）","example":"..."}`;
  }

  return `You are a Grade 9 Physics teacher. Write a clear study summary for "${topic.name.en}" from chapter "${topic.chapterName.en}".

Reference: ${topic.notes?.short || topic.name.en}

Include: definition, key formula, 3-5 key points, 2-3 examples, 5-8 concepts.

JSON only, no markdown:
{"title":"...","keyPoints":["..."],"sections":[{"heading":"...","content":"..."}],"concepts":["..."],"formula":"... or null","example":"..."}`;
}

// ── Roadmap prompt ────────────────────────────────────────────
export function buildTopicRoadmapPrompt(topic: Topic, lang: "en" | "zh" = "zh"): string {
  if (lang === "zh") {
    return `请用简体中文为九年级物理"${topic.name.cn}"制定一个5步学习路线图，从基础开始到备考结束。所有内容必须用简体中文。

仅返回JSON：
{"title":"${topic.name.cn}学习路线","totalSteps":5,"estimatedMinutes":30,"steps":[{"step":1,"title":"（中文标题）","action":"（中文行动步骤）","duration":"5分钟","tip":"（中文提示）"}],"prerequisiteTopics":["..."]}`;
  }

  return `Create a 5-step learning roadmap for "${topic.name.en}" (Grade 9 Physics, chapter "${topic.chapterName.en}"). Start from prerequisites, end at exam-readiness.

JSON only:
{"title":"${topic.name.en} Roadmap","totalSteps":5,"estimatedMinutes":30,"steps":[{"step":1,"title":"...","action":"...","duration":"5 min","tip":"..."}],"prerequisiteTopics":["..."]}`;
}

// ── Embedding input string ────────────────────────────────────
export function buildEmbeddingInput(topic: Topic): string {
  return [
    `${topic.grade} ${topic.subject}.`,
    `Chapter: ${topic.chapterName.en}.`,
    `Topic: ${topic.name.en}.`,
    `Chinese: ${topic.name.cn}.`,
    `Chapter Chinese: ${topic.chapterName.cn}.`,
  ].join(" ");
}

// ── Cache key for a topic+feature combination ─────────────────
export function buildTopicCacheKey(
  topicId: string,
  feature: TopicFeature,
  difficulty = "medium",
  lang = "zh"
): string {
  return `topic:${topicId}:${feature}:${difficulty}:${lang}`;
}
