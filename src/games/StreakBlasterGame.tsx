import { useEffect, useState } from "react";
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

export function StreakBlasterGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [pool, setPool] = useState<GameQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch((e) => setError(e.message));
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
      setStreak(0);
      setBestStreak(0);
      setTotalXp(0);
      setAnswered(false);
      setSelected(null);
      setPhase("playing");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function answer(letter: string) {
    if (answered) return;
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
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setTimeout(() => {
        setQi((i) => i + 1);
        setAnswered(false);
        setSelected(null);
      }, 550);
    } else {
      setTimeout(() => setPhase("result"), 900);
    }
  }

  const flameScale = Math.min(1 + streak * 0.12, 2.4);

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
            <h1>🔥 Streak Blaster</h1>
            <p style={{ color: "var(--ink-faint)" }}>
              Keep answering correctly to build your streak. One wrong answer ends the run — how far can
              you go?
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

        {phase === "playing" && pool[qi % pool.length] && (
          <>
            <div className="streak-flame-wrap">
              <div className="streak-flame" style={{ transform: `scale(${flameScale})` }}>
                🔥
              </div>
              <div className="streak-count">{streak}</div>
            </div>
            <div className="card">
              <div className="pq-question-text">{pool[qi % pool.length].question_text}</div>
              {pool[qi % pool.length].options.map((o, i) => {
                const isCorrect = o.option_letter === pool[qi % pool.length].correct_answer;
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
            <div style={{ fontSize: 44 }}>{bestStreak >= 8 ? "🏆" : bestStreak >= 4 ? "🎉" : "🌱"}</div>
            <h2>Streak ended!</h2>
            <p>
              Your best streak was <strong>{bestStreak}</strong>.
            </p>
            {totalXp > 0 && <span className="tag tag-gold">+{totalXp} XP earned</span>}
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
