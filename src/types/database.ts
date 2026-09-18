// Hand-written to match supabase/migrations/0001_init.sql.
// Once the Supabase project is live, regenerate with:
//   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
// and this file becomes redundant.

export type Role = "student" | "admin";
export type ContentStatus = "draft" | "needs_review" | "verified" | "published" | "archived";
export type AnswerStatus = "verified" | "needs_review" | "missing";
export type QuestionType = "objective" | "subjective";
export type AttemptSource = "practice" | "quiz" | "mock_exam" | "game";

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  xp: number;
  level: number;
  streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export type YearRow = {
  id: string;
  year: number;
  created_at: string;
}

export type TopicRow = {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
}

export type PastPaperRow = {
  id: string;
  year_id: string;
  subject_id: string;
  paper_name: string;
  section: string | null;
  title: string;
  duration_minutes: number | null;
  source_type: "official" | "textbook" | "past_paper_book" | "unknown";
  source_name: string | null;
  source_url: string | null;
  source_notes: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export type QuestionRow = {
  id: string;
  paper_id: string;
  question_number: number;
  question_type: QuestionType;
  question_text: string;
  image_url: string | null;
  correct_answer: string | null;
  answer_status: AnswerStatus;
  explanation: string | null;
  model_answer: string | null;
  topic_id: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  source_notes: string | null;
  content_status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type QuestionOptionRow = {
  id: string;
  question_id: string;
  option_letter: "A" | "B" | "C" | "D" | "E" | "F";
  option_text: string;
  sort_order: number;
}

export type MarkingPointRow = {
  id: string;
  question_id: string;
  point: string;
  marks: number;
  sort_order: number;
}

export type UserProgressRow = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  self_marked_score: number | null;
  time_spent_seconds: number | null;
  attempt_source: AttemptSource;
  client_id: string;
  created_at: string;
}

export type BookmarkRow = {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}

export type QuestionReportRow = {
  id: string;
  user_id: string;
  question_id: string;
  reason:
    | "wrong_answer"
    | "question_incorrect"
    | "missing_image"
    | "formatting"
    | "missing_answer"
    | "other";
  notes: string | null;
  status: "open" | "reviewed" | "resolved";
  created_at: string;
}

export type CustomQuestionRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  question_type: QuestionType;
  question_text: string;
  options: { letter: string; text: string }[] | null;
  correct_answer: string | null;
  explanation: string | null;
  model_answer: string | null;
  marking_points: string[] | null;
  created_at: string;
}

export type ImportBatchRow = {
  id: string;
  admin_id: string;
  paper_id: string | null;
  format: "structured_text" | "json" | "answer_key";
  raw_input: string | null;
  summary: Record<string, unknown> | null;
  status: "pending" | "previewed" | "imported" | "failed";
  created_at: string;
}

export type QuestionImageRow = {
  id: string;
  question_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      subjects: TableDef<SubjectRow>;
      years: TableDef<YearRow>;
      topics: TableDef<TopicRow>;
      past_papers: TableDef<PastPaperRow>;
      questions: TableDef<QuestionRow>;
      question_options: TableDef<QuestionOptionRow>;
      marking_points: TableDef<MarkingPointRow>;
      user_progress: TableDef<UserProgressRow>;
      bookmarks: TableDef<BookmarkRow>;
      question_reports: TableDef<QuestionReportRow>;
      custom_questions: TableDef<CustomQuestionRow>;
      import_batches: TableDef<ImportBatchRow>;
      question_images: TableDef<QuestionImageRow>;
    };
    Views: Record<string, never>;
    Functions: {
      record_progress_and_award_xp: {
        Args: {
          p_question_id: string;
          p_selected_answer: string | null;
          p_is_correct: boolean | null;
          p_self_marked_score: number | null;
          p_time_spent_seconds: number | null;
          p_attempt_source: string;
          p_client_id: string;
        };
        Returns: { awarded_xp: number; new_xp: number; new_level: number; new_streak: number }[];
      };
      award_game_xp: {
        Args: { p_game: string; p_score: number; p_client_id: string };
        Returns: { awarded_xp: number; new_xp: number; new_level: number; new_streak: number }[];
      };
      get_leaderboard: {
        Args: { p_limit: number };
        Returns: {
          display_name: string;
          avatar_url: string | null;
          xp: number;
          level: number;
          streak: number;
          is_you: boolean;
        }[];
      };
      get_my_rank: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
}
