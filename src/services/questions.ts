import { supabase } from "@/lib/supabaseClient";
import type {
  AnswerStatus,
  ContentStatus,
  MarkingPointRow,
  QuestionImageRow,
  QuestionOptionRow,
  QuestionRow,
  QuestionType
} from "@/types/database";

export interface QuestionListItem extends QuestionRow {
  option_count: number;
  image_count: number;
}

export async function listQuestionsForPaper(paperId: string): Promise<QuestionListItem[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(count), question_images(count)")
    .eq("paper_id", paperId)
    .order("question_number");
  if (error) throw error;
  return (
    (data ?? []) as unknown as (QuestionRow & {
      question_options: { count: number }[];
      question_images: { count: number }[];
    })[]
  ).map((row) => ({
    ...row,
    option_count: row.question_options?.[0]?.count ?? 0,
    image_count: row.question_images?.[0]?.count ?? 0
  }));
}

export async function listNeedsReview(): Promise<
  (QuestionRow & { paper_title: string })[]
> {
  const { data, error } = await supabase
    .from("questions")
    .select("*, past_papers(title)")
    .neq("answer_status", "verified")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as (QuestionRow & { past_papers: { title: string } | null })[]).map(
    (row) => ({ ...row, paper_title: row.past_papers?.title ?? "Unknown paper" })
  );
}

export interface QuestionFull {
  question: QuestionRow;
  options: QuestionOptionRow[];
  markingPoints: MarkingPointRow[];
  images: QuestionImageRow[];
}

export async function getQuestionFull(id: string): Promise<QuestionFull | null> {
  const [
    { data: question, error: qErr },
    { data: options, error: oErr },
    { data: mps, error: mErr },
    { data: images, error: iErr }
  ] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase.from("question_options").select("*").eq("question_id", id).order("sort_order"),
    supabase.from("marking_points").select("*").eq("question_id", id).order("sort_order"),
    supabase.from("question_images").select("*").eq("question_id", id).order("sort_order")
  ]);
  if (qErr) throw qErr;
  if (oErr) throw oErr;
  if (mErr) throw mErr;
  if (iErr) throw iErr;
  if (!question) return null;
  return {
    question: question as QuestionRow,
    options: (options ?? []) as QuestionOptionRow[],
    markingPoints: (mps ?? []) as MarkingPointRow[],
    images: (images ?? []) as QuestionImageRow[]
  };
}

export interface QuestionInput {
  paper_id: string;
  question_number: number;
  question_type: QuestionType;
  question_text: string;
  correct_answer?: string | null;
  answer_status: AnswerStatus;
  explanation?: string | null;
  model_answer?: string | null;
  difficulty?: QuestionRow["difficulty"];
  source_notes?: string | null;
  content_status: ContentStatus;
  options: { letter: string; text: string }[];
  markingPoints: { point: string; marks: number }[];
  images: { url: string; caption?: string | null }[];
}

/** Creates or fully replaces a question's options/marking points/images in one call.
 * Images live in question_images (one-to-many) — see migration-0006-multi-image.sql
 * for why: a multi-part question can need more than one diagram, which the old
 * single questions.image_url column couldn't hold. That column is no longer
 * read or written here. */
export async function saveQuestion(input: QuestionInput, existingId?: string): Promise<string> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const payload = {
    paper_id: input.paper_id,
    question_number: input.question_number,
    question_type: input.question_type,
    question_text: input.question_text,
    correct_answer: input.question_type === "objective" ? input.correct_answer ?? null : null,
    answer_status: input.answer_status,
    explanation: input.explanation ?? null,
    model_answer: input.question_type === "subjective" ? input.model_answer ?? null : null,
    difficulty: input.difficulty ?? null,
    source_notes: input.source_notes ?? null,
    content_status: input.content_status
  };

  let questionId = existingId;
  if (questionId) {
    const { error } = await supabase.from("questions").update(payload).eq("id", questionId);
    if (error) throw error;
    // wipe and re-insert options / marking points / images — simplest way to keep them in sync with the form
    await supabase.from("question_options").delete().eq("question_id", questionId);
    await supabase.from("marking_points").delete().eq("question_id", questionId);
    await supabase.from("question_images").delete().eq("question_id", questionId);
  } else {
    const { data, error } = await supabase
      .from("questions")
      .insert({ ...payload, created_by: user?.id ?? null })
      .select("id")
      .single();
    if (error) throw error;
    questionId = (data as { id: string }).id;
  }

  if (input.question_type === "objective" && input.options.length) {
    const { error } = await supabase.from("question_options").insert(
      input.options.map((opt, i) => ({
        question_id: questionId,
        option_letter: opt.letter,
        option_text: opt.text,
        sort_order: i
      }))
    );
    if (error) throw error;
  }

  if (input.question_type === "subjective" && input.markingPoints.length) {
    const { error } = await supabase.from("marking_points").insert(
      input.markingPoints.map((mp, i) => ({
        question_id: questionId,
        point: mp.point,
        marks: mp.marks,
        sort_order: i
      }))
    );
    if (error) throw error;
  }

  if (input.images.length) {
    const { error } = await supabase.from("question_images").insert(
      input.images.map((img, i) => ({
        question_id: questionId,
        image_url: img.url,
        caption: img.caption ?? null,
        sort_order: i
      }))
    );
    if (error) throw error;
  }

  return questionId!;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAnswerReview(
  id: string,
  fields: { answer_status: AnswerStatus; correct_answer?: string | null; explanation?: string | null }
): Promise<void> {
  const { error } = await supabase.from("questions").update(fields).eq("id", id);
  if (error) throw error;
}
