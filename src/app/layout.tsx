import type { Metadata } from "next";
import "./globals.css";
import { StudyProvider } from "@/lib/StudyContext";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "StudyAI — Your Intelligent Study Companion",
  description: "Transform your notes into summaries, quizzes, and study plans with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="mesh-bg min-h-screen antialiased">
        <LanguageProvider>
          <StudyProvider>
            {children}
          </StudyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
