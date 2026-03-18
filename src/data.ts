import { readSessionJson, writeSessionJson } from "./services/storage.js";

const DATA_SOURCES = Object.freeze({
  ARBYS: "https://browse.wf/arbys.txt",
  SOLNODES: "https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json",
});

const SOLNODES_CACHE_KEY = "wf_solNodes_cache";
const SOLNODES_CACHE_VERSION = 1;
const SOLNODES_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 10_000;
const REQUEST_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

const NODE_ID_PATTERN = /^[A-Za-z0-9_./:-]{2,120}$/;

const MISSION_TYPES = Object.freeze({
  MT_ARTIFACT: "Disruption",
  MT_CAPTURE: "Capture",
  MT_DEFENSE: "Defense",
  MT_EXCAVATE: "Excavation",
  MT_EXTERMINATION: "Extermination",
  MT_HIVE: "Hive",
  MT_INTEL: "Spy",
  MT_INTERCEPTION: "Interception",
  MT_LANDSCAPE: "Open World",
  MT_MOBILE_DEFENSE: "Mobile Defense",
  MT_NEST: "Defection",
  MT_PURSUIT: "Pursuit",
  MT_RESCUE: "Rescue",
  MT_RETRIEVAL: "Hijack",
  MT_SABOTAGE: "Sabotage",
  MT_SECTOR: "Dark Sector",
  MT_SURVIVAL: "Survival",
  MT_TERRITORY: "Infested Salvage",
  MT_VOID_CASCADE: "Void Cascade",
  MT_VOID_FLOOD: "Void Flood",
});

type SolNodeInfo = { value: string; type: string; enemy: string };
type SolNodes = Record<string, SolNodeInfo>;
type ArbRow = { epoch: number; nodeId: string };
type Arbitration = {
  epochMs: number;
  nodeId: string;
  node: string;
  planet: string;
  mission: string;
  faction: string;
};
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function safeText(value: unknown, maxLen = 128, fallback = "Unknown"): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().slice(0, maxLen);
  return cleaned || fallback;
}
function isValidNodeId(value: unknown): boolean {
  return typeof value === "string" && NODE_ID_PATTERN.test(value.trim());
}
function safeMission(raw: string): string {
  const mission = safeText(raw, 48, "Unknown");
  return (MISSION_TYPES as Record<string, string>)[mission] || mission;
}
function decodeMission(raw: unknown): string {
  return safeMission(typeof raw === "string" ? raw : "Unknown");
}

async function fetchWithRetry(
  url: string,
  options: { timeoutMs?: number; retries?: number; fetchFn?: typeof fetch } = {}
) {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const retries = options.retries ?? REQUEST_RETRIES;
  const fetchFn = options.fetchFn || fetch;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt >= retries) break;
      await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }

  throw new Error(`Request failed for ${url}: ${String(lastError || "unknown error")}`);
}
function validateSolNodesPayload(payload: unknown): SolNodes {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid solNodes payload");
  }
  const safe: SolNodes = {};

  for (const [nodeId, nodeInfo] of Object.entries(payload as Record<string, unknown>)) {
    if (!isValidNodeId(nodeId)) continue;
    if (!nodeInfo || typeof nodeInfo !== "object") continue;

    const info = nodeInfo as { value?: unknown; type?: unknown; enemy?: unknown };
    safe[nodeId] = {
      value: safeText(info.value, 120, nodeId),
      type: safeText(info.type, 48, "Unknown"),
      enemy: safeText(info.enemy, 32, "Unknown"),
    };
  }

  if (!Object.keys(safe).length) {
    throw new Error("solNodes payload has no valid entries");
  }

  return safe;
}
function parseArbysText(text: string): ArbRow[] {
  const lines = String(text || "").split("\n");
  const entries = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const [rawEpoch, rawNodeId] = line.split(",");
    if (!rawEpoch || !rawNodeId) continue;

    const epoch = Number(rawEpoch);
    const nodeId = rawNodeId.trim();

    if (!Number.isFinite(epoch) || epoch <= 0) continue;
    if (!isValidNodeId(nodeId)) continue;

    entries.push({ epoch, nodeId });
  }

  return entries;
}
async function getSolNodes(): Promise<SolNodes> {
  const cached = readSessionJson(SOLNODES_CACHE_KEY);
  let staleData = null;

  if (cached && typeof cached === "object") {
    const payload = cached as { v?: unknown; updatedAt?: unknown; data?: unknown };
    const isCurrentVersion = Number(payload.v) === SOLNODES_CACHE_VERSION;
    const updatedAt = Number(payload.updatedAt);

    if (isCurrentVersion && payload.data && Number.isFinite(updatedAt)) {
      try {
        const validated = validateSolNodesPayload(payload.data);
        const age = Date.now() - updatedAt;
        if (age < SOLNODES_MAX_AGE_MS) {
          return validated;
        }
        staleData = validated;
      } catch {
        staleData = null;
      }
    }
  }

  try {
    const response = await fetchWithRetry(DATA_SOURCES.SOLNODES);
    const json = await response.json();
    const validated = validateSolNodesPayload(json);

    writeSessionJson(SOLNODES_CACHE_KEY, {
      v: SOLNODES_CACHE_VERSION,
      updatedAt: Date.now(),
      data: validated,
    });

    return validated;
  } catch (error) {
    if (staleData) return staleData;
    throw new Error(`Failed to fetch solNodes: ${String(error)}`);
  }
}
async function fetchArbysRaw() {
  const response = await fetchWithRetry(DATA_SOURCES.ARBYS);
  const text = await response.text();
  const entries = parseArbysText(text);

  if (!entries.length) {
    throw new Error("No valid arbitration entries found");
  }

  return entries;
}
function buildArbitrations(raw: ArbRow[], solNodes: SolNodes): Arbitration[] {
  return raw.map(entry => {
    const info = solNodes[entry.nodeId] || {
      value: entry.nodeId,
      type: "Unknown",
      enemy: "Unknown",
    };

    const match = info.value.match(/^(.+?)\s*\((.+?)\)$/);

    return {
      epochMs: entry.epoch * 1000,
      nodeId: entry.nodeId,
      node: match ? safeText(match[1], 80, entry.nodeId) : safeText(info.value, 80, entry.nodeId),
      planet: match ? safeText(match[2], 40, "Unknown") : "Unknown",
      mission: decodeMission(info.type),
      faction: safeText(info.enemy, 32, "Unknown"),
    };
  });
}
async function fetchArbitrations() {
  const [raw, solNodes] = await Promise.all([fetchArbysRaw(), getSolNodes()]);
  return buildArbitrations(raw, solNodes);
}
async function getAllData() {
  const arbs = await fetchArbitrations();
  const now = Date.now();
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  const seen = new Map();

  for (const arb of arbs) {
    if (!seen.has(arb.nodeId)) {
      seen.set(arb.nodeId, {
        id: arb.nodeId,
        node: arb.node,
        mission: arb.mission,
        faction: arb.faction,
      });
    }
  }

  return {
    nodes: [...seen.values()].sort((a, b) => a.node.localeCompare(b.node)),
    arbs: arbs
      .filter(arb => arb.epochMs >= now - 3_600_000 && arb.epochMs <= now + yearMs)
      .sort((a, b) => a.epochMs - b.epochMs),
  };
}

export {
  getAllData,
  decodeMission,
  parseArbysText,
  validateSolNodesPayload,
  buildArbitrations,
  fetchWithRetry,
  DATA_SOURCES,
};
