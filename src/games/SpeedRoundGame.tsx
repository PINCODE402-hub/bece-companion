import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listSubjects } from "@/services/subjects";
import { fetchObjectiveQuestionPool, type GameQuestion } from "@/games/gamesService";
import { recordProgress } from "@/services/studentContent";
import { shuffle } from "@/games/gameContent";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "loading_pool" | "playing" | "result";
const LETTER = (i: number) => String.fromCharCode(65 + i);

export function SpeedRoundGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pool, setPool] = useState<GameQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
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
    setPhase("loading_pool");
    setError(null);
    try {
      const qs = await fetchObjectiveQuestionPool(subjectId);
      if (qs.length < 3) {
        setError("Not enough published questions in this subject yet for Speed Round.");
        setPhase("setup");
        return;
      }
      setPool(shuffle(qs));
      setQi(0);
      setScore(0);
      setLives(3);
      setTimeLeft(45);
      setPhase("playing");
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPhase("result");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  }

  async function answer(letter: string) {
    const q = pool[qi % pool.length];
    const correct = letter === q.correct_answer;
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

    if (!correct) {
      const remaining = lives - 1;
      setLives(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase("result");
        return;
      }
    }
    setQi((i) => i + 1);
  }

  if (error && phase === "setup") {
    // still show setup below with the error
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/games">
          ‹ Games
        </Link>
        {phase === "playing" && (
          <span className={`exam-timer ${timeLeft <= 10 ? "low" : ""}`}>⏱ {timeLeft}s</span>
        )}
      </header>
      <main className="page">
        {phase === "setup" && (
          <>
            <h1>⚡ Speed Round</h1>
            <p style={{ color: "var(--ink-faint)" }}>Pick a subject, then answer as many as you can in 45 seconds. 3 lives.</p>
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
              Start (45s)
            </button>
          </>
        )}

        {phase === "loading_pool" && <FullPageSpinner label="Getting questions ready…" />}

        {phase === "playing" && pool[qi % pool.length] && (
          <>
            <div className="qcounter">
              <span>{"♥".repeat(lives)}{"♡".repeat(3 - lives)} &nbsp; Score: {score}</span>
            </div>
            <div className="card">
              <div className="pq-question-text">{pool[qi % pool.length].question_text}</div>
              {pool[qi % pool.length].options.map((o, i) => (
                <div key={o.option_letter} className="sq-option" onClick={() => answer(o.option_letter)} style={{ cursor: "pointer" }}>
                  <span className="sq-letter">{LETTER(i)}</span>
                  <span>{o.option_text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>{score >= 8 ? "🏆" : score >= 4 ? "🎉" : "🌱"}</div>
            <h2>Time's up!</h2>
            <p>You scored <strong>{score}</strong> point{score === 1 ? "" : "s"}.</p>
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
