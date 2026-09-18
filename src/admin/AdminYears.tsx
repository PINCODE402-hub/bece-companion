import { useEffect, useState, type FormEvent } from "react";
import { createYear, listYears } from "@/services/subjects";
import type { YearRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function AdminYears() {
  const [years, setYears] = useState<YearRow[] | null>(null);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    listYears().then(setYears).catch((e) => setError(e.message));
  }
  useEffect(refresh, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = parseInt(newYear, 10);
    if (!n || n < 1990 || n > 2100) return setError("Enter a valid year, e.g. 2024.");
    setSaving(true);
    try {
      await createYear(n);
      setNewYear("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!years) return <FullPageSpinner label="Loading years…" />;

  return (
    <div>
      <h1>Years</h1>
      <form className="card" onSubmit={handleAdd}>
        <div className="inline-form">
          <input
            type="number"
            placeholder="e.g. 2024"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add year"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      {years.length === 0 ? (
        <p className="empty-note">No years yet — add one above.</p>
      ) : (
        <div className="card">
          {years.map((y) => (
            <div className="setup-row" key={y.id}>
              <span>{y.year}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
