import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listPublishedQuestionsForPaper, recordProgress, type StudentQuestion } from "@/services/studentContent";
import { getPaper } from "@/services/papers";
import { useAuth } from "@/auth/AuthContext";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { cachePaper, getCachedPaper } from "@/offline/cache";
import { ReportQuestionButton } from "@/components/ReportQuestionButton";
import { questionLikelyReferencesImage } from "@/data/imageHeuristic";
import { formatMultiPartText } from "@/data/formatMultiPartText";

type Phase = "intro" | "taking" | "reviewing" | "done";
const LETTER = (i: number) => String.fromCharCode(65 + i);

function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MockExamSession() {
  const { year, subjectId, paperId } = useParams<{ year: string; subjectId: string; paperId: string }>();
  const { refreshProfile } = useAuth();

  const [questions, setQuestions] = useState<StudentQuestion[] | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingOfflineCopy, setUsingOfflineCopy] = useState(false);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({});
  const [subjectiveScores, setSubjectiveScores] = useState<Record<string, number>>({});
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          setError(e.message ?? "Couldn't load this paper, and no offline copy is available yet.");
          return;
        }
      });
    getPaper(paperId)
      .then((paper) => setDurationMinutes(paper?.duration_minutes ?? null))
      .catch(() => setDurationMinutes(null)); // offline or otherwise unavailable — the intro screen falls back to an estimate
  }, [paperId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startExam() {
    if (!questions) return;
    const minutes = durationMinutes ?? Math.max(15, Math.round(questions.length * 1.5));
    setTimeLeft(minutes * 60);
    setPhase("taking");
    setIndex(0);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          submitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function submitExam() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("reviewing");
    setIndex(0);
  }

  async function scoreSubjective(questionId: string, score: number) {
    setSubjectiveScores((prev) => ({ ...prev, [questionId]: score }));
    try {
      const result = await recordProgress({
        question_id: questionId,
        self_marked_score: score,
        attempt_source: "mock_exam"
      });
      if (result) {
        setTotalXpEarned((x) => x + result.awardedXp);
        refreshProfile();
      }
    } catch (e) {
      console.warn("Couldn't save progress:", e);
    }
  }

  async function finishReview() {
    if (!questions || finishing) return;
    setFinishing(true);
    // record every objective answer now (all at once, since exam mode gives no feedback until here)
    let xpSum = 0;
    for (const sq of questions) {
      if (sq.question.question_type !== "objective") continue;
      const selected = objectiveAnswers[sq.question.id] ?? null;
      const isCorrect = sq.question.correct_answer ? selected === sq.question.correct_answer : null;
      try {
        const result = await recordProgress({
          question_id: sq.question.id,
          selected_answer: selected,
          is_correct: isCorrect,
          attempt_source: "mock_exam"
        });
        if (result) xpSum += result.awardedXp;
      } catch (e) {
        console.warn("Couldn't save progress:", e);
      }
    }
    if (xpSum) {
      setTotalXpEarned((x) => x + xpSum);
      refreshProfile();
    }
    setPhase("done");
  }

  if (error) return <p className="form-error">{error}</p>;
  if (!questions) return <FullPageSpinner label="Loading exam…" />;

  const backLink = `/past-questions/${year}/${subjectId}/${paperId}`;
  const objectiveQs = questions.filter((q) => q.question.question_type === "objective");
  const subjectiveQs = questions.filter((q) => q.question.question_type === "subjective");

  if (phase === "intro") {
    const minutes = durationMinutes ?? Math.max(15, Math.round(questions.length * 1.5));
    return (
      <div className="app-shell">
        <header className="topbar">
          <Link className="backlink-light" to={backLink}>
            ‹ Back
          </Link>
        </header>
        <main className="page">
          <div className="card">
            <h1>📝 Mock Exam</h1>
            {usingOfflineCopy && (
              <div className="offline-note">📥 Using a downloaded copy — you're offline right now.</div>
            )}
            <p>
              {questions.length} question{questions.length === 1 ? "" : "s"} ({objectiveQs.length} objective,{" "}
              {subjectiveQs.length} subjective) · {minutes} minutes
              {!durationMinutes && (
                <span className="hint-text"> (estimated — the official duration wasn't recorded for this paper)</span>
              )}
            </p>
            <p className="hint-text">
              Unlike Practice mode, you won't see whether you're right or wrong until you submit the whole
              exam. Once the timer runs out, it submits automatically.
            </p>
            <button className="btn btn-primary btn-block" onClick={startExam}>
              Start exam
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "done") {
    const objAnswered = objectiveQs.filter((q) => objectiveAnswers[q.question.id]);
    const objCorrect = objAnswered.filter((q) => objectiveAnswers[q.question.id] === q.question.correct_answer);
    const subjScored = subjectiveQs.filter((q) => subjectiveScores[q.question.id] !== undefined);
    const subjScoreSum = subjScored.reduce((s, q) => s + (subjectiveScores[q.question.id] ?? 0), 0);

    return (
      <div className="app-shell">
        <header className="topbar">
          <Link className="backlink-light" to={backLink}>
            ‹ Back
          </Link>
        </header>
        <main className="page">
          <div className="card result-hero">
            <h2>Exam complete! 🎓</h2>
            <p>
              Objective: {objCorrect.length}/{objectiveQs.length} correct
              {subjectiveQs.length > 0 && ` · Subjective: ${subjScoreSum}/${subjectiveQs.length} (self-marked)`}
            </p>
            {totalXpEarned > 0 && <span className="tag tag-gold">+{totalXpEarned} XP earned</span>}
          </div>
          <div className="grid-2">
            <Link className="btn btn-ghost btn-block" to={backLink}>
              Back to paper
            </Link>
            <Link className="btn btn-primary btn-block" to="/progress">
              View progress
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---- taking or reviewing ----
  const current = questions[index];
  const q = current.question;
  const isReviewing = phase === "reviewing";

  return (
    <div className="app-shell">
      <header className="topbar">
        <span style={{ color: "#fff", fontSize: 12.5 }}>
          {isReviewing ? "Reviewing" : "Q"} {index + 1}/{questions.length}
        </span>
        {!isReviewing && <span className={`exam-timer ${timeLeft <= 60 ? "low" : ""}`}>⏱ {fmtTime(timeLeft)}</span>}
      </header>
      <main className="page">
        <div className="exam-palette">
          {questions.map((sq, i) => {
            const answered =
              sq.question.question_type === "objective"
                ? !!objectiveAnswers[sq.question.id]
                : !!writtenAnswers[sq.question.id]?.trim() || subjectiveScores[sq.question.id] !== undefined;
            return (
              <button
                key={sq.question.id}
                className={`${answered ? "answered" : ""} ${i === index ? "current" : ""}`}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="card">
          <div className="pq-question-text">{formatMultiPartText(q.question_text)}</div>
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
              🖼️ This question refers to a diagram/image that hasn't been added yet.
            </div>
          )}

          {q.question_type === "objective" ? (
            <div>
              {current.options.map((o, i) => {
                const selected = objectiveAnswers[q.id] === o.option_letter;
                const showCorrectness = isReviewing;
                const cls = [
                  "sq-option",
                  !showCorrectness && selected ? "selected" : "",
                  showCorrectness && o.option_letter === q.correct_answer ? "correct" : "",
                  showCorrectness && selected && o.option_letter !== q.correct_answer ? "wrong" : ""
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={o.option_letter}
                    className={cls}
                    onClick={() =>
                      !isReviewing && setObjectiveAnswers((prev) => ({ ...prev, [q.id]: o.option_letter }))
                    }
                    style={{ cursor: isReviewing ? "default" : "pointer" }}
                  >
                    <span className="sq-letter">{LETTER(i)}</span>
                    <span>{o.option_text}</span>
                  </div>
                );
              })}
              {isReviewing && (
                <div className="sq-explain-box">
                  {q.answer_status !== "verified" && (
                    <div className="sq-unverified-tag">⚠ This answer hasn't been verified yet.</div>
                  )}
                  {q.correct_answer ? `Correct answer: ${q.correct_answer}. ` : "No answer available. "}
                  {q.explanation ? `💡 ${q.explanation}` : ""}
                </div>
              )}
            </div>
          ) : (
            <div>
              <textarea
                className="answer-input"
                rows={5}
                value={writtenAnswers[q.id] ?? ""}
                onChange={(e) => setWrittenAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Write your answer here..."
                disabled={isReviewing}
              />
              {isReviewing && (
                <div style={{ marginTop: 10 }}>
                  {q.answer_status !== "verified" && (
                    <div className="sq-unverified-tag">⚠ This model answer hasn't been verified yet.</div>
                  )}
                  <div className="sq-answer-reveal">{formatMultiPartText(q.model_answer ?? "No model answer available yet.")}</div>
                  {current.markingPoints.length > 0 && (
                    <>
                      <div className="sq-marking-label">Marking points</div>
                      <ul className="marking-points">
                        {current.markingPoints.map((mp) => (
                          <li key={mp.id}>{mp.point}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {subjectiveScores[q.id] === undefined ? (
                    <div style={{ marginTop: 10 }}>
                      <p className="hint-text">Be honest — how did you do?</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => scoreSubjective(q.id, 0)}>😕 Missed</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => scoreSubjective(q.id, 0.5)}>🙂 Partly</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => scoreSubjective(q.id, 1)}>🎯 Got it!</button>
                      </div>
                    </div>
                  ) : (
                    <span className="tag tag-green" style={{ marginTop: 8, display: "inline-block" }}>
                      Scored {subjectiveScores[q.id]}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {isReviewing && (
            <div style={{ marginTop: 12 }}>
              <ReportQuestionButton questionId={q.id} />
            </div>
          )}
        </div>

        <div className="grid-2">
          <button className="btn btn-ghost btn-block" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            ‹ Previous
          </button>
          {index + 1 === questions.length ? (
            isReviewing ? (
              <button
                className="btn btn-primary btn-block"
                onClick={finishReview}
                disabled={finishing || subjectiveQs.some((sq) => subjectiveScores[sq.question.id] === undefined)}
              >
                {finishing ? "Saving…" : "Finish"}
              </button>
            ) : (
              <button className="btn btn-primary btn-block" onClick={submitExam}>
                Submit exam
              </button>
            )
          ) : (
            <button className="btn btn-primary btn-block" onClick={() => setIndex((i) => i + 1)}>
              Next ›
            </button>
          )}
        </div>
        {!isReviewing && index + 1 === questions.length && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={submitExam}>
            Or submit early from here
          </button>
        )}
      </main>
    </div>
  );
}
