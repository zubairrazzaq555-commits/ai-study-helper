import OpenAI from "openai";

// OpenRouter uses OpenAI-compatible API
export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "StudyAI",
  },
});

export const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

// ── Prompts ──────────────────────────────────────────────────

export function buildSummaryPrompt(notes: string, subject: string, difficulty: string): string {
  return `You are an expert study assistant. Analyze the following ${subject} notes and create a comprehensive study summary.

NOTES:
${notes}

Create a structured summary with:
1. A clear TITLE for this topic
2. KEY_POINTS: 5-7 most important bullet points (each on new line starting with •)
3. SECTIONS: 2-4 detailed sections with headings and explanations
4. CONCEPTS: 6-10 key terms/concepts as a comma-separated list

Difficulty level: ${difficulty}

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "title": "Topic Title Here",
  "keyPoints": [
    "First key point",
    "Second key point"
  ],
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Detailed explanation paragraph here."
    }
  ],
  "concepts": ["Concept1", "Concept2", "Concept3"]
}`;
}

export function buildQuizPrompt(notes: string, subject: string, difficulty: string): string {
  const numQ = difficulty === "hard" ? 8 : difficulty === "easy" ? 4 : 6;
  return `You are an expert quiz creator. Based on the following ${subject} notes, create ${numQ} multiple choice questions.

NOTES:
${notes}

Difficulty: ${difficulty}

Rules:
- Each question must have exactly 4 options (index 0-3)
- "correct" field must be the index (0, 1, 2, or 3) of the right answer
- Write clear, specific questions that test understanding
- Provide a brief explanation for each correct answer

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "title": "Quiz Title",
  "subject": "${subject}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation why this is correct."
    }
  ]
}`;
}

export function buildStudyPlanPrompt(notes: string, subject: string, difficulty: string): string {
  const days = difficulty === "hard" ? 7 : difficulty === "easy" ? 3 : 5;
  return `You are an expert study planner. Based on the following ${subject} notes, create a ${days}-day study plan.

NOTES:
${notes}

Difficulty: ${difficulty}

Create a realistic, actionable study plan. Each day should have 3-5 specific tasks.

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "title": "Study Plan Title",
  "subject": "${subject}",
  "totalDays": ${days},
  "estimatedHours": 8,
  "days": [
    {
      "day": 1,
      "title": "Day Title",
      "duration": "1.5 hrs",
      "tasks": [
        "Specific task description here",
        "Another task"
      ]
    }
  ]
}`;
}

// ── Safe JSON parser ──────────────────────────────────────────
export function safeParseJSON<T>(text: string): T | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract JSON from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
