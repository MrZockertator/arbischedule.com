export type Arbitration = {
  epochMs: number;
  nodeId: string;
  node: string;
  mission: string;
  faction: string;
  planet?: string;
};

export type ClipboardArbitration = Pick<Arbitration, "epochMs" | "node" | "mission" | "faction">;

export type NodeItem = {
  id: string;
  node: string;
  mission: string;
  faction: string;
};

export type SearchState = {
  raw: string;
  normalized: string;
  matchedTokens: string[];
  unmatchedTokens: string[];
};

export type SelectionPreset = {
  name: string;
  nodeIds: string[];
  updatedAt: number;
};

export type ThemeVars = Record<string, string>;

export type ThemeState = {
  preset: string;
  vars: ThemeVars;
};
