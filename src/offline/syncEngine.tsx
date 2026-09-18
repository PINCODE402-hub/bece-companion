import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { listPendingActions, removePendingAction, countPendingActions } from "./queue";
import { supabase } from "@/lib/supabaseClient";

export type SyncStatus = "offline" | "syncing" | "pending" | "synced";

interface SyncContextValue {
  isOnline: boolean;
  status: SyncStatus;
  pendingCount: number;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await countPendingActions());
  }, []);

  const flush = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const actions = await listPendingActions();
      for (const action of actions) {
        try {
          if (action.type === "progress") {
            const { error } = await supabase.rpc("record_progress_and_award_xp", {
              p_question_id: action.payload.question_id,
              p_selected_answer: action.payload.selected_answer,
              p_is_correct: action.payload.is_correct,
              p_self_marked_score: action.payload.self_marked_score,
              p_time_spent_seconds: action.payload.time_spent_seconds,
              p_attempt_source: action.payload.attempt_source,
              p_client_id: action.clientId
            });
            if (error) throw error;
          } else {
            const { error } = await supabase.rpc("award_game_xp", {
              p_game: action.payload.game,
              p_score: action.payload.score,
              p_client_id: action.clientId
            });
            if (error) throw error;
          }
          await removePendingAction(action.id);
        } catch (e) {
          // stop here — likely still offline or flaky; leave the rest queued and retry as a whole next time
          console.warn("Sync paused, will retry:", e);
          break;
        }
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [isOnline, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Poll for newly-queued items regardless of online state — recordProgress()/
  // awardGameXp() write straight to IndexedDB from elsewhere in the app, so this
  // is how the badge notices something got queued without a shared dispatch.
  useEffect(() => {
    const id = setInterval(refreshPendingCount, 4000);
    return () => clearInterval(id);
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline) flush();
  }, [isOnline, flush]);

  // also retry periodically while online with a pending backlog (covers "flaky, not fully offline")
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => {
      countPendingActions().then((c) => {
        if (c > 0) flush();
      });
    }, 20000);
    return () => clearInterval(id);
  }, [isOnline, flush]);

  const status: SyncStatus = !isOnline ? "offline" : isSyncing ? "syncing" : pendingCount > 0 ? "pending" : "synced";

  return (
    <SyncContext.Provider value={{ isOnline, status, pendingCount, triggerSync: flush }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within a SyncProvider");
  return ctx;
}
