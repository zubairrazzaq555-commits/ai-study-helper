// ─── Unified AI Engine ────────────────────────────────────────
// Priority:
//   FAST tasks (quiz, summary, chat)    → Groq (llama-3.1-8b-instant)
//   HEAVY tasks (detailed, roadmap)     → OpenRouter key 1
//   FALLBACK if any key fails           → try next key automatically
//
// Usage:
//   import { aiCall, TaskType } from "@/lib/aiEngine";
//   const result = await aiCall("quiz", prompt, { maxTokens: 2000 });

import OpenAI from "openai";

// ── Client instances ──────────────────────────────────────────
const groqClient = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey:  process.env.GROQ_API_KEY || "",
  defaultHeaders: { "X-Title": "StudyAI" },
});

const openrouterClient1 = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:  process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "StudyAI",
  },
});

const openrouterClient2 = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:  process.env.OPENROUTER_API_KEY_2 || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "StudyAI",
  },
});

// ── Model names ───────────────────────────────────────────────
const GROQ_MODEL        = process.env.GROQ_MODEL        || "llama-3.1-8b-instant";
const OPENROUTER_MODEL  = process.env.OPENROUTER_MODEL  || "nvidia/nemotron-3-super-120b-a12b:free";

// ── Task routing ──────────────────────────────────────────────
// fast = Groq first; heavy = OpenRouter first
export type TaskType =
  | "quiz"        // fast  → Groq
  | "summary"     // fast  → Groq
  | "chat"        // fast  → Groq
  | "detailed"    // heavy → OpenRouter
  | "roadmap"     // heavy → OpenRouter
  | "translate";  // fast  → Groq

interface CallOptions {
  maxTokens?:   number;
  temperature?: number;
  stream?:      boolean;
}

interface Provider {
  client: OpenAI;
  model:  string;
  name:   string;
}

// Fast tasks: Groq first, then OR1, then OR2
const FAST_CHAIN: Provider[] = [
  { client: groqClient,        model: GROQ_MODEL,       name: "Groq"  },
  { client: openrouterClient1, model: OPENROUTER_MODEL, name: "OR-1"  },
  { client: openrouterClient2, model: OPENROUTER_MODEL, name: "OR-2"  },
];

// Heavy tasks: OR1 first, then OR2, then Groq
const HEAVY_CHAIN: Provider[] = [
  { client: openrouterClient1, model: OPENROUTER_MODEL, name: "OR-1"  },
  { client: openrouterClient2, model: OPENROUTER_MODEL, name: "OR-2"  },
  { client: groqClient,        model: GROQ_MODEL,       name: "Groq"  },
];

const HEAVY_TASKS: TaskType[] = ["detailed", "roadmap"];

function getChain(task: TaskType): Provider[] {
  return HEAVY_TASKS.includes(task) ? HEAVY_CHAIN : FAST_CHAIN;
}

// ── Core call with auto-fallback ──────────────────────────────
export async function aiCall(
  task: TaskType,
  prompt: string,
  opts: CallOptions = {}
): Promise<string> {
  const chain = getChain(task);
  const { maxTokens = 2000, temperature = 0.6 } = opts;
  const errors: string[] = [];

  for (const provider of chain) {
    try {
      const completion = await provider.client.chat.completions.create({
        model:    provider.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens:  maxTokens,
        temperature,
      });
      const text = completion.choices[0]?.message?.content || "";
      if (!text.trim()) throw new Error("Empty response");
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${provider.name}] ${msg}`);
      console.warn(`aiEngine: ${provider.name} failed for task=${task}:`, msg);
      // Continue to next provider
    }
  }

  throw new Error(`All providers failed for task=${task}. Errors: ${errors.join(" | ")}`);
}

// ── Streaming version (for chat + detailed) ───────────────────
export async function aiStream(
  task: TaskType,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  opts: CallOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const chain = getChain(task);
  const { maxTokens = 1500, temperature = 0.7 } = opts;

  for (const provider of chain) {
    try {
      const stream = await provider.client.chat.completions.create({
        model:    provider.model,
        messages,
        max_tokens:  maxTokens,
        temperature,
        stream:   true,
      });

      // Convert OpenAI stream → Web ReadableStream
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          const enc = new TextEncoder();
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) controller.enqueue(enc.encode(delta));
            }
          } finally {
            controller.close();
          }
        },
      });
    } catch (err) {
      console.warn(`aiEngine stream: ${provider.name} failed:`, err);
    }
  }

  throw new Error(`All providers failed for streaming task=${task}`);
}

// ── Re-export safeParseJSON so routes don't need openrouter.ts ──
export { safeParseJSON } from "@/lib/openrouter";
