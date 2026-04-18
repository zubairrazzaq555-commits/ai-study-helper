import { NextRequest, NextResponse } from "next/server";
import { openrouter, MODEL } from "@/lib/openrouter";
import { checkRateLimit, getClientIP } from "@/lib/rateLimit";

// Simple language detection — checks for Chinese characters
function detectLang(text: string): "en" | "zh" {
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/g);
  const chineseRatio = (chineseChars?.length || 0) / text.length;
  return chineseRatio > 0.1 ? "zh" : "en";
}

export async function POST(req: NextRequest) {
  // Light rate limiting for translate (20/min — cheaper calls)
  const ip = getClientIP(req);
  const rl = checkRateLimit(`translate_${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Wait ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { text, targetLang } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Text too long for translation." }, { status: 400 });
    }
    if (!["en", "zh"].includes(targetLang)) {
      return NextResponse.json({ error: "targetLang must be 'en' or 'zh'." }, { status: 400 });
    }

    const sourceLang = detectLang(text);

    // Already in target language — return as-is
    if (sourceLang === targetLang) {
      return NextResponse.json({ success: true, translated: text, alreadyInTarget: true });
    }

    const targetName = targetLang === "zh" ? "Chinese (Simplified)" : "English";
    const prompt = `Translate the following text to ${targetName}. 
Return ONLY the translated text with no explanation, no quotes, no preamble.
Preserve the original tone and meaning exactly.

Text to translate:
${text}`;

    const completion = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    const translated = completion.choices[0]?.message?.content?.trim() || "";

    if (!translated) {
      return NextResponse.json({ error: "Translation failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, translated, sourceLang, targetLang });
  } catch (error: unknown) {
    console.error("Translate API error:", error);
    return NextResponse.json({ error: "Translation failed. Please try again." }, { status: 500 });
  }
}
