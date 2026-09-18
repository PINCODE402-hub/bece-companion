export interface ParsedOption {
  letter: string;
  text: string;
}

export interface ParsedQuestion {
  questionNumber: number;
  type: "objective" | "subjective";
  questionText: string;
  options: ParsedOption[]; // objective only
  correctAnswer: string | null; // objective only, option letter
  explanation: string | null;
  modelAnswer: string | null; // subjective only
  markingPoints: string[]; // subjective only
  topic: string | null;
}

export interface ParsedPaper {
  year: number | null;
  subjectName: string | null;
  paperName: string | null;
  questions: ParsedQuestion[];
}

export type IssueLevel = "invalid" | "needs_review";

export interface ImportIssue {
  questionNumber: number | null;
  level: IssueLevel;
  message: string;
}

export interface ImportPreview {
  parsed: ParsedPaper;
  valid: ParsedQuestion[];
  needsReview: ParsedQuestion[]; // still importable, just flagged (e.g. missing answer)
  invalid: ParsedQuestion[]; // will NOT be imported
  issues: ImportIssue[];
}
