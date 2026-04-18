"use client";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

// This page is kept as fallback UI.
// The actual loading state is now handled inside the Notes page itself
// while the API call is in-flight.
export default function LoadingPage() {
  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white" style={{ animation: "spin 2s linear infinite" }} />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-white mb-2">Processing your notes...</h2>
        <p className="text-zinc-500 text-sm">AI is generating your study materials.</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-500"
            style={{ animation: `pulse 1.4s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <Link href="/notes" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Go back
      </Link>
    </div>
  );
}
