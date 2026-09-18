import { supabase } from "@/lib/supabaseClient";
import type { AttemptSource, MarkingPointRow, QuestionImageRow, QuestionOptionRow, QuestionRow } from "@/types/database";
import { isLikelyNetworkError, generateClientId } from "@/offline/db";
import { enqueueAction } from "@/offline/queue";

export interface PublishedPaperSummary {
  id: string;
  title: string;
  paper_name: string;
  section: string | null;
  duration_minutes: number | null;
  year: number;
  subject_id: string;
  subject_name: string;
  subject_icon: string | null;
  subject_slug: string;
  publishedQuestionCount: number;
}

interface RawPublishedPaperRow {
  id: string;
  title: string;
  paper_name: string;
  section: string | null;
  duration_minutes: number | null;
  subject_id: string;
  subjects: { name: string; icon: string | null; slug: string } | null;
  years: { year: number } | null;
}

/** Every published paper, with a count of its *published* questions (not just any
 * question) — and papers with zero published questions are left out entirely, per
 * "don't show a year/subject with nothing available yet." One extra query to batch
 * the counts instead of one-per-paper. */
export async function listPublishedPapers(): Promise<PublishedPaperSummary[]> {
  const { data: papers, error } = await supabase
    .from("past_papers")
    .select("id, title, paper_name, section, duration_minutes, subject_id, subjects(name, icon, slug), years(year)")
    .eq("status", "published");
  if (error) throw error;

  const paperRows = (papers ?? []) as unknown as RawPublishedPaperRow[];
  if (!paperRows.length) return [];

  const ids = paperRows.map((p) => p.id);
  const { data: qRows, error: qErr } = await supabase
    .from("questions")
    .select("paper_id")
    .eq("content_status", "published")
    .in("paper_id", ids);
  if (qErr) throw qErr;

  const counts: Record<string, number> = {};
  (qRows ?? []).forEach((q) => {
    const pid = (q as { paper_id: string }).paper_id;
    counts[pid] = (counts[pid] ?? 0) + 1;
  });

  return paperRows
    .map((p) => ({
      id: p.id,
      title: p.title,
      paper_name: p.paper_name,
      section: p.section,
      duration_minutes: p.duration_minutes,
      year: p.years?.year ?? 0,
      subject_id: p.subject_id,
      subject_name: p.subjects?.name ?? "Unknown subject",
      subject_icon: p.subjects?.icon ?? null,
      subject_slug: p.subjects?.slug ?? "",
      publishedQuestionCount: counts[p.id] ?? 0
    }))
    .filter((p) => p.publishedQuestionCount > 0);
}

export interface StudentQuestion {
  question: QuestionRow;
  options: QuestionOptionRow[];
  markingPoints: MarkingPointRow[];
  images: QuestionImageRow[];
}

export async function listPublishedQuestionsForPaper(paperId: string): Promise<StudentQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(*), marking_points(*), question_images(*)")
    .eq("paper_id", paperId)
    .eq("content_status", "published")
    .order("question_number");
  if (error) throw error;

  return ((data ?? []) as unknown as (QuestionRow & {
    question_options: QuestionOptionRow[];
    marking_points: MarkingPointRow[];
    question_images: QuestionImageRow[];
  })[]).map((row) => ({
    question: row,
    options: (row.question_options ?? []).sort((a, b) => a.sort_order - b.sort_order),
    markingPoints: (row.marking_points ?? []).sort((a, b) => a.sort_order - b.sort_order),
    images: (row.question_images ?? []).sort((a, b) => a.sort_order - b.sort_order)
  }));
}

export interface RecordProgressInput {
  question_id: string;
  selected_answer?: string | null;
  is_correct?: boolean | null;
  self_marked_score?: number | null;
  time_spent_seconds?: number | null;
  attempt_source: AttemptSource;
}

export interface ProgressAwardResult {
  awardedXp: number;
  newXp: number;
  newLevel: number;
  newStreak: number;
}

/** Records an answer AND awards XP/streak, via the record_progress_and_award_xp()
 * Postgres function — never a direct client write to profiles.xp/level/streak (see
 * migration-0002-xp-protection.sql for why: those columns are protected server-side
 * and this RPC is the only path that's allowed through). */
export async function recordProgress(input: RecordProgressInput): Promise<ProgressAwardResult | null> {
  const client_id = generateClientId();
  const payload = {
    question_id: input.question_id,
    selected_answer: input.selected_answer ?? null,
    is_correct: input.is_correct ?? null,
    self_marked_score: input.self_marked_score ?? null,
    time_spent_seconds: input.time_spent_seconds ?? null,
    attempt_source: input.attempt_source
  };

  // Fully offline: don't even attempt the network call, queue immediately.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await enqueueAction({ id: client_id, type: "progress", clientId: client_id, queuedAt: Date.now(), payload });
    return null;
  }

  try {
    const { data, error } = await supabase.rpc("record_progress_and_award_xp", {
      p_question_id: payload.question_id,
      p_selected_answer: payload.selected_answer,
      p_is_correct: payload.is_correct,
      p_self_marked_score: payload.self_marked_score,
      p_time_spent_seconds: payload.time_spent_seconds,
      p_attempt_source: payload.attempt_source,
      p_client_id: client_id
    });
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return { awardedXp: row.awarded_xp, newXp: row.new_xp, newLevel: row.new_level, newStreak: row.new_streak };
  } catch (e) {
    // Online but the request itself failed in a way that looks like a connectivity
    // blip (not a real validation error) — queue it rather than losing the answer.
    if (isLikelyNetworkError(e)) {
      await enqueueAction({ id: client_id, type: "progress", clientId: client_id, queuedAt: Date.now(), payload });
      return null;
    }
    throw e;
  }
}
