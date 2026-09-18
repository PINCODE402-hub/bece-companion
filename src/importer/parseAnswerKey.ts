export interface AnswerKeyEntry {
  questionNumber: number;
  answer: string;
}

export interface AnswerKeyParseResult {
  entries: AnswerKeyEntry[];
  skippedLines: string[]; // lines that didn't match the expected "N. X" / "N) X" pattern
}

const LINE_RE = /^(\d+)[.)]\s*([A-Fa-f])\s*$/;

/** Parses lines like "1. B" / "1) B" into {questionNumber, answer}. Matched against
 * question_number on an already-selected paper by the caller — this parser has no
 * DB knowledge, it just extracts the pairs. */
export function parseAnswerKey(raw: string): AnswerKeyParseResult {
  const entries: AnswerKeyEntry[] = [];
  const skippedLines: string[] = [];

  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(LINE_RE);
    if (!m) {
      skippedLines.push(line);
      continue;
    }
    entries.push({ questionNumber: parseInt(m[1], 10), answer: m[2].toUpperCase() });
  }

  return { entries, skippedLines };
}
