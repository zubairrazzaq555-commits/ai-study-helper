"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight, ChevronDown, ChevronUp, GraduationCap, CheckCircle2,
  Circle, BookOpen, FlaskConical, Map, Calendar, PlayCircle,
  Loader2, Clock, Zap, AlertCircle, BarChart2, Sparkles, ArrowRight,
  Lock, Trophy, FileText
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { syllabus } from "@/lib/syllabusLoader";
import { getChapterProgress, markTopicComplete } from "@/lib/topicProgress";
import Progress from "@/components/ui/Progress";
import {
  getRoadmap, saveRoadmap, hasRoadmap, getTodayTask,
  getRoadmapStats, markDayComplete, makeSubjectId,
} from "@/lib/roadmapStore";
import { isSignedIn } from "@/lib/authStore";
import { RoadmapSetupModal, SignupPromptModal } from "@/components/modals/StudyModals";
import type { ClassRoadmap } from "@/lib/roadmapStore";

const SUBJECT_ID = makeSubjectId(syllabus.subjectCode, syllabus.gradeCode);

export default function SubjectPage() {
  const { lang, t } = useLanguage();
  const sm = t.studyMode;
  const router = useRouter();

  // ── UI state ─────────────────────────────────────────────────
  const [openChapters,     setOpenChapters]     = useState<Set<number>>(new Set([1]));
  const [progress,         setProgress]         = useState<Record<number, { done: number; total: number }>>({});
  const [roadmap,          setRoadmap]          = useState<ClassRoadmap | null>(null);
  const [mounted,          setMounted]          = useState(false);
  const [showSetupModal,   setShowSetupModal]   = useState(false);
  const [showSignupModal,  setShowSignupModal]  = useState(false);
  const [generatingRoadmap,setGeneratingRoadmap]= useState(false);
  const [roadmapError,     setRoadmapError]     = useState("");
  const [roadmapStep,      setRoadmapStep]      = useState("");
  const [pendingDays,      setPendingDays]      = useState<{ days: number; label: string; templateKey?: import("@/lib/roadmapTemplates").TemplateDuration; useAI?: boolean } | null>(null);
  const [showTimeline,     setShowTimeline]     = useState(false);

  // ── Load everything on mount ──────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const prog: Record<number, { done: number; total: number }> = {};
    syllabus.chapters.forEach((ch) => {
      const cp = getChapterProgress(ch.chapterIndex);
      prog[ch.chapterIndex] = { done: cp.completedTopics, total: cp.totalTopics };
    });
    setProgress(prog);
    const rm = getRoadmap(SUBJECT_ID);
    if (rm) setRoadmap(rm);
  }, []);

  // ── Toggle chapter accordion ──────────────────────────────────
  const toggleChapter = (idx: number) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ── Roadmap flow ──────────────────────────────────────────────
  const handleRoadmapClick = () => {
    if (hasRoadmap(SUBJECT_ID)) {
      setShowTimeline(true);
      return;
    }
    setShowSetupModal(true);
  };

  const handleSetupConfirm = (days: number, label: string, templateKey?: import("@/lib/roadmapTemplates").TemplateDuration, useAI?: boolean) => {
    setShowSetupModal(false);
    if (!isSignedIn()) {
      setPendingDays({ days, label, templateKey, useAI });
      setShowSignupModal(true);
    } else {
      generateRoadmap(days, label, templateKey, useAI);
    }
  };

  const handleSignupSuccess = () => {
    setShowSignupModal(false);
    if (pendingDays) generateRoadmap(pendingDays.days, pendingDays.label, pendingDays.templateKey, pendingDays.useAI);
  };

  const handleSignupSkip = () => {
    setShowSignupModal(false);
    if (pendingDays) generateRoadmap(pendingDays.days, pendingDays.label, pendingDays.templateKey, pendingDays.useAI);
  };

  const generateRoadmap = useCallback(async (
    totalDays: number,
    durationLabel: string,
    templateKey?: import("@/lib/roadmapTemplates").TemplateDuration,
    useAI = false
  ) => {
    setGeneratingRoadmap(true);
    setRoadmapError("");

    if (!useAI && templateKey) {
      setRoadmapStep(lang === "en" ? "Loading pre-built plan..." : "加载预设计划...");
    } else {
      setRoadmapStep(lang === "en" ? "Analysing syllabus..." : "分析教学大纲...");
      setTimeout(() => setRoadmapStep(lang === "en" ? "Planning day-by-day schedule..." : "规划每日学习计划..."), 1500);
      setTimeout(() => setRoadmapStep(lang === "en" ? "Distributing all 40 topics..." : "分配所有40个主题..."), 4000);
      setTimeout(() => setRoadmapStep(lang === "en" ? "Finalising roadmap..." : "完成路线图..."), 7000);
    }

    try {
      const res = await fetch("/api/syllabus/generate/class-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalDays, durationLabel, templateKey, useAI }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setRoadmapError(json.error || "Failed to generate roadmap.");
        setGeneratingRoadmap(false);
        setRoadmapStep("");
        return;
      }
      const source = json.source as string;
      setRoadmapStep(
        source === "template" || source === "template_fallback"
          ? (lang === "en" ? "Plan ready! ✓ (instant)" : "计划已就绪！✓（即时）")
          : (lang === "en" ? "Roadmap ready! ✓" : "路线图已就绪！✓")
      );
      setTimeout(() => setRoadmapStep(""), 1800);
      saveRoadmap(json.data);
      setRoadmap(json.data);
      setShowTimeline(true);
    } catch {
      setRoadmapError("Network error. Please try again.");
      setRoadmapStep("");
    }
    setGeneratingRoadmap(false);
  }, [lang]);

  // ── Stats ─────────────────────────────────────────────────────
  const totalDone  = Object.values(progress).reduce((s, p) => s + p.done, 0);
  const overallPct = syllabus.totalTopics > 0 ? Math.round((totalDone / syllabus.totalTopics) * 100) : 0;
  const todayTask  = mounted && roadmap ? getTodayTask(SUBJECT_ID) : null;
  const rmStats    = mounted && roadmap ? getRoadmapStats(SUBJECT_ID) : null;
  const subjectName = lang === "en" ? syllabus.subject : sm.physics;
  const gradeName   = lang === "en" ? syllabus.grade   : sm.grade9;

  return (
    <div className="space-y-7">
      {/* Modals */}
      {showSetupModal && (
        <RoadmapSetupModal
          subject={subjectName} grade={gradeName}
          totalTopics={syllabus.totalTopics}
          onConfirm={handleSetupConfirm}
          onClose={() => setShowSetupModal(false)}
          lang={lang}
        />
      )}
      {showSignupModal && (
        <SignupPromptModal
          reason={lang === "en"
            ? "Sign up to save your study roadmap and progress across sessions."
            : "注册以保存您的学习路线图和跨会话进度。"}
          onSuccess={handleSignupSuccess}
          onSkip={handleSignupSkip}
          onClose={() => setShowSignupModal(false)}
          lang={lang}
        />
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-300 transition-colors flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />{sm.selectGrade}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">{subjectName}</span>
      </nav>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <FlaskConical className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{gradeName}</p>
              <h1 className="font-display text-3xl font-bold text-white">{subjectName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
            <span>{syllabus.chapters.length} {sm.chapters}</span>
            <span>·</span>
            <span>{syllabus.totalTopics} {sm.topics}</span>
            {mounted && totalDone > 0 && (
              <span className="text-emerald-400">{sm.completedCount(totalDone, syllabus.totalTopics)}</span>
            )}
          </div>
        </div>

        {/* Right side: progress + roadmap button */}
        <div className="flex flex-row sm:flex-col sm:items-end gap-3 flex-wrap">
          {mounted && (
            <div className="p-4 rounded-2xl border border-white/7 bg-zinc-900/60 min-w-[120px] text-center">
              <p className="font-display text-3xl font-bold gradient-text mb-1">{overallPct}%</p>
              <p className="text-xs text-zinc-500 mb-2">{lang === "en" ? "overall" : "总体进度"}</p>
              <Progress value={overallPct} color="indigo" size="md" />
            </div>
          )}
          <div className="flex flex-col gap-2 flex-1 sm:flex-none sm:items-end">
            <button onClick={handleRoadmapClick} disabled={generatingRoadmap}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all w-full sm:w-auto ${
                roadmap
                  ? "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white glow-accent-hover"
              } disabled:opacity-60`}>
              {generatingRoadmap
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span className="truncate max-w-[180px]">{roadmapStep || (lang === "en" ? "Generating..." : "生成中...")}</span></>
                : roadmap
                ? <><Map className="w-4 h-4" />{lang === "en" ? "View Roadmap" : "查看路线图"}</>
                : <><Map className="w-4 h-4" />{lang === "en" ? "Create Study Roadmap" : "创建学习路线图"}</>
              }
            </button>
            {roadmapError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{roadmapError}
              </p>
            )}
            <Link href="/learn/progress"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-all w-full sm:w-auto">
              <BarChart2 className="w-4 h-4" />
              {lang === "en" ? "My Progress" : "我的进度"}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Today's Task Card — 4 options ───────────────────── */}
      {mounted && todayTask && !todayTask.completed && (
        <div className="relative rounded-2xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {lang === "en" ? `Day ${todayTask.day} — Today's Task` : `第${todayTask.day}天 — 今日任务`}
                  </span>
                  {rmStats && (
                    <span className="text-xs text-zinc-500">
                      {lang === "en" ? `${rmStats.daysLeft} days left` : `还剩 ${rmStats.daysLeft} 天`}
                    </span>
                  )}
                </div>
                <p className="text-base font-semibold text-white">{todayTask.topicName}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{todayTask.chapterName}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {lang === "en" ? `~${todayTask.estimatedMinutes} min` : `约 ${todayTask.estimatedMinutes} 分钟`}
                  {todayTask.quizAfterTopic && (
                    <span className="flex items-center gap-1 text-violet-400 ml-2">
                      <Zap className="w-3 h-3" />
                      {lang === "en" ? "Quiz included" : "含测验"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4 action buttons */}
          {todayTask.topicId && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pb-5">
              {[
                {
                  href: `${todayTask.topicId.toLowerCase()}?tab=detailed`,
                  icon: BookOpen,
                  label: lang === "en" ? "Study in Detail" : "深入学习",
                  desc:  lang === "en" ? "Full explanation" : "完整讲解",
                  color: "indigo",
                },
                {
                  href: `${todayTask.topicId.toLowerCase()}?tab=short`,
                  icon: FileText,
                  label: lang === "en" ? "Quick Summary" : "快速摘要",
                  desc:  lang === "en" ? "Key points only" : "仅关键点",
                  color: "teal",
                },
                {
                  href: `${todayTask.topicId.toLowerCase()}?tab=quiz`,
                  icon: Zap,
                  label: lang === "en" ? "Take Quiz" : "参加测验",
                  desc:  lang === "en" ? "Test yourself" : "测试自己",
                  color: "violet",
                },
                {
                  href: `${todayTask.topicId.toLowerCase()}?tab=chat`,
                  icon: Sparkles,
                  label: lang === "en" ? "Ask AI" : "问 AI",
                  desc:  lang === "en" ? "Chat with tutor" : "与导师聊天",
                  color: "amber",
                },
              ].map(({ href, icon: Icon, label, desc, color }) => {
                const colorMap: Record<string, string> = {
                  indigo: "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300",
                  teal:   "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300",
                  violet: "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300",
                  amber:  "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300",
                };
                return (
                  <Link key={label}
                    href={`/learn/topic/${href}`}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${colorMap[color]}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{desc}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Progress bar */}
          {rmStats && (
            <div className="px-5 pb-4">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>{lang === "en" ? `${rmStats.completed} days done` : `已完成 ${rmStats.completed} 天`}</span>
                <span>{rmStats.pct}%</span>
              </div>
              <Progress value={rmStats.pct} color="amber" size="sm" />
            </div>
          )}
        </div>
      )}

      {/* Completed all tasks badge */}
      {mounted && roadmap && rmStats && rmStats.pct === 100 && (
        <div className="flex items-center gap-3 p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8">
          <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">
              {lang === "en" ? "Roadmap Complete! 🎉" : "路线图完成！🎉"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {lang === "en" ? "You've finished all planned study days." : "您已完成所有计划学习日。"}
            </p>
          </div>
          <Link href="/learn/progress"
            className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
            {lang === "en" ? "View Report" : "查看报告"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ── Roadmap Timeline (collapsible) ───────────────────── */}
      {mounted && roadmap && showTimeline && (
        <div className="rounded-2xl border border-white/7 bg-zinc-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">
                {lang === "en" ? "Study Roadmap" : "学习路线图"} — {roadmap.durationLabel}
              </span>
            </div>
            <button onClick={() => setShowTimeline(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {lang === "en" ? "Collapse" : "收起"}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-white/4">
            {roadmap.days.map((day) => {
              const isToday = day.day === roadmap.currentDay && !day.completed;
              const isPast  = day.day < roadmap.currentDay || day.completed;
              return (
                <div key={day.day}
                  className={`flex items-center gap-4 px-5 py-3 ${isToday ? "bg-amber-500/8" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    day.completed ? "bg-emerald-500/20 text-emerald-400"
                    : isToday    ? "bg-amber-500/20 text-amber-400"
                    : isPast     ? "bg-zinc-800 text-zinc-600"
                    : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {day.completed ? <CheckCircle2 className="w-4 h-4" /> : day.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isToday ? "text-amber-300" : day.completed ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                      {day.topicName}
                    </p>
                    <p className="text-xs text-zinc-600 truncate">{day.chapterName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-600">~{day.estimatedMinutes}m</span>
                    {/* Quiz indicator — every day has a quiz */}
                    <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                      day.completed ? "bg-emerald-500/10 text-emerald-600"
                      : isToday    ? "bg-violet-500/20 text-violet-400"
                      : "bg-zinc-800 text-zinc-600"
                    }`}>
                      <Zap className="w-2.5 h-2.5" />
                      {lang === "en" ? "Quiz" : "测验"}
                    </span>
                    {isToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        {lang === "en" ? "Today" : "今天"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chapter accordion ─────────────────────────────────── */}
      <div className="space-y-3">
        {syllabus.chapters.map((chapter) => {
          const isOpen = openChapters.has(chapter.chapterIndex);
          const chProg = progress[chapter.chapterIndex];
          const done   = chProg?.done ?? 0;
          const total  = chProg?.total ?? chapter.topics.length;
          const pct    = total ? Math.round((done / total) * 100) : 0;
          const chName = lang === "en" ? chapter.name.en : chapter.name.cn;

          return (
            <div key={chapter.chapterIndex}
              className="rounded-2xl border border-white/7 bg-zinc-900/60 overflow-hidden hover:border-white/12 transition-all">

              {mounted && pct > 0 && (
                <div className="h-0.5 bg-zinc-800">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-700"
                    style={{ width: `${pct}%` }} />
                </div>
              )}

              <button onClick={() => toggleChapter(chapter.chapterIndex)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  mounted && pct === 100 ? "bg-emerald-500/20 text-emerald-400"
                  : mounted && pct > 0   ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-zinc-800 text-zinc-400"
                }`}>
                  {mounted && pct === 100 ? <CheckCircle2 className="w-4 h-4" /> : chapter.chapterIndex}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{chName}</span>
                    {lang === "zh" && <span className="text-xs text-zinc-500">{chapter.name.en}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                    <span>{total} {sm.topics}</span>
                    {mounted && done > 0 && (
                      <span className="text-emerald-400">{sm.completedCount(done, total)}</span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-white/5 divide-y divide-white/4">
                  {chapter.topics.map((topic) => {
                    const topicHref = `/learn/topic/${topic.topicId.toLowerCase()}`;
                    const topicName = lang === "en" ? topic.name.en : topic.name.cn;
                    const tp        = mounted ? require("@/lib/topicProgress").getTopicProgress(topic.topicId) : null;
                    const isDone    = tp?.completed ?? false;
                    const isToday   = todayTask?.topicId === topic.topicId && !todayTask.completed;

                    return (
                      <Link key={topic.topicId} href={topicHref}
                        className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/4 transition-colors group ${isToday ? "bg-amber-500/5" : ""}`}>
                        {isDone
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <Circle className={`w-4 h-4 shrink-0 transition-colors ${isToday ? "text-amber-400" : "text-zinc-700 group-hover:text-indigo-400"}`} />
                        }
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate transition-colors ${isDone ? "text-zinc-500 line-through" : isToday ? "text-amber-300" : "text-zinc-300 group-hover:text-white"}`}>
                            {topicName}
                          </p>
                          {/* Show English subtitle in Chinese mode for reference */}
                          {lang === "zh" && (
                            <p className="text-xs text-zinc-700 truncate">{topic.name.en}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isToday && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                              {lang === "en" ? "Today" : "今天"}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-zinc-900/30">
        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500">
          {lang === "en"
            ? "Click any topic to open AI-powered Summary, Detailed Explanation, and Quiz."
            : "点击任意主题，打开 AI 摘要、详细讲解和测验。"}
        </p>
      </div>
    </div>
  );
}
