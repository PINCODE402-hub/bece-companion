import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/AuthLayout";
import {
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validatePassword
} from "@/auth/validation";

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = [
      validateDisplayName(displayName),
      validateEmail(email),
      validatePassword(password),
      validateConfirmPassword(password, confirm)
    ].filter(Boolean);
    if (errors.length) return setError(errors[0]!);

    setSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, displayName.trim());
    setSubmitting(false);

    if (signUpError) return setError(signUpError);

    // If email confirmation is enabled on the Supabase project, there's no session yet.
    setCheckEmail(true);
    setTimeout(() => navigate("/login", { replace: true }), 3500);
  }

  if (checkEmail) {
    return (
      <AuthLayout title="Almost there!" subtitle="Check your email to confirm your account, then log in.">
        <p>We've sent a confirmation link to <strong>{email}</strong>. Redirecting you to log in…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free BECE past questions, quizzes and mock exams."
      footer={
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Ama Serwaa"
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
