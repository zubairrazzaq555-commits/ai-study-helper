"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText, Zap, BarChart3, Copy, Share2, BookOpen, Clock,
  Target, ChevronDown, ChevronUp, ArrowLeft, Sparkles,
  ThumbsUp, ThumbsDown, ChevronRight, CheckCircle2, Circle,
  RefreshCw, AlertCircle, Layers
} from "lucide-react";
import { Suspense } from "react";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import { useStudy, SummaryResult, QuizResult, PlanResult } from "@/lib/StudyContext";
import { useLanguage } from "@/lib/i18n";

// ─── Summary Tab ─────────────────────────────────────────────
function SummaryTab({ data, t }: { data: SummaryResult; t: ReturnType<typeof useLanguage>["t"]["output"] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = [
      data.title, "",
      "KEY POINTS:", ...data.keyPoints.map((p) => `• ${p}`), "",
      ...data.sections.map((s) => `${s.heading}\n${s.content}`), "",
      "KEY CONCEPTS: " + data.concepts.join(", "),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="info">{data.subject}</Badge>
        <span className="text-xs text-zinc-500 flex items-center gap-1.5"><Target className="w-3 h-3" />{data.keyPoints.length} {t.keyPoints.toLowerCase()}</span>
        <span className="text-xs text-zinc-500 flex items-center gap-1.5"><Clock className="w-3 h-3" />{data.sections.length} sections</span>
      </div>

      {/* Key points */}
      <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
        <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {t.keyPoints}
        </h3>
        <ul className="space-y-2">
          {data.keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold shrink-0 mt-0.5">{i + 1}</div>
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {data.sections.map(({ heading, content }, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50">
            <h3 className="font-display font-semibold text-white mb-2">{heading}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{content}</p>
          </div>
        ))}
      </div>

      {/* Concepts */}
      {data.concepts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{t.keyConcepts}</p>
          <div className="flex flex-wrap gap-2">
            {data.concepts.map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-white/8 text-xs text-zinc-300 hover:border-indigo-500/30 transition-colors cursor-default">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all">
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? t.copied : t.copy}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all">
          <Share2 className="w-4 h-4" /> {t.share}
        </button>
      </div>
    </div>
  );
}

// ─── Quiz Tab ────────────────────────────────────────────────
function QuizTab({ data, t }: { data: QuizResult; t: ReturnType<typeof useLanguage>["t"]["output"] }) {
  const [answers,   setAnswers]   = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expanded,  setExpanded]  = useState<number | null>(null);

  const score  = data.questions.filter((q) => answers[q.id] === q.correct).length;
  const pct    = Math.round((score / data.total) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {submitted && (
        <div className={`p-5 rounded-2xl border ${pct >= 80 ? "border-emerald-500/30 bg-emerald-500/10" : pct >= 60 ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-display font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}/{data.total}</div>
            <div>
              <p className="font-semibold text-white">{pct >= 80 ? t.excellent : pct >= 60 ? t.good : t.practice}</p>
              <p className="text-sm text-zinc-400">{pct}% correct</p>
            </div>
            <button onClick={() => { setAnswers({}); setSubmitted(false); setExpanded(null); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> {t.retry}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {data.questions.map((q, qi) => {
          const selected  = answers[q.id];
          const isCorrect = submitted && selected === q.correct;
          const isWrong   = submitted && selected !== undefined && selected !== q.correct;
          return (
            <div key={q.id} className={`rounded-2xl border transition-all ${isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : isWrong ? "border-red-500/30 bg-red-500/5" : "border-white/7 bg-zinc-900/50"}`}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 mt-0.5">{qi + 1}</span>
                  <p className="text-sm font-medium text-white leading-snug">{q.question}</p>
                </div>
                <div className="space-y-2 ml-9">
                  {q.options.map((opt, oi) => {
                    const sel     = selected === oi;
                    const correct = submitted && oi === q.correct;
                    const wrong   = submitted && sel && oi !== q.correct;
                    return (
                      <button key={oi} disabled={submitted} onClick={() => setAnswers((p) => ({ ...p, [q.id]: oi }))}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                          correct ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : wrong ? "bg-red-500/20 border border-red-500/40 text-red-300"
                          : sel   ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
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
                  <button onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                    className="mt-3 ml-9 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                    {t.explanation} {expanded === q.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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

      {!submitted && (
        <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < data.total}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${Object.keys(answers).length === data.total ? "bg-indigo-600 hover:bg-indigo-500 text-white glow-accent" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
          {t.submit} ({t.answered(Object.keys(answers).length, data.total)})
        </button>
      )}
    </div>
  );
}

// ─── Study Plan Tab ──────────────────────────────────────────
function StudyPlanTab({ data, t }: { data: PlanResult; t: ReturnType<typeof useLanguage>["t"]["output"] }) {
  const [planDays, setPlanDays] = useState(data.days);
  const [openDay,  setOpenDay]  = useState<number | null>(1);

  const toggleTask = (di: number, ti: number) =>
    setPlanDays((prev) => prev.map((d, idx) =>
      idx === di ? { ...d, tasks: d.tasks.map((t, j) => j === ti ? { ...t, done: !t.done } : t) } : d
    ));

  const totalTasks = planDays.reduce((s, d) => s + d.tasks.length, 0);
  const doneTasks  = planDays.reduce((s, d) => s + d.tasks.filter((t) => t.done).length, 0);
  const pct        = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">{data.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{data.totalDays} days · ~{data.estimatedHours} hrs</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold gradient-text">{pct}%</p>
            <p className="text-xs text-zinc-500">{t.complete}</p>
          </div>
        </div>
        <Progress value={pct} color="indigo" size="lg" />
      </div>

      <div className="space-y-3">
        {planDays.map((day, di) => {
          const dayDone = day.tasks.filter((t) => t.done).length;
          const isOpen  = openDay === day.day;
          return (
            <div key={day.day} className="rounded-2xl border border-white/7 bg-zinc-900/50 overflow-hidden">
              <button onClick={() => setOpenDay(isOpen ? null : day.day)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${dayDone === day.tasks.length && day.tasks.length > 0 ? "bg-emerald-500/20 text-emerald-400" : dayDone > 0 ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {dayDone === day.tasks.length && day.tasks.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : day.day}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Day {day.day}: {day.title}</span>
                    {dayDone === day.tasks.length && day.tasks.length > 0 && <Badge variant="success">Done</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{day.duration} · {dayDone}/{day.tasks.length} tasks</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 border-t border-white/5 pt-3 space-y-2">
                  {day.tasks.map((task, ti) => (
                    <button key={ti} onClick={() => toggleTask(di, ti)} className="w-full flex items-center gap-3 py-1.5 text-left group">
                      {task.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />}
                      <span className={`text-sm ${task.done ? "line-through text-zinc-600" : "text-zinc-300"}`}>{task.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Output Page ────────────────────────────────────────
function OutputContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const typeParam    = (searchParams.get("type") || "summary") as "summary" | "quiz" | "plan";
  const { session }  = useStudy();
  const { t }        = useLanguage();
  const ot           = t.output;

  const [activeTab, setActiveTab] = useState(typeParam);
  const [feedback,  setFeedback]  = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!session?.result) router.replace("/notes");
  }, [session, router]);

  if (!session?.result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  const title =
    (session.result as SummaryResult).title ||
    (session.result as QuizResult).title ||
    (session.result as PlanResult).title || "Results";

  const tabs = [
    { id: "summary", label: ot.summary, icon: FileText },
    { id: "quiz",    label: ot.quiz,    icon: Zap },
    { id: "plan",    label: ot.plan,    icon: BarChart3 },
  ];

  const NotGenerated = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="w-8 h-8 text-zinc-600" />
      <p className="text-zinc-500 text-sm">You generated a {session.type}. Go back and generate a {type}.</p>
      <Link href="/notes" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1.5">
        Generate {type} <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/notes" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> {ot.newSession}
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-zinc-500 text-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {ot.generatedNow} · {session.subject}
            </p>
            {(session as { chunked?: boolean }).chunked && (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                <Layers className="w-3 h-3" /> Chunked processing
              </span>
            )}
          </div>
        </div>
        <Link href="/dashboard" className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all">
          <BookOpen className="w-4 h-4" /> {ot.dashboard}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/60 border border-white/7 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === id ? "bg-indigo-600/30 border border-indigo-500/40 text-indigo-300" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "summary" && (session.type === "summary"
          ? <SummaryTab data={session.result as SummaryResult} t={ot} />
          : <NotGenerated type="Summary" />)}
        {activeTab === "quiz" && (session.type === "quiz"
          ? <QuizTab data={session.result as QuizResult} t={ot} />
          : <NotGenerated type="Quiz" />)}
        {activeTab === "plan" && (session.type === "plan"
          ? <StudyPlanTab data={session.result as PlanResult} t={ot} />
          : <NotGenerated type="Study Plan" />)}
      </div>

      {/* Feedback row */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-zinc-900/40">
        <p className="text-sm text-zinc-400 flex-1">{ot.helpful}</p>
        <div className="flex gap-2">
          <button onClick={() => setFeedback("up")}
            className={`p-2 rounded-xl border transition-all ${feedback === "up" ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}>
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button onClick={() => setFeedback("down")}
            className={`p-2 rounded-xl border transition-all ${feedback === "down" ? "border-red-500/50 bg-red-500/15 text-red-400" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}>
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        {feedback && <p className="text-xs text-zinc-500">{feedback === "up" ? ot.thanksUp : ot.thanksDown}</p>}
      </div>

      {/* Next steps */}
      <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-indigo-400" /> {ot.tryElse}
        </h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: ot.summary, icon: FileText, href: "/notes" },
            { label: ot.quiz,    icon: Zap,      href: "/notes" },
            { label: ot.plan,    icon: BarChart3, href: "/notes" },
          ].map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href}
              className="p-4 rounded-xl border border-white/7 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group">
              <Icon className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-sm font-semibold text-white">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OutputPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <OutputContent />
    </Suspense>
  );
}
