import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOpenReports, updateReportStatus, type ReportWithContext } from "@/services/adminReports";
import { FullPageSpinner } from "@/components/FullPageSpinner";

const REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong answer",
  question_incorrect: "Question looks wrong",
  missing_image: "Missing image",
  formatting: "Formatting problem",
  missing_answer: "Missing answer",
  other: "Other"
};

function ReportCard({ report, onUpdated }: { report: ReportWithContext; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handle(status: "reviewed" | "resolved") {
    setBusy(true);
    try {
      await updateReportStatus(report.id, status);
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="tag tag-coral">{REASON_LABELS[report.reason] ?? report.reason}</span>
        <span className="hint-text">{new Date(report.created_at).toLocaleDateString()}</span>
      </div>
      <p className="hint-text" style={{ marginBottom: 4 }}>{report.paper_title}</p>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{report.question_text}</div>
      {report.notes && (
        <div className="sq-explain-box" style={{ marginBottom: 10 }}>"{report.notes}"</div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {report.paper_id && (
          <Link className="btn btn-ghost btn-sm" to={`/admin/papers/${report.paper_id}/questions/${report.question_id}`}>
            Edit question
          </Link>
        )}
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handle("reviewed")}>
          Mark reviewed
        </button>
        <button className="btn btn-green btn-sm" disabled={busy} onClick={() => handle("resolved")}>
          Mark resolved
        </button>
      </div>
    </div>
  );
}

export function AdminReports() {
  const [reports, setReports] = useState<ReportWithContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listOpenReports().then(setReports).catch((e) => setError(e.message));
  }
  useEffect(refresh, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!reports) return <FullPageSpinner label="Loading reports…" />;

  return (
    <div>
      <h1>Reports</h1>
      <p style={{ color: "var(--ink-faint)" }}>Questions students have flagged as having a problem.</p>
      {reports.length === 0 ? (
        <p className="empty-note">No open reports right now. 🎉</p>
      ) : (
        reports.map((r) => <ReportCard key={r.id} report={r} onUpdated={refresh} />)
      )}
    </div>
  );
}
