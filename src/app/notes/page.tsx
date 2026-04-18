"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Zap, BarChart3, Upload, X, ChevronRight,
  Sparkles, Info, AlignLeft, Hash, Globe, AlertCircle,
  FileUp, Loader2, CheckCircle2, Layers, Bolt
} from "lucide-react";
import { useStudy, OutputType } from "@/lib/StudyContext";
import { saveSesionToStorage } from "@/lib/sessionStorage";
import { parsePdfFile, isPdf, isTextFile, formatFileSize } from "@/lib/pdfParser";
import { getInputStats, WARN_CHAR_LIMIT, HARD_CHAR_LIMIT } from "@/lib/chunker";
import { useLanguage } from "@/lib/i18n";

const SUBJECTS = [
  "General","Mathematics","Science","Chemistry","Physics","Biology",
  "History","Literature","Economics","Computer Science","Law","Medicine",
  "Psychology","Philosophy","Other",
];

const SAMPLE_NOTES = `Photosynthesis is a process used by plants, algae, and some bacteria to convert light energy into chemical energy stored in glucose.

The overall equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

There are two main stages:
1. Light-dependent reactions (in thylakoid membrane)
   - Absorb light energy
   - Split water molecules (photolysis)
   - Produce ATP and NADPH
   - Release oxygen as byproduct

2. Light-independent reactions / Calvin cycle (in stroma)
   - Use ATP and NADPH from light reactions
   - Fix CO₂ into organic molecules
   - Produce G3P (glyceraldehyde-3-phosphate)
   - G3P used to make glucose and other carbohydrates`;

interface FileInfo {
  name: string; size: number; type: "pdf" | "text";
  pageCount?: number; pagesExtracted?: number; truncated?: boolean;
}

interface StreamStatus {
  message: string; step: number; total: number;
}

// Color maps
const CM: Record<string, string> = {
  indigo:  "border-indigo-500/50 bg-indigo-500/10",
  violet:  "border-violet-500/50 bg-violet-500/10",
  emerald: "border-emerald-500/50 bg-emerald-500/10",
};
const IC: Record<string, string> = {
  indigo: "text-indigo-400", violet: "text-violet-400", emerald: "text-emerald-400",
};
const BC: Record<string, string> = {
  indigo:  "bg-indigo-500/20 text-indigo-300",
  violet:  "bg-violet-500/20 text-violet-300",
  emerald: "bg-emerald-500/20 text-emerald-300",
};

