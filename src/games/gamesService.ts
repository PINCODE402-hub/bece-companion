import { supabase } from "@/lib/supabaseClient";
import type { QuestionOptionRow } from "@/types/database";
import { isLikelyNetworkError, generateClientId } from "@/offline/db";
import { enqueueAction } from "@/offline/queue";

export interface GameQuestion {
  id: string;
  question_text: string;
  correct_answer: string | null;
  options: QuestionOptionRow[];
}

interface RawGameQuestionRow {
  id: string;
  question_text: string;
  correct_answer: string | null;
  question_options: QuestionOptionRow[];
  past_papers: { subject_id: string } | null;
}

/** Every published objective question (with a verified-or-otherwise answer) for a
 * subject, across all its published papers — the pool Speed Round draws from. */
export async function fetchObjectiveQuestionPool(subjectId: string): Promise<GameQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, question_text, correct_answer, question_options(*), past_papers!inner(subject_id)")
    .eq("question_type", "objective")
    .eq("content_status", "published")
    .eq("past_papers.status", "published")
    .eq("past_papers.subject_id", subjectId)
    .not("correct_answer", "is", null)
    .limit(100);
  if (error) throw error;

  return ((data ?? []) as unknown as RawGameQuestionRow[])
    .filter((r) => r.question_options?.length >= 2)
    .map((r) => ({
      id: r.id,
      question_text: r.question_text,
      correct_answer: r.correct_answer,
      options: r.question_options
    }));
}

export interface AwardResult {
  awardedXp: number;
  newXp: number;
  newLevel: number;
  newStreak: number;
}

/** For Term Match / Word Scramble — score-based, server-computed XP not tied to a
 * specific stored question. See migration-0004-offline-sync-prep.sql for the
 * client_id-based idempotency this relies on when replayed from the offline queue. */
export async function awardGameXp(
  game: "speed_round" | "term_match" | "word_scramble",
  score: number
): Promise<AwardResult | null> {
  const client_id = generateClientId();
  const payload = { game, score };

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await enqueueAction({ id: client_id, type: "game_xp", clientId: client_id, queuedAt: Date.now(), payload });
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("award_game_xp", {
      p_game: game,
      p_score: score,
      p_client_id: client_id
    });
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return { awardedXp: row.awarded_xp, newXp: row.new_xp, newLevel: row.new_level, newStreak: row.new_streak };
  } catch (e) {
    if (isLikelyNetworkError(e)) {
      await enqueueAction({ id: client_id, type: "game_xp", clientId: client_id, queuedAt: Date.now(), payload });
      return null;
    }
    throw e;
  }
}
