"use client";
import Link from "next/link";
import { GraduationCap, BookOpen, ChevronRight, Sparkles, FlaskConical, Calculator, Globe2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { syllabus } from "@/lib/syllabusLoader";

// ── Grade / Subject catalogue ──────────────────────────────────
// Easy to extend when more syllabuses are added
const CATALOGUE = [
  {
    grade: "grade-9",
    gradeLabel: "Grade 9",
    gradeLabel_cn: "九年级",
    subjects: [
      {
        code: "physics",
        label: "Physics",
        label_cn: "物理",
        icon: FlaskConical,
        chapters: syllabus.chapters.length,
        topics: syllabus.totalTopics,
        color: "indigo",
        available: true,
      },
      {
        code: "mathematics",
        label: "Mathematics",
        label_cn: "数学",
        icon: Calculator,
        chapters: 0,
        topics: 0,
        color: "violet",
        available: false,
      },
      {
        code: "geography",
        label: "Geography",
        label_cn: "地理",
        icon: Globe2,
        chapters: 0,
        topics: 0,
        color: "emerald",
        available: false,
      },
    ],
  },
];

const COLOR: Record<string, { ring: string; icon: string; bg: string; badge: string }> = {
  indigo:  { ring: "border-indigo-500/30 hover:border-indigo-500/60",  icon: "bg-indigo-500/15 text-indigo-400",  bg: "bg-indigo-500/5",  badge: "bg-indigo-500/20 text-indigo-300" },
  violet:  { ring: "border-violet-500/30 hover:border-violet-500/60",  icon: "bg-violet-500/15 text-violet-400",  bg: "bg-violet-500/5",  badge: "bg-violet-500/20 text-violet-300" },
  emerald: { ring: "border-emerald-500/30 hover:border-emerald-500/60", icon: "bg-emerald-500/15 text-emerald-400", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-300" },
};

export default function LearnPage() {
  const { lang, t } = useLanguage();
  const sm = t.studyMode;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-5">
          <GraduationCap className="w-3.5 h-3.5" />
          {sm.pageTitle}
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">{sm.pageTitle}</h1>
        <p className="text-zinc-400">{sm.pageSubtitle}</p>
      </div>

      {/* Grade + Subject grid */}
      {CATALOGUE.map((grade) => (
        <div key={grade.grade}>
          {/* Grade header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                {lang === "en" ? grade.gradeLabel : grade.gradeLabel_cn}
              </h2>
              <p className="text-xs text-zinc-500">
                {grade.subjects.filter(s => s.available).length} {lang === "en" ? "subject available" : "个科目可用"}
              </p>
            </div>
          </div>

          {/* Subject cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grade.subjects.map((subj) => {
              const c = COLOR[subj.color];
              const href = `/learn/${grade.grade}/${subj.code}`;
              const name = lang === "en" ? subj.label : subj.label_cn;

              if (!subj.available) {
                return (
                  <div key={subj.code}
                    className="relative p-5 rounded-2xl border border-white/5 bg-zinc-900/30 opacity-50 cursor-not-allowed">
                    <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                      <subj.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-semibold text-zinc-400 mb-1">{name}</h3>
                    <p className="text-xs text-zinc-600">{lang === "en" ? "Coming soon" : "即将推出"}</p>
                    <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-600">{lang === "en" ? "Soon" : "即将"}</span>
                  </div>
                );
              }

              return (
                <Link key={subj.code} href={href}
                  className={`group relative p-5 rounded-2xl border ${c.ring} bg-zinc-900/60 hover:bg-zinc-900/80 transition-all duration-200 card-hover`}>
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                    <subj.icon className="w-5 h-5" />
                  </div>

                  {/* Name */}
                  <h3 className="font-display font-semibold text-white mb-1">{name}</h3>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-zinc-500">{subj.chapters} {lang === "en" ? "chapters" : "章节"}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-xs text-zinc-500">{subj.topics} {lang === "en" ? "topics" : "知识点"}</span>
                  </div>

                  {/* AI badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2.5 py-1 rounded-lg ${c.badge} flex items-center gap-1.5`}>
                      <Sparkles className="w-3 h-3" />
                      {lang === "en" ? "AI-powered" : "AI 驱动"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom hint */}
      <div className="p-5 rounded-2xl border border-white/5 bg-zinc-900/30 flex items-start gap-4">
        <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-white mb-1">
            {lang === "en" ? "How Study Mode works" : "学习模式如何运作"}
          </p>
          <p className="text-sm text-zinc-500">
            {lang === "en"
              ? "Select a topic → AI instantly generates a summary, quiz, and learning roadmap tailored to that exact concept. Results are cached so revisiting is instant."
              : "选择一个主题 → AI 即时生成针对该概念的摘要、测验和学习路线图。结果已缓存，再次访问即时加载。"}
          </p>
        </div>
      </div>
    </div>
  );
}
