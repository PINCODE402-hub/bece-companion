import { supabase } from "@/lib/supabaseClient";
import type { QuestionReportRow } from "@/types/database";

export interface ReportWithContext extends QuestionReportRow {
  question_text: string;
  paper_id: string;
  paper_title: string;
}

interface RawReportRow extends QuestionReportRow {
  questions: {
    question_text: string;
    paper_id: string;
    past_papers: { title: string } | null;
  } | null;
}

export async function listOpenReports(): Promise<ReportWithContext[]> {
  const { data, error } = await supabase
    .from("question_reports")
    .select("*, questions(question_text, paper_id, past_papers(title))")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as RawReportRow[]).map((r) => ({
    ...r,
    question_text: r.questions?.question_text ?? "Unknown question",
    paper_id: r.questions?.paper_id ?? "",
    paper_title: r.questions?.past_papers?.title ?? "Unknown paper"
  }));
}

export async function updateReportStatus(id: string, status: "reviewed" | "resolved"): Promise<void> {
  const { error } = await supabase.from("question_reports").update({ status }).eq("id", id);
  if (error) throw error;
}
