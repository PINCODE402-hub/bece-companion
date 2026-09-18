import { supabase } from "@/lib/supabaseClient";

export interface DashboardStats {
  totalQuestions: number;
  totalPapers: number;
  totalSubjects: number;
  totalYears: number;
  needsReview: number;
  unpublished: number;
  openReports: number;
  registeredStudents: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalQuestions,
    totalPapers,
    totalSubjects,
    totalYears,
    needsReview,
    unpublished,
    openReports,
    registeredStudents
  ] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("past_papers").select("*", { count: "exact", head: true }),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
    supabase.from("years").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }).neq("answer_status", "verified"),
    supabase.from("questions").select("*", { count: "exact", head: true }).neq("content_status", "published"),
    supabase.from("question_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student")
  ]);

  for (const r of [
    totalQuestions,
    totalPapers,
    totalSubjects,
    totalYears,
    needsReview,
    unpublished,
    openReports,
    registeredStudents
  ]) {
    if (r.error) throw r.error;
  }

  return {
    totalQuestions: totalQuestions.count ?? 0,
    totalPapers: totalPapers.count ?? 0,
    totalSubjects: totalSubjects.count ?? 0,
    totalYears: totalYears.count ?? 0,
    needsReview: needsReview.count ?? 0,
    unpublished: unpublished.count ?? 0,
    openReports: openReports.count ?? 0,
    registeredStudents: registeredStudents.count ?? 0
  };
}
