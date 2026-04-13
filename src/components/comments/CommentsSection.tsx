"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Send, Reply, ChevronDown, ChevronUp,
  Loader2, AlertCircle, RefreshCw, Languages, RotateCcw
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface ReplyData {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface CommentData {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  replies: ReplyData[];
}

type Lang = "en" | "zh";

// ─── Helpers ──────────────────────────────────────────────────
function timeAgo(iso: string, lang: Lang): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (lang === "zh") {
    if (m < 1)  return "刚刚";
    if (m < 60) return `${m}分钟前`;
    if (h < 24) return `${h}小时前`;
    if (d === 1) return "昨天";
    return `${d}天前`;
  }
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function detectLang(text: string): Lang {
  const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  return chinese / text.length > 0.1 ? "zh" : "en";
}

function avatarColor(name: string): string {
  const colors = [
    "bg-indigo-500/30 text-indigo-300",
    "bg-violet-500/30 text-violet-300",
    "bg-emerald-500/30 text-emerald-300",
    "bg-amber-500/30 text-amber-300",
    "bg-pink-500/30 text-pink-300",
    "bg-blue-500/30 text-blue-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  return (
    <div className={`${cls} ${avatarColor(name)} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Translate Button ─────────────────────────────────────────
function TranslateButton({
  text,
  uiLang,
  onTranslated,
  isTranslated,
  onRevert,
  size = "sm",
}: {
  text: string;
  uiLang: Lang;
  onTranslated: (translated: string) => void;
  isTranslated: boolean;
  onRevert: () => void;
  size?: "sm" | "xs";
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Target lang is opposite of current UI lang
  const targetLang: Lang = uiLang === "en" ? "zh" : "en";
  const targetLabel = uiLang === "en" ? "中文" : "English";
  const revertLabel = uiLang === "en" ? "Original" : "原文";

  const textCls = size === "xs" ? "text-[10px]" : "text-xs";
  const iconCls = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";

  const handleTranslate = async () => {
    if (isTranslated) { onRevert(); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(uiLang === "en" ? "Translation failed." : "翻译失败。");
        setLoading(false);
        return;
      }
      onTranslated(json.translated);
    } catch {
      setError(uiLang === "en" ? "Network error." : "网络错误。");
    }
    setLoading(false);
  };

  // Don't show translate button if text is already in target lang
  const msgLang = detectLang(text);
  const alreadyTarget = msgLang === targetLang;

  if (alreadyTarget && !isTranslated) return null;

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        onClick={handleTranslate}
        disabled={loading}
        title={isTranslated ? revertLabel : `Translate to ${targetLabel}`}
        className={`inline-flex items-center gap-1 ${textCls} transition-colors disabled:opacity-50 ${
          isTranslated
            ? "text-indigo-400 hover:text-indigo-300"
            : "text-zinc-600 hover:text-indigo-400"
        }`}
      >
        {loading ? (
          <Loader2 className={`${iconCls} animate-spin`} />
        ) : isTranslated ? (
          <RotateCcw className={iconCls} />
        ) : (
          <Languages className={iconCls} />
        )}
        {loading
          ? (uiLang === "en" ? "Translating..." : "翻译中...")
          : isTranslated
          ? revertLabel
          : targetLabel}
      </button>
      {error && <span className={`${textCls} text-red-400`}>{error}</span>}
    </span>
  );
}

// ─── Reply Form ───────────────────────────────────────────────
function ReplyForm({
  commentId,
  uiLang,
  onDone,
}: {
  commentId: string;
  uiLang: Lang;
  onDone: () => void;
}) {
  const [username, setUsername] = useState("");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const ph = {
    en: { name: "Your name", msg: "Write a reply...", both: "Both fields are required.", fail: "Failed to post reply.", net: "Network error." },
    zh: { name: "您的名字",   msg: "写一条回复...",   both: "两个字段均为必填。",          fail: "回复发布失败。",   net: "网络错误。" },
  }[uiLang];

  const handleSubmit = async () => {
    if (!username.trim() || !message.trim()) { setError(ph.both); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/comments/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, username: username.trim(), message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || ph.fail); setLoading(false); return; }
      setUsername(""); setMessage("");
      onDone();
    } catch { setError(ph.net); }
    setLoading(false);
  };

  return (
    <div className="mt-3 ml-10 p-3 rounded-xl bg-zinc-800/40 border border-white/5 space-y-2">
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={ph.name}
        className="w-full bg-zinc-900/80 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40"
      />
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={ph.msg}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          className="flex-1 bg-zinc-900/80 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Single Reply Row ─────────────────────────────────────────
function ReplyRow({ reply, uiLang }: { reply: ReplyData; uiLang: Lang }) {
  const [displayText,  setDisplayText]  = useState(reply.message);
  const [isTranslated, setIsTranslated] = useState(false);

  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={reply.username} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{reply.username}</span>
          <span className="text-xs text-zinc-600">{timeAgo(reply.timestamp, uiLang)}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
          {displayText}
        </p>
        {/* Translate button for reply */}
        <div className="mt-1">
          <TranslateButton
            text={reply.message}
            uiLang={uiLang}
            isTranslated={isTranslated}
            onTranslated={(t) => { setDisplayText(t); setIsTranslated(true); }}
            onRevert={() => { setDisplayText(reply.message); setIsTranslated(false); }}
            size="xs"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Comment Card ─────────────────────────────────────────────
function CommentCard({
  comment,
  uiLang,
  onRefresh,
}: {
  comment: CommentData;
  uiLang: Lang;
  onRefresh: () => void;
}) {
  const [displayText,   setDisplayText]   = useState(comment.message);
  const [isTranslated,  setIsTranslated]  = useState(false);
  const [showReplies,   setShowReplies]   = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplyDone = () => { setShowReplyForm(false); setShowReplies(true); onRefresh(); };

  const replyLabel = uiLang === "en"
    ? `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`
    : `${comment.replies.length} 条回复`;

  return (
    <div className="p-4 rounded-2xl border border-white/7 bg-zinc-900/50 hover:border-white/10 transition-all">
      <div className="flex items-start gap-3">
        <Avatar name={comment.username} size="md" />
        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{comment.username}</span>
            <span className="text-xs text-zinc-600">{timeAgo(comment.timestamp, uiLang)}</span>
            {isTranslated && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                {uiLang === "en" ? "translated" : "已翻译"}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-zinc-300 leading-relaxed mt-1.5 whitespace-pre-wrap break-words">
            {displayText}
          </p>

          {/* Action row: Reply · Translate · Show replies */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              <Reply className="w-3 h-3" />
              {uiLang === "en" ? "Reply" : "回复"}
            </button>

            {/* Translate button */}
            <TranslateButton
              text={comment.message}
              uiLang={uiLang}
              isTranslated={isTranslated}
              onTranslated={(t) => { setDisplayText(t); setIsTranslated(true); }}
              onRevert={() => { setDisplayText(comment.message); setIsTranslated(false); }}
            />

            {comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {replyLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <ReplyForm commentId={comment.id} uiLang={uiLang} onDone={handleReplyDone} />
      )}

      {/* Replies list */}
      {showReplies && comment.replies.length > 0 && (
        <div className="mt-3 ml-10 space-y-3 border-l-2 border-white/5 pl-3">
          {comment.replies.map((r) => (
            <ReplyRow key={r.id} reply={r} uiLang={uiLang} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main CommentsSection ─────────────────────────────────────
export default function CommentsSection({ lang = "en" }: { lang?: Lang }) {
  const [comments,  setComments]  = useState<CommentData[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [posting,   setPosting]   = useState(false);
  const [fetchErr,  setFetchErr]  = useState("");
  const [username,  setUsername]  = useState("");
  const [message,   setMessage]   = useState("");
  const [postError, setPostError] = useState("");

  // All UI strings in both languages
  const T = {
    en: {
      title:          "User Feedback",
      subtitle:       "Real feedback from students testing this app",
      namePh:         "Your name",
      messagePh:      "Share your feedback, experience, or suggestions...",
      post:           "Post",
      noComments:     "No feedback yet — be the first!",
      nameRequired:   "Name is required.",
      msgRequired:    "Message is required.",
      postFailed:     "Failed to post.",
      netError:       "Network error. Please try again.",
      charCount:      (n: number) => `${n}/1000`,
    },
    zh: {
      title:          "用户反馈",
      subtitle:       "正在测试此应用程序的学生的真实反馈",
      namePh:         "您的名字",
      messagePh:      "分享您的反馈、经验或建议...",
      post:           "发布",
      noComments:     "还没有反馈 — 成为第一个！",
      nameRequired:   "姓名为必填项。",
      msgRequired:    "消息为必填项。",
      postFailed:     "发布失败。",
      netError:       "网络错误，请重试。",
      charCount:      (n: number) => `${n}/1000`,
    },
  }[lang];

  const fetchComments = useCallback(async () => {
    setFetchErr("");
    try {
      const res  = await fetch("/api/comments");
      const json = await res.json();
      if (json.success) setComments(json.data);
      else setFetchErr("Failed to load comments.");
    } catch { setFetchErr("Failed to load comments."); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handlePost = async () => {
    if (!username.trim()) { setPostError(T.nameRequired); return; }
    if (!message.trim())  { setPostError(T.msgRequired);  return; }
    setPosting(true); setPostError("");
    try {
      const res  = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), message: message.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setPostError(json.error || T.postFailed); setPosting(false); return; }
      setMessage("");
      await fetchComments();
    } catch { setPostError(T.netError); }
    setPosting(false);
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            {T.title}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{T.subtitle}</p>
        </div>
        <button
          onClick={fetchComments}
          className="p-2 rounded-xl border border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15 transition-all"
          title={lang === "en" ? "Refresh" : "刷新"}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Post form */}
      <div className="p-5 rounded-2xl border border-white/7 bg-zinc-900/50 space-y-3">
        {postError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />{postError}
          </p>
        )}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={T.namePh}
          maxLength={50}
          className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
        />
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={T.messagePh}
            maxLength={1000}
            rows={3}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none pr-16"
          />
          <span className="absolute bottom-3 right-3 text-xs text-zinc-600">
            {T.charCount(message.length)}
          </span>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handlePost}
            disabled={posting || !username.trim() || !message.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {T.post}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : fetchErr ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-sm text-red-400">{fetchErr}</p>
          <button onClick={fetchComments} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            {lang === "en" ? "Try again" : "重试"}
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">{T.noComments}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              uiLang={lang}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
