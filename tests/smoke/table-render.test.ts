// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { renderArbitrationTable } from "../../src/features/table";

function requiredElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

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
      wrapEl: requiredElement<HTMLElement>("tableWrap"),
      resultCountEl: requiredElement<HTMLElement>("resultCount"),
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
      searchState: { raw: "", normalized: "", matchedTokens: [], unmatchedTokens: [] },
      userTz: "UTC",
      daysToShow: 30,
      onCopyDay: () => {},
      onCopyRow: () => {},
    });

    expect(document.querySelector(".arb-grid")).not.toBeNull();
    expect(document.querySelectorAll(".arb-row")).toHaveLength(2);
    expect(document.querySelectorAll(".copy-row-check")).toHaveLength(2);
    expect(document.querySelectorAll(".copy-day-check")).toHaveLength(1);
    expect(document.getElementById("resultCount")?.textContent).toBe("2 entries");
  });

  it("renders empty-state when filter removes all rows", () => {
    const now = Date.now();
    renderArbitrationTable({
      wrapEl: requiredElement<HTMLElement>("tableWrap"),
      resultCountEl: requiredElement<HTMLElement>("resultCount"),
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
      searchState: { raw: "", normalized: "", matchedTokens: [], unmatchedTokens: [] },
      userTz: "UTC",
      daysToShow: 30,
      onCopyDay: () => {},
      onCopyRow: () => {},
    });

    expect(document.querySelector(".state-box")?.textContent).toContain("No results");
    expect(document.getElementById("resultCount")?.textContent).toBe("0 entries");
  });

  it("sets day checkbox indeterminate for partial selection", () => {
    const now = Date.now();
    const first = now + 60_000;

    renderArbitrationTable({
      wrapEl: requiredElement<HTMLElement>("tableWrap"),
      resultCountEl: requiredElement<HTMLElement>("resultCount"),
      allArbs: [
        {
          epochMs: first,
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
      searchState: { raw: "", normalized: "", matchedTokens: [], unmatchedTokens: [] },
      userTz: "UTC",
      daysToShow: 30,
      copySelection: new Set([`${first}:N1`]),
      onCopyDay: () => {},
      onCopyRow: () => {},
    });

    const dayCheck = document.querySelector(".copy-day-check") as HTMLInputElement | null;
    expect(dayCheck).not.toBeNull();
    if (!dayCheck) throw new Error("Missing day checkbox");
    expect(dayCheck.checked).toBe(false);
    expect(dayCheck.indeterminate).toBe(true);
  });
});
