import { getAllData } from "./data.js";
import { TZ_GROUPS, getLocalTimezone } from "./timezone.js";
import { copyRow, copyDay } from "./clipboard.js";
import { el, clearNode, debounce } from "./shared/dom.js";
import { buildSearchState, getSearchFeedback } from "./features/search.js";
import { renderNodeList, updateNodeCountLabel } from "./features/nodes.js";
import { renderArbitrationTable, tickCountdowns } from "./features/table.js";
import { createTimezonePicker } from "./features/timezone-picker.js";
import { createThemeController } from "./features/theme.js";
import {
  loadSelectedNodeIds,
  saveSelectedNodeIds,
  loadSelectionPresets,
  saveSelectionPresets,
  loadTimezonePreference,
  saveTimezonePreference,
  clearTimezonePreference,
} from "./services/preferences.js";
import { createLogger, initGlobalErrorHandling } from "./services/observability.js";

const REFRESH_MS = 60 * 60 * 1000;

const logger = createLogger("app");
initGlobalErrorHandling(logger);

const state = {
  allArbs: [],
  allNodes: [],
  selected: loadSelectedNodeIds(),
  selectionPresets: loadSelectionPresets(),
  userTz: loadTimezonePreference(getLocalTimezone),
  daysToShow: 30,
  searchState: buildSearchState("", []),
  lastUpdatedAt: null,
  nextRefreshAt: null,
};

/** @type {ReturnType<typeof setInterval> | null} */
let countdownTimer = null;
/** @type {ReturnType<typeof setInterval> | null} */
let refreshTimer = null;

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
function getRequiredElement(id) {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing required element: #${id}`);
  }
  return /** @type {T} */ (node);
}

/**
 * @param {string} type
 * @param {string} label
 */
function setStatus(type, label) {
  const pill = getRequiredElement("statusPill");
  pill.textContent = label;
  pill.className = `status-pill ${type}`;
}

/**
 * @param {string} message
 * @param {"" | "ok" | "warn"} [level]
 */
function setPresetStatus(message, level = "") {
  const status = getRequiredElement("presetStatus");
  status.textContent = message;
  status.className = level ? `preset-status ${level}` : "preset-status";
}

/**
 * @param {string} raw
 */
function updateSearchState(raw) {
  state.searchState = buildSearchState(raw, state.allNodes);
  const feedback = getSearchFeedback(state.searchState);

  const searchFeedback = getRequiredElement("searchFeedback");
  searchFeedback.textContent = feedback.message;
  searchFeedback.className = feedback.level ? `search-feedback ${feedback.level}` : "search-feedback";
}

function saveSelectedState() {
  saveSelectedNodeIds(state.selected);
  updateNodeCountLabel(getRequiredElement("nodeCount"), state.allNodes, state.selected);
}

function renderNodeSidebar() {
  renderNodeList(
    getRequiredElement("nodeList"),
    state.allNodes,
    state.selected,
    state.searchState,
    toggleNode
  );

  updateNodeCountLabel(getRequiredElement("nodeCount"), state.allNodes, state.selected);
}

function renderTable() {
  renderArbitrationTable({
    wrapEl: getRequiredElement("tableWrap"),
    resultCountEl: getRequiredElement("resultCount"),
    allArbs: state.allArbs,
    selected: state.selected,
    searchState: state.searchState,
    userTz: state.userTz,
    daysToShow: state.daysToShow,
    onCopyDay: (button, dayArbs) => copyDay(button, dayArbs, state.userTz),
    onCopyRow: (button, arb) => copyRow(button, arb, state.userTz),
  });
}

/**
 * @param {string} id
 */
function toggleNode(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);

  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

