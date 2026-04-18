"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart2, CheckCircle2, Zap, Trophy, Target,
  TrendingUp, TrendingDown, BookOpen, ArrowLeft,
  ChevronRight, FlaskConical, RotateCcw, Sparkles,
  Clock, Circle, GraduationCap
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { syllabus } from "@/lib/syllabusLoader";
import { getOverallProgress, getChapterProgress } from "@/lib/topicProgress";
import { getOverallStats, getAnalytics } from "@/lib/analyticsStore";
import { getRoadmapStats, makeSubjectId } from "@/lib/roadmapStore";
import Progress from "@/components/ui/Progress";
import Badge from "@/components/ui/Badge";

const SUBJECT_ID = makeSubjectId(syllabus.subjectCode, syllabus.gradeCode);

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: "indigo" | "violet" | "emerald" | "amber";
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const bg  = { indigo: "bg-indigo-500/10", violet: "bg-violet-500/10", emerald: "bg-emerald-500/10", amber: "bg-amber-500/10" }[color];
  const ic  = { indigo: "text-indigo-400",  violet: "text-violet-400",  emerald: "text-emerald-400",  amber: "text-amber-400"  }[color];
  const txt = { indigo: "gradient-text",    violet: "text-violet-400",  emerald: "text-emerald-400",  amber: "text-amber-400"  }[color];
  return (
    <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/60 hover:border-white/12 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${ic}`} />
        </div>
      </div>
      <p className={`font-display text-3xl font-bold mb-1 ${txt}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const { lang, t } = useLanguage();
  const sm = t.studyMode;

  const [mounted, setMounted] = useState(false);
  const [overall,  setOverall]  = useState({ completed: 0, total: 0, pct: 0 });
  const [chapters, setChapters] = useState<Array<{ name: string; done: number; total: number; pct: number }>>([]);
  const [analytics, setAnalytics] = useState(getOverallStats());
  const [rmStats,   setRmStats]   = useState<ReturnType<typeof getRoadmapStats>>(null);

  useEffect(() => {
    setMounted(true);
    setOverall(getOverallProgress());
    setAnalytics(getOverallStats());
    setRmStats(getRoadmapStats(SUBJECT_ID));

    const chs = syllabus.chapters.map((ch) => {
      const cp = getChapterProgress(ch.chapterIndex);
      return {
        name:  lang === "en" ? ch.name.en : ch.name.cn,
        done:  cp.completedTopics,
        total: cp.totalTopics,
        pct:   cp.percentComplete,
      };
    });
    setChapters(chs);
  }, [lang]);

  const subjectName = lang === "en" ? syllabus.subject : sm.physics;
  const gradeName   = lang === "en" ? syllabus.grade   : sm.grade9;
  const chapterHref = `/learn/grade-9/physics`;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-300 flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />{sm.selectGrade}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={chapterHref} className="hover:text-zinc-300 flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" />{subjectName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">{lang === "en" ? "My Progress" : "我的进度"}</span>
      </nav>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
          <BarChart2 className="w-3.5 h-3.5" />
          {lang === "en" ? "Progress & Analytics" : "进度与分析"}
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          {lang === "en" ? "My Progress" : "我的进度"}
        </h1>
        <p className="text-zinc-500 text-sm">{gradeName} · {subjectName}</p>
      </div>

      {/* ── Overall progress banner ─────────────────────────── */}
      {mounted && (
        <div className="relative p-6 rounded-2xl border border-indigo-500/20 overflow-hidden"
          style={{ background: "radial-gradient(ellipse at top left, rgba(99,102,241,0.1) 0%, transparent 60%)" }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="font-display text-6xl font-bold gradient-text">{overall.pct}%</p>
              <p className="text-sm text-zinc-400 mt-1">
                {lang === "en" ? "Subject Complete" : "科目完成度"}
              </p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>{lang === "en" ? `${overall.completed} topics done` : `已完成 ${overall.completed} 个主题`}</span>
                <span>{lang === "en" ? `${overall.total - overall.completed} remaining` : `还剩 ${overall.total - overall.completed} 个`}</span>
              </div>
              <Progress value={overall.pct} color="indigo" size="lg" />
              {overall.pct === 100 && (
                <div className="flex items-center gap-2 mt-3 text-emerald-400 text-sm">
                  <Trophy className="w-4 h-4" />
                  {lang === "en" ? "Subject completed! Outstanding! 🎉" : "科目完成！太棒了！🎉"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats grid ──────────────────────────────────────── */}
      {mounted && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label={lang === "en" ? "Topics Completed" : "已完成主题"} value={overall.completed} sub={lang === "en" ? `/ ${overall.total} total` : `共 ${overall.total} 个`} color="emerald" />
          <StatCard icon={Zap}         label={lang === "en" ? "Quizzes Taken"    : "已完成测验"} value={analytics.totalQuizzes} sub={analytics.totalQuizzes > 0 ? (lang === "en" ? `${analytics.topicsAttempted} unique topics` : `${analytics.topicsAttempted} 个独特主题`) : undefined} color="violet" />
          <StatCard icon={Target}      label={lang === "en" ? "Avg. Quiz Score"  : "平均测验分数"} value={analytics.avgScore > 0 ? `${analytics.avgScore}%` : "—"} sub={analytics.avgScore >= 80 ? (lang === "en" ? "Excellent!" : "优秀！") : analytics.avgScore >= 60 ? (lang === "en" ? "Good" : "良好") : analytics.avgScore > 0 ? (lang === "en" ? "Keep practicing" : "继续练习") : undefined} color="indigo" />
          <StatCard icon={BarChart2}   label={lang === "en" ? "Roadmap Progress" : "路线图进度"} value={rmStats ? `${rmStats.pct}%` : "—"} sub={rmStats ? (lang === "en" ? `Day ${rmStats.currentDay} of ${rmStats.total}` : `第 ${rmStats.currentDay}/${rmStats.total} 天`) : (lang === "en" ? "No roadmap yet" : "尚无路线图")} color="amber" />
        </div>
      )}

      {/* ── Roadmap progress ─────────────────────────────────── */}
      {mounted && rmStats && (
        <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              {lang === "en" ? "Study Roadmap Progress" : "学习路线图进度"}
            </h2>
            <Link href={chapterHref}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              {lang === "en" ? "View roadmap" : "查看路线图"} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">{lang === "en" ? `Day ${rmStats.currentDay} of ${rmStats.total}` : `第 ${rmStats.currentDay} 天，共 ${rmStats.total} 天`}</span>
            <span className="font-bold text-amber-400">{rmStats.pct}%</span>
          </div>
          <Progress value={rmStats.pct} color="amber" size="lg" />
          {rmStats.daysLeft > 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              {lang === "en" ? `${rmStats.daysLeft} days remaining` : `还剩 ${rmStats.daysLeft} 天`}
            </p>
          )}
        </div>
      )}

      {/* ── Chapter breakdown with quiz scores ───────────────── */}
      {mounted && (
        <div className="rounded-2xl border border-white/7 bg-zinc-900/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              {lang === "en" ? "Chapter Breakdown" : "章节详情"}
            </h2>
            {/* Estimated study time */}
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {lang === "en"
                ? `~${Math.round((overall.total - overall.completed) * 30 / 60)}h remaining`
                : `约还需 ${Math.round((overall.total - overall.completed) * 30 / 60)} 小时`}
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {chapters.map((ch, i) => {
              // Get quiz analytics for topics in this chapter
              const chAnalytics = Object.values(getAnalytics().topics).filter(
                (tp) => tp.chapterName === (lang === "en" ? syllabus.chapters[i]?.name.en : syllabus.chapters[i]?.name.en)
              );
              const chAvgScore = chAnalytics.length > 0
                ? Math.round(chAnalytics.reduce((s, t) => s + t.avgScore, 0) / chAnalytics.length)
                : null;

              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    ch.pct === 100 ? "bg-emerald-500/20 text-emerald-400"
                    : ch.pct > 0   ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {ch.pct === 100 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm text-zinc-300 truncate">{ch.name}</p>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {/* Quiz score badge for this chapter */}
                        {chAvgScore !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                            chAvgScore >= 80 ? "bg-emerald-500/15 text-emerald-400"
                            : chAvgScore >= 60 ? "bg-amber-500/15 text-amber-400"
                            : "bg-red-500/15 text-red-400"
                          }`}>
                            {chAvgScore}%
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{ch.done}/{ch.total}</span>
                      </div>
                    </div>
                    <Progress
                      value={ch.pct}
                      color={ch.pct === 100 ? "emerald" : ch.pct > 0 ? "indigo" : "indigo"}
                      size="sm"
                    />
                  </div>
                  {ch.pct === 100 && <Badge variant="success">{lang === "en" ? "Done" : "已完成"}</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Analytics Report ─────────────────────────────────── */}
      {mounted && analytics.totalQuizzes > 0 && (
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Strong topics */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-500/15 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                {lang === "en" ? "Strong Topics" : "擅长主题"}
              </h3>
              <span className="ml-auto text-xs text-emerald-400">≥ 80%</span>
            </div>
            {analytics.strongTopics.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <Sparkles className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  {lang === "en" ? "Complete quizzes to see strengths" : "完成测验后查看擅长主题"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-emerald-500/10">
                {analytics.strongTopics.slice(0, 5).map((tp) => (
                  <div key={tp.topicId} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{tp.topicName}</p>
                      <p className="text-xs text-zinc-500 truncate">{tp.chapterName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-bold text-emerald-400">{tp.avgScore}%</span>
                      <Badge variant="success">{tp.attempts}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak topics */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/15 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">
                {lang === "en" ? "Needs Improvement" : "需要提升"}
              </h3>
              <span className="ml-auto text-xs text-red-400">&lt; 60%</span>
            </div>
            {analytics.weakTopics.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <Trophy className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  {lang === "en" ? "No weak topics — great work!" : "没有弱项主题，做得很好！"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-red-500/10">
                {analytics.weakTopics.slice(0, 5).map((tp) => (
                  <div key={tp.topicId} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{tp.topicName}</p>
                      <p className="text-xs text-zinc-500 truncate">{tp.chapterName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm font-bold text-red-400">{tp.avgScore}%</span>
                      <Link href={`/learn/topic/${tp.topicId.toLowerCase()}`}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                        <RotateCcw className="w-3 h-3" />
                        {lang === "en" ? "Retry" : "重试"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No analytics yet */}
      {mounted && analytics.totalQuizzes === 0 && (
        <div className="flex flex-col items-center gap-4 py-10 text-center p-6 rounded-2xl border border-white/5 bg-zinc-900/30">
          <BarChart2 className="w-10 h-10 text-zinc-700" />
          <div>
            <p className="text-sm font-medium text-zinc-400">
              {lang === "en" ? "No analytics yet" : "暂无分析数据"}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {lang === "en"
                ? "Take quizzes on any topic to see your performance report."
                : "在任意主题完成测验后，即可查看您的表现报告。"}
            </p>
          </div>
          <Link href={chapterHref}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 transition-all">
            {lang === "en" ? "Start a Quiz" : "开始测验"} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <Link href={chapterHref}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {sm.backToSubject}
      </Link>
    </div>
  );
}
