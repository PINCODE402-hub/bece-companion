import { supabase } from "@/lib/supabaseClient";

export type ReportReason =
  | "wrong_answer"
  | "question_incorrect"
  | "missing_image"
  | "formatting"
  | "missing_answer"
  | "other";

export async function submitReport(questionId: string, reason: ReportReason, notes?: string): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to report a question.");

  const { error } = await supabase
    .from("question_reports")
    .insert({ user_id: user.id, question_id: questionId, reason, notes: notes ?? null });
  if (error) throw error;
}
