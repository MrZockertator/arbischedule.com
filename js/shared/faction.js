const DEFAULT_COLOR = "#4a5a6a";

const FACTION_META = Object.freeze([
  { key: "grineer", color: "#e05a2b", badgeClass: "Grineer" },
  { key: "corpus", color: "#4ba3e0", badgeClass: "Corpus" },
  { key: "infested", color: "#6abf47", badgeClass: "Infested" },
  { key: "corrupted", color: "#b06ae0", badgeClass: "Corrupted" },
  { key: "orokin", color: "#c8a84b", badgeClass: "Orokin" },
  { key: "murmur", color: "#e8e8e8", badgeClass: "Murmur" },
]);

/**
 * @param {string} faction
 * @returns {string}
 */
function normalizeFaction(faction) {
  return String(faction || "").trim().toLowerCase();
}

/**
 * @param {string} faction
 * @returns {string}
 */
export function getFactionColor(faction) {
  const normalized = normalizeFaction(faction);
  const match = FACTION_META.find(meta => normalized.includes(meta.key));
  return match ? match.color : DEFAULT_COLOR;
}

/**
 * @param {string} faction
 * @returns {string}
 */
export function getFactionBadgeClass(faction) {
  const normalized = normalizeFaction(faction);
  const exact = FACTION_META.find(meta => normalized === meta.key);
  if (exact) return exact.badgeClass;

  const fuzzy = FACTION_META.find(meta => normalized.includes(meta.key));
  return fuzzy ? fuzzy.badgeClass : "default";
}

/**
 * @param {string} faction
 * @returns {string}
 */
export function getFactionInlineStyle(faction) {
  const color = getFactionColor(faction);
  return `border-color:${color};color:${color}`;
}
