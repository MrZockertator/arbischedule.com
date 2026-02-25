import { getAllData } from "./data.js";
import {
  TZ_GROUPS,
  loadTimezone, saveTimezone, clearTimezone, getLocalTimezone,
  getOffset, formatEpoch,
} from "./timezone.js";
import { copyRow, copyDay } from "./clipboard.js";

/* ── State ── */
let allArbs  = [];
let allNodes = [];
let selected = new Set();
let userTz   = loadTimezone();
let daysToShow = 30;
let nodeSearch = "";
let lastUpdatedAt = null;
let nextRefreshAt = null;
let tzFocusIndex  = -1;

const REFRESH_MS = 60 * 60 * 1000;
let countdownTimer = null;
let refreshTimer   = null;

/* Helpers */
function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function factionColor(f) {
  if (!f) return "#4a5a6a";
  const fl = f.toLowerCase();
  if (fl.includes("grineer"))   return "#e05a2b";
  if (fl.includes("corpus"))    return "#4ba3e0";
  if (fl.includes("corrupted")) return "#b06ae0";
  if (fl.includes("infested"))  return "#6abf47";
  if (fl.includes("orokin"))    return "#c8a84b";
  if (fl.includes("murmur"))    return "#e8e8e8";
  return "#4a5a6a";
}

function factionClass(f) {
  if (!f) return "default";
  const fl = f.toLowerCase().trim();
  if (fl === "grineer")       return "Grineer";
  if (fl === "corpus")        return "Corpus";
  if (fl === "infested")      return "Infested";
  if (fl === "corrupted")     return "Corrupted";
  if (fl === "orokin")        return "Orokin";
  if (fl.includes("murmur"))  return "Murmur";
  return "default";
}

/* Persistence */
function loadSelected() {
  try {
    const raw = localStorage.getItem("wf_selected");
    if (raw) selected = new Set(JSON.parse(raw));
  } catch { /* corrupted — start fresh */ }
}

function saveSelected() {
  try {
    localStorage.setItem("wf_selected", JSON.stringify([...selected]));
  } catch { /* noop */ }
  updateNodeCount();
}

/* Data loading */
async function loadData() {
  try {
    const data = await getAllData();
    allNodes = data.nodes;
    allArbs  = data.arbs;

    lastUpdatedAt = Date.now();
    nextRefreshAt = lastUpdatedAt + REFRESH_MS;

    setStatus("ok", "✓ LIVE");
    document.getElementById("refreshInfo").classList.add("visible");

    renderNodeList();
    updateNodeCount();
    renderTable();

    if (!countdownTimer) {
      countdownTimer = setInterval(() => {
        tickCountdowns();
        tickRefreshInfo();
      }, 1000);
    }
    if (!refreshTimer) {
      refreshTimer = setInterval(loadData, REFRESH_MS);
    }
  } catch (err) {
    console.error("Data load failed:", err);
    setStatus("err", "✗ ERROR");
    document.getElementById("tableWrap").innerHTML =
      `<div class="state-box"><span class="icon">⚠</span>${escapeHtml(err.message)}</div>`;
  }
}

function setStatus(type, label) {
  const pill = document.getElementById("statusPill");
  pill.textContent = label;
  pill.className = "status-pill " + type;
}

/* Node sidebar */
function renderNodeList() {
  const list = document.getElementById("nodeList");

  const filtered = nodeSearch
    ? allNodes.filter(n =>
        n.node.toLowerCase().includes(nodeSearch) ||
        n.mission.toLowerCase().includes(nodeSearch) ||
        n.faction.toLowerCase().includes(nodeSearch))
    : allNodes;

  if (!filtered.length) {
    list.innerHTML = '<div class="state-box" style="border:none;padding:30px 10px">No nodes found.</div>';
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const as = selected.has(a.id) ? 0 : 1;
    const bs = selected.has(b.id) ? 0 : 1;
    return as - bs;
  });

  list.innerHTML = sorted.map(n => {
    const active = selected.has(n.id) ? " active" : "";
    const dot = n.faction.toLowerCase().includes("murmur")
      ? "background:#fff"
      : `background:${factionColor(n.faction)}`;

    return `<div class="node-item${active}" data-node-id="${escapeHtml(n.id)}">
      <div class="node-check"></div>
      <div class="node-label">
        <div class="name">${escapeHtml(n.node)}</div>
        <div class="meta">${escapeHtml(n.mission)}</div>
      </div>
      <div class="faction-dot" style="${dot}" title="${escapeHtml(n.faction)}"></div>
    </div>`;
  }).join("");

  list.querySelectorAll(".node-item").forEach(el => {
    el.addEventListener("click", () => toggleNode(el.dataset.nodeId));
  });
}

