import { supabase } from "@/lib/supabaseClient";
import type { ContentStatus, PastPaperRow } from "@/types/database";

export interface PaperWithMeta extends PastPaperRow {
  subject_name: string;
  subject_icon: string | null;
  year_number: number;
  question_count: number;
}

// Supabase's nested-select typing isn't available without generated types, so
// we type the raw shape we expect back and map it ourselves.
interface RawPaperRow extends PastPaperRow {
  subjects: { name: string; icon: string | null } | null;
  years: { year: number } | null;
  questions: { count: number }[];
}

export async function listPapers(): Promise<PaperWithMeta[]> {
  const { data, error } = await supabase
    .from("past_papers")
    .select("*, subjects(name, icon), years(year), questions(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as RawPaperRow[]).map((row) => ({
    ...row,
    subject_name: row.subjects?.name ?? "Unknown subject",
    subject_icon: row.subjects?.icon ?? null,
    year_number: row.years?.year ?? 0,
    question_count: row.questions?.[0]?.count ?? 0
  }));
}

export async function getPaper(id: string): Promise<PaperWithMeta | null> {
  const { data, error } = await supabase
    .from("past_papers")
    .select("*, subjects(name, icon), years(year), questions(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as RawPaperRow;
  return {
    ...row,
    subject_name: row.subjects?.name ?? "Unknown subject",
    subject_icon: row.subjects?.icon ?? null,
    year_number: row.years?.year ?? 0,
    question_count: row.questions?.[0]?.count ?? 0
  };
}

export interface CreatePaperInput {
  year_id: string;
  subject_id: string;
  paper_name: string;
  section?: string | null;
  title: string;
  duration_minutes?: number | null;
  source_type?: PastPaperRow["source_type"];
  source_name?: string | null;
  source_url?: string | null;
  source_notes?: string | null;
}

export async function createPaper(input: CreatePaperInput): Promise<PastPaperRow> {
  const { data, error } = await supabase
    .from("past_papers")
    .insert({
      year_id: input.year_id,
      subject_id: input.subject_id,
      paper_name: input.paper_name,
      section: input.section ?? null,
      title: input.title,
      duration_minutes: input.duration_minutes ?? null,
      source_type: input.source_type ?? "unknown",
      source_name: input.source_name ?? null,
      source_url: input.source_url ?? null,
      source_notes: input.source_notes ?? null,
      status: "draft"
    })
    .select()
    .single();
  if (error) throw error;
  return data as PastPaperRow;
}

/** Finds a paper by (year, subject, paper_name, section) or creates it. Used by the importer. */
export async function findOrCreatePaper(input: CreatePaperInput): Promise<PastPaperRow> {
  let query = supabase
    .from("past_papers")
    .select("*")
    .eq("year_id", input.year_id)
    .eq("subject_id", input.subject_id)
    .eq("paper_name", input.paper_name);

  query = input.section ? query.eq("section", input.section) : query.is("section", null);

  const { data: existing, error: findErr } = await query.maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as PastPaperRow;
  return createPaper(input);
}

export async function updatePaperStatus(id: string, status: ContentStatus): Promise<void> {
  const { error } = await supabase.from("past_papers").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Publishes every question in a paper that isn't already published — a bulk shortcut for
 * after an import, instead of opening each question individually. Doesn't touch answer_status
 * (that stays a deliberate, separate Answer Review action) — only content visibility. */
export async function publishAllQuestionsInPaper(paperId: string): Promise<number> {
  const { data, error } = await supabase
    .from("questions")
    .update({ content_status: "published" })
    .eq("paper_id", paperId)
    .neq("content_status", "published")
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function updatePaper(id: string, fields: Partial<CreatePaperInput>): Promise<void> {
  const { error } = await supabase.from("past_papers").update(fields).eq("id", id);
  if (error) throw error;
}
