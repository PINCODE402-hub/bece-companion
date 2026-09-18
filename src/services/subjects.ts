import { supabase } from "@/lib/supabaseClient";
import type { SubjectRow, YearRow } from "@/types/database";

export async function listSubjects(): Promise<SubjectRow[]> {
  const { data, error } = await supabase.from("subjects").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as SubjectRow[];
}

export async function createSubject(input: {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}): Promise<SubjectRow> {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      description: input.description ?? null,
      sort_order: 99
    })
    .select()
    .single();
  if (error) throw error;
  return data as SubjectRow;
}

export async function listYears(): Promise<YearRow[]> {
  const { data, error } = await supabase.from("years").select("*").order("year", { ascending: false });
  if (error) throw error;
  return (data ?? []) as YearRow[];
}

export async function createYear(year: number): Promise<YearRow> {
  const { data, error } = await supabase.from("years").insert({ year }).select().single();
  if (error) throw error;
  return data as YearRow;
}

/** Finds a year by number, creating it if it doesn't exist yet. Used by the importer. */
export async function findOrCreateYear(year: number): Promise<YearRow> {
  const { data: existing, error: findErr } = await supabase
    .from("years")
    .select("*")
    .eq("year", year)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as YearRow;
  return createYear(year);
}

/** Finds a subject by name (case-insensitive) or slug. Does NOT create — the
 * importer should only ever target the 8 seeded subjects or ones an admin
 * has deliberately added via Admin > Subjects. */
export async function findSubjectByNameOrSlug(nameOrSlug: string): Promise<SubjectRow | null> {
  const needle = nameOrSlug.trim().toLowerCase();
  const subjects = await listSubjects();
  return (
    subjects.find((s) => s.slug.toLowerCase() === needle || s.name.toLowerCase() === needle) ?? null
  );
}
