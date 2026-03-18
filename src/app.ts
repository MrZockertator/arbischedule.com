import { getAllData } from "./data";
import { TZ_GROUPS, getLocalTimezone } from "./timezone.js";
import { copyRow, copyDay, copySelected } from "./clipboard.js";
import { el, clearNode, debounce, getRequiredElement } from "./shared/dom.js";
import { buildSearchState, getSearchFeedback } from "./features/search.js";
import { renderNodeList, updateNodeCountLabel } from "./features/nodes.js";
import { renderArbitrationTable, tickCountdowns } from "./features/table";
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
import type { Arbitration, ClipboardArbitration, NodeItem, SearchState, SelectionPreset } from "./types";

const REFRESH_MS = 60 * 60 * 1000;

type AppState = {
  allArbs: Arbitration[];
  allNodes: NodeItem[];
  visibleArbs: Arbitration[];
  copySelectedKeys: Set<string>;
  selected: Set<string>;
  selectionPresets: SelectionPreset[];
  userTz: string;
  daysToShow: number;
  searchState: SearchState;
  lastUpdatedAt: number | null;
  nextRefreshAt: number | null;
};

const logger = createLogger("app");
initGlobalErrorHandling(logger);

const state: AppState = {
  allArbs: [],
  allNodes: [],
  visibleArbs: [],
  copySelectedKeys: new Set(),
  selected: loadSelectedNodeIds(),
  selectionPresets: loadSelectionPresets(),
  userTz: loadTimezonePreference(getLocalTimezone),
  daysToShow: 30,
  searchState: buildSearchState("", []),
  lastUpdatedAt: null,
  nextRefreshAt: null,
};

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function setStatus(type: string, label: string): void {
  const pill = getRequiredElement<HTMLElement>("statusPill");
  pill.textContent = label;
  pill.className = `status-pill ${type}`;
}

function setPresetStatus(message: string, level: "" | "ok" | "warn" = ""): void {
  const status = getRequiredElement<HTMLElement>("presetStatus");
  status.textContent = message;
  status.className = level ? `preset-status ${level}` : "preset-status";
}

function updateSearchState(raw: string): void {
  state.searchState = buildSearchState(raw, state.allNodes);
  const feedback = getSearchFeedback(state.searchState);

  const searchFeedback = getRequiredElement<HTMLElement>("searchFeedback");
  searchFeedback.textContent = feedback.message;
  searchFeedback.className = feedback.level ? `search-feedback ${feedback.level}` : "search-feedback";
}

function getCopySelectionKey(arb: Pick<Arbitration, "epochMs" | "nodeId">): string {
  return `${arb.epochMs}:${arb.nodeId}`;
}

function getSelectedVisibleArbs(): Arbitration[] {
  return state.visibleArbs.filter(arb => state.copySelectedKeys.has(getCopySelectionKey(arb)));
}

function updateCopySelectedButton(): void {
  const btn = getRequiredElement<HTMLButtonElement>("btnCopySelected");
  const selectedCount = getSelectedVisibleArbs().length;
  btn.textContent = `Copy selected (${selectedCount})`;
  btn.disabled = selectedCount === 0;
}

function saveSelectedState(): void {
  saveSelectedNodeIds(state.selected);
  updateNodeCountLabel(getRequiredElement<HTMLElement>("nodeCount"), state.allNodes, state.selected);
}

function renderNodeSidebar(): void {
  renderNodeList(
    getRequiredElement<HTMLElement>("nodeList"),
    state.allNodes,
    state.selected,
    state.searchState,
    toggleNode
  );

  updateNodeCountLabel(getRequiredElement<HTMLElement>("nodeCount"), state.allNodes, state.selected);
}

function renderTable(): void {
  const visibleArbs = renderArbitrationTable({
    wrapEl: getRequiredElement<HTMLElement>("tableWrap"),
    resultCountEl: getRequiredElement<HTMLElement>("resultCount"),
    allArbs: state.allArbs,
    selected: state.selected,
    searchState: state.searchState,
    userTz: state.userTz,
    daysToShow: state.daysToShow,
    copySelection: state.copySelectedKeys,
    getCopyKey: getCopySelectionKey,
    onToggleCopyRow: (arb, checked) => {
      const key = getCopySelectionKey(arb);
      if (checked) state.copySelectedKeys.add(key);
      else state.copySelectedKeys.delete(key);
      renderTable();
    },
    onToggleCopyDay: (dayArbs, checked) => {
      dayArbs.forEach(arb => {
        const key = getCopySelectionKey(arb);
        if (checked) state.copySelectedKeys.add(key);
        else state.copySelectedKeys.delete(key);
      });
      renderTable();
    },
    onCopyDay: (button: HTMLButtonElement, dayArbs: ClipboardArbitration[]) => {
      void copyDay(button, dayArbs, state.userTz);
    },
    onCopyRow: (button: HTMLButtonElement, arb: ClipboardArbitration) => {
      void copyRow(button, arb, state.userTz);
    },
  });

  state.visibleArbs = visibleArbs;
  const visibleKeys = new Set(visibleArbs.map(getCopySelectionKey));
  state.copySelectedKeys = new Set([...state.copySelectedKeys].filter(copyKey => visibleKeys.has(copyKey)));
  updateCopySelectedButton();
}

