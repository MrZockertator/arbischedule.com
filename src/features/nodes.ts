import { el, clearNode } from "../shared/dom.js";
import { getFactionColor } from "../shared/faction.js";
import { matchesSearch } from "./search.js";
import type { NodeItem, SearchState } from "../types";
function filterNodes(allNodes: NodeItem[], searchState: SearchState): NodeItem[] {
  if (!searchState?.normalized) return allNodes;
  return allNodes.filter(node =>
    matchesSearch(searchState, node.node, node.mission, node.faction)
  );
}
export function renderNodeList(
  listEl: HTMLElement,
  allNodes: NodeItem[],
  selected: Set<string>,
  searchState: SearchState,
  onToggle: (id: string) => void
): void {
  const filtered = filterNodes(allNodes, searchState);

  clearNode(listEl);

  if (!filtered.length) {
    listEl.appendChild(
      el("div", {
        className: "state-box state-box-compact state-box-plain",
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
export function updateNodeCountLabel(nodeCountEl: HTMLElement, allNodes: NodeItem[], selected: Set<string>): void {
  const total = allNodes.length;
  const active = selected.size > 0
    ? [...selected].filter(id => allNodes.some(node => node.id === id)).length
    : 0;

  nodeCountEl.textContent = active > 0 ? `${active} / ${total}` : `${total} nodes`;
}
