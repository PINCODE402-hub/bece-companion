import { supabase } from "@/lib/supabaseClient";
import type { ParsedQuestion } from "./types";
import type { AnswerKeyEntry } from "./parseAnswerKey";

export interface CommitResult {
  insertedCount: number;
  skippedDuplicateNumbers: number[];
}

export async function fetchExistingQuestionNumbers(paperId: string): Promise<number[]> {
  const { data, error } = await supabase.from("questions").select("question_number").eq("paper_id", paperId);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { question_number: number }).question_number);
}

/** Inserts questions (from the structured-text or JSON importer) that aren't already
 * present in this paper by question_number. Never marks an answer "verified" — imports
 * land as "needs_review" (if an answer was found) or "missing" (if not), by design:
 * verification is a deliberate separate admin action (see Answer Review). */
export async function commitQuestions(
  paperId: string,
  questions: ParsedQuestion[],
  format: "structured_text" | "json",
  rawInput: string
): Promise<CommitResult> {
  const existingNumbers = new Set(await fetchExistingQuestionNumbers(paperId));
  const toInsert = questions.filter((q) => !existingNumbers.has(q.questionNumber));
  const skippedDuplicateNumbers = questions
    .filter((q) => existingNumbers.has(q.questionNumber))
    .map((q) => q.questionNumber);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  for (const q of toInsert) {
    const hasAnswer = q.type === "objective" ? !!q.correctAnswer : !!q.modelAnswer?.trim();

    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        paper_id: paperId,
        question_number: q.questionNumber,
        question_type: q.type,
        question_text: q.questionText,
        correct_answer: q.type === "objective" ? q.correctAnswer : null,
        answer_status: hasAnswer ? "needs_review" : "missing",
        explanation: q.explanation,
        model_answer: q.type === "subjective" ? q.modelAnswer : null,
        content_status: "draft",
        created_by: user?.id ?? null
      })
      .select("id")
      .single();
    if (error) throw error;
    const questionId = (inserted as { id: string }).id;

    if (q.type === "objective" && q.options.length) {
      const { error: optErr } = await supabase.from("question_options").insert(
        q.options.map((o, i) => ({
          question_id: questionId,
          option_letter: o.letter,
          option_text: o.text,
          sort_order: i
        }))
      );
      if (optErr) throw optErr;
    }
    if (q.type === "subjective" && q.markingPoints.length) {
      const { error: mpErr } = await supabase.from("marking_points").insert(
        q.markingPoints.map((p, i) => ({ question_id: questionId, point: p, marks: 1, sort_order: i }))
      );
      if (mpErr) throw mpErr;
    }
  }

  await supabase.from("import_batches").insert({
    admin_id: user?.id,
    paper_id: paperId,
    format,
    raw_input: rawInput.slice(0, 20000),
    summary: { inserted: toInsert.length, skipped_duplicates: skippedDuplicateNumbers },
    status: "imported"
  });

  return { insertedCount: toInsert.length, skippedDuplicateNumbers };
}

export interface AnswerKeyApplyResult {
  updated: number[];
  notFound: number[];
}

/** Matches answer-key entries to already-imported questions by question_number and
 * updates correct_answer. Always lands on answer_status="needs_review" — never
 * "verified" from an automated match, same reasoning as commitQuestions above. */
export async function applyAnswerKey(paperId: string, entries: AnswerKeyEntry[]): Promise<AnswerKeyApplyResult> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, question_number")
    .eq("paper_id", paperId);
  if (error) throw error;
  const rows = (data ?? []) as { id: string; question_number: number }[];

  const updated: number[] = [];
  const notFound: number[] = [];

  for (const entry of entries) {
    const row = rows.find((r) => r.question_number === entry.questionNumber);
    if (!row) {
      notFound.push(entry.questionNumber);
      continue;
    }
    const { error: upErr } = await supabase
      .from("questions")
      .update({ correct_answer: entry.answer, answer_status: "needs_review" })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated.push(entry.questionNumber);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  await supabase.from("import_batches").insert({
    admin_id: user?.id,
    paper_id: paperId,
    format: "answer_key",
    raw_input: entries.map((e) => `${e.questionNumber}. ${e.answer}`).join("\n").slice(0, 20000),
    summary: { updated, not_found: notFound },
    status: "imported"
  });

  return { updated, notFound };
}
