import { useEffect, useState } from "react";
import { listNeedsReview, updateAnswerReview } from "@/services/questions";
import type { AnswerStatus, QuestionRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Item = QuestionRow & { paper_title: string };

function ReviewRow({ item, onSaved }: { item: Item; onSaved: () => void }) {
  const [answer, setAnswer] = useState(item.correct_answer ?? "");
  const [explanation, setExplanation] = useState(item.explanation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status: AnswerStatus) {
    setSaving(true);
    setError(null);
    try {
      await updateAnswerReview(item.id, {
        answer_status: status,
        correct_answer: item.question_type === "objective" ? answer || null : null,
        explanation: explanation || null
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="row-between">
        <strong>Q{item.question_number} — {item.paper_title}</strong>
        <span className={`tag ${item.answer_status === "missing" ? "tag-coral" : "tag-gold"}`}>{item.answer_status}</span>
      </div>
      <p style={{ marginTop: 8 }}>{item.question_text}</p>

      {item.question_type === "objective" ? (
        <label className="field">
          <span>Correct answer (option letter)</span>
          <input type="text" maxLength={1} value={answer} onChange={(e) => setAnswer(e.target.value.toUpperCase())} style={{ maxWidth: 80 }} />
        </label>
      ) : (
        <p className="hint-text">Subjective question — review its model answer in the question editor.</p>
      )}

      <label className="field">
        <span>Explanation (optional)</span>
        <textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-green btn-sm" disabled={saving} onClick={() => save("verified")}>
          ✓ Verify
        </button>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => save("needs_review")}>
          Save as needs review
        </button>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => save("missing")}>
          Mark missing
        </button>
      </div>
    </div>
  );
}

export function AdminAnswerReview() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listNeedsReview()
      .then(setItems)
      .catch((e) => setError(e.message));
  }
  useEffect(refresh, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!items) return <FullPageSpinner label="Loading review queue…" />;

  return (
    <div>
      <h1>Answer review</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Questions with an answer that isn't verified yet. Nothing here is shown to students as an
        official answer until you verify it.
      </p>
      {items.length === 0 ? (
        <p className="empty-note">Nothing to review right now — every answer is verified. 🎉</p>
      ) : (
        items.map((item) => <ReviewRow key={item.id} item={item} onSaved={refresh} />)
      )}
    </div>
  );
}
