import type { ImportIssue, ImportPreview, ParsedPaper, ParsedQuestion } from "./types";

const HEADER_RE = /^(YEAR|SUBJECT|PAPER|SECTION)\s*:\s*(.+)$/i;
const QUESTION_START_RE = /^(\d+)\.\s*(.*)$/;
const OPTION_RE = /^([A-F])\.\s*(.*)$/;
const ANSWER_RE = /^ANSWER\s*:\s*([A-F])/i;
const EXPLANATION_RE = /^EXPLANATION\s*:\s*(.*)$/i;
const TOPIC_RE = /^TOPIC\s*:\s*(.*)$/i;
const MODEL_ANSWER_RE = /^MODEL\s*ANSWER\s*:\s*(.*)$/i;
const MARKING_RE = /^MARKING\s*:\s*$/i;
const MARKING_POINT_RE = /^[-*]\s*(.+)$/;

function blankQuestion(num: number): ParsedQuestion {
  return {
    questionNumber: num,
    type: "objective",
    questionText: "",
    options: [],
    correctAnswer: null,
    explanation: null,
    modelAnswer: null,
    markingPoints: [],
    topic: null
  };
}

export function parseStructuredText(raw: string): ParsedPaper {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  const paper: ParsedPaper = { year: null, subjectName: null, paperName: null, questions: [] };
  let current: ParsedQuestion | null = null;
  let mode: "text" | "model_answer" | "marking" = "text";

  const pushCurrent = () => {
    if (current) {
      current.questionText = current.questionText.trim();
      if (current.modelAnswer) current.modelAnswer = current.modelAnswer.trim();
      paper.questions.push(current);
    }
    current = null;
    mode = "text";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!current) {
      const header = line.match(HEADER_RE);
      if (header) {
        const [, key, value] = header;
        if (/YEAR/i.test(key)) paper.year = parseInt(value.trim(), 10) || null;
        else if (/SUBJECT/i.test(key)) paper.subjectName = value.trim();
        else if (/PAPER/i.test(key)) paper.paperName = value.trim();
        continue;
      }
    }

    const qStart = line.match(QUESTION_START_RE);
    if (qStart) {
      pushCurrent();
      current = blankQuestion(parseInt(qStart[1], 10));
      current.questionText = qStart[2] ?? "";
      continue;
    }

    if (!current) continue; // ignore stray blank lines / preamble
    if (!line) continue;

    const option = line.match(OPTION_RE);
    if (option) {
      current.type = "objective";
      current.options.push({ letter: option[1].toUpperCase(), text: option[2].trim() });
      mode = "text";
      continue;
    }

    const answer = line.match(ANSWER_RE);
    if (answer) {
      current.correctAnswer = answer[1].toUpperCase();
      mode = "text";
      continue;
    }

    const explanation = line.match(EXPLANATION_RE);
    if (explanation) {
      current.explanation = explanation[1].trim();
      mode = "text";
      continue;
    }

    const topic = line.match(TOPIC_RE);
    if (topic) {
      current.topic = topic[1].trim();
      mode = "text";
      continue;
    }

    const modelAnswer = line.match(MODEL_ANSWER_RE);
    if (modelAnswer) {
      current.type = "subjective";
      current.modelAnswer = modelAnswer[1];
      mode = "model_answer";
      continue;
    }

    if (MARKING_RE.test(line)) {
      current.type = "subjective";
      mode = "marking";
      continue;
    }

    if (mode === "marking") {
      const point = line.match(MARKING_POINT_RE);
      if (point) {
        current.markingPoints.push(point[1].trim());
        continue;
      }
      // a non-bullet line while in marking mode ends the marking list
      mode = "text";
    }

    if (mode === "model_answer") {
      current.modelAnswer = (current.modelAnswer ?? "") + " " + line;
      continue;
    }

    // otherwise: continuation of the question text itself (multi-line question)
    current.questionText += (current.questionText ? " " : "") + line;
  }
  pushCurrent();

  return paper;
}

export function validateParsedPaper(paper: ParsedPaper): ImportPreview {
  const issues: ImportIssue[] = [];
  const valid: ParsedQuestion[] = [];
  const needsReview: ParsedQuestion[] = [];
  const invalid: ParsedQuestion[] = [];

  const seenNumbers = new Set<number>();

  for (const q of paper.questions) {
    let isInvalid = false;
    let isFlagged = false;

    if (seenNumbers.has(q.questionNumber)) {
      issues.push({
        questionNumber: q.questionNumber,
        level: "invalid",
        message: `Duplicate question number ${q.questionNumber} within this import.`
      });
      isInvalid = true;
    }
    seenNumbers.add(q.questionNumber);

    if (!q.questionText.trim()) {
      issues.push({ questionNumber: q.questionNumber, level: "invalid", message: "Missing question text." });
      isInvalid = true;
    }

    if (q.type === "objective") {
      if (q.options.length < 2) {
        issues.push({
          questionNumber: q.questionNumber,
          level: "invalid",
          message: `Only ${q.options.length} option(s) found — needs at least 2.`
        });
        isInvalid = true;
      }
      if (q.correctAnswer && !q.options.some((o) => o.letter === q.correctAnswer)) {
        issues.push({
          questionNumber: q.questionNumber,
          level: "invalid",
          message: `ANSWER "${q.correctAnswer}" doesn't match any parsed option (${q.options
            .map((o) => o.letter)
            .join(", ")}).`
        });
        isInvalid = true;
      }
      if (!q.correctAnswer) {
        issues.push({
          questionNumber: q.questionNumber,
          level: "needs_review",
          message: "No ANSWER line found — will import with answer status \"missing\", not a guess."
        });
        isFlagged = true;
      }
    } else {
      if (!q.modelAnswer?.trim()) {
        issues.push({
          questionNumber: q.questionNumber,
          level: "needs_review",
          message: "No MODEL ANSWER found."
        });
        isFlagged = true;
      }
      if (q.markingPoints.length === 0) {
        issues.push({
          questionNumber: q.questionNumber,
          level: "needs_review",
          message: "No marking points found."
        });
        isFlagged = true;
      }
    }

    if (isInvalid) invalid.push(q);
    else if (isFlagged) needsReview.push(q);
    else valid.push(q);
  }

  return { parsed: paper, valid, needsReview, invalid, issues };
}
