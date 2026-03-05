import { describe, expect, it } from "vitest";
import {
  parseArbysText,
  validateSolNodesPayload,
  buildArbitrations,
  decodeMission,
} from "../../js/data.js";

describe("data parsing", () => {
  it("parses valid arbys rows and drops invalid rows", () => {
    const text = [
      "1710000000,SolNode1",
      "", // empty
      "bad,line",
      "1710000300,   SolNode2   ",
      "-1,Invalid",
      "1710000600,",
    ].join("\n");

    const rows = parseArbysText(text);
    expect(rows).toEqual([
      { epoch: 1710000000, nodeId: "SolNode1" },
      { epoch: 1710000300, nodeId: "SolNode2" },
    ]);
  });

  it("validates and sanitizes solNodes payload", () => {
    const payload = {
      SolNode1: { value: "Earth (Earth)", type: "MT_CAPTURE", enemy: "Corpus" },
      SolNode2: { value: "Mars (Mars)", type: "MT_DEFENSE", enemy: "Grineer" },
      "": { value: "Bad", type: "Bad", enemy: "Bad" },
    };

    const validated = validateSolNodesPayload(payload);
    expect(validated.SolNode1.value).toBe("Earth (Earth)");
    expect(validated.SolNode2.type).toBe("MT_DEFENSE");
    expect(validated[""]).toBeUndefined();
  });

  it("builds enriched arbitration objects", () => {
    const rows = [{ epoch: 1710000000, nodeId: "SolNode1" }];
    const nodes = {
      SolNode1: { value: "Hydron (Sedna)", type: "MT_DEFENSE", enemy: "Grineer" },
    };

    const arbs = buildArbitrations(rows, nodes);
    expect(arbs[0]).toMatchObject({
      epochMs: 1710000000 * 1000,
      nodeId: "SolNode1",
      node: "Hydron",
      planet: "Sedna",
      mission: "Defense",
      faction: "Grineer",
    });
  });

  it("decodes unknown mission types safely", () => {
    expect(decodeMission("MT_CAPTURE")).toBe("Capture");
    expect(decodeMission("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    expect(decodeMission(null)).toBe("Unknown");
  });
});
