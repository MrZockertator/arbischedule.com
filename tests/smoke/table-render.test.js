// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { renderArbitrationTable } from "../../js/features/table.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="tableWrap"></div>
    <span id="resultCount"></span>
  `;
});

describe("table smoke render", () => {
  it("renders arbitration rows and count", () => {
    const now = Date.now();
    renderArbitrationTable({
      wrapEl: /** @type {HTMLElement} */ (document.getElementById("tableWrap")),
      resultCountEl: /** @type {HTMLElement} */ (document.getElementById("resultCount")),
      allArbs: [
        {
          epochMs: now + 60_000,
          nodeId: "N1",
          node: "Hydron",
          mission: "Defense",
          faction: "Grineer",
        },
        {
          epochMs: now + 120_000,
          nodeId: "N2",
          node: "Helene",
          mission: "Defense",
          faction: "Corpus",
        },
      ],
      selected: new Set(),
      searchState: { normalized: "", matchedTokens: [] },
      userTz: "UTC",
      daysToShow: 30,
      onCopyDay: () => {},
      onCopyRow: () => {},
    });

    expect(document.querySelector(".arb-table")).not.toBeNull();
    expect(document.querySelectorAll(".arb-row")).toHaveLength(2);
    expect(document.getElementById("resultCount")?.textContent).toBe("2 entries");
  });

  it("renders empty-state when filter removes all rows", () => {
    const now = Date.now();
    renderArbitrationTable({
      wrapEl: /** @type {HTMLElement} */ (document.getElementById("tableWrap")),
      resultCountEl: /** @type {HTMLElement} */ (document.getElementById("resultCount")),
      allArbs: [
        {
          epochMs: now + 60_000,
          nodeId: "N1",
          node: "Hydron",
          mission: "Defense",
          faction: "Grineer",
        },
      ],
      selected: new Set(["OTHER"]),
      searchState: { normalized: "", matchedTokens: [] },
      userTz: "UTC",
      daysToShow: 30,
      onCopyDay: () => {},
      onCopyRow: () => {},
    });

    expect(document.querySelector(".state-box")?.textContent).toContain("No results");
    expect(document.getElementById("resultCount")?.textContent).toBe("0 entries");
  });
});
