function getStorage(scope: "localStorage" | "sessionStorage"): Storage | null {
  try {
    const host = typeof window !== "undefined" ? window : (globalThis as typeof window);
    const storage = host[scope];
    return storage || null;
  } catch {
    return null;
  }
}
function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function readJson(storage: Storage | null, key: string): unknown {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  return safeParse(raw);
}
function writeJson(storage: Storage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}
function readString(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  const raw = storage.getItem(key);
  return raw === null ? null : raw;
}
function writeString(storage: Storage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* noop */
  }
}
function removeItem(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* noop */
  }
}
export function readLocalJson(key: string): unknown {
  return readJson(getStorage("localStorage"), key);
}
export function writeLocalJson(key: string, value: unknown): void {
  writeJson(getStorage("localStorage"), key, value);
}
export function readLocalString(key: string): string | null {
  return readString(getStorage("localStorage"), key);
}
export function writeLocalString(key: string, value: string): void {
  writeString(getStorage("localStorage"), key, value);
}
export function removeLocalItem(key: string): void {
  removeItem(getStorage("localStorage"), key);
}
export function readSessionJson(key: string): unknown {
  return readJson(getStorage("sessionStorage"), key);
}
export function writeSessionJson(key: string, value: unknown): void {
  writeJson(getStorage("sessionStorage"), key, value);
}
