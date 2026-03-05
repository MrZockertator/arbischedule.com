import { el, clearNode } from "../shared/dom.js";
import { getFactionBadgeClass } from "../shared/faction.js";
import { formatTableCountdown } from "../shared/countdown.js";
import { formatEpoch } from "../timezone.js";
import { matchesSearch } from "./search.js";

/**
 * @param {HTMLElement} wrapEl
 * @param {string} message
 * @param {string} [icon]
 */
function renderState(wrapEl, message, icon = "") {
  clearNode(wrapEl);
  const children = [];
  if (icon) children.push(el("span", { className: "icon", textContent: icon }));
  children.push(message);
  wrapEl.appendChild(el("div", { className: "state-box" }, children));
}

/**
 * @param {Array<{epochMs: number,nodeId: string,node: string,mission: string,faction: string}>} arbs
 * @param {Set<string>} selected
 * @param {{normalized: string, matchedTokens: string[]}} searchState
 * @param {number} cutoffMs
 */
function filterArbitrations(arbs, selected, searchState, cutoffMs) {
  return arbs
    .filter(arb => arb.epochMs <= cutoffMs)
    .filter(arb => selected.size === 0 || selected.has(arb.nodeId))
    .filter(arb => matchesSearch(searchState, arb.node, arb.mission, arb.faction))
    .sort((a, b) => a.epochMs - b.epochMs);
}

/**
 * @param {HTMLElement} element
 */
function isNearViewport(element) {
  if (typeof window === "undefined" || typeof element.getBoundingClientRect !== "function") {
    return true;
  }

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || 0;
  return rect.bottom >= -200 && rect.top <= viewportHeight + 200;
}

/**
 * @param {{
 *   wrapEl: HTMLElement,
 *   resultCountEl: HTMLElement,
 *   allArbs: Array<{epochMs: number,nodeId: string,node: string,mission: string,faction: string}>,
 *   selected: Set<string>,
 *   searchState: {normalized: string, matchedTokens: string[]},
 *   userTz: string,
 *   daysToShow: number,
 *   onCopyDay: (button: HTMLButtonElement, dayArbs: Array<{epochMs: number,node:string,mission:string,faction:string}>) => void,
 *   onCopyRow: (button: HTMLButtonElement, arb: {epochMs: number,node:string,mission:string,faction:string}) => void,
 * }} options
 */
export function renderArbitrationTable(options) {
  const {
    wrapEl,
    resultCountEl,
    allArbs,
    selected,
    searchState,
    userTz,
    daysToShow,
    onCopyDay,
    onCopyRow,
  } = options;

  if (!allArbs.length) {
    resultCountEl.textContent = "0 entries";
    return;
  }

  const cutoff = Date.now() + daysToShow * 24 * 60 * 60 * 1000;
  const filtered = filterArbitrations(allArbs, selected, searchState, cutoff);
  resultCountEl.textContent = `${filtered.length} entries`;

  if (!filtered.length) {
    renderState(wrapEl, "No results — select nodes on the left.", "◈");
    return;
  }

  /** @type {Map<string, Array<{epochMs:number,node:string,mission:string,faction:string}>>} */
  const dayMap = new Map();

  for (const arb of filtered) {
    const day = formatEpoch(arb.epochMs, "date", userTz);
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)?.push(arb);
  }

  const thead = el("thead", {}, [
    el("tr", {}, [
      el("th", { textContent: "Time" }),
      el("th", { textContent: "Node" }),
      el("th", { textContent: "Mission" }),
      el("th", { textContent: "Faction" }),
      el("th", { textContent: "Starts In" }),
      el("th"),
    ]),
  ]);

  const tbody = el("tbody");
  let lastDay = "";

  for (const arb of filtered) {
    const day = formatEpoch(arb.epochMs, "date", userTz);

    if (day !== lastDay) {
      const copyDayBtn = /** @type {HTMLButtonElement} */ (
        el("button", {
          className: "copy-day-btn",
          "data-day": day,
          textContent: "copy",
        })
      );

      copyDayBtn.addEventListener("click", () => {
        const dayArbs = dayMap.get(day);
        if (dayArbs) onCopyDay(copyDayBtn, dayArbs);
      });

      tbody.appendChild(
        el("tr", { className: "day-divider" }, [
          el("td", { colSpan: 6 }, [
            el("div", { className: "day-divider-inner" }, [
              el("span", { textContent: formatEpoch(arb.epochMs, "day", userTz) }),
              copyDayBtn,
            ]),
          ]),
        ])
      );

      lastDay = day;
    }

    const copyRowBtn = /** @type {HTMLButtonElement} */ (
      el("button", { className: "copy-row-btn", textContent: "copy" })
    );

    copyRowBtn.addEventListener("click", event => {
      event.stopPropagation();
      onCopyRow(copyRowBtn, {
        epochMs: arb.epochMs,
        node: arb.node,
        mission: arb.mission,
        faction: arb.faction,
      });
    });

    tbody.appendChild(
      el("tr", { className: "arb-row", "data-epoch": String(arb.epochMs) }, [
        el("td", { className: "td-time" }, [
          el("span", { className: "date", textContent: day }),
          el("span", {
            className: "time-val",
            textContent: formatEpoch(arb.epochMs, "time", userTz),
          }),
        ]),
        el("td", { className: "td-node", textContent: arb.node }),
        el("td", { textContent: arb.mission }),
        el("td", {}, [
          el("span", {
            className: `badge badge-${getFactionBadgeClass(arb.faction)}`,
            textContent: arb.faction,
          }),
        ]),
        el("td", { className: "countdown-cell" }, [
          el("span", {
            className: "countdown",
            "data-epoch": String(arb.epochMs),
          }),
        ]),
        el("td", { className: "copy-cell" }, [copyRowBtn]),
      ])
    );
  }

  const table = el("table", { className: "arb-table" }, [thead, tbody]);
  clearNode(wrapEl);
  wrapEl.appendChild(table);

  wrapEl.classList.remove("fade-in");
  void wrapEl.offsetWidth;
  wrapEl.classList.add("fade-in");

  tickCountdowns(wrapEl);
}

/**
 * @param {ParentNode} [root]
 */
export function tickCountdowns(root = document) {
  if (typeof document !== "undefined" && document.hidden) return;

  const nodes = root.querySelectorAll(".countdown[data-epoch]");
  const total = nodes.length;
  const now = Date.now();

  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    if (total > 250 && !isNearViewport(node)) return;

    const epochMs = Number(node.dataset.epoch);
    const label = formatTableCountdown(epochMs, now);
    node.textContent = label;

    if (label === "NOW") {
      node.style.color = "var(--infested)";
    } else {
      node.style.color = "";
    }
  });
}
