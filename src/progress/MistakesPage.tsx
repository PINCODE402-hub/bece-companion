import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMistakes, type MistakeItem } from "@/services/progress";
import { formatMultiPartText } from "@/data/formatMultiPartText";
import { FullPageSpinner } from "@/components/FullPageSpinner";

function MistakeCard({ item }: { item: MistakeItem }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="hint-text">
          {item.subject_icon} {item.subject_name} · {item.paper_title} · Q{item.question_number}
        </span>
      </div>
      <div className="pq-question-text" style={{ fontSize: 14.5 }}>{formatMultiPartText(item.question_text)}</div>
      <button className="btn btn-ghost btn-sm" onClick={() => setRevealed((r) => !r)}>
        {revealed ? "Hide answer" : "Show answer"}
      </button>
      {revealed && (
        <div className="sq-explain-box" style={{ marginTop: 10 }}>
          {item.question_type === "objective" ? (
            <>
              <strong>Correct answer: {item.correct_answer ?? "Not available"}</strong>
              {item.explanation ? <div style={{ marginTop: 4 }}>💡 {item.explanation}</div> : null}
            </>
          ) : (
            <div style={{ whiteSpace: "pre-line" }}>{formatMultiPartText(item.model_answer ?? "No model answer available yet.")}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMistakes()
      .then(setMistakes)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!mistakes) return <FullPageSpinner label="Loading mistakes…" />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/progress">
          ‹ Progress
        </Link>
        <strong style={{ color: "#fff" }}>Review Mistakes</strong>
      </header>
      <main className="page">
        <h1>❌ Review mistakes</h1>
        {mistakes.length === 0 ? (
          <p className="empty-note">Great! No incorrect questions to review right now. 🎉</p>
        ) : (
          mistakes.map((m) => <MistakeCard key={m.question_id} item={m} />)
        )}
      </main>
    </div>
  );
}
