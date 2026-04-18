"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Loader2, RefreshCw, Sparkles,
  MessageSquare, AlertCircle
} from "lucide-react";

interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  loading?: boolean;
}

interface ChatbotPanelProps {
  topicId:    string;
  topicName:  string;
  chapterName: string;
  lang:       "en" | "zh";
}

const SUGGESTIONS = {
  en: [
    "Explain this topic simply",
    "Give me a real-world example",
    "What formula should I remember?",
    "What are common mistakes?",
    "Can you test me with a question?",
  ],
  zh: [
    "简单解释一下这个主题",
    "给我一个生活中的例子",
    "我需要记住哪个公式？",
    "常见错误有哪些？",
    "可以用一个问题测试我吗？",
  ],
};

let msgIdCounter = 0;
function newId() { return `msg_${++msgIdCounter}_${Date.now()}`; }

export default function ChatbotPanel({ topicId, topicName, chapterName, lang }: ChatbotPanelProps) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState("");
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    setMessages([{
      id:      newId(),
      role:    "assistant",
      content: lang === "en"
        ? `Hi! I'm your AI tutor for **${topicName}**. Ask me anything about this topic — definitions, examples, formulas, or practice questions. I'm here to help! 🎓`
        : `你好！我是**${topicName}**的 AI 辅导老师。关于这个主题，你可以问我任何问题——定义、例子、公式或练习题。我来帮你！🎓`,
    }]);
  }, [topicId, lang, topicName]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || streaming) return;

    setError("");
    setInput("");

    // Add user message
    const userMsg: Message = { id: newId(), role: "user", content: userText };
    const loadingMsg: Message = { id: newId(), role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setStreaming(true);

    // Build history for API (exclude loading msg)
    const history = [...messages, userMsg].map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/syllabus/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ topicId, messages: history, lang }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || "Chat failed");
      }

      if (!res.body) throw new Error("No response body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   fullText = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        // Update the loading message with streamed text
        setMessages((prev) =>
          prev.map((m) => m.loading ? { ...m, content: fullText, loading: false } : m)
        );
      }

      // Ensure loading flag is cleared
      setMessages((prev) =>
        prev.map((m) => m.loading ? { ...m, content: fullText || "...", loading: false } : m)
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setMessages((prev) => prev.filter((m) => !m.loading));
    } finally {
      setStreaming(false);
    }
  }, [streaming, messages, topicId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setStreaming(false);
    // Re-trigger welcome message
    setTimeout(() => {
      setMessages([{
        id:      newId(),
        role:    "assistant",
        content: lang === "en"
          ? `Chat reset. Ask me anything about **${topicName}**! 🎓`
          : `对话已重置。问我任何关于**${topicName}**的问题！🎓`,
      }]);
    }, 50);
  };

  const suggestions = SUGGESTIONS[lang];

  // Simple markdown bold renderer
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "520px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/7 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {lang === "en" ? "AI Tutor" : "AI 辅导老师"}
            </p>
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{topicName}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-emerald-400 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {lang === "en" ? "Online" : "在线"}
          </span>
        </div>
        <button onClick={handleReset}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          title={lang === "en" ? "Reset chat" : "重置对话"}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === "assistant" ? "bg-emerald-500/20" : "bg-indigo-500/20"
            }`}>
              {msg.role === "assistant"
                ? <Bot className="w-3.5 h-3.5 text-emerald-400" />
                : <User className="w-3.5 h-3.5 text-indigo-400" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-600/30 border border-indigo-500/30 text-zinc-200 rounded-tr-sm"
                : "bg-zinc-800/70 border border-white/7 text-zinc-300 rounded-tl-sm"
            }`}>
              {msg.loading ? (
                <div className="flex items-center gap-2 py-0.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span className="text-zinc-500 text-xs">
                    {lang === "en" ? "Thinking..." : "思考中..."}
                  </span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Suggestions (when no conversation yet) */}
        {messages.length <= 1 && !streaming && (
          <div className="pt-1 space-y-1.5">
            <p className="text-xs text-zinc-600 mb-2">
              {lang === "en" ? "Try asking:" : "尝试问："}
            </p>
            {suggestions.map((s) => (
              <button key={s} onClick={() => sendMessage(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-xl border border-white/8 text-zinc-400 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/5 shrink-0">
        <div className="flex items-end gap-2 bg-zinc-800/60 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-indigo-500/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder={lang === "en" ? "Ask anything about this topic..." : "问任何关于该主题的问题..."}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none py-0.5 max-h-24 disabled:opacity-50"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              input.trim() && !streaming
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}>
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-xs text-zinc-700 mt-1.5 text-center">
          {lang === "en" ? "Enter to send · Shift+Enter for new line" : "回车发送 · Shift+回车换行"}
        </p>
      </div>
    </div>
  );
}
