import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listSubjects } from "@/services/subjects";
import { fetchObjectiveQuestionPool, type GameQuestion } from "@/games/gamesService";
import { recordProgress } from "@/services/studentContent";
import { shuffle } from "@/games/gameContent";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "playing" | "result";
const ROUND_LENGTH = 8;
const PER_QUESTION_SECONDS = 8;
const TARGET_COLORS = ["#3A7CA5", "#E4572E", "#2F7A4F", "#B9800F"];

export function ShootingGalleryGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [pool, setPool] = useState<GameQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);
  const [popped, setPopped] = useState<string | null>(null); // letter that was just shot
  const [missed, setMissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function start() {
    if (!subjectId) return;
    setError(null);
    try {
      const qs = await fetchObjectiveQuestionPool(subjectId);
      if (qs.length < 3) {
        setError("Not enough published questions in this subject yet.");
        return;
      }
      setPool(shuffle(qs));
      setQi(0);
      setScore(0);
      setLives(3);
      loadQuestion();
      setPhase("playing");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function loadQuestion() {
    setPopped(null);
    setMissed(false);
    setTimeLeft(PER_QUESTION_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          handleMiss();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleMiss() {
    setMissed(true);
    const remaining = lives - 1;
    setLives(remaining);
    setTimeout(() => (remaining <= 0 ? setPhase("result") : advance()), 900);
  }

  async function shoot(letter: string) {
    if (popped || missed) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const q = pool[qi % pool.length];
    const correct = letter === q.correct_answer;
    setPopped(letter);

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

    if (correct) {
      setScore((s) => s + 1);
      setTimeout(advance, 650);
    } else {
      const remaining = lives - 1;
      setLives(remaining);
      setTimeout(() => (remaining <= 0 ? setPhase("result") : advance()), 900);
    }
  }

  function advance() {
    if (qi + 1 >= ROUND_LENGTH || qi + 1 >= pool.length) {
      setPhase("result");
      return;
    }
    setQi((i) => i + 1);
    loadQuestion();
  }

  const current = pool[qi % pool.length];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/games">
          ‹ Games
        </Link>
        {phase === "playing" && <span className={`exam-timer ${timeLeft <= 3 ? "low" : ""}`}>⏱ {timeLeft}s</span>}
      </header>
      <main className="page">
        {phase === "setup" && (
          <>
            <h1>🎯 Shooting Gallery</h1>
            <p style={{ color: "var(--ink-faint)" }}>
              Shoot the correct answer before time runs out. {ROUND_LENGTH} questions, 3 lives.
            </p>
            {!subjects ? (
              <FullPageSpinner label="Loading subjects…" />
            ) : (
              <div className="chip-row" style={{ marginBottom: 16 }}>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${subjectId === s.id ? "active" : ""}`}
                    onClick={() => setSubjectId(s.id)}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" onClick={start} disabled={!subjectId}>
              Start
            </button>
          </>
        )}

        {phase === "playing" && current && (
          <>
            <div className="qcounter">
              <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)} &nbsp; Score: {score}</span>
              <span>
                Q{qi + 1}/{Math.min(ROUND_LENGTH, pool.length)}
              </span>
            </div>
            <div className="card">
              <div className="pq-question-text">{current.question_text}</div>
            </div>
            <div className="shoot-range">
              {current.options.map((o, i) => {
                const isPoppedCorrect = popped === o.option_letter && o.option_letter === current.correct_answer;
                const isPoppedWrong = popped === o.option_letter && o.option_letter !== current.correct_answer;
                const revealCorrect = (missed || (popped && popped !== o.option_letter)) && o.option_letter === current.correct_answer;
                const cls = [
                  "shoot-target",
                  isPoppedCorrect ? "hit" : "",
                  isPoppedWrong ? "miss" : "",
                  revealCorrect ? "reveal" : ""
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={o.option_letter}
                    className={cls}
                    style={{ background: TARGET_COLORS[i % TARGET_COLORS.length], animationDelay: `${i * 0.3}s` }}
                    onClick={() => shoot(o.option_letter)}
                    disabled={!!popped || missed}
                  >
                    {o.option_text}
                  </button>
                );
              })}
            </div>
            {missed && <p className="form-error" style={{ textAlign: "center" }}>⏱ Too slow! Correct: {current.correct_answer}</p>}
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>{score >= 6 ? "🏆" : score >= 3 ? "🎉" : "🌱"}</div>
            <h2>Gallery closed!</h2>
            <p>
              You hit {score}/{Math.min(ROUND_LENGTH, pool.length)} targets.
            </p>
            <div className="grid-2">
              <button className="btn btn-ghost btn-block" onClick={() => setPhase("setup")}>
                Play again
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
