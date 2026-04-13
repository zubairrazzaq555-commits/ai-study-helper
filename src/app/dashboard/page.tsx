"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Plus, FileText, Zap, BarChart3, Clock, TrendingUp,
  BookOpen, Target, Flame, ChevronRight, Trash2,
  CheckCircle2, Circle, ArrowUpRight, Sparkles
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import {
  getSessionsFromStorage, deleteSessionFromStorage,
  clearAllSessions, formatTimeAgo, SavedSession,
} from "@/lib/sessionStorage";
import { useLanguage } from "@/lib/i18n";

const TYPE_CFG: Record<string, { icon: React.ElementType; variant: "info" | "purple" | "success" }> = {
  summary: { icon: FileText, variant: "info" },
  quiz:    { icon: Zap,      variant: "purple" },
  plan:    { icon: BarChart3, variant: "success" },
};
const PROGRESS_COLORS = ["indigo","violet","emerald","amber"] as const;

export default function DashboardPage() {
  const { t } = useLanguage();
  const dt    = t.dashboard;

  const [sessions,     setSessions]     = useState<SavedSession[]>([]);
  const [todos,        setTodos]        = useState([
    { id: 1, text: dt.summarize,     done: false },
    { id: 2, text: dt.generateQuiz,  done: false },
    { id: 3, text: dt.createPlan,    done: false },
    { id: 4, text: "Review yesterday's output", done: false },
  ]);
  const [mounted,      setMounted]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  useEffect(() => { setMounted(true); setSessions(getSessionsFromStorage()); }, []);

  const handleDelete = (id: string) => { deleteSessionFromStorage(id); setSessions(getSessionsFromStorage()); };
  const handleClearAll = () => { clearAllSessions(); setSessions([]); setShowConfirm(false); };
  const toggleTodo = (id: number) => setTodos((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  // Live stats
  const total     = sessions.length;
  const quizCount = sessions.filter((s) => s.type === "quiz").length;
  const planCount = sessions.filter((s) => s.type === "plan").length;
  const summCount = sessions.filter((s) => s.type === "summary").length;

  const streak = (() => {
    if (!sessions.length) return 0;
    const days = new Set(sessions.map((s) => s.createdAt.slice(0, 10)));
    let c = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) { c++; d.setDate(d.getDate() - 1); }
    return c;
  })();

  const subjMap: Record<string, number> = {};
  sessions.forEach((s) => { subjMap[s.subject] = (subjMap[s.subject] || 0) + 1; });
  const topSubjects = Object.entries(subjMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / Math.max(total, 1)) * 100) }));

  const STATS = [
    { label: dt.totalSessions, value: String(total),  change: dt.allTime,                icon: Sparkles, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: dt.quizzesTaken,  value: String(quizCount), change: `${summCount} summaries`, icon: Zap,    color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: dt.streak,        value: `${streak}d`,   change: streak > 0 ? dt.keepItUp : dt.startToday, icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: dt.studyPlans,    value: String(planCount), change: `${summCount + quizCount} others`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm mb-1">{dt.greeting}</p>
          <h1 className="font-display text-3xl font-bold text-white">{dt.title}</h1>
        </div>
        <Link href="/notes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all glow-accent-hover self-start">
          <Plus className="w-4 h-4" /> {dt.newSession}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, change, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-2xl border border-white/7 bg-zinc-900/60 hover:border-white/12 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="font-display text-2xl font-bold text-white mb-1">{mounted ? value : "—"}</p>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-xs text-emerald-400 mt-1">{mounted ? change : ""}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sessions list */}
        <div className="lg:col-span-2 rounded-2xl border border-white/7 bg-zinc-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              {dt.recentSessions}
              {mounted && sessions.length > 0 && (
                <span className="text-xs text-zinc-600 font-normal">({sessions.length})</span>
              )}
            </h2>
            {mounted && sessions.length > 0 && (
              <button onClick={() => setShowConfirm(true)}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> {dt.clearAll}
              </button>
            )}
          </div>

          {showConfirm && (
            <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-4">
              <p className="text-xs text-red-300">{dt.deleteConfirm}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 transition-all">{dt.cancel}</button>
                <button onClick={handleClearAll} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-all">{dt.deleteAll}</button>
              </div>
            </div>
          )}

          {!mounted ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">{dt.noSessions}</p>
                <p className="text-xs text-zinc-600 mt-1">{dt.noSessionsHint}</p>
              </div>
              <Link href="/notes"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 transition-all">
                <Plus className="w-3.5 h-3.5" /> {dt.startFirst}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sessions.slice(0, 8).map((s) => {
                const cfg  = TYPE_CFG[s.type] || TYPE_CFG.summary;
                const Icon = cfg.icon;
                return (
                  <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${cfg.variant === "info" ? "text-indigo-400" : cfg.variant === "purple" ? "text-violet-400" : "text-emerald-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {s.subject} · {formatTimeAgo(s.createdAt)}
                        {s.wordCount > 0 && ` · ${s.wordCount.toLocaleString()} words`}
                      </p>
                    </div>
                    <Badge variant={cfg.variant}>{s.type}</Badge>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Subject breakdown */}
          <div className="rounded-2xl border border-white/7 bg-zinc-900/60 p-5">
            <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-500" /> {dt.subjectBreakdown}
            </h2>
            {!mounted || topSubjects.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">
                {mounted ? dt.noSubjects : "Loading..."}
              </p>
            ) : (
              <div className="space-y-4">
                {topSubjects.map(({ name, count, pct }, i) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-zinc-300">{name}</span>
                      <span className="text-zinc-500">{count}</span>
                    </div>
                    <Progress value={pct} color={PROGRESS_COLORS[i % PROGRESS_COLORS.length]} size="md" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study goals */}
          <div className="rounded-2xl border border-white/7 bg-zinc-900/60 p-5">
            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" /> {dt.studyGoals}
            </h2>
            <div className="space-y-2.5">
              {todos.map((todo) => (
                <button key={todo.id} onClick={() => toggleTodo(todo.id)} className="w-full flex items-start gap-3 text-left group">
                  <div className="mt-0.5 shrink-0">
                    {todo.done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <Circle className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />}
                  </div>
                  <span className={`text-sm leading-snug ${todo.done ? "line-through text-zinc-600" : "text-zinc-300"}`}>{todo.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-white/7 bg-zinc-900/60 p-5">
            <h2 className="font-display font-semibold text-white mb-4">{dt.quickActions}</h2>
            <div className="space-y-2">
              {[
                { icon: FileText, label: dt.summarize,   color: "text-indigo-400" },
                { icon: Zap,      label: dt.generateQuiz, color: "text-violet-400" },
                { icon: BarChart3,label: dt.createPlan,   color: "text-emerald-400" },
              ].map(({ icon: Icon, label, color }) => (
                <Link key={label} href="/notes"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
