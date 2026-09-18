import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/AuthLayout";
import { validateConfirmPassword, validatePassword } from "@/auth/validation";

// Supabase's emailed reset link redirects here with a recovery token in the URL.
// The client (detectSessionInUrl: true) exchanges it for a session automatically,
// so by the time this form submits, updateUser() applies to the right account.
export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = [validatePassword(password), validateConfirmPassword(password, confirm)].filter(Boolean);
    if (errors.length) return setError(errors[0]!);

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) return setError(updateError);
    setDone(true);
    setTimeout(() => navigate("/", { replace: true }), 2000);
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Taking you to your dashboard…" >
        <div />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthLayout>
  );
}
