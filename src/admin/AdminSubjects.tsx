import { useEffect, useState, type FormEvent } from "react";
import { createSubject, listSubjects } from "@/services/subjects";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminSubjects() {
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    listSubjects().then(setSubjects).catch((e) => setError(e.message));
  }
  useEffect(refresh, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Subject name is required.");
    setSaving(true);
    try {
      await createSubject({ name: name.trim(), slug: slugify(name), icon: icon.trim() || undefined });
      setName("");
      setIcon("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!subjects) return <FullPageSpinner label="Loading subjects…" />;

  return (
    <div>
      <h1>Subjects</h1>
      <form className="card" onSubmit={handleAdd}>
        <div className="inline-form">
          <input type="text" placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            type="text"
            placeholder="Icon (emoji, optional)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            style={{ maxWidth: 90 }}
          />
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      <div className="card">
        {subjects.map((s) => (
          <div className="setup-row" key={s.id}>
            <span>
              {s.icon} {s.name}
            </span>
            <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>{s.slug}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
