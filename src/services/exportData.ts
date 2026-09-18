import { supabase } from "@/lib/supabaseClient";

export interface ExportFilter {
  yearId?: string;
  subjectId?: string;
}

interface RawExportPaperRow {
  id: string;
  title: string;
  paper_name: string;
  section: string | null;
  years: { year: number } | null;
  subjects: { name: string } | null;
}

interface RawExportOptionRow {
  option_letter: string;
  option_text: string;
  sort_order: number;
}
interface RawExportMarkingPointRow {
  point: string;
  sort_order: number;
}
interface RawExportQuestionRow {
  paper_id: string;
  question_number: number;
  question_type: string;
  question_text: string;
  correct_answer: string | null;
  answer_status: string;
  explanation: string | null;
  model_answer: string | null;
  content_status: string;
  question_options: RawExportOptionRow[];
  marking_points: RawExportMarkingPointRow[];
}

/** Produces the same JSON shape the importer accepts, plus a few extra
 * bookkeeping fields (answerStatus, contentStatus) — so an export is also a
 * valid re-import if you ever need to restore from a backup. */
export async function exportQuestionsAsJson(filter: ExportFilter): Promise<string> {
  let paperQuery = supabase.from("past_papers").select("id, title, paper_name, section, years(year), subjects(name)");
  if (filter.yearId) paperQuery = paperQuery.eq("year_id", filter.yearId);
  if (filter.subjectId) paperQuery = paperQuery.eq("subject_id", filter.subjectId);

  const { data: papers, error: papersErr } = await paperQuery;
  if (papersErr) throw papersErr;
  const paperRows = (papers ?? []) as unknown as RawExportPaperRow[];
  if (!paperRows.length) {
    return JSON.stringify({ exportedAt: new Date().toISOString(), papers: [] }, null, 2);
  }

  const paperIds = paperRows.map((p) => p.id);
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select(
      "paper_id, question_number, question_type, question_text, correct_answer, answer_status, " +
        "explanation, model_answer, content_status, question_options(*), marking_points(*)"
    )
    .in("paper_id", paperIds)
    .order("question_number");
  if (qErr) throw qErr;

  const byPaper = new Map<string, RawExportQuestionRow[]>();
  ((questions ?? []) as unknown as RawExportQuestionRow[]).forEach((q) => {
    const list = byPaper.get(q.paper_id) ?? [];
    list.push(q);
    byPaper.set(q.paper_id, list);
  });

  const result = paperRows.map((p) => ({
    year: p.years?.year ?? null,
    subject: p.subjects?.name ?? null,
    paper: p.paper_name,
    section: p.section,
    title: p.title,
    questions: (byPaper.get(p.id) ?? []).map((q) => ({
      questionNumber: q.question_number,
      type: q.question_type,
      question: q.question_text,
      options: [...q.question_options]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => `${o.option_letter}. ${o.option_text}`),
      answer: q.correct_answer,
      answerStatus: q.answer_status,
      explanation: q.explanation,
      modelAnswer: q.model_answer,
      markingPoints: [...q.marking_points].sort((a, b) => a.sort_order - b.sort_order).map((m) => m.point),
      contentStatus: q.content_status
    }))
  }));

  return JSON.stringify({ exportedAt: new Date().toISOString(), papers: result }, null, 2);
}
