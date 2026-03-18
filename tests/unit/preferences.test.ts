import { beforeEach, describe, expect, it } from "vitest";
import {
  loadSelectedNodeIds,
  saveSelectedNodeIds,
  loadSelectionPresets,
  saveSelectionPresets,
  loadThemePreference,
  saveThemePreference,
  loadTimezonePreference,
  saveTimezonePreference,
  clearTimezonePreference,
} from "../../src/services/preferences.js";
import { createMemoryStorage } from "../helpers/memoryStorage.js";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
});

describe("preferences storage", () => {
  it("migrates legacy selected-node array", () => {
    localStorage.setItem("wf_selected", JSON.stringify(["A", "B", "A", " "]));
    const selected = loadSelectedNodeIds();
    expect([...selected]).toEqual(["A", "B"]);
  });

  it("round-trips selected nodes with versioned shape", () => {
    const selected = new Set(["NodeOne", "NodeTwo"]);
    saveSelectedNodeIds(selected);

    const loaded = loadSelectedNodeIds();
    expect([...loaded]).toEqual(["NodeOne", "NodeTwo"]);
  });

  it("loads presets from legacy and saves sorted presets", () => {
    localStorage.setItem(
      "wf_selection_presets",
      JSON.stringify([
        { name: "Zeta", nodeIds: ["n2", "n1", "n2"] },
        { name: "", nodeIds: ["n3"] },
      ])
    );

    const loadedLegacy = loadSelectionPresets();
    expect(loadedLegacy).toHaveLength(1);
    expect(loadedLegacy[0].nodeIds).toEqual(["n2", "n1"]);

    saveSelectionPresets([
      { name: "Bravo", nodeIds: ["b"], updatedAt: 1 },
      { name: "Alpha", nodeIds: ["a"], updatedAt: 2 },
    ]);

    const loaded = loadSelectionPresets();
    expect(loaded.map((item: { name: string }) => item.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("supports legacy and versioned theme payloads", () => {
    localStorage.setItem(
      "wf_theme",
      JSON.stringify({ preset: "Dark", vars: { "--bg": "#000000" } })
    );
    const legacy = loadThemePreference();
    expect(legacy).toEqual({ preset: "Dark", vars: { "--bg": "#000000" } });

    saveThemePreference({ preset: "Warm", vars: { "--bg": "#111111" } });
    const current = loadThemePreference();
    expect(current).toEqual({ preset: "Warm", vars: { "--bg": "#111111" } });
  });

  it("stores and clears timezone preference", () => {
    expect(loadTimezonePreference(() => "UTC")).toBe("UTC");
    saveTimezonePreference("Europe/Paris");
    expect(loadTimezonePreference(() => "UTC")).toBe("Europe/Paris");

    clearTimezonePreference();
    expect(loadTimezonePreference(() => "UTC")).toBe("UTC");
  });
});