function toggleNode(id) {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  saveSelected();

  const el = document.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
  if (el) el.classList.toggle("active", selected.has(id));
  renderTable();
}

function selectAll() {
  allNodes.forEach(n => selected.add(n.id));
  saveSelected();
  renderNodeList();
  renderTable();
}

function selectNone() {
  selected.clear();
  saveSelected();
  renderNodeList();
  renderTable();
}

function updateNodeCount() {
  const total  = allNodes.length;
  const active = selected.size > 0
    ? [...selected].filter(id => allNodes.some(n => n.id === id)).length
    : 0;
  document.getElementById("nodeCount").textContent =
    active > 0 ? `${active} / ${total}` : `${total} nodes`;
}

/* Table */
function renderTable() {
  const wrap   = document.getElementById("tableWrap");
  const cutoff = Date.now() + daysToShow * 24 * 60 * 60 * 1000;

  const filtered = allArbs
    .filter(a => a.epochMs <= cutoff)
    .filter(a => selected.size === 0 || selected.has(a.nodeId))
    .filter(a => {
      if (!nodeSearch) return true;
      return a.node.toLowerCase().includes(nodeSearch)
          || a.mission.toLowerCase().includes(nodeSearch)
          || a.faction.toLowerCase().includes(nodeSearch);
    })
    .sort((a, b) => a.epochMs - b.epochMs);

  document.getElementById("resultCount").textContent = `${filtered.length} entries`;

  if (!allArbs.length) return;

  if (!filtered.length) {
    wrap.innerHTML = '<div class="state-box"><span class="icon">◈</span>No results — select nodes on the left.</div>';
    return;
  }

  let html = `<table class="arb-table">
    <thead><tr>
      <th>Time</th><th>Node</th><th>Mission</th><th>Faction</th><th>Starts In</th><th></th>
    </tr></thead><tbody>`;

  let lastDay = "";
  // Group arbis by day
  const dayMap = new Map();

  filtered.forEach(a => {
    const day = formatEpoch(a.epochMs, "date", userTz);
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day).push(a);

    if (day !== lastDay) {
      html += `<tr class="day-divider"><td colspan="6">
        <div class="day-divider-inner">
          <span>${escapeHtml(formatEpoch(a.epochMs, "day", userTz))}</span>
          <button class="copy-day-btn" data-day="${escapeHtml(day)}">copy</button>
        </div>
      </td></tr>`;
      lastDay = day;
    }

    const badge = `badge badge-${factionClass(a.faction)}`;
    html += `<tr class="arb-row" data-epoch="${a.epochMs}">
      <td class="td-time">
        <span class="date">${escapeHtml(day)}</span>
        <span class="time-val">${escapeHtml(formatEpoch(a.epochMs, "time", userTz))}</span>
      </td>
      <td class="td-node">${escapeHtml(a.node)}</td>
      <td>${escapeHtml(a.mission)}</td>
      <td><span class="${badge}">${escapeHtml(a.faction)}</span></td>
      <td class="countdown-cell">
        <span class="countdown" data-epoch="${a.epochMs}"></span>
      </td>
      <td class="copy-cell">
        <button class="copy-row-btn"
          data-epoch="${a.epochMs}"
          data-node="${escapeHtml(a.node)}"
          data-mission="${escapeHtml(a.mission)}"
          data-faction="${escapeHtml(a.faction)}">copy</button>
      </td>
    </tr>`;
  });

  html += "</tbody></table>";
  wrap.innerHTML = html;

  // Animate in
  wrap.classList.remove("fade-in");
  void wrap.offsetWidth;
  wrap.classList.add("fade-in");

  wrap.querySelectorAll(".copy-day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dayArbs = dayMap.get(btn.dataset.day);
      if (dayArbs) copyDay(btn, dayArbs, userTz);
    });
  });

  wrap.querySelectorAll(".copy-row-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const arb = {
        epochMs:  Number(btn.dataset.epoch),
        node:     btn.dataset.node,
        mission:  btn.dataset.mission,
        faction:  btn.dataset.faction,
      };
      copyRow(btn, arb, userTz);
    });
  });

  tickCountdowns();
}

/* Countdown ticker */
function tickCountdowns() {
  const now = Date.now();
  document.querySelectorAll(".countdown[data-epoch]").forEach(el => {
    const diff = Number(el.dataset.epoch) - now;
    if (diff <= 0) {
      el.textContent = "NOW";
      el.style.color = "var(--infested)";
      return;
    }
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    el.textContent = d > 0
      ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
      : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  });
}