function selectAll() {
  state.allNodes.forEach(node => state.selected.add(node.id));
  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

function selectNone() {
  state.selected.clear();
  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

/**
 * @param {string} name
 */
function normalizePresetName(name) {
  return String(name || "").trim().toLowerCase();
}

/**
 * @param {string} [selectedName]
 */
function renderPresetOptions(selectedName = "") {
  const presetSelect = /** @type {HTMLSelectElement} */ (getRequiredElement("presetSelect"));
  const desired = selectedName || presetSelect.value;

  clearNode(presetSelect);
  presetSelect.appendChild(el("option", { value: "", textContent: "Select preset…" }));

  state.selectionPresets.forEach(preset => {
    presetSelect.appendChild(
      el("option", {
        value: preset.name,
        textContent: preset.name,
      })
    );
  });

  if (desired && state.selectionPresets.some(preset => preset.name === desired)) {
    presetSelect.value = desired;
  } else {
    presetSelect.value = "";
  }

  const hasPresets = state.selectionPresets.length > 0;
  /** @type {HTMLButtonElement} */ (getRequiredElement("btnLoadPreset")).disabled = !hasPresets;
  /** @type {HTMLButtonElement} */ (getRequiredElement("btnDeletePreset")).disabled = !hasPresets;
}

function saveCurrentSelectionPreset() {
  const presetSelect = /** @type {HTMLSelectElement} */ (getRequiredElement("presetSelect"));
  const rawName = window.prompt("Preset name", presetSelect.value || "");
  if (rawName === null) return;

  const name = rawName.trim();
  if (!name) {
    setPresetStatus("Preset name cannot be empty.", "warn");
    return;
  }

  const nodeIds = [...state.selected].filter(id => typeof id === "string");
  const existingIndex = state.selectionPresets.findIndex(
    preset => normalizePresetName(preset.name) === normalizePresetName(name)
  );

  if (existingIndex >= 0) {
    const confirmOverwrite = window.confirm(
      `Preset "${state.selectionPresets[existingIndex].name}" already exists. Overwrite it?`
    );
    if (!confirmOverwrite) {
      setPresetStatus("Save cancelled.");
      return;
    }

    state.selectionPresets[existingIndex] = {
      name,
      nodeIds,
      updatedAt: Date.now(),
    };
  } else {
    state.selectionPresets.push({
      name,
      nodeIds,
      updatedAt: Date.now(),
    });
  }

  state.selectionPresets.sort((a, b) => a.name.localeCompare(b.name));
  saveSelectionPresets(state.selectionPresets);
  renderPresetOptions(name);
  setPresetStatus(`Saved preset "${name}" (${nodeIds.length} nodes).`, "ok");
}

function loadSelectedPreset() {
  const presetName = /** @type {HTMLSelectElement} */ (getRequiredElement("presetSelect")).value;
  if (!presetName) {
    setPresetStatus("Select a preset to load.", "warn");
    return;
  }

  const preset = state.selectionPresets.find(item => item.name === presetName);
  if (!preset) {
    setPresetStatus("Preset no longer exists.", "warn");
    renderPresetOptions();
    return;
  }

  const hasNodeCatalog = state.allNodes.length > 0;
  const validIds = hasNodeCatalog
    ? preset.nodeIds.filter(id => state.allNodes.some(node => node.id === id))
    : [...preset.nodeIds];
  const ignored = hasNodeCatalog ? (preset.nodeIds.length - validIds.length) : 0;

  state.selected = new Set(validIds);
  saveSelectedState();
  renderNodeSidebar();
  renderTable();

  if (ignored > 0) {
    setPresetStatus(`Loaded "${preset.name}" (${ignored} old nodes ignored).`, "warn");
  } else {
    setPresetStatus(`Loaded "${preset.name}".`, "ok");
  }
}

function deleteSelectedPreset() {
  const presetName = /** @type {HTMLSelectElement} */ (getRequiredElement("presetSelect")).value;
  if (!presetName) {
    setPresetStatus("Select a preset to delete.", "warn");
    return;
  }

  const preset = state.selectionPresets.find(item => item.name === presetName);
  if (!preset) {
    setPresetStatus("Preset no longer exists.", "warn");
    renderPresetOptions();
    return;
  }

  const confirmDelete = window.confirm(`Delete preset "${preset.name}"?`);
  if (!confirmDelete) return;

  state.selectionPresets = state.selectionPresets.filter(item => item.name !== preset.name);
  saveSelectionPresets(state.selectionPresets);
  renderPresetOptions();
  setPresetStatus(`Deleted "${preset.name}".`, "ok");
}

function tickRefreshInfo() {
  if (!state.lastUpdatedAt || !state.nextRefreshAt) return;

  const now = Date.now();
  const agoMs = now - state.lastUpdatedAt;
  const agoMin = Math.floor(agoMs / 60_000);
  const agoSec = Math.floor((agoMs % 60_000) / 1_000);

  getRequiredElement("lastUpdated").textContent =
    agoMin > 0 ? `${agoMin}m ago` : `${agoSec}s ago`;

  const nextMs = Math.max(0, state.nextRefreshAt - now);
  const nextMin = Math.floor(nextMs / 60_000);
  const nextSec = Math.floor((nextMs % 60_000) / 1_000);

  getRequiredElement("nextRefresh").textContent = `${nextMin}m ${String(nextSec).padStart(2, "0")}s`;
}

function ensureTimers() {
  if (!countdownTimer) {
    countdownTimer = setInterval(() => {
      tickCountdowns(document);
      tickRefreshInfo();
    }, 1000);
  }

  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      loadData().catch(error => {
        logger.error(error, { phase: "refresh" });
      });
    }, REFRESH_MS);
  }
}

