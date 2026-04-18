"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Sparkles, FileText, Zap, BookOpen, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Loader2, Target,
  AlertCircle, Copy, ThumbsUp, ThumbsDown, ChevronRight,
  GraduationCap, FlaskConical, Bolt, Layers, Lightbulb,
  AlertTriangle, ArrowRight, Trophy, MessageSquare, Hash,
  BookMarked, Beaker
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { slugToTopicId, getTopicById, syllabus, getAllTopics } from "@/lib/syllabusLoader";
import { getTopicNotes, buildAIContext } from "@/lib/syllabusNotes";
import {
  getTopicProgress, markSummaryRead, markDetailedRead,
  saveQuizScore, markTopicComplete,
} from "@/lib/topicProgress";
import { recordQuizAttempt } from "@/lib/analyticsStore";
import { getTodayTask, markDayComplete, makeSubjectId } from "@/lib/roadmapStore";
import type { Topic, TopicQuizResult } from "@/lib/syllabusData";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import ChatbotPanel from "@/components/ChatbotPanel";

type TabId = "short" | "detailed" | "quiz" | "chat";
const SUBJECT_ID = makeSubjectId(syllabus.subjectCode, syllabus.gradeCode);

// ── StudyFlowBar ──────────────────────────────────────────────
function StudyFlowBar({ shortRead, detailedRead, quizDone, lang, onStep }:
  { shortRead: boolean; detailedRead: boolean; quizDone: boolean; lang: "en" | "zh"; onStep: (t: TabId) => void }
) {
  const steps: Array<{ id: TabId; label: string; done: boolean }> = [
    { id: "short",    label: lang === "en" ? "Short Note"   : "简短笔记", done: shortRead    },
    { id: "detailed", label: lang === "en" ? "Deep Read"    : "深入阅读", done: detailedRead },
    { id: "quiz",     label: lang === "en" ? "Quiz"         : "测验",    done: quizDone     },
    { id: "chat",     label: lang === "en" ? "Ask AI"       : "问 AI",   done: false        },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / 3) * 100); // chat doesn't count

  return (
    <div className="p-4 rounded-2xl border border-white/7 bg-zinc-900/50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Hash className="w-3 h-3" />{lang === "en" ? "Study Flow" : "学习流程"}
        </p>
        <p className="text-xs text-zinc-500">{doneCount}/3 {lang === "en" ? "steps" : "步"}</p>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {steps.map((step, i) => (
          <button key={step.id} onClick={() => onStep(step.id)}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all border ${
              step.done
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "border-white/8 text-zinc-500 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/5"
            }`}>
            {step.done
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px]">{i + 1}</span>
            }
            <span className="leading-tight text-center">{step.label}</span>
          </button>
        ))}
      </div>
      <Progress value={pct} color="emerald" size="sm" />
    </div>
  );
}

// ── ShortNoteTab — STATIC, instant from JSON ──────────────────
function ShortNoteTab({ topic, lang, onRead }: { topic: Topic; lang: "en" | "zh"; onRead: () => void }) {
  const notes = getTopicNotes(topic.topicId, lang); // pass lang for CN/EN notes

  useEffect(() => { onRead(); }, []); // mark as read immediately on render

  if (!notes?.short) return (
    <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50 text-zinc-400 text-sm">
      {lang === "en" ? "No short note available for this topic." : "此主题没有简短笔记。"}
    </div>
  );

  // Parse note: split by Chinese period (。) or English period (.) for key points
  const lines = lang === "zh"
    ? notes.short.split(/[。，]/).filter((s) => s.trim().length > 5)
    : notes.short.split(". ").filter(Boolean);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Instant badge — no AI used */}
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Bolt className="w-3.5 h-3.5" />
        {lang === "en" ? "Loaded instantly from syllabus — no AI needed" : "从课程表即时加载——无需 AI"}
      </div>

      {/* Topic header card */}
      <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
        <div className="flex items-center gap-2 mb-3">
          <BookMarked className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-indigo-300">
            {lang === "en" ? "Quick Summary" : "快速摘要"}
          </h3>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{notes.short}</p>
      </div>

      {/* Key sentences as structured list */}
      {lines.length > 1 && (
        <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            {lang === "en" ? "Key Points" : "关键点"}
          </h3>
          <ul className="space-y-2.5">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold shrink-0 mt-0.5">{i + 1}</div>
                {line.endsWith(".") ? line : line + "."}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA to go deeper */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-zinc-400 flex-1">
          {lang === "en"
            ? "This is the quick version. Read the detailed explanation to fully understand this topic."
            : "这是简短版本。阅读详细说明以完全理解本主题。"}
        </p>
        <button onClick={() => onRead()}
          className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap">
          {lang === "en" ? "Read in Detail →" : "阅读详情 →"}
        </button>
      </div>
    </div>
  );
}

// ── DetailedTab — STATIC, instant from JSON ───────────────────
function DetailedTab({ topic, lang, onRead }: { topic: Topic; lang: "en" | "zh"; onRead: () => void }) {
  const notes = getTopicNotes(topic.topicId, lang); // pass lang for CN/EN notes
  const [expanded, setExpanded] = useState(true);

  useEffect(() => { onRead(); }, []); // mark as read immediately

  if (!notes?.detailed) return (
    <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50 text-zinc-400 text-sm">
      {lang === "en" ? "No detailed note available for this topic." : "此主题没有详细笔记。"}
    </div>
  );

  const text = notes.detailed;

  // Extract formulas — works for both EN and CN notes
  const formulaMatch = text.match(/[A-Za-zηαβΔ]\s*=\s*[A-Za-z0-9\s/×÷+\-().²³⁻¹⁴⁶Δ%]+/g);
  const formulas = formulaMatch
    ? [...new Set(formulaMatch.filter(f => f.length > 3 && f.length < 60))].slice(0, 3)
    : [];

  // Split paragraphs: Chinese uses 。as sentence end; English uses ". " before capital
  const paragraphs = lang === "zh"
    ? text.split(/(?<=。)\s*(?=[（\u4e00-\u9fff（A-Z])/).filter(p => p.trim().length > 15)
    : text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(p => p.length > 30);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Instant badge */}
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Bolt className="w-3.5 h-3.5" />
        {lang === "en" ? "Loaded instantly from syllabus — no AI needed" : "从课程表即时加载——无需 AI"}
      </div>

      {/* Formulas callout box */}
      {formulas.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/8">
          <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            {lang === "en" ? "Key Formulas" : "关键公式"}
          </p>
          <div className="flex flex-wrap gap-2">
            {formulas.map((f, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 font-mono text-xs">
                {f.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main detailed content — student-friendly layout */}
      <div className="rounded-2xl border border-violet-500/15 bg-zinc-900/60 overflow-hidden">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">
              {lang === "en" ? "Full Explanation" : "完整说明"}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 border-t border-white/5 pt-4">
            {paragraphs.length > 1 ? (
              <div className="space-y-4">
                {paragraphs.map((para, i) => (
                  <p key={i} className="text-sm text-zinc-300 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
            )}
          </div>
        )}
      </div>

      {/* Study tips */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
        <Beaker className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-emerald-400 mb-1">
            {lang === "en" ? "Ready to test yourself?" : "准备好测试自己了吗？"}
          </p>
          <p className="text-xs text-zinc-400">
            {lang === "en"
              ? "You've read the full explanation. Take the quiz to check your understanding — or ask the AI tutor if anything is unclear."
              : "您已阅读完整说明。参加测验检查理解程度，或向 AI 辅导老师提问。"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── QuizTab — AI powered with JSON context injected ───────────
function QuizTab({ topic, lang, difficulty, onScore }:
  { topic: Topic; lang: "en" | "zh"; difficulty: "easy" | "medium" | "hard"; onScore: (s: number, t: number) => void }
) {
  const [data, setData]       = useState<TopicQuizResult | null>(null);
  const [loading, setL]       = useState(false);
  const [error, setE]         = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSub]   = useState(false);
  const [expanded, setExp]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setL(true); setE(""); setAnswers({}); setSub(false);
    try {
      const res = await fetch("/api/syllabus/generate/quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.topicId, difficulty, lang }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) { setE(j.error || "Failed"); setL(false); return; }
      setData(j.data);
    } catch { setE("Network error."); }
    setL(false);
  }, [topic.topicId, difficulty, lang]);

  useEffect(() => { load(); }, [load]);

  const submit = () => {
    if (!data) return;
    const score = data.questions.filter((q) => answers[q.id] === q.correct).length;
    setSub(true);
    onScore(score, data.total);
  };

  if (loading) return (
    <div className="flex items-center gap-3 p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
      <div>
        <p className="text-sm text-zinc-300">{lang === "en" ? "Generating quiz using your syllabus notes..." : "使用课程笔记生成测验..."}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{lang === "en" ? "AI reads your notes to make relevant questions" : "AI 读取笔记生成相关问题"}</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm">{error}</p>
        <button onClick={load} className="text-xs text-indigo-400 mt-1.5 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    </div>
  );
  if (!data) return null;

  const score = data.questions.filter((q) => answers[q.id] === q.correct).length;
  const pct   = Math.round((score / data.total) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score result */}
      {submitted && (
        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${pct >= 80 ? "border-emerald-500/30 bg-emerald-500/10" : pct >= 60 ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          <div className={`text-4xl font-display font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}/{data.total}</div>
          <div>
            <p className="font-semibold text-white">{pct >= 80 ? "Excellent! 🎉" : pct >= 60 ? "Good job! 💪" : "Keep practicing! 📚"}</p>
            <p className="text-sm text-zinc-400">{pct}% correct</p>
          </div>
          <button onClick={() => { setAnswers({}); setSub(false); load(); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> {lang === "en" ? "Retry" : "重试"}
          </button>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {data.questions.map((q, qi) => {
          const sel = answers[q.id];
          const isOk  = submitted && sel === q.correct;
          const isBad = submitted && sel !== undefined && sel !== q.correct;
          return (
            <div key={q.id} className={`rounded-2xl border ${isOk ? "border-emerald-500/30 bg-emerald-500/5" : isBad ? "border-red-500/30 bg-red-500/5" : "border-white/7 bg-zinc-900/50"}`}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 mt-0.5">{qi + 1}</span>
                  <p className="text-sm font-medium text-white leading-snug">{q.question}</p>
                </div>
                <div className="space-y-2 ml-9">
                  {q.options.map((opt, oi) => {
                    const isSel = sel === oi;
                    const ok2   = submitted && oi === q.correct;
                    const bad2  = submitted && isSel && oi !== q.correct;
                    return (
                      <button key={oi} disabled={submitted} onClick={() => setAnswers((p) => ({ ...p, [q.id]: oi }))}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                          ok2   ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : bad2  ? "bg-red-500/20 border border-red-500/40 text-red-300"
                          : isSel ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                          : "border border-white/7 text-zinc-400 hover:border-white/15 hover:text-zinc-200 hover:bg-white/3"
                        }`}>
                        <span className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">{String.fromCharCode(65 + oi)}</span>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <button onClick={() => setExp(expanded === q.id ? null : q.id)}
                    className="mt-3 ml-9 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                    {lang === "en" ? "Explanation" : "解释"}
                    {expanded === q.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {submitted && expanded === q.id && (
                  <div className="mt-2 ml-9 p-3 rounded-xl bg-zinc-800/60 text-xs text-zinc-400 leading-relaxed">{q.explanation}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <button onClick={submit} disabled={Object.keys(answers).length < data.total}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
            Object.keys(answers).length === data.total
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}>
          {lang === "en"
            ? `Submit Quiz (${Object.keys(answers).length}/${data.total} answered)`
            : `提交测验（已答 ${Object.keys(answers).length}/${data.total}）`}
        </button>
      )}
    </div>
  );
}

// ── Main Topic Page ───────────────────────────────────────────
export default function TopicPage() {
  const params      = useParams<{ topicId: string }>();
  const router      = useRouter();
  const { lang, t } = useLanguage();
  const sm          = t.studyMode;
  const topicId     = slugToTopicId(params.topicId);
  const topic       = getTopicById(topicId);

  // Read ?tab= from URL — so Today Card 4-option links work
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      const raw = new URLSearchParams(window.location.search).get("tab") as TabId | null;
      if (raw && ["short", "detailed", "quiz", "chat"].includes(raw)) return raw;
    }
    return "short";
  });
  const [difficulty,    setDifficulty]    = useState<"easy" | "medium" | "hard">("medium");
  const [feedback,      setFeedback]      = useState<"up" | "down" | null>(null);
  const [progress,      setProgress]      = useState(() =>
    typeof window !== "undefined" ? getTopicProgress(topicId) : null
  );
  const [showComplete,  setShowComplete]  = useState(false);
  const [showQuizHint,  setShowQuizHint]  = useState(false);
  const [nextTopic,     setNextTopic]     = useState<Topic | null>(null);

  const refreshProgress = useCallback(() => setProgress(getTopicProgress(topicId)), [topicId]);

  useEffect(() => {
    const all = getAllTopics();
    const idx = all.findIndex((t) => t.topicId === topicId);
    if (idx !== -1 && idx < all.length - 1) setNextTopic(all[idx + 1]);
  }, [topicId]);

  const onShortRead    = useCallback(() => { markSummaryRead(topicId);  refreshProgress(); }, [topicId, refreshProgress]);
  const onDetailedRead = useCallback(() => {
    markDetailedRead(topicId); refreshProgress();
    setShowQuizHint(true);
  }, [topicId, refreshProgress]);

  const onQuizScore = useCallback((score: number, total: number) => {
    saveQuizScore(topicId, score, total);
    if (topic) recordQuizAttempt(topicId, topic.name.en, topic.chapterName.en, score, total);
    refreshProgress();
  }, [topicId, topic, refreshProgress]);

  const handleMarkComplete = () => {
    markTopicComplete(topicId);
    const today = getTodayTask(SUBJECT_ID);
    if (today && today.topicId === topicId) markDayComplete(SUBJECT_ID, today.day);
    refreshProgress();
    setShowComplete(true);
  };

  if (!topic) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle className="w-10 h-10 text-zinc-600" />
      <p className="text-zinc-400 text-sm">Topic not found: <code className="text-zinc-300">{topicId}</code></p>
      <Link href="/learn" className="text-indigo-400 text-sm flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Study Mode
      </Link>
    </div>
  );

  const topicName   = lang === "en" ? topic.name.en    : topic.name.cn;
  const chapterName = lang === "en" ? topic.chapterName.en : topic.chapterName.cn;
  const chapterHref = `/learn/${topic.gradeCode.toLowerCase().replace("g", "grade-")}/${topic.subjectCode.toLowerCase()}`;
  const isCompleted = progress?.completed ?? false;
  const notes       = getTopicNotes(topicId);

  const tabs = [
    { id: "short"    as TabId, label: lang === "en" ? "Short Note"  : "简短笔记",  icon: FileText    },
    { id: "detailed" as TabId, label: lang === "en" ? "Deep Read"   : "深入阅读",  icon: BookOpen    },
    { id: "quiz"     as TabId, label: lang === "en" ? "Quiz"        : "测验",      icon: Zap         },
    { id: "chat"     as TabId, label: lang === "en" ? "Ask AI"      : "问 AI",     icon: Sparkles    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
        <Link href="/learn" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
          <GraduationCap className="w-3 h-3" />{sm.selectGrade}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={chapterHref} className="hover:text-zinc-300 flex items-center gap-1">
          <FlaskConical className="w-3 h-3" />{lang === "en" ? topic.subject : sm.physics}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={chapterHref} className="hover:text-zinc-300 max-w-[120px] truncate">{chapterName}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-300 max-w-[120px] truncate">{topicName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="info">{lang === "en" ? topic.subject : sm.physics}</Badge>
            <Badge variant="purple">{chapterName}</Badge>
            {isCompleted && <Badge variant="success">{sm.markedComplete}</Badge>}
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">{topicName}</h1>
          {lang === "zh" && <p className="text-zinc-500 text-sm">{topic.name.en}</p>}
          {/* Quick stat strip */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-zinc-600 font-mono">{topic.topicId}</span>
            {notes?.short && (
              <span className="text-xs text-zinc-600">
                · {notes.short.split(" ").length} word note
              </span>
            )}
          </div>
        </div>
        {!isCompleted ? (
          <button onClick={handleMarkComplete}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all self-start shrink-0">
            <CheckCircle2 className="w-4 h-4" />{sm.markComplete}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm self-start">
            <CheckCircle2 className="w-4 h-4" />{sm.markedComplete}
          </div>
        )}
      </div>

      {/* Study flow bar */}
      <StudyFlowBar
        shortRead={progress?.summaryRead ?? false}
        detailedRead={progress?.detailedRead ?? false}
        quizDone={progress?.quizAttempted ?? false}
        lang={lang}
        onStep={(tab) => setActiveTab(tab)}
      />

      {/* Completion card */}
      {showComplete && (
        <div className="p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                {lang === "en" ? "Topic Complete! Well done 🎉" : "主题完成！干得好 🎉"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {lang === "en" ? "Your roadmap has been updated." : "您的学习路线图已更新。"}
              </p>
            </div>
          </div>
          {nextTopic && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/learn/topic/${nextTopic.topicId.toLowerCase()}?tab=short`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all">
                {lang === "en" ? "Next:" : "下一个："} {lang === "en" ? nextTopic.name.en : nextTopic.name.cn}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={chapterHref}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-all">
                {lang === "en" ? "Back to Chapters" : "返回章节"}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quiz nudge after detailed reading */}
      {showQuizHint && !progress?.quizAttempted && activeTab !== "quiz" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-violet-500/25 bg-violet-500/8 animate-fade-in">
          <Zap className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm text-zinc-300 flex-1">
            {lang === "en"
              ? "You've read the detailed notes. Take the quiz to test your understanding!"
              : "您已阅读详细笔记。参加测验测试您的理解程度！"}
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setActiveTab("quiz"); setShowQuizHint(false); }}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
              {lang === "en" ? "Take Quiz" : "参加测验"}
            </button>
            <button onClick={() => setShowQuizHint(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
        </div>
      )}

      {/* Difficulty selector for quiz */}
      {activeTab === "quiz" && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-500">{sm.difficulty}:</span>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                difficulty === d
                  ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300"
                  : "border border-white/8 text-zinc-500 hover:text-zinc-300"
              }`}>
              {d === "easy" ? sm.easy : d === "medium" ? sm.medium : sm.hard}
            </button>
          ))}
        </div>
      )}

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto pb-0.5">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/60 border border-white/7 w-fit min-w-full sm:min-w-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${
                activeTab === id
                  ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-300"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "short"    && <ShortNoteTab topic={topic} lang={lang} onRead={onShortRead} />}
      {activeTab === "detailed" && <DetailedTab  topic={topic} lang={lang} onRead={onDetailedRead} />}
      {activeTab === "quiz"     && <QuizTab      topic={topic} lang={lang} difficulty={difficulty} onScore={onQuizScore} />}
      {activeTab === "chat"     && (
        <div className="rounded-2xl border border-white/7 bg-zinc-900/60 overflow-hidden animate-fade-in">
          <ChatbotPanel
            topicId={topic.topicId}
            topicName={lang === "en" ? topic.name.en : topic.name.cn}
            chapterName={lang === "en" ? topic.chapterName.en : topic.chapterName.cn}
            lang={lang}
          />
        </div>
      )}

      {/* Feedback */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
        <p className="text-sm text-zinc-400 flex-1">{lang === "en" ? "Was this helpful?" : "这有帮助吗？"}</p>
        <div className="flex gap-2">
          {[{ v: "up" as const, icon: ThumbsUp }, { v: "down" as const, icon: ThumbsDown }].map(({ v, icon: Icon }) => (
            <button key={v} onClick={() => setFeedback(v)}
              className={`p-2 rounded-xl border transition-all ${
                feedback === v
                  ? v === "up" ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-red-500/50 bg-red-500/15 text-red-400"
                  : "border-white/10 text-zinc-500 hover:text-zinc-300"
              }`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        {feedback && (
          <p className="text-xs text-zinc-500">{feedback === "up" ? "Thanks! 🎉" : lang === "en" ? "We'll improve it." : "我们将改进。"}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Link href={chapterHref} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />{sm.backToChapter}
        </Link>
        <span className="text-xs text-zinc-700 font-mono">{topic.topicId}</span>
      </div>
    </div>
  );
}
