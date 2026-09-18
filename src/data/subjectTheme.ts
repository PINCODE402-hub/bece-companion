export interface SubjectTheme {
  color: string;
  bg: string;
}

// Keyed by subject slug. Falls back to a neutral tint for any subject an
// admin adds later that isn't one of the original 8.
export const SUBJECT_THEME: Record<string, SubjectTheme> = {
  english: { color: "#3A7CA5", bg: "#DCEBF2" },
  maths: { color: "#E4572E", bg: "#FBE1D9" },
  science: { color: "#2F7A4F", bg: "#DCEEE2" },
  social: { color: "#B9800F", bg: "#FBE9C4" },
  rme: { color: "#6B5CA5", bg: "#E7E1F5" },
  ict: { color: "#1B2A4A", bg: "#E2E6EF" },
  french: { color: "#3A7CA5", bg: "#DCEBF2" },
  twi: { color: "#E4A61A", bg: "#FBE9C4" }
};

export const DEFAULT_SUBJECT_THEME: SubjectTheme = { color: "#3C4A68", bg: "#E7E1D2" };

export function getSubjectTheme(slug: string): SubjectTheme {
  return SUBJECT_THEME[slug] ?? DEFAULT_SUBJECT_THEME;
}
