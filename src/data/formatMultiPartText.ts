// Matches unambiguous parenthesized sub-part labels: (a)-(h), (i)-(viii). Deliberately
// narrow (parenthesized only) to avoid false-positive line breaks on things like "e.g."
// or decimal numbers.
const SUBPART_LABEL_RE = /\((?:[a-h]|i{1,3}|iv|vi{0,3}|ix|x)\)/g;

/** Purely a display transform — never mutates what's actually stored. Inserts a
 * line break before each sub-part label (except one at the very start of the
 * text), so "(a) Define X. (b) State... (c) (i)... (ii)..." renders as separate
 * lines instead of a wall of text. Pair with a `white-space: pre-line` class. */
export function formatMultiPartText(text: string): string {
  if (!text) return text;
  let result = "";
  let lastIndex = 0;
  let isFirst = true;

  for (const match of text.matchAll(SUBPART_LABEL_RE)) {
    const idx = match.index ?? 0;
    result += text.slice(lastIndex, idx);
    if (!isFirst && idx > 0) result += "\n";
    result += match[0];
    lastIndex = idx + match[0].length;
    isFirst = false;
  }
  result += text.slice(lastIndex);
  return result;
}
