import {
  readLocalJson,
  writeLocalJson,
  readLocalString,
  writeLocalString,
  removeLocalItem,
} from "./storage.js";
import type { SelectionPreset as PresetEntry, ThemeState as ThemePreference } from "../types";

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
function toSafeString(value: unknown, maxLen = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}
function toUniqueStringList(values: unknown[]): string[] {
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
function sanitizePresetEntry(entry: unknown): PresetEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as { name?: unknown; nodeIds?: unknown; updatedAt?: unknown };

  const name = toSafeString(raw.name, 64);
  if (!name) return null;

  const nodeIds = Array.isArray(raw.nodeIds) ? toUniqueStringList(raw.nodeIds) : [];
  const updatedAt = Number(raw.updatedAt) || Date.now();

  return { name, nodeIds, updatedAt };
}
export function loadSelectedNodeIds() {
  const raw = readLocalJson(STORAGE_KEYS.selectedNodes);
  let nodeIds: unknown[] = [];

  if (Array.isArray(raw)) {
    nodeIds = raw;
  } else if (raw && typeof raw === "object") {
    const payload = raw as { data?: { nodeIds?: unknown[] }; nodeIds?: unknown[] };
    if (Array.isArray(payload.data?.nodeIds)) {
      nodeIds = payload.data.nodeIds;
    } else if (Array.isArray(payload.nodeIds)) {
      nodeIds = payload.nodeIds;
    }
  }

  return new Set(toUniqueStringList(nodeIds));
}
export function saveSelectedNodeIds(selectedIds: Set<string>): void {
  const nodeIds = toUniqueStringList([...selectedIds]);
  writeLocalJson(STORAGE_KEYS.selectedNodes, {
    v: STORAGE_VERSIONS.selectedNodes,
    data: { nodeIds },
    updatedAt: Date.now(),
  });
}
export function loadSelectionPresets() {
  const raw = readLocalJson(STORAGE_KEYS.selectionPresets);
  let entries: unknown[] = [];

  if (Array.isArray(raw)) {
    entries = raw;
  } else if (raw && typeof raw === "object") {
    const payload = raw as { data?: { presets?: unknown[] }; presets?: unknown[] };
    if (Array.isArray(payload.data?.presets)) {
      entries = payload.data.presets;
    } else if (Array.isArray(payload.presets)) {
      entries = payload.presets;
    }
  }

  return entries
    .map(sanitizePresetEntry)
    .filter((entry): entry is PresetEntry => Boolean(entry))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function saveSelectionPresets(presets: PresetEntry[]): void {
  const cleaned = presets
    .map(sanitizePresetEntry)
    .filter((entry): entry is PresetEntry => Boolean(entry))
    .sort((a, b) => a.name.localeCompare(b.name));

  writeLocalJson(STORAGE_KEYS.selectionPresets, {
    v: STORAGE_VERSIONS.selectionPresets,
    data: { presets: cleaned },
    updatedAt: Date.now(),
  });
}
export function loadThemePreference(): ThemePreference | null {
  const raw = readLocalJson(STORAGE_KEYS.theme);
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as { data?: { preset?: unknown; vars?: unknown }; preset?: unknown; vars?: unknown };

  if (payload.data && typeof payload.data === "object") {
    const preset = toSafeString(payload.data.preset, 40) || "Custom";
      const vars = payload.data.vars && typeof payload.data.vars === "object"
      ? (payload.data.vars as Record<string, string>)
      : {};
    return { preset, vars };
  }

  if (payload.vars && typeof payload.vars === "object") {
    const preset = toSafeString(payload.preset, 40) || "Custom";
    return { preset, vars: payload.vars as Record<string, string> };
  }

  return {
    preset: "Custom",
    vars: raw as Record<string, string>,
  };
}
export function saveThemePreference(theme: ThemePreference): void {
  writeLocalJson(STORAGE_KEYS.theme, {
    v: STORAGE_VERSIONS.theme,
    data: {
      preset: toSafeString(theme?.preset, 40) || "Custom",
      vars: theme?.vars && typeof theme.vars === "object" ? theme.vars : {},
    },
    updatedAt: Date.now(),
  });
}
export function loadTimezonePreference(getLocalTimezone: () => string): string {
  const stored = readLocalString(STORAGE_KEYS.timezone);
  if (!stored || !stored.trim()) return getLocalTimezone();
  return stored.trim();
}
export function saveTimezonePreference(timezone: string): void {
  const safe = toSafeString(timezone, 80);
  if (!safe) return;
  writeLocalString(STORAGE_KEYS.timezone, safe);
}

export function clearTimezonePreference() {
  removeLocalItem(STORAGE_KEYS.timezone);
}
