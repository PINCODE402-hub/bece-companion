import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listPublishedPapers, type PublishedPaperSummary } from "@/services/studentContent";
import { listCachedPaperIds, cachePublishedPapersList, getCachedPublishedPapersList } from "@/offline/cache";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function PastQuestionsPapers() {
  const { year, subjectId } = useParams<{ year: string; subjectId: string }>();
  const [papers, setPapers] = useState<PublishedPaperSummary[] | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPublishedPapers()
      .then((ps) => {
        setPapers(ps);
        cachePublishedPapersList(ps);
      })
      .catch(async (e) => {
        const cached = await getCachedPublishedPapersList();
        if (cached) setPapers(cached);
        else setError(e.message);
      });
    listCachedPaperIds().then(setCachedIds);
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!papers) return <FullPageSpinner label="Loading papers…" />;

  const yearNum = Number(year);
  const filtered = papers.filter((p) => p.year === yearNum && p.subject_id === subjectId);
  const subjectLabel = filtered[0] ? `${filtered[0].subject_icon ?? ""} ${filtered[0].subject_name}` : "Subject";

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to={`/past-questions/${year}`}>
          ‹ Subjects
        </Link>
        <strong style={{ color: "#fff" }}>{subjectLabel}</strong>
      </header>
      <main className="page">
        <h1>
          {year} {subjectLabel}
        </h1>
        {filtered.length === 0 ? (
          <p className="empty-note">Nothing published here yet.</p>
        ) : (
          filtered.map((p) => (
            <Link className="pq-year-card" to={`/past-questions/${year}/${subjectId}/${p.id}`} key={p.id}>
              <div>
                <div className="pq-year-title">
                  {p.paper_name}
                  {p.section ? ` (${p.section})` : ""}
                </div>
                <div className="pq-year-meta">
                  {p.publishedQuestionCount} question{p.publishedQuestionCount === 1 ? "" : "s"}
                  {p.duration_minutes ? ` · ${p.duration_minutes} min` : ""}
                  {cachedIds.has(p.id) ? " · 📥 Available offline" : ""}
                </div>
              </div>
              <span className="chev">›</span>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
