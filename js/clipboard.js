/**
 * clipboard.js — Copy arbitration data as formatted text.
 *
 * Uses the Clipboard API with a plaintext fallback.
 * Image generation (html2canvas) removed for security & performance —
 * text copies are more portable and don't require external scripts.
 */

import { formatEpoch, getOffset } from "./timezone.js";

function buildCountdown(epochMs) {
  const diff = epochMs - Date.now();
  if (diff <= 0) return "NOW";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    flashButton(btn, "✓ copied");
  } catch {
    // Fallback for older browsers / insecure contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    flashButton(btn, "✓ copied");
  }
}

function flashButton(btn, label) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = label;
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 2000);
}

function copyRow(btn, arb, tz) {
  const time = formatEpoch(arb.epochMs, "time", tz);
  const date = formatEpoch(arb.epochMs, "short-date", tz);
  const countdown = buildCountdown(arb.epochMs);
  const line = `${date} ${time}  ${arb.node} — ${arb.mission} (${arb.faction})  [${countdown}]`;
  copyText(line.trim(), btn);
}

function copyDay(btn, dayArbs, tz) {
  const header = formatEpoch(dayArbs[0].epochMs, "day", tz);
  const offset = getOffset(tz);
  const lines = dayArbs.map(a => {
    const t = formatEpoch(a.epochMs, "time", tz);
    return `  ${t}  ${a.node} — ${a.mission} (${a.faction})`;
  });
  const text = `${header}  (${offset})\n${lines.join("\n")}\n— arbischedule.com`;
  copyText(text, btn);
}

export { copyRow, copyDay };