async function copySelectedRows(): Promise<void> {
  const btn = getRequiredElement<HTMLButtonElement>("btnCopySelected");
  const selectedArbs = getSelectedVisibleArbs().map(({ epochMs, node, mission, faction }) => ({
    epochMs,
    node,
    mission,
    faction,
  }));

  if (!selectedArbs.length) return;

  const copied = await copySelected(btn, selectedArbs, state.userTz);
  if (!copied) return;

  state.copySelectedKeys.clear();
  renderTable();
}

function toggleNode(id: string): void {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);

  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

function selectAll(): void {
  state.allNodes.forEach(node => state.selected.add(node.id));
  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

function selectNone(): void {
  state.selected.clear();
  saveSelectedState();
  renderNodeSidebar();
  renderTable();
}

function normalizePresetName(name: string): string {
  return String(name || "").trim().toLowerCase();
}

function renderPresetOptions(selectedName = ""): void {
  const presetSelect = getRequiredElement<HTMLSelectElement>("presetSelect");
  const desired = selectedName || presetSelect.value;

  clearNode(presetSelect);
  presetSelect.appendChild(el("option", { value: "", textContent: "Select preset…" }));

  state.selectionPresets.forEach(preset => {
    presetSelect.appendChild(el("option", { value: preset.name, textContent: preset.name }));
  });

  presetSelect.value = desired && state.selectionPresets.some(preset => preset.name === desired) ? desired : "";

  const hasPresets = state.selectionPresets.length > 0;
  getRequiredElement<HTMLButtonElement>("btnLoadPreset").disabled = !hasPresets;
  getRequiredElement<HTMLButtonElement>("btnDeletePreset").disabled = !hasPresets;
}

function saveCurrentSelectionPreset(): void {
  const presetSelect = getRequiredElement<HTMLSelectElement>("presetSelect");
  const rawName = window.prompt("Preset name", presetSelect.value || "");
  if (rawName === null) return;

  const name = rawName.trim();
  if (!name) {
    setPresetStatus("Preset name cannot be empty.", "warn");
    return;
  }

  const nodeIds = [...state.selected];
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

    state.selectionPresets[existingIndex] = { name, nodeIds, updatedAt: Date.now() };
  } else {
    state.selectionPresets.push({ name, nodeIds, updatedAt: Date.now() });
  }

  state.selectionPresets.sort((a, b) => a.name.localeCompare(b.name));
  saveSelectionPresets(state.selectionPresets);
  renderPresetOptions(name);
  setPresetStatus(`Saved preset "${name}" (${nodeIds.length} nodes).`, "ok");
}

function loadSelectedPreset(): void {
  const presetName = getRequiredElement<HTMLSelectElement>("presetSelect").value;
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
  const ignored = hasNodeCatalog ? preset.nodeIds.length - validIds.length : 0;

  state.selected = new Set(validIds);
  saveSelectedState();
  renderNodeSidebar();
  renderTable();

  setPresetStatus(
    ignored > 0 ? `Loaded "${preset.name}" (${ignored} old nodes ignored).` : `Loaded "${preset.name}".`,
    ignored > 0 ? "warn" : "ok"
  );
}

function deleteSelectedPreset(): void {
  const presetName = getRequiredElement<HTMLSelectElement>("presetSelect").value;
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

  if (!window.confirm(`Delete preset "${preset.name}"?`)) return;

  state.selectionPresets = state.selectionPresets.filter(item => item.name !== preset.name);
  saveSelectionPresets(state.selectionPresets);
  renderPresetOptions();
  setPresetStatus(`Deleted "${preset.name}".`, "ok");
}

function tickRefreshInfo(): void {
  if (!state.lastUpdatedAt || !state.nextRefreshAt) return;

  const now = Date.now();
  const agoMs = now - state.lastUpdatedAt;
  const agoMin = Math.floor(agoMs / 60_000);
  const agoSec = Math.floor((agoMs % 60_000) / 1_000);
  getRequiredElement<HTMLElement>("lastUpdated").textContent = agoMin > 0 ? `${agoMin}m ago` : `${agoSec}s ago`;

  const nextMs = Math.max(0, state.nextRefreshAt - now);
  const nextMin = Math.floor(nextMs / 60_000);
  const nextSec = Math.floor((nextMs % 60_000) / 1_000);
  getRequiredElement<HTMLElement>("nextRefresh").textContent = `${nextMin}m ${String(nextSec).padStart(2, "0")}s`;
}

