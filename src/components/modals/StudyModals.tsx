"use client";
import { useState } from "react";
import { X, Calendar, Clock, Sparkles, ChevronRight, Mail, User, AlertCircle, CheckCircle2, Zap, Bot } from "lucide-react";
import { isValidEmail, signUp } from "@/lib/authStore";
import { TEMPLATE_DAYS, TEMPLATE_LABELS, type TemplateDuration } from "@/lib/roadmapTemplates";

// ─── Roadmap Setup Modal ──────────────────────────────────────
interface RoadmapSetupModalProps {
  subject: string;
  grade: string;
  totalTopics: number;
  onConfirm: (days: number, label: string, templateKey?: TemplateDuration, useAI?: boolean) => void;
  onClose: () => void;
  lang: "en" | "zh";
}

// Main pre-built templates
const TEMPLATE_PRESETS: Array<{
  key: TemplateDuration;
  icon: string;
  desc_en: string;
  desc_cn: string;
  intensity_en: string;
  intensity_cn: string;
  color: string;
}> = [
  {
    key: "3months",
    icon: "⚡",
    desc_en: "3 Months",
    desc_cn: "3个月",
    intensity_en: "Intensive — ~2 topics/week",
    intensity_cn: "密集 — 每周约2个主题",
    color: "red",
  },
  {
    key: "6months",
    icon: "📘",
    desc_en: "6 Months",
    desc_cn: "6个月",
    intensity_en: "Balanced — ~1 topic/week",
    intensity_cn: "均衡 — 每周约1个主题",
    color: "indigo",
  },
  {
    key: "9months",
    icon: "🌱",
    desc_en: "9 Months",
    desc_cn: "9个月",
    intensity_en: "Relaxed — 1 topic/10 days",
    intensity_cn: "轻松 — 每10天1个主题",
    color: "emerald",
  },
];

