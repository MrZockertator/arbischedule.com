import { readLocalJson, writeLocalJson } from "./storage.js";

const LOG_KEY = "wf_error_log";
const LOG_VERSION = 1;
const MAX_ENTRIES = 50;

let globalHandlersBound = false;
function normalizeError(error: unknown): { message: string; stack: string } {
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
function getErrorEndpoint(): string | null {
  try {
    const config = typeof window !== "undefined" ? window.__ARBISCHEDULE_CONFIG__ : undefined;
    if (!config || typeof config.errorEndpoint !== "string") return null;
    const endpoint = config.errorEndpoint.trim();
    return endpoint || null;
  } catch {
    return null;
  }
}
function appendLocalLog(entry: Record<string, unknown>): void {
  const raw = readLocalJson(LOG_KEY);

  let entries: Record<string, unknown>[] = [];
  if (raw && typeof raw === "object") {
    const payload = raw as { data?: { entries?: Record<string, unknown>[] }; entries?: Record<string, unknown>[] };
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
function sendRemoteLog(entry: Record<string, unknown>): void {
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
export function createLogger(scope = "app") {
  function capture(level: string, error: unknown, context: Record<string, unknown> = {}) {
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
    info(message: string, context: Record<string, unknown> = {}) {
      capture("info", message, context);
    },
    warn(error: unknown, context: Record<string, unknown> = {}) {
      capture("warn", error, context);
    },
    error(error: unknown, context: Record<string, unknown> = {}) {
      capture("error", error, context);
    },
  };
}
export function initGlobalErrorHandling(logger: { error: (error: unknown, context?: Record<string, unknown>) => void }): void {
  if (globalHandlersBound || typeof window === "undefined") return;

  window.addEventListener("error", event => {
    logger.error(event.error || event.message, { phase: "window.error" });
  });

  window.addEventListener("unhandledrejection", event => {
    logger.error(event.reason, { phase: "window.unhandledrejection" });
  });

  globalHandlersBound = true;
}
