import { supabase } from "@/lib/supabaseClient";
import type { QuestionType } from "@/types/database";

export interface SubjectAccuracy {
  subject_id: string;
  subject_name: string;
  subject_icon: string | null;
  attempted: number;
  correct: number;
}

export interface ProgressSummary {
  subjects: SubjectAccuracy[];
  totalAttempted: number;
  totalCorrect: number;
}

interface RawProgressRow {
  is_correct: boolean | null;
  self_marked_score: number | null;
  question_id: string;
  questions: {
    paper_id: string;
    past_papers: {
      subject_id: string;
      subjects: { name: string; icon: string | null } | null;
    } | null;
  } | null;
}

/** "Correct" for progress purposes = objective marked correct by the system, OR a
 * subjective self-mark of 1.0 ("Got it!"). A 0.5 self-mark counts as attempted but
 * not correct — partial credit doesn't inflate accuracy. */
function wasCorrect(row: { is_correct: boolean | null; self_marked_score: number | null }): boolean {
  return row.is_correct === true || (row.self_marked_score !== null && row.self_marked_score >= 1);
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  const { data, error } = await supabase
    .from("user_progress")
    .select(
      "is_correct, self_marked_score, question_id, questions(paper_id, past_papers(subject_id, subjects(name, icon)))"
    );
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawProgressRow[];
  const bySubject = new Map<string, SubjectAccuracy>();
  let totalAttempted = 0;
  let totalCorrect = 0;

  for (const row of rows) {
    const subjectId = row.questions?.past_papers?.subject_id;
    if (!subjectId) continue;
    const meta = row.questions?.past_papers?.subjects;
    if (!bySubject.has(subjectId)) {
      bySubject.set(subjectId, {
        subject_id: subjectId,
        subject_name: meta?.name ?? "Unknown subject",
        subject_icon: meta?.icon ?? null,
        attempted: 0,
        correct: 0
      });
    }
    const entry = bySubject.get(subjectId)!;
    entry.attempted += 1;
    totalAttempted += 1;
    if (wasCorrect(row)) {
      entry.correct += 1;
      totalCorrect += 1;
    }
  }

  return {
    subjects: Array.from(bySubject.values()).sort((a, b) => b.attempted - a.attempted),
    totalAttempted,
    totalCorrect
  };
}

export interface MistakeItem {
  question_id: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  correct_answer: string | null;
  model_answer: string | null;
  explanation: string | null;
  paper_title: string;
  subject_name: string;
  subject_icon: string | null;
  attempted_at: string;
}

interface RawMistakeRow {
  created_at: string;
  is_correct: boolean | null;
  self_marked_score: number | null;
  question_id: string;
  questions: {
    question_number: number;
    question_text: string;
    question_type: QuestionType;
    correct_answer: string | null;
    model_answer: string | null;
    explanation: string | null;
    past_papers: {
      title: string;
      subjects: { name: string; icon: string | null } | null;
    } | null;
  } | null;
}

/** Only the most recent attempt per question counts — if you got it wrong once but
 * right on a later attempt, it's not a "mistake" anymore. */
export async function getMistakes(): Promise<MistakeItem[]> {
  const { data, error } = await supabase
    .from("user_progress")
    .select(
      "created_at, is_correct, self_marked_score, question_id, " +
        "questions(question_number, question_text, question_type, correct_answer, model_answer, explanation, " +
        "past_papers(title, subjects(name, icon)))"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawMistakeRow[];
  const latestByQuestion = new Map<string, RawMistakeRow>();
  for (const row of rows) {
    if (!latestByQuestion.has(row.question_id)) latestByQuestion.set(row.question_id, row);
  }

  const mistakes: MistakeItem[] = [];
  for (const row of latestByQuestion.values()) {
    if (wasCorrect(row)) continue;
    const q = row.questions;
    if (!q) continue;
    mistakes.push({
      question_id: row.question_id,
      question_number: q.question_number,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      model_answer: q.model_answer,
      explanation: q.explanation,
      paper_title: q.past_papers?.title ?? "Unknown paper",
      subject_name: q.past_papers?.subjects?.name ?? "Unknown subject",
      subject_icon: q.past_papers?.subjects?.icon ?? null,
      attempted_at: row.created_at
    });
  }
  return mistakes.sort((a, b) => (a.attempted_at < b.attempted_at ? 1 : -1));
}
