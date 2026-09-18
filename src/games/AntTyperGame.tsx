import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listSubjects } from "@/services/subjects";
import { SCRAMBLE_WORDS, shuffle } from "@/games/gameContent";
import { awardGameXp } from "@/games/gamesService";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "playing" | "result";
const BASE_DURATION_MS = 6500;
const MIN_DURATION_MS = 2800;
const SPEED_UP_EVERY = 3; // rounds
const ROUNDS_PER_GAME = 12;

export function AntTyperGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectSlug, setSubjectSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [currentWord, setCurrentWord] = useState("");
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [antRunKey, setAntRunKey] = useState(0);
  const [durationMs, setDurationMs] = useState(BASE_DURATION_MS);
  const [feedback, setFeedback] = useState<"caught" | "escaped" | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timeouts fire asynchronously, well after the render that scheduled them —
  // reading React state directly inside them risks a stale closure. These refs
  // are always current, mirrored alongside the state used purely for rendering.
  const wordsRef = useRef<string[]>([]);
  const roundRef = useRef(0);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const durationRef = useRef(BASE_DURATION_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const availableSubjects = (subjects ?? []).filter((s) => SCRAMBLE_WORDS[s.slug]);

  function start() {
    if (!subjectSlug) return;
    setError(null);
    const base = SCRAMBLE_WORDS[subjectSlug];
    const pool: string[] = [];
    while (pool.length < ROUNDS_PER_GAME) pool.push(...shuffle(base));
    wordsRef.current = pool.slice(0, ROUNDS_PER_GAME);
    roundRef.current = 0;
    livesRef.current = 3;
    scoreRef.current = 0;
    durationRef.current = BASE_DURATION_MS;
    setScore(0);
    setLives(3);
    setDurationMs(BASE_DURATION_MS);
    setXpAwarded(null);
    setPhase("playing");
    loadRound();
  }

  function loadRound() {
    const word = wordsRef.current[roundRef.current];
    setCurrentWord(word);
    setTyped("");
    setFeedback(null);
    setAntRunKey((k) => k + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleEscape, durationRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleEscape() {
    setFeedback("escaped");
    livesRef.current -= 1;
    setLives(livesRef.current);
    setTimeout(() => {
      if (livesRef.current <= 0) finish();
      else advanceRound();
    }, 900);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (feedback) return;
    if (typed.trim().toUpperCase() === currentWord) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFeedback("caught");
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setTimeout(advanceRound, 600);
    }
    // wrong guess but ant hasn't escaped yet — let them keep trying until it does
  }

  function advanceRound() {
    roundRef.current += 1;
    if (roundRef.current % SPEED_UP_EVERY === 0) {
      durationRef.current = Math.max(MIN_DURATION_MS, durationRef.current - 500);
      setDurationMs(durationRef.current);
    }
    if (roundRef.current >= ROUNDS_PER_GAME) {
      finish();
      return;
    }
    loadRound();
  }

  async function finish() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("result");
    if (scoreRef.current > 0) {
      try {
        // Ant Typer is a vocabulary/typing drill like Word Scramble — reuses that
        // same server-side XP bucket rather than adding a new game type.
        const result = await awardGameXp("word_scramble", scoreRef.current);
        if (result) {
          setXpAwarded(result.awardedXp);
          refreshProfile();
        }
      } catch (e) {
        console.warn("Couldn't award XP:", e);
      }
    }
  }

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
            <h1>🐜 Ant Typer</h1>
            <p style={{ color: "var(--ink-faint)" }}>
              Type each word before the ant crosses the screen! It speeds up as you go. 3 lives.
            </p>
            {!subjects ? (
              <FullPageSpinner label="Loading subjects…" />
            ) : (
              <div className="chip-row" style={{ marginBottom: 16 }}>
                {availableSubjects.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${subjectSlug === s.slug ? "active" : ""}`}
                    onClick={() => setSubjectSlug(s.slug)}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" onClick={start} disabled={!subjectSlug}>
              Start
            </button>
          </>
        )}

        {phase === "playing" && (
          <>
            <div className="qcounter">
              <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
              <span>Score: {score}</span>
            </div>
            <div className="ant-track">
              <div key={antRunKey} className="ant-runner" style={{ animationDuration: `${durationMs}ms` }}>
                🐜
              </div>
              <div className="ant-hole">🕳️</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p className="hint-text">Type this word:</p>
              <div className="ant-word-target">{currentWord}</div>
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  className="ant-input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={!!feedback}
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={!!feedback}
                  style={{ marginTop: 10 }}
                >
                  Zap! 🐜⚡
                </button>
              </form>
              {feedback === "caught" && <p className="form-success">Caught it! 🎉</p>}
              {feedback === "escaped" && <p className="form-error">The ant got away! It was "{currentWord}"</p>}
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>{score >= 8 ? "🏆" : score >= 4 ? "🎉" : "🌱"}</div>
            <h2>Round over!</h2>
            <p>
              You caught {score} ant{score === 1 ? "" : "s"}.
            </p>
            {xpAwarded !== null && <span className="tag tag-gold">+{xpAwarded} XP</span>}
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
