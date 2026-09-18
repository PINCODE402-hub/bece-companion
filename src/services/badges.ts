import { supabase } from "@/lib/supabaseClient";
import { getProgressSummary } from "./progress";

export interface BadgeStats {
  level: number;
  streak: number;
  totalAttempted: number;
  totalCorrect: number;
  subjectCount: number;
  gameAttempts: number;
  reportsSubmitted: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  description: string;
  check: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first-steps", icon: "🥇", name: "First Steps", description: "Answer your first question", check: (s) => s.totalAttempted >= 1 },
  { id: "streak-3", icon: "🔥", name: "3-Day Streak", description: "Practice 3 days in a row", check: (s) => s.streak >= 3 },
  { id: "streak-7", icon: "🌟", name: "7-Day Streak", description: "Practice 7 days in a row", check: (s) => s.streak >= 7 },
  { id: "level-3", icon: "🌳", name: "Growing Scholar", description: "Reach level 3", check: (s) => s.level >= 3 },
  { id: "level-5", icon: "🏆", name: "Master Learner", description: "Reach level 5", check: (s) => s.level >= 5 },
  {
    id: "sharp-shooter",
    icon: "🎯",
    name: "Sharp Shooter",
    description: "90%+ accuracy over 20+ questions",
    check: (s) => s.totalAttempted >= 20 && s.totalCorrect / s.totalAttempted >= 0.9
  },
  { id: "explorer", icon: "🗺️", name: "Explorer", description: "Practice in 4+ different subjects", check: (s) => s.subjectCount >= 4 },
  { id: "century", icon: "📚", name: "Century Club", description: "Answer 100 questions", check: (s) => s.totalAttempted >= 100 },
  { id: "gamer", icon: "🎮", name: "Game On", description: "Play any learning game", check: (s) => s.gameAttempts >= 1 },
  { id: "helper", icon: "🚩", name: "Community Helper", description: "Report a problem question", check: (s) => s.reportsSubmitted >= 1 }
];

export async function getBadgeStats(profileLevel: number, profileStreak: number): Promise<BadgeStats> {
  const [summary, gameCountRes, reportCountRes] = await Promise.all([
    getProgressSummary(),
    supabase.from("user_progress").select("*", { count: "exact", head: true }).eq("attempt_source", "game"),
    supabase.from("question_reports").select("*", { count: "exact", head: true })
  ]);

  return {
    level: profileLevel,
    streak: profileStreak,
    totalAttempted: summary.totalAttempted,
    totalCorrect: summary.totalCorrect,
    subjectCount: summary.subjects.length,
    gameAttempts: gameCountRes.count ?? 0,
    reportsSubmitted: reportCountRes.count ?? 0
  };
}
