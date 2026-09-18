import { Link } from "react-router-dom";

export function GamesHub() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/">
          ‹ Home
        </Link>
        <strong style={{ color: "#fff" }}>Games</strong>
      </header>
      <main className="page">
        <h1>🎮 Learning Games</h1>
        <p style={{ color: "var(--ink-faint)" }}>Quick, fun ways to reinforce what you're learning.</p>

        <div className="card">
          <span style={{ fontSize: 26 }}>⚡</span>
          <h3>Speed Round</h3>
          <p>Answer real past-question MCQs before the clock runs out. Three lives — don't rush too much!</p>
          <Link className="btn btn-gold btn-block" to="/games/speed">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🧩</span>
          <h3>Term Match</h3>
          <p>Flip and match key terms with their meanings as fast as you can.</p>
          <Link className="btn btn-gold btn-block" to="/games/match">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🔤</span>
          <h3>Word Scramble</h3>
          <p>Unscramble key vocabulary words, four rounds, against the clock.</p>
          <Link className="btn btn-gold btn-block" to="/games/scramble">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🎡</span>
          <h3>Spin &amp; Quiz</h3>
          <p>Spin the wheel to pick a random subject, then answer 5 quick questions.</p>
          <Link className="btn btn-gold btn-block" to="/games/spin">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🔥</span>
          <h3>Streak Blaster</h3>
          <p>No timer, no lives — just keep the correct answers coming. How high can you climb?</p>
          <Link className="btn btn-gold btn-block" to="/games/streak">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🎯</span>
          <h3>Shooting Gallery</h3>
          <p>Shoot the correct answer before it slips away. Fast, colorful, arcade-style.</p>
          <Link className="btn btn-gold btn-block" to="/games/shoot">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🏎️</span>
          <h3>Racing Rivals</h3>
          <p>Race a rival car down the track — correct answers are your only fuel.</p>
          <Link className="btn btn-gold btn-block" to="/games/race">
            Play
          </Link>
        </div>

        <div className="card">
          <span style={{ fontSize: 26 }}>🐜</span>
          <h3>Ant Typer</h3>
          <p>The classic typing-race game — type each word before the ant escapes.</p>
          <Link className="btn btn-gold btn-block" to="/games/ant">
            Play
          </Link>
        </div>
      </main>
    </div>
  );
}
