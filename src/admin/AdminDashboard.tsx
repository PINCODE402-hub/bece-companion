import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, type DashboardStats } from "@/services/dashboardStats";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message ?? "Failed to load stats"));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <FullPageSpinner label="Loading dashboard…" />;

  const cards: { label: string; value: number; to?: string; warn?: boolean }[] = [
    { label: "Total questions", value: stats.totalQuestions },
    { label: "Total papers", value: stats.totalPapers },
    { label: "Subjects", value: stats.totalSubjects },
    { label: "Years", value: stats.totalYears },
    { label: "Needs answer review", value: stats.needsReview, to: "/admin/review", warn: stats.needsReview > 0 },
    { label: "Unpublished questions", value: stats.unpublished, warn: stats.unpublished > 0 },
    { label: "Open reports", value: stats.openReports, to: "/admin/reports", warn: stats.openReports > 0 },
    { label: "Registered students", value: stats.registeredStudents }
  ];

  return (
    <div>
      <h1>Admin dashboard</h1>
      <div className="stat-grid">
        {cards.map((c) => {
          const inner = (
            <div className={`stat-card ${c.warn ? "stat-warn" : ""}`} key={c.label}>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          );
          return c.to ? (
            <Link to={c.to} key={c.label} style={{ textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          ) : (
            inner
          );
        })}
      </div>

      <div className="card">
        <h3>Get started</h3>
        <p>
          Add a Year and confirm your Subjects, then create a Past Paper and use its Importer to paste
          questions from a source PDF.
        </p>
        <div className="admin-actions">
          <Link className="btn btn-ghost" to="/admin/years">Manage years</Link>
          <Link className="btn btn-ghost" to="/admin/subjects">Manage subjects</Link>
          <Link className="btn btn-primary" to="/admin/papers">Go to Papers</Link>
        </div>
      </div>
    </div>
  );
}
