import { getOfflineDb } from "./db";
import type { StudentQuestion } from "@/services/studentContent";
import type { PublishedPaperSummary } from "@/services/studentContent";

const PAPER_LIST_CACHE_KEY = "__published_papers_list__";

export async function cachePaper(paperId: string, paperTitle: string, questions: StudentQuestion[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.put("cachedPapers", { paperId, paperTitle, cachedAt: Date.now(), questions });
  } catch (e) {
    console.warn("Couldn't cache paper for offline use:", e);
  }
}

export async function getCachedPaper(
  paperId: string
): Promise<{ paperTitle: string; cachedAt: number; questions: StudentQuestion[] } | null> {
  try {
    const db = await getOfflineDb();
    const row = await db.get("cachedPapers", paperId);
    return row ? { paperTitle: row.paperTitle, cachedAt: row.cachedAt, questions: row.questions } : null;
  } catch (e) {
    console.warn("Couldn't read offline cache:", e);
    return null;
  }
}

export async function listCachedPaperIds(): Promise<Set<string>> {
  try {
    const db = await getOfflineDb();
    const keys = await db.getAllKeys("cachedPapers");
    return new Set(keys);
  } catch {
    return new Set();
  }
}

export async function cachePublishedPapersList(papers: PublishedPaperSummary[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.put("metaCache", { key: PAPER_LIST_CACHE_KEY, data: papers, cachedAt: Date.now() });
  } catch (e) {
    console.warn("Couldn't cache the papers list offline:", e);
  }
}

export async function getCachedPublishedPapersList(): Promise<PublishedPaperSummary[] | null> {
  try {
    const db = await getOfflineDb();
    const row = await db.get("metaCache", PAPER_LIST_CACHE_KEY);
    return row ? (row.data as PublishedPaperSummary[]) : null;
  } catch {
    return null;
  }
}
