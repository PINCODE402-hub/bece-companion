import { getOfflineDb, type PendingAction } from "./db";

export async function enqueueAction(action: PendingAction): Promise<void> {
  const db = await getOfflineDb();
  await db.put("pendingActions", action);
}

export async function listPendingActions(): Promise<PendingAction[]> {
  const db = await getOfflineDb();
  return db.getAll("pendingActions");
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete("pendingActions", id);
}

export async function countPendingActions(): Promise<number> {
  const db = await getOfflineDb();
  return db.count("pendingActions");
}
