import { useEffect, useState } from "react";
import { listSubjects, listYears } from "@/services/subjects";
import { exportQuestionsAsJson } from "@/services/exportData";
import type { SubjectRow, YearRow } from "@/types/database";

export function AdminExport() {
  const [years, setYears] = useState<YearRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [yearId, setYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    listYears().then(setYears).catch(() => {});
    listSubjects().then(setSubjects).catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setDone(false);
    try {
      const json = await exportQuestionsAsJson({ yearId: yearId || undefined, subjectId: subjectId || undefined });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const yearLabel = years.find((y) => y.id === yearId)?.year ?? "all-years";
      const subjectLabel = subjects.find((s) => s.id === subjectId)?.slug ?? "all-subjects";
      const a = document.createElement("a");
      a.href = url;
      a.download = `bece-companion-export-${yearLabel}-${subjectLabel}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1>Export questions</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Download a JSON backup of your question database — everything, or filtered by year/subject. This
        is also a valid file to re-import later if you ever need to restore from a backup.
      </p>
      <div className="card">
        <label className="field">
          <span>Year</span>
          <select value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Subject</span>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        {done && <p className="form-success">Export downloaded.</p>}
        <button className="btn btn-primary btn-block" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing…" : "Export JSON"}
        </button>
      </div>
    </div>
  );
}
