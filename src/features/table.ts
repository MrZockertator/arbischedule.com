import { el, clearNode } from "../shared/dom.js";
import { getFactionBadgeClass } from "../shared/faction.js";
import { formatTableCountdown } from "../shared/countdown.js";
import { formatEpoch } from "../timezone.js";
import { matchesSearch } from "./search.js";
import type { Arbitration, ClipboardArbitration, SearchState } from "../types";

type RenderTableOptions = {
  wrapEl: HTMLElement;
  resultCountEl: HTMLElement;
  allArbs: Arbitration[];
  selected: Set<string>;
  searchState: SearchState;
  userTz: string;
  daysToShow: number;
  copySelection?: Set<string>;
  getCopyKey?: (arb: Pick<Arbitration, "epochMs" | "nodeId">) => string;
  onToggleCopyRow?: (arb: Arbitration, checked: boolean) => void;
  onToggleCopyDay?: (dayArbs: Arbitration[], checked: boolean) => void;
  onCopyDay?: (button: HTMLButtonElement, dayArbs: ClipboardArbitration[]) => void;
  onCopyRow?: (button: HTMLButtonElement, arb: ClipboardArbitration) => void;
};

function renderState(wrapEl: HTMLElement, message: string, icon = ""): void {
  clearNode(wrapEl);
  const children: Array<Node | string> = [];
  if (icon) children.push(el("span", { className: "icon", textContent: icon }));
  children.push(message);
  wrapEl.appendChild(el("div", { className: "state-box" }, children));
}

function filterArbitrations(
  arbs: Arbitration[],
  selected: Set<string>,
  searchState: SearchState,
  cutoffMs: number
): Arbitration[] {
  return arbs
    .filter(arb => arb.epochMs <= cutoffMs)
    .filter(arb => selected.size === 0 || selected.has(arb.nodeId))
    .filter(arb => matchesSearch(searchState, arb.node, arb.mission, arb.faction))
    .sort((a, b) => a.epochMs - b.epochMs);
}

function isNearViewport(element: HTMLElement): boolean {
  if (typeof window === "undefined") return true;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || 0;
  return rect.bottom >= -200 && rect.top <= viewportHeight + 200;
}

function defaultCopyKey(arb: Pick<Arbitration, "epochMs" | "nodeId">): string {
  return `${arb.epochMs}:${arb.nodeId}`;
}

