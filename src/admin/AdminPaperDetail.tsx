import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPaper, updatePaperStatus, publishAllQuestionsInPaper, type PaperWithMeta } from "@/services/papers";
import { deleteQuestion, listQuestionsForPaper, type QuestionListItem } from "@/services/questions";
import type { ContentStatus } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { questionLikelyReferencesImage } from "@/data/imageHeuristic";

const STATUS_OPTIONS: ContentStatus[] = ["draft", "needs_review", "verified", "published", "archived"];

export function AdminPaperDetail() {
  const { paperId } = useParams<{ paperId: string }>();
  const [paper, setPaper] = useState<PaperWithMeta | null>(null);
  const [questions, setQuestions] = useState<QuestionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);

  function refresh() {
    if (!paperId) return;
    getPaper(paperId).then(setPaper).catch((e) => setError(e.message));
    listQuestionsForPaper(paperId).then(setQuestions).catch((e) => setError(e.message));
  }
  useEffect(refresh, [paperId]);

  async function handleStatusChange(status: ContentStatus) {
    if (!paperId) return;
    setSavingStatus(true);
    try {
      await updatePaperStatus(paperId, status);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question permanently? This cannot be undone.")) return;
    try {
      await deleteQuestion(id);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handlePublishAll() {
    if (!paperId) return;
    if (!confirm("Publish every question in this paper that isn't already published?")) return;
    setPublishingAll(true);
    try {
      const count = await publishAllQuestionsInPaper(paperId);
      refresh();
      if (count === 0) setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishingAll(false);
    }
  }

  if (!paper || !questions) return <FullPageSpinner label="Loading paper…" />;

  return (
    <div>
      <Link className="backlink" to="/admin/papers">
        ‹ All papers
      </Link>
      <h1>{paper.title}</h1>

      <div className="card">
        <div className="setup-row">
          <span>Status</span>
          <select value={paper.status} disabled={savingStatus} onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="setup-row">
          <span>Duration</span>
          <span>{paper.duration_minutes ? `${paper.duration_minutes} min` : "Not set"}</span>
        </div>
        <div className="setup-row">
          <span>Source</span>
          <span>{paper.source_type}{paper.source_name ? ` — ${paper.source_name}` : ""}</span>
        </div>
        <p className="hint-text">
          Only papers with status <strong>published</strong> are visible to students — and within a
          published paper, only questions individually marked <strong>published</strong> show up.
        </p>
      </div>

      <div className="row-between">
        <h3 style={{ margin: 0 }}>Questions ({questions.length})</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePublishAll} disabled={publishingAll}>
            {publishingAll ? "Publishing…" : "Publish all"}
          </button>
          <Link className="btn btn-ghost btn-sm" to={`/admin/papers/${paperId}/import`}>
            Import
          </Link>
          <Link className="btn btn-primary btn-sm" to={`/admin/papers/${paperId}/questions/new`}>
            + Add question
          </Link>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {questions.length === 0 ? (
        <p className="empty-note">No questions yet. Add one manually or use Import to paste from a source.</p>
      ) : (
        questions.map((q) => (
          <div className="question-row" key={q.id}>
            <Link to={`/admin/papers/${paperId}/questions/${q.id}`} className="question-row-link">
              <span className="question-row-number">Q{q.question_number}</span>
              <span className="question-row-text">{q.question_text.slice(0, 90)}</span>
            </Link>
            <div className="question-row-tags">
              {questionLikelyReferencesImage(q.question_text) && q.image_count === 0 && (
                <span className="tag tag-coral" title="This question's wording suggests a diagram/graph/table, but no image is attached">
                  🖼️ needs image?
                </span>
              )}
              <span className={`tag ${q.content_status === "published" ? "tag-green" : "tag-sky"}`}>
                {q.content_status}
              </span>
              <span
                className={`tag ${
                  q.answer_status === "verified" ? "tag-green" : q.answer_status === "missing" ? "tag-coral" : "tag-gold"
                }`}
              >
                {q.answer_status}
              </span>
              <button className="btn-icon-delete" onClick={() => handleDelete(q.id)} aria-label="Delete question">
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
