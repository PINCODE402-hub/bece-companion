import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeaderboard, getMyRank, type LeaderboardEntry } from "@/services/leaderboard";
import { FullPageSpinner } from "@/components/FullPageSpinner";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getLeaderboard(20), getMyRank()])
      .then(([e, r]) => {
        setEntries(e);
        setMyRank(r);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!entries) return <FullPageSpinner label="Loading leaderboard…" />;

  const iAmInTop20 = entries.some((e) => e.is_you);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/progress">
          ‹ Progress
        </Link>
        <strong style={{ color: "#fff" }}>Leaderboard</strong>
      </header>
      <main className="page">
        <h1>🏅 Leaderboard</h1>
        {myRank !== null && (
          <div className="card" style={{ textAlign: "center" }}>
            <span className="hint-text">Your rank</span>
            <div style={{ fontSize: 26, fontWeight: 800 }}>#{myRank}</div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="empty-note">No students on the board yet — be the first to earn some XP!</p>
        ) : (
          <div className="card" style={{ padding: 6 }}>
            {entries.map((e, i) => (
              <div key={i} className={`leaderboard-row ${e.is_you ? "you" : ""}`}>
                <span className="leaderboard-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                <span className="leaderboard-name">
                  {e.display_name}
                  {e.is_you && <span className="tag tag-sky" style={{ marginLeft: 6 }}>You</span>}
                </span>
                <span className="leaderboard-xp">{e.xp} XP</span>
              </div>
            ))}
            {!iAmInTop20 && myRank !== null && myRank > entries.length && (
              <p className="hint-text" style={{ padding: "10px 12px 4px" }}>
                Keep going — you're ranked #{myRank}, not far off the top {entries.length}!
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