function tickRefreshInfo() {
  if (!lastUpdatedAt || !nextRefreshAt) return;
  const now = Date.now();

  const agoMs  = now - lastUpdatedAt;
  const agoMin = Math.floor(agoMs / 60_000);
  const agoSec = Math.floor((agoMs % 60_000) / 1_000);
  document.getElementById("lastUpdated").textContent =
    agoMin > 0 ? `${agoMin}m ago` : `${agoSec}s ago`;

  const nextMs  = Math.max(0, nextRefreshAt - now);
  const nextMin = Math.floor(nextMs / 60_000);
  const nextSec = Math.floor((nextMs % 60_000) / 1_000);
  document.getElementById("nextRefresh").textContent =
    `${nextMin}m ${String(nextSec).padStart(2, "0")}s`;
}

/* Timezone picker */
function updateTzLabel() {
  const offset = getOffset(userTz);
  document.getElementById("tzLabel").textContent =
    userTz.replace(/_/g, " ") + " · " + offset;
}

function buildTzListbox(filter) {
  const lb = document.getElementById("tzListbox");
  lb.innerHTML = "";
  tzFocusIndex = -1;
  const q = (filter || "").toLowerCase();
  let any = false;

  for (const [group, zones] of Object.entries(TZ_GROUPS)) {
    const matched = q
      ? zones.filter(z => z.toLowerCase().replace(/_/g, " ").includes(q))
      : zones;
    if (!matched.length) continue;
    any = true;

    const label = document.createElement("div");
    label.className = "tz-group-label";
    label.textContent = group;
    lb.appendChild(label);

    matched.forEach(tz => {
      const div = document.createElement("div");
      div.className = "tz-option" + (tz === userTz ? " selected" : "");
      div.dataset.tz = tz;
      const city = tz.replace(/_/g, " ").split("/").pop();
      div.innerHTML = `<span>${escapeHtml(city)}</span><span class="tz-offset">${escapeHtml(getOffset(tz))}</span>`;
      div.addEventListener("mousedown", e => { e.preventDefault(); selectTz(tz); });
      lb.appendChild(div);
    });
  }

  if (!any) {
    lb.innerHTML = '<div class="tz-none">No match found</div>';
  }
}

function selectTz(tz) {
  userTz = tz;
  saveTimezone(tz);
  document.getElementById("tzInput").value = tz.replace(/_/g, " ").split("/").pop();
  document.getElementById("tzClear").classList.add("visible");
  closeTzList();
  updateTzLabel();
  renderTable();
}

function clearTzOverride() {
  userTz = getLocalTimezone();
  clearTimezone();
  document.getElementById("tzInput").value = "";
  document.getElementById("tzClear").classList.remove("visible");
  updateTzLabel();
  renderTable();
}

function openTzList() {
  buildTzListbox(document.getElementById("tzInput").value);
  document.getElementById("tzListbox").classList.add("open");
}

function closeTzList() {
  document.getElementById("tzListbox").classList.remove("open");
}

function handleTzKeyNav(e) {
  const items = document.querySelectorAll(".tz-option");
  if (e.key === "ArrowDown") {
    e.preventDefault();
    tzFocusIndex = Math.min(tzFocusIndex + 1, items.length - 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    tzFocusIndex = Math.max(tzFocusIndex - 1, 0);
  } else if (e.key === "Enter" && tzFocusIndex >= 0) {
    e.preventDefault();
    selectTz(items[tzFocusIndex].dataset.tz);
    return;
  } else if (e.key === "Escape") {
    closeTzList();
    return;
  } else {
    return;
  }
  items.forEach((el, i) => el.classList.toggle("focused", i === tzFocusIndex));
  if (items[tzFocusIndex]) items[tzFocusIndex].scrollIntoView({ block: "nearest" });
}

/* Boot */
document.addEventListener("DOMContentLoaded", () => {
  loadSelected();
  updateTzLabel();

  // Node search
  document.getElementById("nodeSearch").addEventListener("input", function () {
    nodeSearch = this.value.toLowerCase();
    renderNodeList();
    renderTable();
  });

  // Days select
  document.getElementById("daysSelect").addEventListener("change", function () {
    daysToShow = Number(this.value);
    renderTable();
  });

  // Sidebar buttons
  document.getElementById("btnAll").addEventListener("click", selectAll);
  document.getElementById("btnNone").addEventListener("click", selectNone);

  // Timezone combo
  const tzInput = document.getElementById("tzInput");
  tzInput.addEventListener("focus", openTzList);
  tzInput.addEventListener("input", () => {
    const val = tzInput.value;
    document.getElementById("tzClear").classList.toggle("visible", val.length > 0);
    buildTzListbox(val);
    document.getElementById("tzListbox").classList.add("open");
  });
  tzInput.addEventListener("keydown", handleTzKeyNav);
  document.getElementById("tzClear").addEventListener("click", clearTzOverride);

  // Close tz dropdown on outside click
  document.addEventListener("mousedown", e => {
    if (!document.getElementById("tzCombo").contains(e.target)) closeTzList();
  });

  // Go
  loadData();
});
