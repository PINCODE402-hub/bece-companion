import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { validateConfirmPassword, validateDisplayName, validatePassword } from "@/auth/validation";

export function ProfilePage() {
  const { user, profile, updateProfile, updatePassword } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwStatus, setPwStatus] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameStatus(null);
    const err = validateDisplayName(displayName);
    if (err) return setNameError(err);
    setNameError(null);
    setSavingName(true);
    const { error } = await updateProfile({ display_name: displayName.trim() });
    setSavingName(false);
    setNameStatus(error ? null : "Saved!");
    if (error) setNameError(error);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    const errors = [validatePassword(newPassword), validateConfirmPassword(newPassword, confirmPassword)].filter(Boolean);
    if (errors.length) return setPwError(errors[0]!);
    setPwError(null);
    setSavingPw(true);
    const { error } = await updatePassword(newPassword);
    setSavingPw(false);
    if (error) return setPwError(error);
    setNewPassword("");
    setConfirmPassword("");
    setPwStatus("Password updated!");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="backlink-light" to="/">
          ‹ Home
        </Link>
      </header>
      <main className="page">
        <h1>Your profile</h1>

        <div className="card">
          <div className="setup-row">
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div className="setup-row">
            <span>Member since</span>
            <strong>{profile ? new Date(profile.created_at).toLocaleDateString() : "—"}</strong>
          </div>
          <div className="setup-row">
            <span>Role</span>
            <strong>{profile?.role}</strong>
          </div>
        </div>

        <div className="card">
          <h3>Display name</h3>
          <form onSubmit={handleSaveName} noValidate>
            <label className="field">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            {nameError && <p className="form-error">{nameError}</p>}
            {nameStatus && <p className="form-success">{nameStatus}</p>}
            <button className="btn btn-primary" type="submit" disabled={savingName}>
              {savingName ? "Saving…" : "Save name"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Change password</h3>
          <form onSubmit={handleChangePassword} noValidate>
            <label className="field">
              <span>New password</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </label>
            {pwError && <p className="form-error">{pwError}</p>}
            {pwStatus && <p className="form-success">{pwStatus}</p>}
            <button className="btn btn-primary" type="submit" disabled={savingPw}>
              {savingPw ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
