import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPublishedPapers, type PublishedPaperSummary } from "@/services/studentContent";
import { cachePublishedPapersList, getCachedPublishedPapersList } from "@/offline/cache";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function PastQuestionsYears() {
  const [papers, setPapers] = useState<PublishedPaperSummary[] | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPublishedPapers()
      .then((ps) => {
        setPapers(ps);
        cachePublishedPapersList(ps);
      })
      .catch(async (e) => {
        const cached = await getCachedPublishedPapersList();
        if (cached) {
          setPapers(cached);
          setUsingOfflineCopy(true);
        } else {
          setError(e.message ?? "Couldn't load past questions.");
        }
      });
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!papers) return <FullPageSpinner label="Loading past questions…" />;

  const years = Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/">
          ‹ Home
        </Link>
        <strong style={{ color: "#fff" }}>Past Questions</strong>
      </header>
      <main className="page">
        <h1>📚 Past Questions</h1>
        {usingOfflineCopy && (
          <div className="offline-note">📥 Showing your last downloaded list — you're offline right now.</div>
        )}
        {years.length === 0 ? (
          <p className="empty-note">
            No past questions are published yet — check back soon, or ask your admin to publish some.
          </p>
        ) : (
          years.map((year) => {
            const count = papers.filter((p) => p.year === year).length;
            return (
              <Link className="pq-year-card" to={`/past-questions/${year}`} key={year}>
                <div>
                  <div className="pq-year-title">{year} BECE</div>
                  <div className="pq-year-meta">{count} paper{count === 1 ? "" : "s"} available</div>
                </div>
                <span className="chev">›</span>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
