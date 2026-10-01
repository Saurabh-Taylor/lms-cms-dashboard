// Lightweight thread index for the AI panel — localStorage-backed until
// server-side thread persistence lands (spec phase 5).

export interface ThreadMeta {
  id: string;
  title: string;
  updatedAt: number;
}

// Must stay in sync with the `keyPrefix` given to localStoragePersistence —
// transcript keys are `${THREAD_KEY_PREFIX}${threadId}`.
export const THREAD_KEY_PREFIX = "microshala-ai:thread:";
const INDEX_KEY = "microshala-ai:threads";
const MAX_THREADS = 50;

export function listThreads(): ThreadMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function touchThread(id: string, title = "New chat") {
  try {
    const threads = listThreads();
    const existing = threads.find((t) => t.id === id);
    if (existing) {
      existing.updatedAt = Date.now();
    } else {
      threads.unshift({ id, title, updatedAt: Date.now() });
    }
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(INDEX_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)));
  } catch {}
}

export function removeThread(id: string) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(listThreads().filter((t) => t.id !== id)));
    localStorage.removeItem(`${THREAD_KEY_PREFIX}${id}`);
  } catch {}
}
