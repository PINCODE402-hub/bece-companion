import { useState } from "react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { listSubjects } from "@/services/subjects";
import { SCRAMBLE_WORDS, shuffle } from "@/games/gameContent";
import { awardGameXp } from "@/games/gamesService";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "playing" | "result";

function scrambleLetters(word: string): string[] {
  let arr = word.split("");
  let tries = 0;
  do {
    arr = shuffle(arr);
    tries++;
  } while (arr.join("") === word && tries < 10);
  return arr;
}

export function WordScrambleGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectSlug, setSubjectSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [words, setWords] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [used, setUsed] = useState<number[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => {});
  }, []);

  const availableSubjects = (subjects ?? []).filter((s) => SCRAMBLE_WORDS[s.slug]);

  function loadRound(newWords: string[], roundIndex: number) {
    const word = newWords[roundIndex];
    setLetters(scrambleLetters(word));
    setUsed([]);
    setAnswer(new Array(word.length).fill(""));
    setMessage(null);
  }

  function start() {
    if (!subjectSlug) return;
    const picked = shuffle(SCRAMBLE_WORDS[subjectSlug]).slice(0, 4);
    setWords(picked);
    setRound(0);
    setScore(0);
    setXpAwarded(null);
    setPhase("playing");
    loadRound(picked, 0);
  }

  function tapLetter(i: number) {
    if (used.includes(i)) return;
    const emptyIdx = answer.indexOf("");
    if (emptyIdx === -1) return;
    const nextAnswer = [...answer];
    nextAnswer[emptyIdx] = letters[i];
    setAnswer(nextAnswer);
    setUsed([...used, i]);
  }

  function clear() {
    setAnswer(new Array(words[round].length).fill(""));
    setUsed([]);
  }

  async function check() {
    const attempt = answer.join("");
    const word = words[round];
    let newScore = score;
    if (attempt === word) {
      newScore = score + 1;
      setScore(newScore);
      setMessage("✅ Correct!");
    } else {
      setMessage(`❌ Not quite — the word was ${word}`);
    }

    const nextRound = round + 1;
    if (nextRound >= words.length) {
      try {
        const result = await awardGameXp("word_scramble", newScore);
        if (result) {
          setXpAwarded(result.awardedXp);
          refreshProfile();
        }
      } catch (e) {
        console.warn("Couldn't award XP:", e);
      }
      setTimeout(() => setPhase("result"), 700);
    } else {
      setTimeout(() => {
        setRound(nextRound);
        loadRound(words, nextRound);
      }, 700);
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
            <h1>🔤 Word Scramble</h1>
            <p style={{ color: "var(--ink-faint)" }}>Tap the letters in order to unscramble each word. 4 rounds.</p>
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
            <button className="btn btn-primary btn-block" onClick={start} disabled={!subjectSlug}>
              Start
            </button>
          </>
        )}

        {phase === "playing" && (
          <>
            <div className="qcounter">
              <span>Round {round + 1}/{words.length}</span>
              <span>Score: {score}</span>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p className="hint-text">Unscramble this word:</p>
              <div className="scramble-slots">
                {answer.map((ch, i) => (
                  <div className="scramble-slot" key={i}>{ch}</div>
                ))}
              </div>
              <div className="scramble-letters">
                {letters.map((L, i) => (
                  <div
                    key={i}
                    className="scramble-letter"
                    style={used.includes(i) ? { opacity: 0.25, pointerEvents: "none" } : undefined}
                    onClick={() => tapLetter(i)}
                  >
                    {L}
                  </div>
                ))}
              </div>
              {message && <p className="hint-text" style={{ marginBottom: 10 }}>{message}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn btn-ghost btn-sm" onClick={clear}>
                  Clear
                </button>
                <button className="btn btn-primary btn-sm" onClick={check} disabled={answer.includes("")}>
                  Check
                </button>
              </div>
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>🔤</div>
            <h2>Round complete!</h2>
            <p>You scored {score} out of {words.length}.</p>
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
