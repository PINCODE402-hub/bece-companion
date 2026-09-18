const IMAGE_REFERENCE_RE =
  /\b(diagram|graph|figure|table below|table above|map(?:\s+below|\s+above)?|illustration|chart|image\s+below|picture\s+below|shown\s+below|shown\s+above|the\s+following\s+diagram)\b/i;

/** Heuristic only — flags wording that commonly accompanies a diagram/graph/table
 * in past-question text, so a question imported as plain text doesn't silently
 * ask a student to read a picture that was never attached. */
export function questionLikelyReferencesImage(questionText: string): boolean {
  return IMAGE_REFERENCE_RE.test(questionText);
}
