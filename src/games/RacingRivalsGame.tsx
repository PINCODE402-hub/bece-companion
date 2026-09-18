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
const LETTER = (i: number) => String.fromCharCode(65 + i);
const TRACK_LENGTH = 100;
const YOU_STEP = 14; // % advanced per correct answer
const RIVAL_STEP = 6; // % the rival advances every tick, regardless of your answers
const RIVAL_TICK_MS = 2200;

export function RacingRivalsGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [pool, setPool] = useState<GameQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [youPos, setYouPos] = useState(0);
  const [rivalPos, setRivalPos] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [totalXp, setTotalXp] = useState(0);
  const [winner, setWinner] = useState<"you" | "rival" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

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
      setYouPos(0);
      setRivalPos(0);
      setAnswered(false);
      setSelected(null);
      setTotalXp(0);
      setWinner(null);
      finishedRef.current = false;
      setPhase("playing");

      intervalRef.current = setInterval(() => {
        if (finishedRef.current) return;
        setRivalPos((p) => Math.min(TRACK_LENGTH, p + RIVAL_STEP));
      }, RIVAL_TICK_MS);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (phase === "playing" && rivalPos >= TRACK_LENGTH) endRace("rival");
  }, [rivalPos, phase]);
  useEffect(() => {
    if (phase === "playing" && youPos >= TRACK_LENGTH) endRace("you");
  }, [youPos, phase]);

  function endRace(who: "you" | "rival") {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setWinner(who);
    setPhase("result");
  }

  async function answer(letter: string) {
    if (answered || finishedRef.current) return;
    const q = pool[qi % pool.length];
    const correct = letter === q.correct_answer;
    setSelected(letter);
    setAnswered(true);

    try {
      const result = await recordProgress({
        question_id: q.id,
        selected_answer: letter,
        is_correct: correct,
        attempt_source: "game"
      });
      if (result) {
        setTotalXp((x) => x + result.awardedXp);
        refreshProfile();
      }
    } catch (e) {
      console.warn("Couldn't save progress:", e);
    }

    if (correct) {
      setYouPos((p) => Math.min(TRACK_LENGTH, p + YOU_STEP));
    }

    setTimeout(() => {
      if (finishedRef.current) return;
      setQi((i) => i + 1);
      setAnswered(false);
      setSelected(null);
    }, 500);
  }

  const current = pool[qi % pool.length];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/games">
          ‹ Games
        </Link>
      </header>
      <main className="page">
        {phase === "setup" && (
          <>
            <h1>🏎️ Racing Rivals</h1>
            <p style={{ color: "var(--ink-faint)" }}>
              Answer correctly to move your car forward — but the rival keeps moving too, whether you
              answer or not. First to the finish line wins!
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
              Start race
            </button>
          </>
        )}

        {phase === "playing" && current && (
          <>
            <div className="race-track">
              <div className="race-lane">
                <span className="race-label">You</span>
                <div className="race-road">
                  <div className="race-car" style={{ left: `${youPos}%` }}>🏎️</div>
                  <div className="race-finish">🏁</div>
                </div>
              </div>
              <div className="race-lane">
                <span className="race-label">Rival</span>
                <div className="race-road">
                  <div className="race-car" style={{ left: `${rivalPos}%` }}>🚗</div>
                  <div className="race-finish">🏁</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="pq-question-text">{current.question_text}</div>
              {current.options.map((o, i) => {
                const isCorrect = o.option_letter === current.correct_answer;
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
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>{winner === "you" ? "🏆" : "🏁"}</div>
            <h2>{winner === "you" ? "You won the race! 🎉" : "The rival got there first!"}</h2>
            {totalXp > 0 && <span className="tag tag-gold">+{totalXp} XP earned</span>}
            <div className="grid-2">
              <button className="btn btn-ghost btn-block" onClick={() => setPhase("setup")}>
                Race again
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
