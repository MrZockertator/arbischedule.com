/**
 * @param {string} raw
 * @returns {string[]}
 */
function parseSearchTokens(raw) {
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

/**
 * @param {string} raw
 * @param {{node: string}[]} nodes
 */
export function buildSearchState(raw, nodes) {
  const source = String(raw || "");
  const normalized = source.toLowerCase().trim();
  const tokens = parseSearchTokens(source);

  /** @type {string[]} */
  const matchedTokens = [];
  /** @type {string[]} */
  const unmatchedTokens = [];

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

/**
 * @param {{normalized: string, matchedTokens: string[]}} searchState
 * @param {string} node
 * @param {string} mission
 * @param {string} faction
 */
export function matchesSearch(searchState, node, mission, faction) {
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

/**
 * @param {{normalized: string, unmatchedTokens: string[]}} searchState
 */
export function getSearchFeedback(searchState) {
  if (!searchState?.normalized || !searchState.unmatchedTokens?.length) {
    return { message: "", level: "" };
  }

  return {
    message: `No node match: ${searchState.unmatchedTokens.join(", ")}`,
    level: "warn",
  };
}
