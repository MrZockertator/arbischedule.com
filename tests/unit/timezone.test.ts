import { describe, expect, it } from "vitest";
import { isValidTimezone, formatEpoch, getOffset } from "../../src/timezone.js";

describe("timezone utilities", () => {
  it("validates timezone identifiers", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Europe/Paris")).toBe(true);
    expect(isValidTimezone("Invalid/Zone")).toBe(false);
  });

  it("formats epoch with timezone fallback", () => {
    const epoch = Date.UTC(2026, 0, 10, 12, 30, 0);

    const date = formatEpoch(epoch, "date", "UTC");
    const time = formatEpoch(epoch, "time", "UTC");

    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(time).toMatch(/^\d{2}:\d{2}$/);
    expect(formatEpoch(epoch, "time", "Invalid/Zone")).not.toBe("");
  });

  it("returns timezone offsets", () => {
    const offset = getOffset("UTC");
    expect(typeof offset).toBe("string");
  });
});