function ensureTimers(): void {
  if (!countdownTimer) {
    countdownTimer = setInterval(() => {
      tickCountdowns(document);
      tickRefreshInfo();
    }, 1000);
  }

  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      void loadData().catch(error => {
        logger.error(error, { phase: "refresh" });
      });
    }, REFRESH_MS);
  }
}

async function loadData(): Promise<void> {
  try {
    const data = await getAllData();
    state.allNodes = data.nodes;
    state.allArbs = data.arbs;

    updateSearchState(getRequiredElement<HTMLInputElement>("nodeSearch").value);
    state.lastUpdatedAt = Date.now();
    state.nextRefreshAt = state.lastUpdatedAt + REFRESH_MS;

    setStatus("ok", "✓ LIVE");
    getRequiredElement<HTMLElement>("refreshInfo").classList.add("visible");

    renderNodeSidebar();
    renderTable();
    ensureTimers();
  } catch (error) {
    logger.error(error, { phase: "loadData" });
    setStatus("err", "✗ ERROR");

    const wrap = getRequiredElement<HTMLElement>("tableWrap");
    clearNode(wrap);
    wrap.appendChild(
      el("div", { className: "state-box" }, [
        el("span", { className: "icon", textContent: "⚠" }),
        error instanceof Error ? error.message : "Failed to load data.",
      ])
    );
  }
}

function bindUiEvents(): void {
  const nodeSearchInput = getRequiredElement<HTMLInputElement>("nodeSearch");
  const debouncedSearchUpdate = debounce<string>(value => {
    updateSearchState(value);
    renderNodeSidebar();
    renderTable();
  }, 180);

  nodeSearchInput.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    debouncedSearchUpdate(target.value);
  });

  const daysSelect = getRequiredElement<HTMLSelectElement>("daysSelect");
  daysSelect.addEventListener("change", () => {
    const next = Number(daysSelect.value);
    state.daysToShow = Number.isFinite(next) && next > 0 ? next : 30;
    renderTable();
  });

  getRequiredElement<HTMLButtonElement>("btnAll").addEventListener("click", selectAll);
  getRequiredElement<HTMLButtonElement>("btnNone").addEventListener("click", selectNone);
  getRequiredElement<HTMLButtonElement>("btnSavePreset").addEventListener("click", saveCurrentSelectionPreset);
  getRequiredElement<HTMLButtonElement>("btnLoadPreset").addEventListener("click", loadSelectedPreset);
  getRequiredElement<HTMLButtonElement>("btnDeletePreset").addEventListener("click", deleteSelectedPreset);
  getRequiredElement<HTMLButtonElement>("btnCopySelected").addEventListener("click", () => {
    void copySelectedRows().catch(error => {
      logger.error(error, { phase: "copySelectedRows" });
    });
  });
  getRequiredElement<HTMLSelectElement>("presetSelect").addEventListener("change", () => setPresetStatus(""));
}

function initTimezonePicker(): void {
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

function initThemeController(): void {
  createThemeController(logger).init();
}

function initDebugGrid(): void {
  const key = "arb.debugGrid";

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debugGrid")) {
      localStorage.setItem(key, params.get("debugGrid") === "1" ? "1" : "0");
    }

    const enabled = localStorage.getItem(key) === "1";
    document.body.classList.toggle("debug-grid", enabled);
  } catch (error) {
    logger.warn("debug grid toggle unavailable", { error });
  }
}

function boot(): void {
  try {
    initDebugGrid();
    initThemeController();
    renderPresetOptions();
    updateSearchState(getRequiredElement<HTMLInputElement>("nodeSearch").value);
    bindUiEvents();
    initTimezonePicker();
    setStatus("", "⟳ LOADING");

    void loadData().catch(error => {
      logger.error(error, { phase: "boot.loadData" });
    });
  } catch (error) {
    logger.error(error, { phase: "boot" });

    const statusPill = document.getElementById("statusPill");
    if (statusPill) {
      statusPill.textContent = "✗ ERROR";
      statusPill.className = "status-pill err";
    }

    const wrap = document.getElementById("tableWrap");
    if (wrap instanceof HTMLElement) {
      clearNode(wrap);
      wrap.appendChild(
        el("div", { className: "state-box" }, [
          el("span", { className: "icon", textContent: "⚠" }),
          error instanceof Error ? error.message : "Failed to initialize app.",
        ])
      );
    }
  }
}

export { boot };
