import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listSubjects } from "@/services/subjects";
import { MATCH_DATA, shuffle } from "@/games/gameContent";
import { awardGameXp } from "@/games/gamesService";
import { useAuth } from "@/auth/AuthContext";
import type { SubjectRow } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";

type Phase = "setup" | "playing" | "result";
interface Card {
  text: string;
  pairId: number;
  solved: boolean;
}

export function TermMatchGame() {
  const { refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [subjectSlug, setSubjectSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");

  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => {});
  }, []);
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const availableSubjects = (subjects ?? []).filter((s) => MATCH_DATA[s.slug]);

  function start() {
    if (!subjectSlug) return;
    const pairs = MATCH_DATA[subjectSlug];
    const built: Card[] = [];
    pairs.forEach((p, i) => {
      built.push({ text: p.term, pairId: i, solved: false });
      built.push({ text: p.definition, pairId: i, solved: false });
    });
    setCards(shuffle(built));
    setSelected([]);
    setMoves(0);
    setTime(0);
    setXpAwarded(null);
    setPhase("playing");
    intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }

  async function select(i: number) {
    if (cards[i].solved || selected.includes(i) || selected.length >= 2) return;
    const next = [...selected, i];
    setSelected(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].pairId === cards[b].pairId) {
        const updated = cards.map((c, idx) => (idx === a || idx === b ? { ...c, solved: true } : c));
        setCards(updated);
        setSelected([]);
        if (updated.every((c) => c.solved)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const pairCount = updated.length / 2;
          try {
            const result = await awardGameXp("term_match", pairCount);
            if (result) {
              setXpAwarded(result.awardedXp);
              refreshProfile();
            }
          } catch (e) {
            console.warn("Couldn't award XP:", e);
          }
          setPhase("result");
        }
      } else {
        setTimeout(() => setSelected([]), 700);
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
            <h1>🧩 Term Match</h1>
            <p style={{ color: "var(--ink-faint)" }}>Tap two cards to match each term with its meaning.</p>
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
              <span>Moves: {moves}</span>
              <span>⏱ {time}s</span>
            </div>
            <div className="match-grid">
              {cards.map((c, i) => (
                <div
                  key={i}
                  className={`match-item ${c.solved ? "solved" : ""} ${selected.includes(i) ? "selected" : ""}`}
                  onClick={() => select(i)}
                >
                  {c.text}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="card result-hero">
            <div style={{ fontSize: 44 }}>🧩</div>
            <h2>All matched!</h2>
            <p>Completed in {moves} moves and {time}s.</p>
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
