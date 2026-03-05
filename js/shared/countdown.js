/**
 * @param {number} epochMs
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatTableCountdown(epochMs, nowMs = Date.now()) {
  const diff = Number(epochMs) - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return "NOW";

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);

  if (d > 0) {
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }

  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/**
 * @param {number} epochMs
 * @param {number} [nowMs]
 * @returns {string}
 */
export function formatCardCountdown(epochMs, nowMs = Date.now()) {
  const diff = Number(epochMs) - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return "NOW";

  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
