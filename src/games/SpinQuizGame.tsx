import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listSubjects } from "@/services/subjects";
import { fetchObjectiveQuestionPool, type GameQuestion } from "@/games/gamesService";
import { recordProgress } from "@/services/studentContent";
import { shuffle } from "@/games/gameContent";
import { getSubjectTheme } from "@/data/subjectTheme";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "spinning" | "quiz" | "result";
const LETTER = (i: number) => String.fromCharCode(65 + i);
const ROUND_LENGTH = 5;

export function SpinQuizGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [chosenSubject, setChosenSubject] = useState<SubjectRow | null>(null);
  const [pool, setPool] = useState<GameQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    listSubjects().then(setSubjects).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  function spin() {
    if (!subjects || subjects.length === 0) return;
    setError(null);
    setPhase("spinning");
    const finalIndex = Math.floor(Math.random() * subjects.length);
    const totalSteps = subjects.length * 3 + finalIndex; // a couple of full loops, then land on the target

    let step = 0;
    const scheduleStep = () => {
      const progress = step / totalSteps;
      const delay = 55 + progress * progress * 480; // ease-out deceleration
      const t = setTimeout(() => {
        setHighlightIndex((prev) => (prev + 1) % subjects.length);
        step++;
        if (step < totalSteps) scheduleStep();
        else finishSpin(finalIndex);
      }, delay);
      timeoutsRef.current.push(t);
    };
    scheduleStep();
  }

  async function finishSpin(index: number) {
    if (!subjects) return;
    const subject = subjects[index];
    setChosenSubject(subject);
    setHighlightIndex(index);
    try {
      const qs = await fetchObjectiveQuestionPool(subject.id);
      if (qs.length < 2) {
        setError(`Not enough published questions in ${subject.name} yet — spin again for another subject.`);
        setPhase("setup");
        return;
      }
      setPool(shuffle(qs).slice(0, ROUND_LENGTH));
      setQi(0);
      setScore(0);
      setAnswered(false);
      setSelected(null);
      setPhase("quiz");
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  async function answer(letter: string) {
    if (answered) return;
    const q = pool[qi];
    const correct = letter === q.correct_answer;
    setSelected(letter);
    setAnswered(true);
    if (correct) setScore((s) => s + 1);
    try {
      const result = await recordProgress({
        question_id: q.id,
        selected_answer: letter,
        is_correct: correct,
        attempt_source: "game"
      });
      if (result) refreshProfile();
    } catch (e) {
      console.warn("Couldn't save progress:", e);
    }
  }

  function next() {
    if (qi + 1 >= pool.length) {
      setPhase("result");
      return;
    }
    setQi((i) => i + 1);
    setAnswered(false);
    setSelected(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/games">
          ‹ Games
        </Link>
      </header>
      <main className="page">
        {(phase === "setup" || phase === "spinning") && (
          <>
            <h1>🎡 Spin &amp; Quiz</h1>
            <p style={{ color: "var(--ink-faint)" }}>
              Spin the wheel — whatever subject it lands on, answer {ROUND_LENGTH} quick questions!
            </p>
            {!subjects ? (
              <FullPageSpinner label="Loading subjects…" />
            ) : (
              <div className="spin-reel">
                {subjects.map((s, i) => {
                  const theme = getSubjectTheme(s.slug);
                  return (
                    <div
                      key={s.id}
                      className={`spin-reel-item ${i === highlightIndex ? "active" : ""}`}
                      style={{ background: theme.bg, color: theme.color }}
                    >
                      {s.icon} {s.name}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn btn-primary btn-block"
              onClick={spin}
              disabled={!subjects || subjects.length === 0 || phase === "spinning"}
            >
              {phase === "spinning" ? "Spinning…" : "🎡 Spin!"}
            </button>
          </>
        )}

        {phase === "quiz" && pool[qi] && chosenSubject && (
          <>
            <div className="qcounter">
              <span>
                {chosenSubject.icon} {chosenSubject.name} · Q{qi + 1}/{pool.length}
              </span>
              <span>Score: {score}</span>
            </div>
            <div className="card">
              <div className="pq-question-text">{pool[qi].question_text}</div>
              {pool[qi].options.map((o, i) => {
                const isCorrect = o.option_letter === pool[qi].correct_answer;
                const isSelected = selected === o.option_letter;
                const cls = [
                  "sq-option",
                  answered && isCorrect ? "correct" : "",
                  answered && isSelected && !isCorrect ? "wrong" : ""
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={o.option_letter}
                    className={cls}
                    onClick={() => answer(o.option_letter)}
                    style={{ cursor: answered ? "default" : "pointer" }}
                  >
                    <span className="sq-letter">{LETTER(i)}</span>
                    <span>{o.option_text}</span>
                  </div>
                );
              })}
            </div>
            {answered && (
              <button className="btn btn-primary btn-block" onClick={next}>
                {qi + 1 === pool.length ? "See results" : "Next ›"}
              </button>
            )}
          </>
        )}

        {phase === "result" && chosenSubject && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>{score >= 4 ? "🏆" : score >= 2 ? "🎉" : "🌱"}</div>
            <h2>{chosenSubject.name} round complete!</h2>
            <p>
              You scored {score}/{pool.length}.
            </p>
            <div className="grid-2">
              <button className="btn btn-ghost btn-block" onClick={() => setPhase("setup")}>
                Spin again
              </button>
              <Link className="btn btn-primary btn-block" to="/games">
                Back to games
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