export function renderArbitrationTable(options: RenderTableOptions): Arbitration[] {
  const {
    wrapEl,
    resultCountEl,
    allArbs,
    selected,
    searchState,
    userTz,
    daysToShow,
    copySelection = new Set(),
    getCopyKey = defaultCopyKey,
    onToggleCopyRow = () => {},
    onToggleCopyDay = () => {},
    onCopyDay = () => {},
    onCopyRow = () => {},
  } = options;

  const copySelectedStash = document.getElementById("copySelectedStash");
  const copySelectedBtn = document.getElementById("btnCopySelected");

  if (
    copySelectedBtn instanceof HTMLButtonElement &&
    copySelectedStash instanceof HTMLElement &&
    copySelectedBtn.parentElement !== copySelectedStash
  ) {
    copySelectedStash.appendChild(copySelectedBtn);
  }

  if (!allArbs.length) {
    resultCountEl.textContent = "0 entries";
    return [];
  }

  const cutoff = Date.now() + daysToShow * 24 * 60 * 60 * 1000;
  const filtered = filterArbitrations(allArbs, selected, searchState, cutoff);
  resultCountEl.textContent = `${filtered.length} entries`;

  if (!filtered.length) {
    renderState(wrapEl, "No results — select nodes on the left.", "◈");
    return filtered;
  }

  const dayMap = new Map<string, Arbitration[]>();
  for (const arb of filtered) {
    const day = formatEpoch(arb.epochMs, "date", userTz);
    const existing = dayMap.get(day);
    if (existing) existing.push(arb);
    else dayMap.set(day, [arb]);
  }

  const grid = el("div", { className: "arb-grid" });
  const headerRail = el("div", { className: "arb-cell rail head actions-head" });
  if (copySelectedBtn instanceof HTMLButtonElement) headerRail.appendChild(copySelectedBtn);

  grid.appendChild(
    el("div", { className: "arb-grid-row arb-grid-head" }, [
      el("div", { className: "arb-cell box head box-start", textContent: "Time" }),
      el("div", { className: "arb-cell box head", textContent: "Node" }),
      el("div", { className: "arb-cell box head", textContent: "Mission" }),
      el("div", { className: "arb-cell box head", textContent: "Faction" }),
      el("div", { className: "arb-cell box head box-end", textContent: "Starts In" }),
      headerRail,
    ])
  );

  let lastDay = "";

  for (const arb of filtered) {
    const day = formatEpoch(arb.epochMs, "date", userTz);

    if (day !== lastDay) {
      const dayArbs = dayMap.get(day) ?? [];
      const daySelectedCount = dayArbs.filter(dayArb => copySelection.has(getCopyKey(dayArb))).length;

      const dayCopyCheck = el("input", {
        type: "checkbox",
        className: "copy-day-check",
        "aria-label": `Select all arbitrations on ${formatEpoch(arb.epochMs, "day", userTz)}`,
      });

      dayCopyCheck.checked = dayArbs.length > 0 && daySelectedCount === dayArbs.length;
      dayCopyCheck.indeterminate = daySelectedCount > 0 && daySelectedCount < dayArbs.length;
      dayCopyCheck.addEventListener("change", event => {
        event.stopPropagation();
        onToggleCopyDay(dayArbs, dayCopyCheck.checked);
      });

      const copyDayBtn = el("button", {
        className: "copy-day-btn",
        "data-day": day,
        textContent: "copy",
      });

      copyDayBtn.addEventListener("click", () => {
        onCopyDay(copyDayBtn, dayArbs.map(({ epochMs, node, mission, faction }) => ({ epochMs, node, mission, faction })));
      });

      grid.appendChild(
        el("div", { className: "arb-grid-row day-divider arb-day-row" }, [
          el("div", { className: "arb-cell box day-divider-main day-box day-box-span" }, [
            el("div", { className: "day-divider-inner" }, [
              el("span", { textContent: formatEpoch(arb.epochMs, "day", userTz) }),
              copyDayBtn,
            ]),
          ]),
          el("div", { className: "arb-cell rail day-copy-cell" }, [
            el("div", { className: "day-copy-actions" }, [dayCopyCheck]),
          ]),
        ])
      );

      lastDay = day;
    }

    const copyRowBtn = el("button", { className: "copy-row-btn", textContent: "copy" });
    const copyRowCheck = el("input", {
      type: "checkbox",
      className: "copy-row-check",
      "aria-label": `Select ${arb.node} at ${formatEpoch(arb.epochMs, "time", userTz)}`,
    });

    const isRowSelected = copySelection.has(getCopyKey(arb));
    copyRowCheck.checked = isRowSelected;
    copyRowCheck.addEventListener("change", event => {
      event.stopPropagation();
      onToggleCopyRow(arb, copyRowCheck.checked);
    });

    copyRowBtn.addEventListener("click", event => {
      event.stopPropagation();
      onCopyRow(copyRowBtn, {
        epochMs: arb.epochMs,
        node: arb.node,
        mission: arb.mission,
        faction: arb.faction,
      });
    });

    grid.appendChild(
      el("div", { className: `arb-grid-row arb-row${isRowSelected ? " selected" : ""}`, "data-epoch": String(arb.epochMs) }, [
        el("div", { className: "arb-cell box td-time" }, [
          el("span", { className: "date", textContent: day }),
          el("span", { className: "time-val", textContent: formatEpoch(arb.epochMs, "time", userTz) }),
        ]),
        el("div", { className: "arb-cell box td-node", textContent: arb.node }),
        el("div", { className: "arb-cell box", textContent: arb.mission }),
        el("div", { className: "arb-cell box" }, [
          el("span", {
            className: `badge badge-${getFactionBadgeClass(arb.faction)}`,
            textContent: arb.faction,
          }),
        ]),
        el("div", { className: "arb-cell box countdown-cell" }, [
          el("div", { className: "countdown-actions" }, [
            el("span", { className: "countdown", "data-epoch": String(arb.epochMs) }),
            copyRowBtn,
          ]),
        ]),
        el("div", { className: "arb-cell rail copy-cell" }, [
          el("div", { className: "copy-cell-actions" }, [copyRowCheck]),
        ]),
      ])
    );
  }

  clearNode(wrapEl);
  wrapEl.appendChild(grid);
  wrapEl.classList.remove("fade-in");
  void wrapEl.offsetWidth;
  wrapEl.classList.add("fade-in");

  tickCountdowns(wrapEl);
  return filtered;
}

export function tickCountdowns(root: ParentNode = document): void {
  if (typeof document !== "undefined" && document.hidden) return;

  const nodes = root.querySelectorAll<HTMLElement>(".countdown[data-epoch]");
  const total = nodes.length;
  const now = Date.now();

  nodes.forEach(node => {
    if (total > 250 && !isNearViewport(node)) return;

    const epochMs = Number(node.dataset.epoch);
    const label = formatTableCountdown(epochMs, now);
    node.textContent = label;
    node.style.color = label === "NOW" ? "var(--infested)" : "";
  });
}
