import { el, clearNode } from "../shared/dom.js";
import { getFactionColor } from "../shared/faction.js";
import { matchesSearch } from "./search.js";

/**
 * @param {{node: string, mission: string, faction: string, id: string}[]} allNodes
 * @param {{normalized: string, matchedTokens: string[]}} searchState
 */
function filterNodes(allNodes, searchState) {
  if (!searchState?.normalized) return allNodes;
  return allNodes.filter(node =>
    matchesSearch(searchState, node.node, node.mission, node.faction)
  );
}

/**
 * @param {HTMLElement} listEl
 * @param {{node: string, mission: string, faction: string, id: string}[]} allNodes
 * @param {Set<string>} selected
 * @param {{normalized: string, matchedTokens: string[]}} searchState
 * @param {(id: string) => void} onToggle
 */
export function renderNodeList(listEl, allNodes, selected, searchState, onToggle) {
  const filtered = filterNodes(allNodes, searchState);

  clearNode(listEl);

  if (!filtered.length) {
    listEl.appendChild(
      el("div", {
        className: "state-box",
        style: "border:none;padding:30px 10px",
        textContent: "No nodes found.",
      })
    );
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const aSelected = selected.has(a.id) ? 0 : 1;
    const bSelected = selected.has(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  for (const node of sorted) {
    const active = selected.has(node.id);
    const isMurmur = node.faction.toLowerCase().includes("murmur");
    const dotStyle = isMurmur
      ? "background:#fff"
      : `background:${getFactionColor(node.faction)}`;

    const item = el(
      "div",
      {
        className: `node-item${active ? " active" : ""}`,
        "data-node-id": node.id,
      },
      [
        el("div", { className: "node-check" }),
        el("div", { className: "node-label" }, [
          el("div", { className: "name", textContent: node.node }),
          el("div", { className: "meta", textContent: node.mission }),
        ]),
        el("div", { className: "faction-dot", style: dotStyle, title: node.faction }),
      ]
    );

    item.addEventListener("click", () => onToggle(node.id));
    listEl.appendChild(item);
  }
}

/**
 * @param {HTMLElement} nodeCountEl
 * @param {{id: string}[]} allNodes
 * @param {Set<string>} selected
 */
export function updateNodeCountLabel(nodeCountEl, allNodes, selected) {
  const total = allNodes.length;
  const active = selected.size > 0
    ? [...selected].filter(id => allNodes.some(node => node.id === id)).length
    : 0;

  nodeCountEl.textContent = active > 0 ? `${active} / ${total}` : `${total} nodes`;
}
