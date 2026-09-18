import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/papers", label: "Papers" },
  { to: "/admin/years", label: "Years" },
  { to: "/admin/subjects", label: "Subjects" },
  { to: "/admin/review", label: "Answer Review" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/export", label: "Export" }
];

export function AdminLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="backlink-light" to="/">
          ‹ Student app
        </NavLink>
        <strong style={{ color: "#fff" }}>Admin</strong>
      </header>
      <nav className="admin-tabs">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "admin-tab active" : "admin-tab")}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
