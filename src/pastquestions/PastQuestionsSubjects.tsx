import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listPublishedPapers, type PublishedPaperSummary } from "@/services/studentContent";
import { cachePublishedPapersList, getCachedPublishedPapersList } from "@/offline/cache";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function PastQuestionsSubjects() {
  const { year } = useParams<{ year: string }>();
  const [papers, setPapers] = useState<PublishedPaperSummary[] | null>(null);
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
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!papers) return <FullPageSpinner label="Loading subjects…" />;

  const yearNum = Number(year);
  const forYear = papers.filter((p) => p.year === yearNum);
  const subjectMap = new Map<string, { name: string; icon: string | null; paperCount: number; questionCount: number }>();
  forYear.forEach((p) => {
    const existing = subjectMap.get(p.subject_id);
    if (existing) {
      existing.paperCount += 1;
      existing.questionCount += p.publishedQuestionCount;
    } else {
      subjectMap.set(p.subject_id, {
        name: p.subject_name,
        icon: p.subject_icon,
        paperCount: 1,
        questionCount: p.publishedQuestionCount
      });
    }
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/past-questions">
          ‹ Years
        </Link>
        <strong style={{ color: "#fff" }}>{year} BECE</strong>
      </header>
      <main className="page">
        <h1>{year} — Choose a subject</h1>
        {subjectMap.size === 0 ? (
          <p className="empty-note">Nothing published for this year.</p>
        ) : (
          Array.from(subjectMap.entries()).map(([subjectId, s]) => (
            <Link className="pq-year-card" to={`/past-questions/${year}/${subjectId}`} key={subjectId}>
              <div>
                <div className="pq-year-title">
                  {s.icon} {s.name}
                </div>
                <div className="pq-year-meta">
                  {s.paperCount} paper{s.paperCount === 1 ? "" : "s"} · {s.questionCount} question
                  {s.questionCount === 1 ? "" : "s"}
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
