export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export const createStorageAdapter = (): StorageAdapter => ({
  get: <T>(key: string, fallback: T): T => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '') as T;
    } catch {
      return fallback;
    }
  },
  set: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
});
