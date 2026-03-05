/**
 * @param {"localStorage" | "sessionStorage"} scope
 * @returns {Storage | null}
 */
function getStorage(scope) {
  try {
    const host = typeof window !== "undefined" ? window : globalThis;
    const storage = host[scope];
    return storage || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} raw
 * @returns {unknown}
 */
function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null} storage
 * @param {string} key
 * @returns {unknown}
 */
function readJson(storage, key) {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  return safeParse(raw);
}

/**
 * @param {Storage | null} storage
 * @param {string} key
 * @param {unknown} value
 */
function writeJson(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/**
 * @param {Storage | null} storage
 * @param {string} key
 * @returns {string | null}
 */
function readString(storage, key) {
  if (!storage) return null;
  const raw = storage.getItem(key);
  return raw === null ? null : raw;
}

/**
 * @param {Storage | null} storage
 * @param {string} key
 * @param {string} value
 */
function writeString(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* noop */
  }
}

/**
 * @param {Storage | null} storage
 * @param {string} key
 */
function removeItem(storage, key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * @param {string} key
 * @returns {unknown}
 */
export function readLocalJson(key) {
  return readJson(getStorage("localStorage"), key);
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function writeLocalJson(key, value) {
  writeJson(getStorage("localStorage"), key, value);
}

/**
 * @param {string} key
 * @returns {string | null}
 */
export function readLocalString(key) {
  return readString(getStorage("localStorage"), key);
}

/**
 * @param {string} key
 * @param {string} value
 */
export function writeLocalString(key, value) {
  writeString(getStorage("localStorage"), key, value);
}

/**
 * @param {string} key
 */
export function removeLocalItem(key) {
  removeItem(getStorage("localStorage"), key);
}

/**
 * @param {string} key
 * @returns {unknown}
 */
export function readSessionJson(key) {
  return readJson(getStorage("sessionStorage"), key);
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function writeSessionJson(key, value) {
  writeJson(getStorage("sessionStorage"), key, value);
}