export function RoadmapSetupModal({ subject, grade, totalTopics, onConfirm, onClose, lang }: RoadmapSetupModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDuration | null>("6months");
  const [useCustom,   setUseCustom]   = useState(false);
  const [customDays,  setCustomDays]  = useState("");
  const [useAI,       setUseAI]       = useState(false);

  const finalDays = useCustom
    ? parseInt(customDays) || 0
    : selectedTemplate
      ? TEMPLATE_DAYS[selectedTemplate]
      : 0;

  const canConfirm = finalDays >= 7 && finalDays <= 365;
  const topicsPerWeek = finalDays > 0 ? ((totalTopics / finalDays) * 7).toFixed(1) : "—";

  const handleConfirm = () => {
    if (!canConfirm) return;
    const label = useCustom
      ? `${finalDays} ${lang === "en" ? "days" : "天"}`
      : selectedTemplate
        ? lang === "zh"
          ? TEMPLATE_LABELS[selectedTemplate].cn
          : TEMPLATE_LABELS[selectedTemplate].en
        : `${finalDays} days`;

    onConfirm(
      finalDays,
      label,
      useCustom ? undefined : selectedTemplate ?? undefined,
      useAI
    );
  };

  const colorMap: Record<string, { border: string; bg: string; text: string; selected: string }> = {
    red:     { border: "border-red-500/30",    bg: "bg-red-500/5",    text: "text-red-400",    selected: "border-red-500/60 bg-red-500/15" },
    indigo:  { border: "border-indigo-500/30", bg: "bg-indigo-500/5", text: "text-indigo-400", selected: "border-indigo-500/60 bg-indigo-500/20" },
    emerald: { border: "border-emerald-500/30",bg: "bg-emerald-500/5",text: "text-emerald-400",selected: "border-emerald-500/60 bg-emerald-500/15" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                {lang === "en" ? "Create Study Roadmap" : "创建学习路线图"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">{grade} · {subject} · {totalTopics} {lang === "en" ? "topics" : "个主题"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Pre-built template section */}
          {!useCustom && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {lang === "en" ? "Choose a pre-built plan (instant, no AI needed)" : "选择预设计划（即时，无需 AI）"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATE_PRESETS.map((preset) => {
                  const c = colorMap[preset.color];
                  const isSelected = selectedTemplate === preset.key && !useCustom;
                  return (
                    <button key={preset.key}
                      onClick={() => { setSelectedTemplate(preset.key); setUseCustom(false); }}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all ${
                        isSelected ? c.selected : `${c.border} ${c.bg} hover:border-white/20`
                      }`}>
                      <span className="text-xl">{preset.icon}</span>
                      <span className={`text-sm font-semibold ${isSelected ? c.text : "text-white"}`}>
                        {lang === "en" ? preset.desc_en : preset.desc_cn}
                      </span>
                      <span className="text-[10px] text-zinc-500 leading-tight text-center">
                        {lang === "en" ? preset.intensity_en : preset.intensity_cn}
                      </span>
                      <span className={`text-[10px] ${isSelected ? c.text : "text-zinc-600"}`}>
                        {TEMPLATE_DAYS[preset.key]} {lang === "en" ? "days" : "天"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom duration section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setUseCustom(!useCustom); if (!useCustom) setSelectedTemplate(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  useCustom
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                    : "border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                }`}>
                {lang === "en" ? "Custom duration" : "自定义时长"}
              </button>
            </div>
            {useCustom && (
              <div className="flex items-center gap-3">
                <input
                  type="number" min="7" max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder={lang === "en" ? "Enter days (7–365)" : "输入天数（7–365）"}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/40"
                />
                <span className="text-xs text-zinc-500">{lang === "en" ? "days" : "天"}</span>
              </div>
            )}
          </div>

          {/* Stats preview */}
          {canConfirm && (
            <div className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/60 border border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar className="w-3.5 h-3.5" />
                {finalDays} {lang === "en" ? "days" : "天"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5" />
                {lang === "en" ? `~${topicsPerWeek} topics/week` : `每周约 ${topicsPerWeek} 个主题`}
              </div>
              {!useCustom && !useAI && (
                <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {lang === "en" ? "Instant" : "即时"}
                </span>
              )}
            </div>
          )}
          {useCustom && customDays && !canConfirm && (
            <p className="text-xs text-red-400">{lang === "en" ? "Enter between 7–365 days." : "请输入 7–365 天。"}</p>
          )}

          {/* Customize with AI option */}
          <div className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            useAI ? "border-violet-500/40 bg-violet-500/10" : "border-white/8 bg-zinc-800/40 hover:border-white/15"
          }`} onClick={() => setUseAI(!useAI)}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${useAI ? "bg-violet-500/20" : "bg-zinc-700/60"}`}>
                <Bot className={`w-4 h-4 ${useAI ? "text-violet-400" : "text-zinc-500"}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${useAI ? "text-violet-300" : "text-zinc-300"}`}>
                  {lang === "en" ? "Customize with AI" : "使用 AI 自定义"}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {lang === "en"
                    ? "AI generates a personalized plan (takes ~15s longer)"
                    : "AI 生成个性化计划（多需约15秒）"}
                </p>
              </div>
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                useAI ? "bg-violet-600 border-violet-500" : "border-white/20"
              }`}>
                {useAI && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm font-medium transition-all">
            {lang === "en" ? "Cancel" : "取消"}
          </button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canConfirm
                ? useAI
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}>
            {useAI ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {lang === "en"
              ? useAI ? "Generate with AI" : "Create Plan"
              : useAI ? "AI 生成" : "创建计划"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signup Prompt Modal ──────────────────────────────────────
interface SignupPromptModalProps {
  reason?: string;
  onSuccess: () => void;
  onSkip: () => void;
  onClose: () => void;
  lang: "en" | "zh";
}

export function SignupPromptModal({ reason, onSuccess, onSkip, onClose, lang }: SignupPromptModalProps) {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = () => {
    if (!isValidEmail(email)) {
      setError(lang === "en" ? "Please enter a valid email." : "请输入有效的电子邮件。");
      return;
    }
    signUp(email, name);
    setSuccess(true);
    setTimeout(() => onSuccess(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-white">
              {lang === "en" ? "Save Your Progress" : "保存您的进度"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-medium text-white">{lang === "en" ? "You're all set! 🎉" : "设置完成！🎉"}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                {reason || (lang === "en"
                  ? "Sign up to save your roadmap and track progress across sessions."
                  : "注册以保存您的学习路线图并跨会话跟踪进度。")}
              </p>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />{error}
                </div>
              )}
              <div className="space-y-2.5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={lang === "en" ? "Your name (optional)" : "您的姓名（可选）"}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === "en" ? "Email address" : "电子邮件地址"} type="email"
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={onSkip}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-all">
                  {lang === "en" ? "Skip for now" : "暂时跳过"}
                </button>
                <button onClick={handleSignup}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  {lang === "en" ? "Sign Up" : "注册"}<ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 text-center">
                {lang === "en" ? "No password needed. Saved locally." : "无需密码。本地保存。"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
