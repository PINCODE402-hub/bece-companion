import { useSync } from "@/offline/syncEngine";

export function SyncStatusBadge() {
  const { status, pendingCount, triggerSync } = useSync();

  if (status === "synced") return null; // nothing to show when everything's fine and online

  const label =
    status === "offline"
      ? `📴 Offline${pendingCount ? ` · ${pendingCount} queued` : ""}`
      : status === "syncing"
        ? "🔄 Syncing…"
        : `⏳ ${pendingCount} pending sync`;

  return (
    <button className={`sync-badge sync-badge-${status}`} onClick={triggerSync} disabled={status === "syncing"}>
      {label}
    </button>
  );
}
