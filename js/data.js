const DATA_SOURCES = Object.freeze({
  ARBYS:    "https://browse.wf/arbys.txt",
  SOLNODES: "https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json",
});

const MISSION_TYPES = Object.freeze({
  MT_ARTIFACT:       "Disruption",
  MT_CAPTURE:        "Capture",
  MT_DEFENSE:        "Defense",
  MT_EXCAVATE:       "Excavation",
  MT_EXTERMINATION:  "Extermination",
  MT_HIVE:           "Hive",
  MT_INTEL:          "Spy",
  MT_INTERCEPTION:   "Interception",
  MT_LANDSCAPE:      "Open World",
  MT_MOBILE_DEFENSE: "Mobile Defense",
  MT_NEST:           "Defection",
  MT_PURSUIT:        "Pursuit",
  MT_RESCUE:         "Rescue",
  MT_RETRIEVAL:      "Hijack",
  MT_SABOTAGE:       "Sabotage",
  MT_SECTOR:         "Dark Sector",
  MT_SURVIVAL:       "Survival",
  MT_TERRITORY:      "Infested Salvage",
  MT_VOID_CASCADE:   "Void Cascade",
  MT_VOID_FLOOD:     "Void Flood",
});

function decodeMission(raw) {
  return MISSION_TYPES[raw] || raw || "Unknown";
}

/* Fetch solNodes.json (cached in sessionStorage for the tab) */
async function getSolNodes() {
  const CACHE_KEY = "wf_solNodes_v2";
  const CACHE_TS  = "wf_solNodes_ts";
  const MAX_AGE   = 6 * 60 * 60 * 1000; // 6 hours

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    const ts     = Number(sessionStorage.getItem(CACHE_TS) || 0);
    if (cached && Date.now() - ts < MAX_AGE) {
      return JSON.parse(cached);
    }
  } catch { /* sessionStorage unavailable — continue without cache */ }

  const resp = await fetch(DATA_SOURCES.SOLNODES);
  if (!resp.ok) throw new Error("Failed to fetch solNodes.json — HTTP " + resp.status);

  const data = await resp.json();

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TS, String(Date.now()));
  } catch { /* quota exceeded or unavailable — silently skip */ }

  return data;
}

/* Fetch + parse arbys.txt */
async function fetchArbysRaw() {
  const resp = await fetch(DATA_SOURCES.ARBYS);
  if (!resp.ok) throw new Error("Failed to fetch arbys.txt — HTTP " + resp.status);

  const text = await resp.text();
  const entries = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(",");
    if (parts.length < 2) continue;
    const epoch  = Number(parts[0]);
    const nodeId = parts[1].trim();
    if (Number.isNaN(epoch) || !nodeId) continue;
    entries.push({ epoch, nodeId });
  }

  return entries;
}

/* Combine into enriched arbitration objects */
async function fetchArbitrations() {
  const [raw, solNodes] = await Promise.all([fetchArbysRaw(), getSolNodes()]);

  return raw.map(entry => {
    const info  = solNodes[entry.nodeId] || {};
    const match = (info.value || "").match(/^(.+?)\s*\((.+?)\)$/);

    return {
      epochMs: entry.epoch * 1000,
      nodeId:  entry.nodeId,
      node:    match ? match[1] : (info.value || entry.nodeId),
      planet:  match ? match[2] : "Unknown",
      mission: decodeMission(info.type || "Unknown"),
      faction: info.enemy || "Unknown",
    };
  });
}

/* Build the payload the UI expects */
async function getAllData() {
  const arbs = await fetchArbitrations();
  const now  = Date.now();
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  // Deduplicate nodes
  const seen = {};
  for (const a of arbs) {
    if (!seen[a.nodeId]) {
      seen[a.nodeId] = {
        id: a.nodeId,
        node: a.node,
        mission: a.mission,
        faction: a.faction,
      };
    }
  }

  return {
    nodes: Object.values(seen).sort((a, b) => a.node.localeCompare(b.node)),
    arbs: arbs
      .filter(a => a.epochMs >= now - 3_600_000 && a.epochMs <= now + yearMs)
      .sort((a, b) => a.epochMs - b.epochMs),
  };
}

export { getAllData, decodeMission, DATA_SOURCES };
