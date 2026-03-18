
import type { SearchState } from "../types";

function parseSearchTokens(raw: string): string[] {
  return [
    ...new Set(
      String(raw || "")
        .toLowerCase()
        .split(/[\s,]+/)
        .map(token => token.trim())
        .filter(Boolean)
    ),
  ];
}
export function buildSearchState(raw: string, nodes: Array<{ node: string }>): SearchState {
  const source = String(raw || "");
  const normalized = source.toLowerCase().trim();
  const tokens = parseSearchTokens(source);
  const matchedTokens: string[] = [];
  const unmatchedTokens: string[] = [];

  tokens.forEach(token => {
    const hasNodeMatch = nodes.some(node => node.node.toLowerCase().includes(token));
    if (hasNodeMatch) matchedTokens.push(token);
    else unmatchedTokens.push(token);
  });

  return {
    raw: source,
    normalized,
    matchedTokens,
    unmatchedTokens,
  };
}
export function matchesSearch(searchState: SearchState, node: string, mission: string, faction: string): boolean {
  const query = searchState?.normalized || "";
  if (!query) return true;

  const nodeName = String(node || "").toLowerCase();
  const missionName = String(mission || "").toLowerCase();
  const factionName = String(faction || "").toLowerCase();

  const fullQueryMatch =
    nodeName.includes(query) ||
    missionName.includes(query) ||
    factionName.includes(query);

  const matchedTokens = Array.isArray(searchState?.matchedTokens)
    ? searchState.matchedTokens
    : [];

  if (!matchedTokens.length) return fullQueryMatch;
  const anyNodeTokenMatch = matchedTokens.some(token => nodeName.includes(token));
  return anyNodeTokenMatch || fullQueryMatch;
}
export function getSearchFeedback(searchState: SearchState): { message: string; level: string } {
  if (!searchState?.normalized || !searchState.unmatchedTokens?.length) {
    return { message: "", level: "" };
  }

  return {
    message: `No node match: ${searchState.unmatchedTokens.join(", ")}`,
    level: "warn",
  };
}
