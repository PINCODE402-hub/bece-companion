export function FullPageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="full-page-center">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
