import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listPapers, createPaper, type PaperWithMeta } from "@/services/papers";
import { listSubjects, listYears } from "@/services/subjects";
import type { SubjectRow, YearRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

const STATUS_COLORS: Record<string, string> = {
  draft: "tag-sky",
  needs_review: "tag-gold",
  verified: "tag-gold",
  published: "tag-green",
  archived: "tag-coral"
};

export function AdminPapers() {
  const [papers, setPapers] = useState<PaperWithMeta[] | null>(null);
  const [years, setYears] = useState<YearRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [yearId, setYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [paperName, setPaperName] = useState("Paper 1");
  const [section, setSection] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [sourceType, setSourceType] = useState<"official" | "textbook" | "past_paper_book" | "unknown">(
    "unknown"
  );
  const [sourceName, setSourceName] = useState("");

  function refresh() {
    listPapers().then(setPapers).catch((e) => setError(e.message));
  }

  useEffect(() => {
    refresh();
    listYears().then(setYears).catch(() => {});
    listSubjects().then(setSubjects).catch(() => {});
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!yearId || !subjectId || !paperName.trim()) {
      return setError("Year, subject and paper name are required.");
    }
    const year = years.find((y) => y.id === yearId);
    const subject = subjects.find((s) => s.id === subjectId);
    const title = `${year?.year ?? ""} ${subject?.name ?? ""} ${paperName}`.trim();

    setSaving(true);
    try {
      await createPaper({
        year_id: yearId,
        subject_id: subjectId,
        paper_name: paperName.trim(),
        section: section.trim() || null,
        title,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        source_type: sourceType,
        source_name: sourceName.trim() || null
      });
      setShowForm(false);
      setSection("");
      setDurationMinutes("");
      setSourceName("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!papers) return <FullPageSpinner label="Loading papers…" />;

  return (
    <div>
      <div className="row-between">
        <h1>Past papers</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New paper"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <label className="field">
            <span>Year</span>
            <select value={yearId} onChange={(e) => setYearId(e.target.value)}>
              <option value="">Select year…</option>
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
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Paper name</span>
            <input type="text" value={paperName} onChange={(e) => setPaperName(e.target.value)} placeholder="Paper 1" />
          </label>
          <label className="field">
            <span>Section (optional)</span>
            <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="Objective" />
          </label>
          <label className="field">
            <span>Duration in minutes (optional — leave blank if unknown)</span>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 60"
            />
          </label>
          <label className="field">
            <span>Source type</span>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value as typeof sourceType)}>
              <option value="unknown">Unknown</option>
              <option value="official">Official</option>
              <option value="textbook">Textbook</option>
              <option value="past_paper_book">Past paper book</option>
            </select>
          </label>
          <label className="field">
            <span>Source name (optional)</span>
            <input type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create paper"}
          </button>
        </form>
      )}

      {papers.length === 0 ? (
        <p className="empty-note">No papers yet — create one above, then use its Importer.</p>
      ) : (
        papers.map((p) => (
          <Link to={`/admin/papers/${p.id}`} key={p.id} className="paper-row">
            <div>
              <div className="paper-row-title">
                {p.subject_icon} {p.year_number} {p.subject_name} — {p.paper_name}
                {p.section ? ` (${p.section})` : ""}
              </div>
              <div className="paper-row-meta">{p.question_count} question(s)</div>
            </div>
            <span className={`tag ${STATUS_COLORS[p.status] ?? "tag-sky"}`}>{p.status}</span>
          </Link>
        ))
      )}
    </div>
  );
}
