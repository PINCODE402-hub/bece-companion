import { supabase } from "@/lib/supabaseClient";
import type { QuestionType } from "@/types/database";

export async function listBookmarkedQuestionIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from("bookmarks").select("question_id");
  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { question_id: string }).question_id));
}

export async function addBookmark(questionId: string): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, question_id: questionId });
  if (error && error.code !== "23505") throw error; // 23505 = already bookmarked, fine
}

export async function removeBookmark(questionId: string): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("bookmarks").delete().eq("question_id", questionId).eq("user_id", user.id);
  if (error) throw error;
}

export interface BookmarkItem {
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
}

interface RawBookmarkRow {
  question_id: string;
  questions: {
    question_number: number;
    question_text: string;
    question_type: QuestionType;
    correct_answer: string | null;
    model_answer: string | null;
    explanation: string | null;
    past_papers: { title: string; subjects: { name: string; icon: string | null } | null } | null;
  } | null;
}

export async function listBookmarks(): Promise<BookmarkItem[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      "question_id, questions(question_number, question_text, question_type, correct_answer, model_answer, " +
        "explanation, past_papers(title, subjects(name, icon)))"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawBookmarkRow[];
  return rows
    .filter((r) => r.questions)
    .map((r) => ({
      question_id: r.question_id,
      question_number: r.questions!.question_number,
      question_text: r.questions!.question_text,
      question_type: r.questions!.question_type,
      correct_answer: r.questions!.correct_answer,
      model_answer: r.questions!.model_answer,
      explanation: r.questions!.explanation,
      paper_title: r.questions!.past_papers?.title ?? "Unknown paper",
      subject_name: r.questions!.past_papers?.subjects?.name ?? "Unknown subject",
      subject_icon: r.questions!.past_papers?.subjects?.icon ?? null
    }));
}
