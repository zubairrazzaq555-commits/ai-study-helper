import { NextRequest } from "next/server";
import { aiStream } from "@/lib/aiEngine";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";
import { getTopicById } from "@/lib/syllabusLoader";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = checkRateLimit(`chat_${ip}`);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `请求过多，请稍后再试。` }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { topicId, messages, lang = "zh" } = body as {
    topicId: string;
    messages: ChatMessage[];
    lang?: "en" | "zh";
  };

  if (!topicId || !messages?.length) {
    return new Response(
      JSON.stringify({ error: "topicId and messages are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    return new Response(
      JSON.stringify({ error: `Topic '${topicId}' not found.` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Build language-aware system prompt with notes injected ────
  const notes = topic.notes;

  const systemContent = lang === "zh"
    ? `你是一位友好、专业的九年级物理辅导老师。
你正在帮助学生学习："${topic.name.cn}"（${topic.chapterName.cn}章节）。

【本主题课程笔记（以下为你的主要参考资料）】：
---
简短说明：${notes.short_cn || notes.short}

详细说明：${notes.detailed_cn || notes.detailed}
---

【重要规则】：
1. 必须始终用简体中文回答，绝对不能用英文回答
2. 只回答与本主题相关的物理问题
3. 所有解释必须基于以上课程笔记，保持与课程一致
4. 使用九年级学生能理解的简单语言
5. 回答简洁清晰（通常3-6句话）
6. 如果学生提问偏离主题，用中文礼貌引导回本知识点
7. 如果涉及公式，参考笔记中的公式清晰展示
8. 鼓励遇到困难的学生，用积极的语气

请始终用简体中文与学生交流。`
    : `You are a friendly, expert Grade 9 Physics tutor.
You are helping a student learn: "${topic.name.en}" from chapter "${topic.chapterName.en}".

SYLLABUS NOTES FOR THIS TOPIC:
---
Short: ${notes.short}
Detailed: ${notes.detailed}
---

Rules:
- Always respond in English
- Answer ONLY questions related to this topic or closely related physics concepts
- Base your answers on the syllabus notes above
- Use simple, student-friendly language (Grade 9 level)
- Keep answers concise (3-6 sentences)
- Encourage struggling students`;

  const systemMessage = { role: "system" as const, content: systemContent };

  const trimmedMessages = messages.slice(-10);

  try {
    const stream = await aiStream(
      "chat",
      [systemMessage, ...trimmedMessages],
      { maxTokens: 700, temperature: 0.7 }
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({ error: lang === "zh" ? "AI服务暂时不可用，请重试。" : "Chat service unavailable. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
