import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBookmarks, removeBookmark, type BookmarkItem } from "@/services/bookmarks";
import { formatMultiPartText } from "@/data/formatMultiPartText";
import { FullPageSpinner } from "@/components/FullPageSpinner";

function BookmarkCard({ item, onRemoved }: { item: BookmarkItem; onRemoved: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeBookmark(item.question_id);
      onRemoved();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="hint-text">
          {item.subject_icon} {item.subject_name} · {item.paper_title} · Q{item.question_number}
        </span>
        <button className="btn-icon-delete" onClick={handleRemove} disabled={removing} aria-label="Remove bookmark">
          ✕
        </button>
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

export function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listBookmarks().then(setBookmarks).catch((e) => setError(e.message));
  }
  useEffect(refresh, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!bookmarks) return <FullPageSpinner label="Loading bookmarks…" />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/progress">
          ‹ Progress
        </Link>
        <strong style={{ color: "#fff" }}>Bookmarks</strong>
      </header>
      <main className="page">
        <h1>🔖 My bookmarks</h1>
        {bookmarks.length === 0 ? (
          <p className="empty-note">
            You haven't bookmarked any questions yet — tap the bookmark button while studying or
            practicing to save one here.
          </p>
        ) : (
          bookmarks.map((b) => <BookmarkCard key={b.question_id} item={b} onRemoved={refresh} />)
        )}
      </main>
    </div>
  );
}
