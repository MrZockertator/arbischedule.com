import {
  readLocalJson,
  writeLocalJson,
  readLocalString,
  writeLocalString,
  removeLocalItem,
} from "./storage.js";

const STORAGE_KEYS = Object.freeze({
  selectedNodes: "wf_selected",
  selectionPresets: "wf_selection_presets",
  theme: "wf_theme",
  timezone: "wf_tz",
});

const STORAGE_VERSIONS = Object.freeze({
  selectedNodes: 2,
  selectionPresets: 2,
  theme: 2,
});

/**
 * @param {unknown} value
 * @param {number} [maxLen]
 * @returns {string}
 */
function toSafeString(value, maxLen = 120) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

/**
 * @param {unknown[]} values
 * @returns {string[]}
 */
function toUniqueStringList(values) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const safe = toSafeString(value);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }

  return out;
}

/**
 * @param {unknown} entry
 * @returns {{name: string, nodeIds: string[], updatedAt: number} | null}
 */
function sanitizePresetEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const raw = /** @type {{name?: unknown, nodeIds?: unknown, updatedAt?: unknown}} */ (entry);

  const name = toSafeString(raw.name, 64);
  if (!name) return null;

  const nodeIds = Array.isArray(raw.nodeIds) ? toUniqueStringList(raw.nodeIds) : [];
  const updatedAt = Number(raw.updatedAt) || Date.now();

  return { name, nodeIds, updatedAt };
}

/**
 * @returns {Set<string>}
 */
export function loadSelectedNodeIds() {
  const raw = readLocalJson(STORAGE_KEYS.selectedNodes);
  /** @type {unknown[]} */
  let nodeIds = [];

  if (Array.isArray(raw)) {
    nodeIds = raw;
  } else if (raw && typeof raw === "object") {
    const payload = /** @type {{data?: {nodeIds?: unknown[]}, nodeIds?: unknown[]}} */ (raw);
    if (Array.isArray(payload.data?.nodeIds)) {
      nodeIds = payload.data.nodeIds;
    } else if (Array.isArray(payload.nodeIds)) {
      nodeIds = payload.nodeIds;
    }
  }

  return new Set(toUniqueStringList(nodeIds));
}

/**
 * @param {Set<string>} selectedIds
 */
export function saveSelectedNodeIds(selectedIds) {
  const nodeIds = toUniqueStringList([...selectedIds]);
  writeLocalJson(STORAGE_KEYS.selectedNodes, {
    v: STORAGE_VERSIONS.selectedNodes,
    data: { nodeIds },
    updatedAt: Date.now(),
  });
}

/**
 * @returns {{name: string, nodeIds: string[], updatedAt: number}[]}
 */
export function loadSelectionPresets() {
  const raw = readLocalJson(STORAGE_KEYS.selectionPresets);
  /** @type {unknown[]} */
  let entries = [];

  if (Array.isArray(raw)) {
    entries = raw;
  } else if (raw && typeof raw === "object") {
    const payload = /** @type {{data?: {presets?: unknown[]}, presets?: unknown[]}} */ (raw);
    if (Array.isArray(payload.data?.presets)) {
      entries = payload.data.presets;
    } else if (Array.isArray(payload.presets)) {
      entries = payload.presets;
    }
  }

  return entries
    .map(sanitizePresetEntry)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {{name: string, nodeIds: string[], updatedAt: number}[]} presets
 */
export function saveSelectionPresets(presets) {
  const cleaned = presets
    .map(sanitizePresetEntry)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  writeLocalJson(STORAGE_KEYS.selectionPresets, {
    v: STORAGE_VERSIONS.selectionPresets,
    data: { presets: cleaned },
    updatedAt: Date.now(),
  });
}

/**
 * @returns {{preset: string, vars: Record<string, string>} | null}
 */
export function loadThemePreference() {
  const raw = readLocalJson(STORAGE_KEYS.theme);
  if (!raw || typeof raw !== "object") return null;

  const payload = /** @type {{data?: {preset?: unknown, vars?: unknown}, preset?: unknown, vars?: unknown}} */ (raw);

  if (payload.data && typeof payload.data === "object") {
    const preset = toSafeString(payload.data.preset, 40) || "Custom";
    const vars = payload.data.vars && typeof payload.data.vars === "object"
      ? /** @type {Record<string, string>} */ (payload.data.vars)
      : {};
    return { preset, vars };
  }

  if (payload.vars && typeof payload.vars === "object") {
    const preset = toSafeString(payload.preset, 40) || "Custom";
    return { preset, vars: /** @type {Record<string, string>} */ (payload.vars) };
  }

  return {
    preset: "Custom",
    vars: /** @type {Record<string, string>} */ (raw),
  };
}

/**
 * @param {{preset: string, vars: Record<string, string>}} theme
 */
export function saveThemePreference(theme) {
  writeLocalJson(STORAGE_KEYS.theme, {
    v: STORAGE_VERSIONS.theme,
    data: {
      preset: toSafeString(theme?.preset, 40) || "Custom",
      vars: theme?.vars && typeof theme.vars === "object" ? theme.vars : {},
    },
    updatedAt: Date.now(),
  });
}

/**
 * @param {() => string} getLocalTimezone
 * @returns {string}
 */
export function loadTimezonePreference(getLocalTimezone) {
  const stored = readLocalString(STORAGE_KEYS.timezone);
  if (!stored || !stored.trim()) return getLocalTimezone();
  return stored.trim();
}

/**
 * @param {string} timezone
 */
export function saveTimezonePreference(timezone) {
  const safe = toSafeString(timezone, 80);
  if (!safe) return;
  writeLocalString(STORAGE_KEYS.timezone, safe);
}

export function clearTimezonePreference() {
  removeLocalItem(STORAGE_KEYS.timezone);
}
