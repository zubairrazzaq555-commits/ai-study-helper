"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Menu, X, Sparkles, GraduationCap, BarChart2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

export default function Navbar() {
  const pathname    = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const navLinks = [
    { href: "/dashboard",     label: t.nav.dashboard,      icon: LayoutDashboard },
    { href: "/learn",         label: t.studyMode.navLabel, icon: GraduationCap   },
    { href: "/learn/progress",label: lang === "en" ? "Progress" : "进度", icon: BarChart2 },
    { href: "/notes",         label: t.nav.newSession,     icon: BookOpen        },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between max-w-6xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center glow-accent">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-base text-white tracking-tight">
              Study<span className="gradient-text">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all"
              title={lang === "zh" ? "Switch to English" : "切换为中文"}
            >
              <span className="text-sm">{lang === "zh" ? "🇬🇧" : "🇨🇳"}</span>
              {lang === "zh" ? "English" : "中文"}
            </button>
            <Link href="/notes"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all glow-accent-hover">
              {t.nav.tryFree}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden mx-4 mt-2">
          <div className="glass-strong rounded-2xl p-4 space-y-2">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              );
            })}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setLang(lang === "en" ? "zh" : "en")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm">
                <span>{lang === "en" ? "🇨🇳" : "🇬🇧"}</span>
                {lang === "en" ? "中文" : "English"}
              </button>
              <Link href="/notes" onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                {t.nav.tryFree}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
