import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { StudentQuestion } from "@/services/studentContent";

export interface CachedPaperRecord {
  paperId: string;
  paperTitle: string;
  cachedAt: number;
  questions: StudentQuestion[];
}

export type PendingAction =
  | {
      id: string;
      type: "progress";
      clientId: string;
      queuedAt: number;
      payload: {
        question_id: string;
        selected_answer: string | null;
        is_correct: boolean | null;
        self_marked_score: number | null;
        time_spent_seconds: number | null;
        attempt_source: string;
      };
    }
  | {
      id: string;
      type: "game_xp";
      clientId: string;
      queuedAt: number;
      payload: { game: string; score: number };
    };

interface BeceOfflineDB extends DBSchema {
  cachedPapers: { key: string; value: CachedPaperRecord };
  pendingActions: { key: string; value: PendingAction };
  metaCache: { key: string; value: { key: string; data: unknown; cachedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<BeceOfflineDB>> | null = null;

/** Lazily opens (and upgrades, if needed) the offline database. Every offline
 * module goes through this single connection. */
export function getOfflineDb(): Promise<IDBPDatabase<BeceOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BeceOfflineDB>("bece-companion-offline", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cachedPapers")) {
          db.createObjectStore("cachedPapers", { keyPath: "paperId" });
        }
        if (!db.objectStoreNames.contains("pendingActions")) {
          db.createObjectStore("pendingActions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("metaCache")) {
          db.createObjectStore("metaCache", { keyPath: "key" });
        }
      }
    });
  }
  return dbPromise;
}

/** Heuristic for "this failed because we're offline/flaky, not because the
 * request was actually invalid" — used to decide whether to queue-and-retry
 * versus surface a real error to the user. */
export function isLikelyNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /fetch|network|timeout|Load failed/i.test(msg);
}

export function generateClientId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
