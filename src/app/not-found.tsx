import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 text-center">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-zinc-400 mb-8">Hmm, this page doesn&apos;t exist.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