async function loadData() {
  try {
    const data = await getAllData();
    state.allNodes = data.nodes;
    state.allArbs = data.arbs;

    const nodeSearchInput = /** @type {HTMLInputElement} */ (getRequiredElement("nodeSearch"));
    updateSearchState(nodeSearchInput.value);

    state.lastUpdatedAt = Date.now();
    state.nextRefreshAt = state.lastUpdatedAt + REFRESH_MS;

    setStatus("ok", "✓ LIVE");
    getRequiredElement("refreshInfo").classList.add("visible");

    renderNodeSidebar();
    renderTable();
    ensureTimers();
  } catch (error) {
    logger.error(error, { phase: "loadData" });
    setStatus("err", "✗ ERROR");

    const wrap = getRequiredElement("tableWrap");
    clearNode(wrap);
    wrap.appendChild(
      el("div", { className: "state-box" }, [
        el("span", { className: "icon", textContent: "⚠" }),
        error instanceof Error ? error.message : "Failed to load data.",
      ])
    );
  }
}

function bindUiEvents() {
  const nodeSearchInput = /** @type {HTMLInputElement} */ (getRequiredElement("nodeSearch"));
  const debouncedSearchUpdate = debounce(value => {
    updateSearchState(value);
    renderNodeSidebar();
    renderTable();
  }, 180);

  nodeSearchInput.addEventListener("input", event => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    debouncedSearchUpdate(target.value);
  });

  const daysSelect = /** @type {HTMLSelectElement} */ (getRequiredElement("daysSelect"));
  daysSelect.addEventListener("change", () => {
    const next = Number(daysSelect.value);
    state.daysToShow = Number.isFinite(next) && next > 0 ? next : 30;
    renderTable();
  });

  getRequiredElement("btnAll").addEventListener("click", selectAll);
  getRequiredElement("btnNone").addEventListener("click", selectNone);
  getRequiredElement("btnSavePreset").addEventListener("click", saveCurrentSelectionPreset);
  getRequiredElement("btnLoadPreset").addEventListener("click", loadSelectedPreset);
  getRequiredElement("btnDeletePreset").addEventListener("click", deleteSelectedPreset);
  getRequiredElement("presetSelect").addEventListener("change", () => setPresetStatus(""));
}

function initTimezonePicker() {
  const picker = createTimezonePicker({
    groups: TZ_GROUPS,
    initialTimezone: state.userTz,
    onTimezoneSelected: timezone => {
      state.userTz = timezone;
      saveTimezonePreference(timezone);
      renderTable();
    },
    onTimezoneCleared: localTimezone => {
      state.userTz = localTimezone;
      clearTimezonePreference();
      renderTable();
    },
  });

  picker.init();
  state.userTz = picker.getTimezone();
}

function initThemeController() {
  const themeController = createThemeController(logger);
  themeController.init();
}

function boot() {
  initThemeController();

  renderPresetOptions();
  updateSearchState(/** @type {HTMLInputElement} */ (getRequiredElement("nodeSearch")).value);
  bindUiEvents();
  initTimezonePicker();

  setStatus("", "⟳ LOADING");

  loadData().catch(error => {
    logger.error(error, { phase: "boot.loadData" });
  });
}

document.addEventListener("DOMContentLoaded", boot);