export default function NotesInputPage() {
  const router         = useRouter();
  const { setSession } = useStudy();
  const { lang, t }    = useLanguage();
  const nt             = t.notes;

  const [notes,        setNotes]        = useState("");
  const [selectedType, setSelectedType] = useState<OutputType>("summary");
  const [subject,      setSubject]      = useState("General");
  const [difficulty,   setDifficulty]   = useState("medium");
  const [dragging,     setDragging]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [pdfParsing,   setPdfParsing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [fileInfo,     setFileInfo]     = useState<FileInfo | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [fromCache,    setFromCache]    = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  const stats = getInputStats(notes);

  const OUTPUT_TYPES = [
    { id: "summary" as OutputType, icon: FileText, color: "indigo", ...nt.outputTypes.summary },
    { id: "quiz"    as OutputType, icon: Zap,      color: "violet", ...nt.outputTypes.quiz },
    { id: "plan"    as OutputType, icon: BarChart3, color: "emerald",...nt.outputTypes.plan },
  ];

  // ── File processing ──────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setError(null); setFileInfo(null);
    if (isPdf(file)) {
      setPdfParsing(true);
      try {
        const result = await parsePdfFile(file);
        if (!result.text || result.text.length < 20) {
          setError("Could not extract text from this PDF. It may be scanned/image-based.");
          setPdfParsing(false); return;
        }
        setNotes(result.text);
        setFileInfo({ name: file.name, size: file.size, type: "pdf",
          pageCount: result.pageCount, pagesExtracted: result.pagesExtracted, truncated: result.truncated });
      } catch { setError("Failed to read PDF. Please try a different file or paste text directly."); }
      setPdfParsing(false);
    } else if (isTextFile(file)) {
      const reader = new FileReader();
      reader.onload = (ev) => { setNotes(ev.target?.result as string); setFileInfo({ name: file.name, size: file.size, type: "text" }); };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    } else {
      setError("Unsupported file. Please upload PDF, .txt, or .md.");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClear = () => { setNotes(""); setFileInfo(null); setError(null); setStreamStatus(null); };

  // ── Streaming generate ───────────────────────────────────────
  const handleGenerate = async () => {
    if (!notes.trim() || loading) return;
    setError(null); setStreamStatus(null); setFromCache(false); setLoading(true);

    // Cancel any previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, subject, difficulty, type: selectedType }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error || "Request failed. Please try again.");
        setLoading(false); return;
      }

      if (!res.body) { setError("No response body."); setLoading(false); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; message?: string; step?: number; total?: number;
              success?: boolean; data?: unknown; cached?: boolean; error?: string;
            };

            if (event.type === "status") {
              setStreamStatus({ message: event.message || "", step: event.step ?? 0, total: event.total ?? 1 });
            } else if (event.type === "done" && event.success && event.data) {
              setFromCache(!!event.cached);
              setSession({ notes, subject, difficulty, type: selectedType, result: event.data as never });
              saveSesionToStorage({
                title: (event.data as { title?: string }).title || `${subject} ${selectedType}`,
                subject, type: selectedType, difficulty,
                createdAt: new Date().toISOString(),
                wordCount: stats.words,
              });
              router.push(`/output?type=${selectedType}&subject=${encodeURIComponent(subject)}`);
              return;
            } else if (event.type === "error") {
              setError(event.message || "Generation failed.");
              setLoading(false); return;
            }
          } catch { /* ignore parse errors on partial lines */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Network error — please check your connection.");
    }
    setLoading(false);
  };

  // Progress bar pct
  const progressPct = streamStatus
    ? Math.round((streamStatus.step / Math.max(streamStatus.total, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-5">
          <Sparkles className="w-3 h-3" /> {nt.badge}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-3">{nt.title}</h1>
        <p className="text-zinc-400 text-base">{nt.subtitle}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Input size warnings */}
      {notes.length > WARN_CHAR_LIMIT && notes.length <= HARD_CHAR_LIMIT && !loading && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-300">
          <Layers className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">
            {lang === "en"
              ? `Large input (${stats.chunks} chunks) — will use parallel processing for speed`
              : `大型输入（${stats.chunks} 个块）— 将使用并行处理以提高速度`}
          </p>
        </div>
      )}
      {notes.length > HARD_CHAR_LIMIT && !loading && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-orange-500/25 bg-orange-500/8 text-orange-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">
            {lang === "en"
              ? `Input exceeds ${Math.round(HARD_CHAR_LIMIT / 1000)}K char limit — first ${Math.round(HARD_CHAR_LIMIT / 1000)}K will be used`
              : `输入超过 ${Math.round(HARD_CHAR_LIMIT / 1000)}K 字符限制 — 将使用前 ${Math.round(HARD_CHAR_LIMIT / 1000)}K`}
          </p>
        </div>
      )}

      {/* ── Streaming progress UI ──────────────────────────── */}
      {loading && (
        <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4 animate-fade-in">
          {/* Status message */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {streamStatus?.message || (lang === "en" ? "Connecting to AI..." : "正在连接 AI...")}
              </p>
              {streamStatus && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {lang === "en" ? `Step ${streamStatus.step} of ${streamStatus.total}` : `第 ${streamStatus.step} / ${streamStatus.total} 步`}
                </p>
              )}
            </div>
            <span className="text-sm font-bold text-indigo-400">{progressPct}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progressPct, loading ? 5 : 0)}%` }}
            />
          </div>

          {/* Cancel button */}
          <div className="flex justify-end">
            <button
              onClick={() => { abortRef.current?.abort(); setLoading(false); setStreamStatus(null); }}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              {lang === "en" ? "Cancel" : "取消"}
            </button>
          </div>
        </div>
      )}

      {/* Cache hit badge */}
      {fromCache && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 text-emerald-300 text-sm animate-fade-in">
          <Bolt className="w-4 h-4" />
          {lang === "en" ? "⚡ Loaded from cache — instant result!" : "⚡ 从缓存加载 — 即时结果！"}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Left: Input ───────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* File info */}
          {fileInfo && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{fileInfo.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatFileSize(fileInfo.size)}
                  {fileInfo.type === "pdf" && ` · ${fileInfo.pagesExtracted} pages`}
                  {fileInfo.truncated && ` · truncated`}
                  {` · ${stats.words.toLocaleString()} words`}
                </p>
              </div>
              <button onClick={handleClear} className="p-1 text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Textarea */}
          <div
            className={`relative rounded-2xl border-2 transition-all duration-200 ${
              dragging ? "border-indigo-500/70 bg-indigo-500/10" : "border-white/10 bg-zinc-900/60 hover:border-white/15"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
            onDrop={handleDrop}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/7">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" />{stats.words.toLocaleString()} {nt.words}
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />{notes.length.toLocaleString()} {nt.chars}
                </span>
                {stats.chunks > 1 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Layers className="w-3 h-3" />
                    {stats.chunks} {lang === "en" ? "chunks" : "块"}
                  </span>
                )}
                {stats.tokens > 0 && (
                  <span className="text-zinc-600 hidden sm:flex items-center gap-1">
                    ~{stats.tokens.toLocaleString()} tokens
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!notes && (
                  <button onClick={() => { setNotes(SAMPLE_NOTES); setFileInfo(null); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all">
                    {nt.useSample}
                  </button>
                )}
                {notes && (
                  <button onClick={handleClear} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); if (fileInfo) setFileInfo(null); }}
              disabled={loading || pdfParsing}
              placeholder={lang === "en"
                ? "Paste your notes, lecture content, or any study material here...\n\nOr drag & drop a PDF, .txt, or .md file."
                : "在此粘贴您的笔记、讲义内容或任何学习材料...\n\n或拖放 PDF、.txt 或 .md 文件。"}
              className="w-full h-64 bg-transparent text-zinc-200 placeholder-zinc-600 text-sm leading-relaxed resize-none px-5 py-4 focus:outline-none font-mono disabled:opacity-50"
            />

            {/* PDF parsing overlay */}
            {pdfParsing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-900/85 backdrop-blur-sm gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm text-zinc-300 font-medium">{nt.pdfParsing}</p>
              </div>
            )}

            {dragging && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl pointer-events-none gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border-2 border-dashed border-indigo-500/60 flex items-center justify-center">
                  <FileUp className="w-7 h-7 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-indigo-300">{nt.dropHere}</p>
              </div>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || pdfParsing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-sm transition-all disabled:opacity-40 group"
          >
            <Upload className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
            {nt.uploadBtn}
          </button>
          <input
            ref={fileInputRef} type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
          />

          {/* Subject + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> {nt.subject}
              </label>
              <select
                value={subject} onChange={(e) => setSubject(e.target.value)} disabled={loading}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer disabled:opacity-50"
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {nt.difficulty}
              </label>
              <div className="flex gap-2">
                {(["easy","medium","hard"] as const).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                      difficulty === d
                        ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300"
                        : "border border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15"
                    }`}>
                    {d === "easy" ? nt.easy : d === "medium" ? nt.medium : nt.hard}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Output type + Generate ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-300 mb-1">{nt.outputType}</p>
            <p className="text-xs text-zinc-500 mb-4">{nt.outputSubtitle}</p>

            <div className="space-y-3">
              {OUTPUT_TYPES.map(({ id, icon: Icon, label, desc, badge, color }) => {
                const active = selectedType === id;
                return (
                  <button key={id} onClick={() => setSelectedType(id)} disabled={loading}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 disabled:opacity-60 ${
                      active ? CM[color] : "border-white/7 bg-zinc-900/40 hover:border-white/15 hover:bg-zinc-900/60"
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-white/10" : "bg-zinc-800"}`}>
                        <Icon className={`w-4 h-4 ${active ? IC[color] : "text-zinc-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-sm font-semibold ${active ? "text-white" : "text-zinc-300"}`}>{label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md ${active ? BC[color] : "bg-zinc-800 text-zinc-500"}`}>{badge}</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-snug">{desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!notes.trim() || loading || pdfParsing}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              notes.trim() && !loading && !pdfParsing
                ? "bg-indigo-600 hover:bg-indigo-500 text-white glow-accent shadow-lg shadow-indigo-900/30"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{nt.generating}</span></>
              : pdfParsing
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{nt.pdfParsing}</span></>
              : <><Sparkles className="w-4 h-4" />{nt.generateBtn}<ChevronRight className="w-4 h-4" /></>
            }
          </button>

          {/* Performance hints */}
          {!loading && notes.trim() && (
            <div className="space-y-1.5">
              {stats.chunks > 1 && (
                <p className="text-center text-xs text-amber-500">
                  ⚡ {lang === "en" ? `Parallel processing: ${stats.chunks} chunks` : `并行处理：${stats.chunks} 个块`}
                </p>
              )}
              <p className="text-center text-xs text-zinc-600">
                {lang === "en" ? "~10–30 seconds · Results cached for 1 hour" : "约 10–30 秒 · 结果缓存 1 小时"}
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5">
            <p className="text-xs font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" /> {nt.tips}
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-500">
              {nt.tipsList.map((tip, i) => <li key={i}>• {tip}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
