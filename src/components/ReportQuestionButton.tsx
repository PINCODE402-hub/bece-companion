import { useState } from "react";
import { submitReport, type ReportReason } from "@/services/reports";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_answer", label: "Wrong answer" },
  { value: "question_incorrect", label: "Question looks wrong" },
  { value: "missing_image", label: "Missing image" },
  { value: "formatting", label: "Formatting problem" },
  { value: "missing_answer", label: "Missing answer" },
  { value: "other", label: "Other" }
];

export function ReportQuestionButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport(questionId, reason, notes.trim() || undefined);
      setDone(true);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <span className="hint-text">🚩 Reported — thank you, an admin will take a look.</span>;
  }

  if (!open) {
    return (
      <button className="btn-report" onClick={() => setOpen(true)}>
        🚩 Report a problem with this question
      </button>
    );
  }

  return (
    <div className="report-box">
      <div className="chip-row">
        {REASONS.map((r) => (
          <button
            key={r.value}
            className={`chip ${reason === r.value ? "active" : ""}`}
            onClick={() => setReason(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        className="answer-input"
        rows={2}
        placeholder="Anything else? (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={!reason || submitting}>
          {submitting ? "Sending…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
