import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BADGES, getBadgeStats, type BadgeStats } from "@/services/badges";
import { useAuth } from "@/auth/AuthContext";
import { FullPageSpinner } from "@/components/FullPageSpinner";

export function BadgesPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    getBadgeStats(profile.level, profile.streak)
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [profile]);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <FullPageSpinner label="Checking your badges…" />;

  const earnedCount = BADGES.filter((b) => b.check(stats)).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/progress">
          ‹ Progress
        </Link>
        <strong style={{ color: "#fff" }}>Badges</strong>
      </header>
      <main className="page">
        <h1>🎖️ Badges</h1>
        <p style={{ color: "var(--ink-faint)" }}>
          {earnedCount}/{BADGES.length} earned
        </p>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const earned = b.check(stats);
            return (
              <div key={b.id} className={`badge ${earned ? "" : "locked"}`}>
                <span className="b-ic">{b.icon}</span>
                <span className="b-name">{b.name}</span>
                <span className="b-desc">{b.description}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
