import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { listPublishedPapers, type PublishedPaperSummary } from "@/services/studentContent";
import { KnowledgeTree } from "@/components/KnowledgeTree";
import { getSubjectTheme } from "@/data/subjectTheme";

interface SubjectQuickLink {
  subjectId: string;
  slug: string;
  name: string;
  icon: string | null;
  latestYear: number;
  paperCount: number;
}

export function HomePage() {
  const { profile, signOut, isAdmin } = useAuth();
  const [papers, setPapers] = useState<PublishedPaperSummary[] | null>(null);

  useEffect(() => {
    listPublishedPapers()
      .then(setPapers)
      .catch(() => setPapers([]));
  }, []);

  const subjectLinks: SubjectQuickLink[] = [];
  if (papers) {
    const bySubject = new Map<string, SubjectQuickLink>();
    papers.forEach((p) => {
      const existing = bySubject.get(p.subject_id);
      if (existing) {
        existing.paperCount += 1;
        existing.latestYear = Math.max(existing.latestYear, p.year);
      } else {
        bySubject.set(p.subject_id, {
          subjectId: p.subject_id,
          slug: p.subject_slug,
          name: p.subject_name,
          icon: p.subject_icon,
          latestYear: p.year,
          paperCount: 1
        });
      }
    });
    subjectLinks.push(...Array.from(bySubject.values()));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <strong>BECE Companion</strong>
          </div>
        </div>
        <button className="btn-topbar" onClick={() => signOut()}>
          🚪 Log out
        </button>
      </header>

      <main className="page">
        <div className="hero hero-fun">
          <div className="hero-top">
            <div>
              <div className="greet">Akwaaba, {profile?.display_name ?? "Student"} 👋</div>
              <div className="greet-sub">Ready to level up your BECE prep today?</div>
            </div>
            <div className="hero-tree">
              <KnowledgeTree level={profile?.level ?? 1} />
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="num">{profile?.xp ?? 0}</div>
              <div className="lbl">XP</div>
            </div>
            <div className="hero-stat">
              <div className="num">Lv {profile?.level ?? 1}</div>
              <div className="lbl">Level</div>
            </div>
            <div className="hero-stat hero-stat-streak">
              <div className="num">{profile?.streak ?? 0}🔥</div>
              <div className="lbl">Streak</div>
            </div>
          </div>
        </div>

        {subjectLinks.length > 0 && (
          <>
            <div className="section-title">Jump into a subject</div>
            <div className="subject-tile-grid">
              {subjectLinks.map((s) => {
                const theme = getSubjectTheme(s.slug);
                return (
                  <Link
                    key={s.subjectId}
                    to={`/past-questions/${s.latestYear}/${s.subjectId}`}
                    className="subject-tile"
                    style={{ background: theme.bg }}
                  >
                    <span className="subject-tile-icon">{s.icon}</span>
                    <span className="subject-tile-name" style={{ color: theme.color }}>
                      {s.name}
                    </span>
                    <span className="subject-tile-meta">{s.paperCount} paper{s.paperCount === 1 ? "" : "s"}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <div className="section-title">Quick actions</div>
        <div className="action-tile-grid">
          <Link className="action-tile" to="/past-questions" style={{ background: "#DCEBF2" }}>
            <span className="action-tile-icon">📚</span>
            <span className="action-tile-label">Past Questions</span>
          </Link>
          <Link className="action-tile" to="/games" style={{ background: "#FBE9C4" }}>
            <span className="action-tile-icon">🎮</span>
            <span className="action-tile-label">Games</span>
          </Link>
          <Link className="action-tile" to="/progress" style={{ background: "#DCEEE2" }}>
            <span className="action-tile-icon">📈</span>
            <span className="action-tile-label">Progress</span>
          </Link>
          <Link className="action-tile" to="/profile" style={{ background: "#FBE1D9" }}>
            <span className="action-tile-icon">👤</span>
            <span className="action-tile-label">Profile</span>
          </Link>
          {isAdmin && (
            <Link className="action-tile" to="/admin" style={{ background: "#E7E1F5" }}>
              <span className="action-tile-icon">🛠️</span>
              <span className="action-tile-label">Admin</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
