// ─── Smart Chunking System ───────────────────────────────────
// Splits large text into logical chunks for parallel AI processing

export const MAX_CHARS_PER_CHUNK = 8000;   // ~2000 tokens — faster per chunk
export const MAX_CHUNKS          = 6;      // max 6 parallel chunks
export const HARD_CHAR_LIMIT     = 50000;  // absolute limit — beyond this we truncate
export const WARN_CHAR_LIMIT     = 8000;   // show warning above this

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
  isLast: boolean;
}

/**
 * Smart paragraph-aware chunker.
 * Priority: paragraph break → sentence break → word break
 */
export function chunkText(text: string): TextChunk[] {
  // Normalize whitespace
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Enforce hard limit
  const capped = cleaned.length > HARD_CHAR_LIMIT
    ? cleaned.slice(0, HARD_CHAR_LIMIT)
    : cleaned;

  // Single chunk — no need to split
  if (capped.length <= MAX_CHARS_PER_CHUNK) {
    return [{ index: 0, text: capped, charCount: capped.length, isLast: true }];
  }

  const chunks: string[] = [];
  let remaining = capped;

  while (remaining.length > 0 && chunks.length < MAX_CHUNKS) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push(remaining.trim());
      break;
    }

    const window = remaining.slice(0, MAX_CHARS_PER_CHUNK);
    let splitAt = MAX_CHARS_PER_CHUNK;

    // 1. Prefer paragraph break
    const para = window.lastIndexOf("\n\n");
    if (para > MAX_CHARS_PER_CHUNK * 0.5) {
      splitAt = para + 2;
    } else {
      // 2. Prefer sentence end
      const sent = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
        window.lastIndexOf("。"),
        window.lastIndexOf("！"),
        window.lastIndexOf("？"),
      );
      if (sent > MAX_CHARS_PER_CHUNK * 0.4) {
        splitAt = sent + 2;
      } else {
        // 3. Fallback: word break
        const word = window.lastIndexOf(" ");
        if (word > MAX_CHARS_PER_CHUNK * 0.3) splitAt = word + 1;
      }
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.map((text, i) => ({
    index: i,
    text,
    charCount: text.length,
    isLast: i === chunks.length - 1,
  }));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars for English, 2 chars for Chinese
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const rest = text.length - chinese;
  return Math.ceil(chinese / 2 + rest / 4);
}

export function getInputStats(text: string) {
  const chars    = text.length;
  const words    = countWords(text);
  const tokens   = estimateTokens(text);
  const chunks   = chunkText(text).length;
  const willWarn = chars > WARN_CHAR_LIMIT;
  const isCapped = chars > HARD_CHAR_LIMIT;

  return { chars, words, tokens, chunks, willWarn, isCapped };
}
