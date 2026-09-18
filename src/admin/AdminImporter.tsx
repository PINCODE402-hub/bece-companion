import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { parseStructuredText, validateParsedPaper } from "@/importer/parseStructuredText";
import { parseJsonImport } from "@/importer/parseJson";
import { parseAnswerKey } from "@/importer/parseAnswerKey";
import { commitQuestions, applyAnswerKey } from "@/importer/commitImport";
import type { ImportPreview } from "@/importer/types";
import type { AnswerKeyParseResult } from "@/importer/parseAnswerKey";

type Format = "structured_text" | "json" | "answer_key";

const PLACEHOLDER: Record<Format, string> = {
  structured_text: `YEAR: 2024
SUBJECT: MATHEMATICS
PAPER: PAPER 1

1. What is 25% of 80?
A. 10
B. 20
C. 25
D. 30
ANSWER: B

2. Explain two causes of soil erosion.
MODEL ANSWER: Deforestation removes plant roots that hold soil together; poor farming methods like overgrazing strip the land of vegetation.
MARKING:
- Deforestation
- Poor farming practices`,
  json: `{
  "year": 2024,
  "subject": "Mathematics",
  "paper": "Paper 1",
  "questions": [
    {
      "questionNumber": 1,
      "type": "objective",
      "question": "What is 25% of 80?",
      "options": ["A. 10", "B. 20", "C. 25", "D. 30"],
      "answer": "B",
      "explanation": "25% of 80 = 20."
    }
  ]
}`,
  answer_key: `1. B
2. D
3. A
4. C`
};

export function AdminImporter() {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();

  const [format, setFormat] = useState<Format>("structured_text");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [answerKeyPreview, setAnswerKeyPreview] = useState<AnswerKeyParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handlePreview() {
    setError(null);
    setResult(null);
    setPreview(null);
    setAnswerKeyPreview(null);
    if (!raw.trim()) return setError("Paste something first.");

    try {
      if (format === "answer_key") {
        setAnswerKeyPreview(parseAnswerKey(raw));
      } else {
        const parsed = format === "json" ? parseJsonImport(raw) : parseStructuredText(raw);
        setPreview(validateParsedPaper(parsed));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCommit() {
    if (!paperId) return;
    setCommitting(true);
    setError(null);
    try {
      if (format === "answer_key" && answerKeyPreview) {
        const res = await applyAnswerKey(paperId, answerKeyPreview.entries);
        setResult(
          `Updated ${res.updated.length} answer(s).` +
            (res.notFound.length ? ` No matching question found for: ${res.notFound.join(", ")}.` : "")
        );
      } else if (preview) {
        const toImport = [...preview.valid, ...preview.needsReview];
        const res = await commitQuestions(paperId, toImport, format as "structured_text" | "json", raw);
        setResult(
          `Imported ${res.insertedCount} question(s).` +
            (res.skippedDuplicateNumbers.length
              ? ` Skipped as duplicates (already exist in this paper): ${res.skippedDuplicateNumbers.join(", ")}.`
              : "")
        );
      }
      setPreview(null);
      setAnswerKeyPreview(null);
      setRaw("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div>
      <Link className="backlink" to={`/admin/papers/${paperId}`}>
        ‹ Back to paper
      </Link>
      <h1>Import questions</h1>

      <div className="card">
        <div className="chip-row">
          {(["structured_text", "json", "answer_key"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip ${format === f ? "active" : ""}`}
              onClick={() => {
                setFormat(f);
                setPreview(null);
                setAnswerKeyPreview(null);
                setResult(null);
              }}
            >
              {f === "structured_text" ? "Structured text" : f === "json" ? "JSON" : "Answer key only"}
            </button>
          ))}
        </div>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Paste your content</span>
          <textarea
            className="import-textarea"
            rows={12}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={PLACEHOLDER[format]}
          />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setRaw(PLACEHOLDER[format])}>
            Insert example
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={handlePreview}>
            Preview
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        {result && <p className="form-success">{result}</p>}
      </div>

      {preview && (
        <div className="card">
          <h3>Import preview</h3>
          <p>
            {preview.parsed.questions.length} question(s) detected
            {preview.parsed.year ? ` · Year ${preview.parsed.year}` : ""}
            {preview.parsed.subjectName ? ` · ${preview.parsed.subjectName}` : ""}
            {preview.parsed.paperName ? ` · ${preview.parsed.paperName}` : ""}
          </p>
          <div className="preview-summary">
            <span className="tag tag-green">✓ {preview.valid.length} valid</span>
            <span className="tag tag-gold">⚠ {preview.needsReview.length} need review</span>
            <span className="tag tag-coral">✕ {preview.invalid.length} invalid</span>
          </div>

          {preview.issues.length > 0 && (
            <ul className="issue-list">
              {preview.issues.map((issue, i) => (
                <li key={i} className={issue.level === "invalid" ? "issue-invalid" : "issue-warn"}>
                  {issue.questionNumber !== null ? `Q${issue.questionNumber}: ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          <p className="hint-text">
            Only the {preview.valid.length + preview.needsReview.length} valid/needs-review question(s) will
            be imported (as drafts) — invalid ones are skipped and nothing is written until you confirm.
          </p>
          <div className="grid-2">
            <button className="btn btn-ghost btn-block" onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={handleCommit}
              disabled={committing || preview.valid.length + preview.needsReview.length === 0}
            >
              {committing ? "Importing…" : "Import valid questions"}
            </button>
          </div>
        </div>
      )}

      {answerKeyPreview && (
        <div className="card">
          <h3>Answer key preview</h3>
          <p>{answerKeyPreview.entries.length} answer(s) parsed.</p>
          {answerKeyPreview.skippedLines.length > 0 && (
            <div>
              <p className="hint-text">Lines that didn't match "N. X" and were skipped:</p>
              <ul className="issue-list">
                {answerKeyPreview.skippedLines.map((l, i) => (
                  <li key={i} className="issue-warn">{l}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="hint-text">
            These will be matched to existing questions in this paper by question number, and marked
            "needs review" — never auto-verified.
          </p>
          <div className="grid-2">
            <button className="btn btn-ghost btn-block" onClick={() => setAnswerKeyPreview(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={handleCommit}
              disabled={committing || answerKeyPreview.entries.length === 0}
            >
              {committing ? "Applying…" : "Apply answer key"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <button className="btn btn-ghost btn-block" onClick={() => navigate(`/admin/papers/${paperId}`)}>
          Back to paper
        </button>
      )}
    </div>
  );
}
