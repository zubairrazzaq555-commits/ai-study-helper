// Chunk-based text processing for large documents
// Handles PDFs and long text inputs without hitting token limits

export const MAX_CHARS_PER_CHUNK = 12000;  // ~3000 tokens per chunk — safe for most models
export const MAX_CHUNKS = 6;               // process max 6 chunks → ~72k chars total
export const HARD_CHAR_LIMIT = 80000;      // absolute hard limit before chunking

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
  isLast: boolean;
}

/**
 * Split text into manageable chunks.
 * Tries to split on paragraph/sentence boundaries for better context.
 */
export function chunkText(text: string): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (cleaned.length <= MAX_CHARS_PER_CHUNK) {
    return [{ index: 0, text: cleaned, charCount: cleaned.length, isLast: true }];
  }

  const chunks: string[] = [];
  let remaining = cleaned.slice(0, HARD_CHAR_LIMIT); // enforce absolute limit

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point — prefer paragraph, then sentence, then word
    let splitAt = MAX_CHARS_PER_CHUNK;
    const slice = remaining.slice(0, MAX_CHARS_PER_CHUNK);

    const paraBreak = slice.lastIndexOf("\n\n");
    if (paraBreak > MAX_CHARS_PER_CHUNK * 0.6) {
      splitAt = paraBreak + 2;
    } else {
      const sentBreak = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("。"),
      );
      if (sentBreak > MAX_CHARS_PER_CHUNK * 0.5) {
        splitAt = sentBreak + 2;
      } else {
        const wordBreak = slice.lastIndexOf(" ");
        if (wordBreak > MAX_CHARS_PER_CHUNK * 0.4) splitAt = wordBreak + 1;
      }
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();

    if (chunks.length >= MAX_CHUNKS) {
      // Add remaining as last chunk if there's meaningful content
      if (remaining.length > 100) {
        chunks[chunks.length - 1] += "\n\n[Note: Document truncated for processing]";
      }
      break;
    }
  }

  return chunks.map((text, i) => ({
    index: i,
    text,
    charCount: text.length,
    isLast: i === chunks.length - 1,
  }));
}

/**
 * Merge multiple AI-generated summaries into one coherent result.
 * Called when a document is too large and was split into chunks.
 */
export function buildMergePrompt(
  summaries: string[],
  subject: string,
  outputType: "summary" | "quiz" | "plan"
): string {
  const combined = summaries
    .map((s, i) => `--- Part ${i + 1} ---\n${s}`)
    .join("\n\n");

  if (outputType === "summary") {
    return `You are an expert study assistant. Below are AI-generated summaries of different parts of a ${subject} document. 
Merge them into ONE comprehensive, unified summary.

${combined}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "title": "Unified Topic Title",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "sections": [
    { "heading": "Section Title", "content": "Detailed content." }
  ],
  "concepts": ["Concept1", "Concept2", "Concept3"]
}`;
  }

  if (outputType === "quiz") {
    return `You are an expert quiz creator. Below are AI-generated quiz questions from different parts of a ${subject} document.
Select the best 6-8 unique questions, remove duplicates, and return them as one unified quiz.

${combined}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "title": "Unified Quiz Title",
  "subject": "${subject}",
  "questions": [
    {
      "id": 1,
      "question": "Question?",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Explanation."
    }
  ]
}`;
  }

  // plan
  return `You are an expert study planner. Below are partial study plans generated from different parts of a ${subject} document.
Merge them into ONE coherent study plan. Remove duplicates and create a logical sequence.

${combined}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "title": "Unified Study Plan",
  "subject": "${subject}",
  "totalDays": 5,
  "estimatedHours": 8,
  "days": [
    {
      "day": 1,
      "title": "Day Title",
      "duration": "1.5 hrs",
      "tasks": ["Task 1", "Task 2"]
    }
  ]
}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadTime(text: string): string {
  const words = countWords(text);
  const mins = Math.ceil(words / 200);
  return mins <= 1 ? "< 1 min" : `${mins} min`;
}
