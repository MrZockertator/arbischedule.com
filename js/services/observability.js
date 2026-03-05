import { readLocalJson, writeLocalJson } from "./storage.js";

const LOG_KEY = "wf_error_log";
const LOG_VERSION = 1;
const MAX_ENTRIES = 50;

let globalHandlersBound = false;

/**
 * @param {unknown} error
 * @returns {{message: string, stack: string}}
 */
function normalizeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || "",
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    stack: "",
  };
}

/**
 * @returns {string | null}
 */
function getErrorEndpoint() {
  try {
    const config = typeof window !== "undefined" ? window.__ARBISCHEDULE_CONFIG__ : undefined;
    if (!config || typeof config.errorEndpoint !== "string") return null;
    const endpoint = config.errorEndpoint.trim();
    return endpoint || null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
function appendLocalLog(entry) {
  const raw = readLocalJson(LOG_KEY);

  /** @type {Record<string, unknown>[]} */
  let entries = [];
  if (raw && typeof raw === "object") {
    const payload = /** @type {{data?: {entries?: Record<string, unknown>[]}, entries?: Record<string, unknown>[]}} */ (raw);
    if (Array.isArray(payload.data?.entries)) {
      entries = payload.data.entries;
    } else if (Array.isArray(payload.entries)) {
      entries = payload.entries;
    }
  }

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES);
  }

  writeLocalJson(LOG_KEY, {
    v: LOG_VERSION,
    data: { entries },
    updatedAt: Date.now(),
  });
}

/**
 * @param {Record<string, unknown>} entry
 */
function sendRemoteLog(entry) {
  const endpoint = getErrorEndpoint();
  if (!endpoint) return;

  const body = JSON.stringify(entry);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    } catch {
      /* noop */
    }
  }

  if (typeof fetch !== "function") return;
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* noop */
  });
}

/**
 * @param {string} scope
 */
export function createLogger(scope = "app") {
  /**
   * @param {string} level
   * @param {unknown} error
   * @param {Record<string, unknown>} [context]
   */
  function capture(level, error, context = {}) {
    const normalized = normalizeError(error);
    const entry = {
      ts: new Date().toISOString(),
      scope,
      level,
      message: normalized.message,
      stack: normalized.stack,
      context,
    };

    if (level === "error") {
      console.error(`[${scope}] ${normalized.message}`, context, error);
    } else if (level === "warn") {
      console.warn(`[${scope}] ${normalized.message}`, context, error);
    } else {
      console.info(`[${scope}] ${normalized.message}`, context);
    }

    if (level === "error" || level === "warn") {
      appendLocalLog(entry);
      sendRemoteLog(entry);
    }
  }

  return {
    /** @param {string} message @param {Record<string, unknown>} [context] */
    info(message, context = {}) {
      capture("info", message, context);
    },
    /** @param {unknown} error @param {Record<string, unknown>} [context] */
    warn(error, context = {}) {
      capture("warn", error, context);
    },
    /** @param {unknown} error @param {Record<string, unknown>} [context] */
    error(error, context = {}) {
      capture("error", error, context);
    },
  };
}

/**
 * @param {{error: (error: unknown, context?: Record<string, unknown>) => void}} logger
 */
export function initGlobalErrorHandling(logger) {
  if (globalHandlersBound || typeof window === "undefined") return;

  window.addEventListener("error", event => {
    logger.error(event.error || event.message, { phase: "window.error" });
  });

  window.addEventListener("unhandledrejection", event => {
    logger.error(event.reason, { phase: "window.unhandledrejection" });
  });

  globalHandlersBound = true;
}
