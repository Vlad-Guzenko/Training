/**
 * Safe wrappers around Web Storage with JSON serialization.
 * - Avoids crashes in private mode / SSR
 * - Catches quota and JSON errors
 */
export const safeStorage = {
  get<T = unknown>(
    key: string,
    fallback: T | null = null,
    storage: Storage | undefined = typeof window !== "undefined"
      ? window.localStorage
      : undefined
  ): T | null {
    try {
      if (!storage) return fallback;
      const raw = storage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(
    key: string,
    value: T,
    storage: Storage | undefined = typeof window !== "undefined"
      ? window.localStorage
      : undefined
  ) {
    try {
      if (!storage) return;
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota/availability */
    }
  },
  remove(
    key: string,
    storage: Storage | undefined = typeof window !== "undefined"
      ? window.localStorage
      : undefined
  ) {
    try {
      if (!storage) return;
      storage.removeItem(key);
    } catch {}
  },
};
