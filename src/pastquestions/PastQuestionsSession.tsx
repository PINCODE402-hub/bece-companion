import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listPublishedQuestionsForPaper, recordProgress, type StudentQuestion } from "@/services/studentContent";
import { listBookmarkedQuestionIds, addBookmark, removeBookmark } from "@/services/bookmarks";
import { cachePaper, getCachedPaper } from "@/offline/cache";
import { ReportQuestionButton } from "@/components/ReportQuestionButton";
import { questionLikelyReferencesImage } from "@/data/imageHeuristic";
import { formatMultiPartText } from "@/data/formatMultiPartText";
import { useAuth } from "@/auth/AuthContext";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Mode = "study" | "practice";
type Phase = "choose_mode" | "active" | "done";

const LETTER = (i: number) => String.fromCharCode(65 + i);

export function PastQuestionsSession() {
  const { year, subjectId, paperId } = useParams<{ year: string; subjectId: string; paperId: string }>();
  const { refreshProfile } = useAuth();

  const [questions, setQuestions] = useState<StudentQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>("choose_mode");
  const [index, setIndex] = useState(0);
  const [lastXpGain, setLastXpGain] = useState<number | null>(null);

  // study mode: which questions currently have their answer revealed
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // practice mode: objective answer state for current question
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  // practice mode: subjective answer state for current question
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);

  // practice mode tallies
  const [correctCount, setCorrectCount] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(Date.now());

  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  useEffect(() => {
    listBookmarkedQuestionIds()
      .then(setBookmarked)
      .catch(() => {});
  }, []);

  async function toggleBookmark(questionId: string) {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    const isBookmarked = bookmarked.has(questionId);
    try {
      if (isBookmarked) await removeBookmark(questionId);
      else await addBookmark(questionId);
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
    } catch (e) {
      console.warn("Couldn't update bookmark:", e);
    } finally {
      setBookmarkBusy(false);
    }
  }

  useEffect(() => {
    if (!paperId) return;
    listPublishedQuestionsForPaper(paperId)
      .then((qs) => {
        setQuestions(qs);
        setUsingOfflineCopy(false);
        cachePaper(paperId, "", qs);
      })
      .catch(async (e) => {
        const cached = await getCachedPaper(paperId);
        if (cached) {
          setQuestions(cached.questions);
          setUsingOfflineCopy(true);
        } else {
          setError(e.message ?? "Couldn't load questions, and no offline copy is available yet.");
        }
      });
  }, [paperId]);

  function startMode(m: Mode) {
    setMode(m);
    setPhase("active");
    setIndex(0);
    setRevealed(new Set());
    resetPracticeState();
  }

  function resetPracticeState() {
    setSelectedOption(null);
    setAnswered(false);
    setWrittenAnswer("");
    setChecked(false);
    setSelfScore(null);
    setLastXpGain(null);
    setQuestionStartedAt(Date.now());
  }

  function toggleReveal(i: number) {
    setRevealed((r) => {
      const next = new Set(r);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function answerObjective(letter: string) {
    if (answered || !questions) return;
    const q = questions[index].question;
    setSelectedOption(letter);
    setAnswered(true);
    const isCorrect = q.correct_answer ? letter === q.correct_answer : null;
    if (isCorrect) setCorrectCount((c) => c + 1);
    try {
      const result = await recordProgress({
        question_id: q.id,
        selected_answer: letter,
        is_correct: isCorrect,
        attempt_source: "practice",
        time_spent_seconds: Math.round((Date.now() - questionStartedAt) / 1000)
      });
      if (result) {
        setLastXpGain(result.awardedXp);
        refreshProfile();
      }
    } catch (e) {
      console.warn("Couldn't save progress:", e);
    }
  }

  async function markSubjective(score: number) {
    if (!questions) return;
    const q = questions[index].question;
    setSelfScore(score);
    setScoredCount((c) => c + 1);
    try {
      const result = await recordProgress({
        question_id: q.id,
        self_marked_score: score,
        attempt_source: "practice",
        time_spent_seconds: Math.round((Date.now() - questionStartedAt) / 1000)
      });
      if (result) {
        setLastXpGain(result.awardedXp);
        refreshProfile();
      }
    } catch (e) {
      console.warn("Couldn't save progress:", e);
    }
  }

  function goNext() {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    resetPracticeState();
  }
  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!questions) return <FullPageSpinner label="Loading paper…" />;

  const backLink = `/past-questions/${year}/${subjectId}`;

  if (phase === "choose_mode") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <Link className="backlink-light" to={backLink}>
            ‹ Papers
          </Link>
        </header>
        <main className="page">
          <h1>{questions.length} question{questions.length === 1 ? "" : "s"} in this paper</h1>
          {usingOfflineCopy && (
            <div className="offline-note">📥 Showing a downloaded copy — you're offline right now.</div>
          )}
          <p style={{ color: "var(--ink-faint)" }}>Choose how you'd like to go through them.</p>
          <div className="card">
            <h3>📖 Study mode</h3>
            <p>Browse every question with the answer and explanation available to reveal any time. Not scored.</p>
            <button className="btn btn-ghost btn-block" onClick={() => startMode("study")}>
              Start studying
            </button>
          </div>
          <div className="card">
            <h3>✍️ Practice mode</h3>
            <p>Answer each question yourself first, then see if you got it right. Your results are saved.</p>
            <button className="btn btn-primary btn-block" onClick={() => startMode("practice")}>
              Start practicing
            </button>
          </div>
          <div className="card">
            <h3>📝 Mock Exam</h3>
            <p>The full paper, timed, no feedback until you submit — closest to the real thing.</p>
            <Link className="btn btn-primary btn-block" to={`/past-questions/${year}/${subjectId}/${paperId}/exam`}>
              Start mock exam
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "done") {
    const objectiveCount = questions.filter((q) => q.question.question_type === "objective").length;
    return (
      <div className="app-shell">
        <header className="topbar">
          <Link className="backlink-light" to={backLink}>
            ‹ Papers
          </Link>
        </header>
        <main className="page">
          <div className="card result-hero">
            <h2>Nice work! 🎉</h2>
            {mode === "practice" ? (
              <p>
                {objectiveCount > 0 && `${correctCount}/${objectiveCount} objective correct. `}
                {scoredCount > 0 && `${scoredCount} subjective question(s) self-marked.`}
              </p>
            ) : (
              <p>You've been through every question in this paper.</p>
            )}
          </div>
          <div className="grid-2">
            <button className="btn btn-ghost btn-block" onClick={() => setPhase("choose_mode")}>
              Try another mode
            </button>
            <Link className="btn btn-primary btn-block" to={backLink}>
              Back to papers
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // phase === "active"
  const current = questions[index];
  const q = current.question;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to={backLink}>
          ‹ Exit
        </Link>
        <span style={{ color: "#fff", fontSize: 12.5 }}>
          {mode === "study" ? "Study" : "Practice"} · Q{index + 1}/{questions.length}
        </span>
      </header>
      <main className="page">
        <div className="progress-track" style={{ marginBottom: 14 }}>
          <div className="progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: 4 }}>
            <div className="pq-question-text" style={{ marginBottom: 0, flex: 1 }}>{formatMultiPartText(q.question_text)}</div>
            <button
              className="btn-bookmark"
              onClick={() => toggleBookmark(q.id)}
              disabled={bookmarkBusy}
              aria-label="Toggle bookmark"
            >
              {bookmarked.has(q.id) ? "🔖" : "🏷️"}
            </button>
          </div>
          {lastXpGain !== null && <span className="tag tag-gold" style={{ marginBottom: 10, display: "inline-block" }}>+{lastXpGain} XP</span>}
          {current.images.length > 0 && (
            <div className="question-image-gallery">
              {current.images.map((img) => (
                <figure className="question-image-item" key={img.id} style={{ margin: 0 }}>
                  <img src={img.image_url} alt={img.caption || "Question diagram"} className="question-image-preview" />
                  {img.caption && <figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          {current.images.length === 0 && questionLikelyReferencesImage(q.question_text) && (
            <div className="offline-note">
              🖼️ This question refers to a diagram/image that hasn't been added yet — you can still try
              it, but you may be missing context. Feel free to report it below.
            </div>
          )}

          {q.question_type === "objective" ? (
            <ObjectiveBlock
              question={q}
              options={current.options}
              mode={mode!}
              revealed={mode === "study" && revealed.has(index)}
              onToggleReveal={() => toggleReveal(index)}
              selected={selectedOption}
              answered={answered}
              onAnswer={answerObjective}
            />
          ) : (
            <SubjectiveBlock
              question={q}
              markingPoints={current.markingPoints}
              mode={mode!}
              revealed={mode === "study" && revealed.has(index)}
              onToggleReveal={() => toggleReveal(index)}
              writtenAnswer={writtenAnswer}
              onWrite={setWrittenAnswer}
              checked={checked}
              onCheck={() => setChecked(true)}
              selfScore={selfScore}
              onScore={markSubjective}
            />
          )}
          <div style={{ marginTop: 12 }}>
            <ReportQuestionButton questionId={q.id} />
          </div>
        </div>

        <div className="grid-2">
          <button className="btn btn-ghost btn-block" onClick={goPrev} disabled={index === 0}>
            ‹ Previous
          </button>
          <button
            className="btn btn-primary btn-block"
            onClick={goNext}
            disabled={mode === "practice" && q.question_type === "objective" && !answered}
          >
            {index + 1 === questions.length ? "Finish" : "Next ›"}
          </button>
        </div>
      </main>
    </div>
  );
}

function ObjectiveBlock({
  question,
  options,
  mode,
  revealed,
  onToggleReveal,
  selected,
  answered,
  onAnswer
}: {
  question: StudentQuestion["question"];
  options: StudentQuestion["options"];
  mode: Mode;
  revealed: boolean;
  onToggleReveal: () => void;
  selected: string | null;
  answered: boolean;
  onAnswer: (letter: string) => void;
}) {
  const showAnswerState = mode === "study" ? revealed : answered;
  return (
    <div>
      {options.map((o, i) => {
        const isCorrect = o.option_letter === question.correct_answer;
        const isSelected = selected === o.option_letter;
        const cls = [
          "sq-option",
          showAnswerState && isCorrect ? "correct" : "",
          showAnswerState && mode === "practice" && isSelected && !isCorrect ? "wrong" : ""
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div
            key={o.option_letter}
            className={cls}
            onClick={() => (mode === "practice" ? onAnswer(o.option_letter) : undefined)}
            style={{ cursor: mode === "practice" && !answered ? "pointer" : "default" }}
          >
            <span className="sq-letter">{LETTER(i)}</span>
            <span>{o.option_text}</span>
          </div>
        );
      })}

      {mode === "study" && (
        <button className="btn btn-ghost btn-sm" onClick={onToggleReveal} style={{ marginTop: 8 }}>
          {revealed ? "Hide answer" : "Show answer"}
        </button>
      )}

      {showAnswerState && (
        <div className="sq-explain-box">
          {question.answer_status !== "verified" && (
            <div className="sq-unverified-tag">⚠ This answer hasn't been verified yet — use with caution.</div>
          )}
          {question.explanation ? `💡 ${question.explanation}` : !question.correct_answer ? "No answer available for this question yet." : null}
        </div>
      )}
    </div>
  );
}

function SubjectiveBlock({
  question,
  markingPoints,
  mode,
  revealed,
  onToggleReveal,
  writtenAnswer,
  onWrite,
  checked,
  onCheck,
  selfScore,
  onScore
}: {
  question: StudentQuestion["question"];
  markingPoints: StudentQuestion["markingPoints"];
  mode: Mode;
  revealed: boolean;
  onToggleReveal: () => void;
  writtenAnswer: string;
  onWrite: (v: string) => void;
  checked: boolean;
  onCheck: () => void;
  selfScore: number | null;
  onScore: (score: number) => void;
}) {
  const showAnswer = mode === "study" ? revealed : checked;

  return (
    <div>
      {mode === "practice" && !checked && (
        <textarea
          className="answer-input"
          rows={5}
          value={writtenAnswer}
          onChange={(e) => onWrite(e.target.value)}
          placeholder="Write your answer here..."
        />
      )}

      {mode === "study" && (
        <button className="btn btn-ghost btn-sm" onClick={onToggleReveal}>
          {revealed ? "Hide model answer" : "Show model answer"}
        </button>
      )}
      {mode === "practice" && !checked && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={onCheck}>
          Check my answer against the model answer
        </button>
      )}

      {showAnswer && (
        <div style={{ marginTop: 10 }}>
          {question.answer_status !== "verified" && (
            <div className="sq-unverified-tag">⚠ This model answer hasn't been verified yet.</div>
          )}
          <div className="sq-answer-reveal">{formatMultiPartText(question.model_answer ?? "No model answer available yet.")}</div>
          {markingPoints.length > 0 && (
            <>
              <div className="sq-marking-label">Marking points</div>
              <ul className="marking-points">
                {markingPoints.map((mp) => (
                  <li key={mp.id}>
                    {mp.point} {mp.marks ? `(${mp.marks} mark${mp.marks === 1 ? "" : "s"})` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {mode === "practice" && checked && selfScore === null && (
        <div style={{ marginTop: 12 }}>
          <p className="hint-text">Be honest — how did you do?</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onScore(0)}>😕 Missed it</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onScore(0.5)}>🙂 Partly</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onScore(1)}>🎯 Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
