import type { ParsedPaper, ParsedQuestion } from "./types";

/** Throws a plain, human-readable Error if the JSON doesn't match the expected shape.
 * Deliberately strict at the top level (a malformed import must fail loudly, not
 * silently import garbage) but lenient on a per-question basis — per-question
 * problems are surfaced as "invalid"/"needs_review" issues instead, by the same
 * validateParsedPaper() used for the text importer. */
export function parseJsonImport(raw: string): ParsedPaper {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new Error("That's not valid JSON: " + (e as Error).message);
  }

  if (typeof obj !== "object" || obj === null) throw new Error("Top level must be a JSON object.");
  const o = obj as Record<string, unknown>;

  if (!Array.isArray(o.questions)) throw new Error('Missing or invalid "questions" array.');

  const questions: ParsedQuestion[] = o.questions.map((raw, idx) => {
    const q = raw as Record<string, unknown>;
    const questionNumber = Number(q.questionNumber ?? idx + 1);
    const type: "objective" | "subjective" = q.type === "subjective" ? "subjective" : "objective";

    const options = Array.isArray(q.options)
      ? (q.options as unknown[]).map((optRaw) => {
          const s = String(optRaw);
          const m = s.match(/^([A-Fa-f])\.?\s*(.*)$/);
          return m ? { letter: m[1].toUpperCase(), text: m[2].trim() } : { letter: "?", text: s.trim() };
        })
      : [];

    const markingPoints = Array.isArray(q.markingPoints) ? (q.markingPoints as unknown[]).map(String) : [];

    return {
      questionNumber,
      type,
      questionText: String(q.question ?? "").trim(),
      options,
      correctAnswer: q.answer ? String(q.answer).toUpperCase().trim() : null,
      explanation: q.explanation ? String(q.explanation).trim() : null,
      modelAnswer: q.modelAnswer ? String(q.modelAnswer).trim() : null,
      markingPoints,
      topic: q.topic ? String(q.topic).trim() : null
    };
  });

  return {
    year: o.year ? Number(o.year) : null,
    subjectName: o.subject ? String(o.subject) : null,
    paperName: o.paper ? String(o.paper) : null,
    questions
  };
}
