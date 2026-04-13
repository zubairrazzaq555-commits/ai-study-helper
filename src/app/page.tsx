"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Brain, FileText, Target, Zap, BarChart3, CheckCircle2, ChevronRight, Upload } from "lucide-react";
import CommentsSection from "@/components/comments/CommentsSection";
import { useLanguage } from "@/lib/i18n";

const featureData = {
  en: [
    { icon: FileText, title: "Paste or Upload", desc: "Drop text or upload a PDF — lecture notes, textbook chapters, any study material." },
    { icon: Brain,    title: "AI Processes It",  desc: "AI analyzes your content, extracts key concepts, and structures knowledge intelligently." },
    { icon: Target,   title: "Get Study Tools",  desc: "Receive summaries, interactive quizzes, and personalized study plans instantly." },
  ],
  zh: [
    { icon: FileText, title: "粘贴或上传",    desc: "粘贴文本或上传 PDF — 讲义、教材章节、任何学习资料。" },
    { icon: Brain,    title: "AI 智能处理",   desc: "AI 分析您的内容，提取关键概念，智能构建知识体系。" },
    { icon: Target,   title: "获取学习工具",  desc: "即时获得摘要、互动测验和个性化学习计划。" },
  ],
};

const outputData = {
  en: [
    { icon: FileText, label: "Smart Summary",  desc: "Concise structured summaries with key points highlighted",    badge: "Popular",     badgeColor: "bg-indigo-500/20 text-indigo-300" },
    { icon: Zap,      label: "Auto Quiz",       desc: "MCQ and flashcard questions auto-generated from your notes",  badge: "Interactive", badgeColor: "bg-violet-500/20 text-violet-300" },
    { icon: BarChart3,label: "Study Plan",      desc: "Personalized schedule based on topics and your learning goals", badge: "Adaptive",  badgeColor: "bg-emerald-500/20 text-emerald-300" },
  ],
  zh: [
    { icon: FileText, label: "智能摘要",   desc: "简洁的结构化摘要，重点突出",              badge: "热门",    badgeColor: "bg-indigo-500/20 text-indigo-300" },
    { icon: Zap,      label: "自动测验",   desc: "从您的笔记自动生成选择题和闪卡",           badge: "互动",    badgeColor: "bg-violet-500/20 text-violet-300" },
    { icon: BarChart3,label: "学习计划",   desc: "根据主题和学习目标制定个性化时间表",        badge: "自适应",  badgeColor: "bg-emerald-500/20 text-emerald-300" },
  ],
};

export default function LandingPage() {
  const { lang, t } = useLanguage();
  const features = featureData[lang];
  const outputs  = outputData[lang];

  return (
    <div className="min-h-screen mesh-bg text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <div className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-base text-white tracking-tight">
                Study<span className="gradient-text">AI</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {(lang === "en"
                ? ["Features", "How it works", "Feedback"]
                : ["功能", "工作原理", "用户反馈"]
              ).map((item, i) => {
                const anchors = ["features", "how-it-works", "feedback"];
                return (
                  <a key={item} href={`#${anchors[i]}`}
                    className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                    {item}
                  </a>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <LanguageToggle />
              <Link href="/dashboard" className="hidden md:block px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                {t.nav.dashboard}
              </Link>
              <Link href="/notes"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-200 flex items-center gap-1.5">
                {t.nav.tryFree} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-4 text-center">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-32 left-1/3 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            {t.hero.badge}
            <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-xs">{t.hero.badgeNew}</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-800 leading-[1.05] tracking-tight mb-6 animate-fade-in stagger-1">
            {t.hero.headline}
            <br />
            <span className="gradient-text">{t.hero.headlineSub}</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in stagger-2">
            {t.hero.subtext}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-in stagger-3">
            <Link href="/notes"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all glow-accent shadow-lg shadow-indigo-900/40 w-full sm:w-auto justify-center">
              {t.hero.cta} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl glass text-zinc-300 hover:text-white font-semibold text-base transition-all w-full sm:w-auto justify-center">
              {t.hero.ctaSecondary}
            </Link>
          </div>

          {/* PDF badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-4">
            <Upload className="w-3.5 h-3.5" />
            {t.hero.pdfBadge}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">{t.sections.howItWorks}</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{t.sections.threeSteps}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="relative p-6 rounded-2xl border border-white/7 bg-zinc-900/50 hover:border-white/15 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 mb-4">{i + 1}</div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Output types */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">{t.sections.whatYouGet}</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{t.sections.everythingYouNeed}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {outputs.map(({ icon: Icon, label, desc, badge, badgeColor }) => (
              <div key={label} className="p-6 rounded-2xl border border-white/7 bg-zinc-900/50 hover:border-indigo-500/30 transition-all duration-300 group card-hover">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${badgeColor}`}>{badge}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{label}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.sections.tryIt} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-10 rounded-3xl border border-indigo-500/20 overflow-hidden"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(9,9,11,0) 70%)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 glow-accent">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-display text-4xl font-bold mb-4">{t.cta.title}</h2>
              <p className="text-zinc-400 mb-8 text-lg">{t.cta.subtitle}</p>
              <Link href="/notes" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all glow-accent">
                {t.cta.button} <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-zinc-500 flex-wrap">
                {t.cta.perks.map((p) => (
                  <span key={p} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ REAL Comments Section (replaces fake testimonials) */}
      <section id="feedback" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <CommentsSection lang={lang} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-sm text-white">StudyAI</span>
          </div>
          <p className="text-xs text-zinc-600">{t.footer.copy}</p>
          <div className="flex gap-6">
            {t.footer.links.map((item) => (
              <a key={item} href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Inline Language Toggle (uses context) ─────────────────────
function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all"
    >
      <span className="text-sm">{lang === "en" ? "🇨🇳" : "🇬🇧"}</span>
      {lang === "en" ? "中文" : "English"}
    </button>
  );
}
