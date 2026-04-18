"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type OutputType = "summary" | "quiz" | "plan";

export interface StudySession {
  notes: string;
  subject: string;
  difficulty: string;
  type: OutputType;
  result: SummaryResult | QuizResult | PlanResult | null;
}

export interface SummaryResult {
  title: string;
  keyPoints: string[];
  sections: Array<{ heading: string; content: string }>;
  concepts: string[];
  subject: string;
  generatedAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizResult {
  title: string;
  subject: string;
  total: number;
  questions: QuizQuestion[];
  generatedAt: string;
}

export interface PlanDay {
  day: number;
  title: string;
  duration: string;
  tasks: Array<{ text: string; done: boolean }>;
}

export interface PlanResult {
  title: string;
  subject: string;
  totalDays: number;
  estimatedHours: number;
  days: PlanDay[];
  generatedAt: string;
}

interface StudyContextType {
  session: StudySession | null;
  setSession: (s: StudySession) => void;
  clearSession: () => void;
}

const StudyContext = createContext<StudyContextType>({
  session: null,
  setSession: () => {},
  clearSession: () => {},
});

export function StudyProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StudySession | null>(null);

  const setSession = (s: StudySession) => setSessionState(s);
  const clearSession = () => setSessionState(null);

  return (
    <StudyContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  return useContext(StudyContext);
}
