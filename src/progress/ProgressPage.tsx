import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProgressSummary, type ProgressSummary } from "@/services/progress";
import { useAuth } from "@/auth/AuthContext";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function ProgressPage() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProgressSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!summary) return <FullPageSpinner label="Loading your progress…" />;

  const overallPct = summary.totalAttempted ? Math.round((summary.totalCorrect / summary.totalAttempted) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/">
          ‹ Home
        </Link>
        <strong style={{ color: "#fff" }}>Progress</strong>
      </header>
      <main className="page">
        <h1>📈 Your progress</h1>

        <div className="hero">
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">{profile?.xp ?? 0}</div>
              <div className="lbl">XP</div>
            </div>
            <div className="hero-stat">
              <div className="num">Lv {profile?.level ?? 1}</div>
              <div className="lbl">Level</div>
            </div>
            <div className="hero-stat">
              <div className="num">{profile?.streak ?? 0}🔥</div>
              <div className="lbl">Streak</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row-between">
            <strong>Overall accuracy</strong>
            <span>{overallPct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
          <p className="hint-text" style={{ marginTop: 8 }}>
            {summary.totalAttempted} question{summary.totalAttempted === 1 ? "" : "s"} attempted so far
          </p>
        </div>

        <div className="grid-2" style={{ marginTop: 0, marginBottom: 16 }}>
          <Link className="btn btn-ghost btn-block" to="/progress/mistakes">
            ❌ Review mistakes
          </Link>
          <Link className="btn btn-ghost btn-block" to="/progress/bookmarks">
            🔖 Bookmarks
          </Link>
        </div>
        <div className="grid-2" style={{ marginTop: 0, marginBottom: 16 }}>
          <Link className="btn btn-ghost btn-block" to="/progress/leaderboard">
            🏅 Leaderboard
          </Link>
          <Link className="btn btn-ghost btn-block" to="/progress/badges">
            🎖️ Badges
          </Link>
        </div>

        <div className="section-title">By subject</div>
        {summary.subjects.length === 0 ? (
          <p className="empty-note">
            No practice yet — go answer some questions in Past Questions and your accuracy will show up
            here.
          </p>
        ) : (
          summary.subjects.map((s) => {
            const pct = s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0;
            return (
              <div className="card" key={s.subject_id} style={{ padding: 13 }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {s.subject_icon} {s.subject_name}
                  </span>
                  <span style={{ fontFamily: "ui-monospace,Menlo,Consolas,monospace", fontSize: 12, color: "var(--ink-faint)" }}>
                    {s.correct}/{s.attempted}
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
