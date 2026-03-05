import { describe, expect, it } from "vitest";
import { formatTableCountdown, formatCardCountdown } from "../../js/shared/countdown.js";

describe("countdown formatters", () => {
  it("formats table countdown with seconds", () => {
    const now = 1_700_000_000_000;
    const label = formatTableCountdown(now + 90_000, now);
    expect(label).toBe("0h 01m 30s");
  });

  it("formats table countdown with day bucket", () => {
    const now = 1_700_000_000_000;
    const label = formatTableCountdown(now + 26 * 60 * 60 * 1000, now);
    expect(label).toBe("1d 02h 00m");
  });

  it("formats card countdown in compact form", () => {
    const now = 1_700_000_000_000;
    expect(formatCardCountdown(now + 3_960_000, now)).toBe("1h 06m");
    expect(formatCardCountdown(now + 120_000, now)).toBe("2m");
  });

  it("returns NOW for elapsed times", () => {
    const now = 1_700_000_000_000;
    expect(formatTableCountdown(now - 1, now)).toBe("NOW");
    expect(formatCardCountdown(now - 1, now)).toBe("NOW");
  });
});
