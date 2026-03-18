import html2canvas from "html2canvas";
import { formatEpoch, getOffset } from "./timezone.js";
import { el } from "./shared/dom.js";
import { getFactionInlineStyle } from "./shared/faction.js";
import { formatCardCountdown } from "./shared/countdown.js";

const MAX_SELECTED_IMAGE_ROWS = 80;

type ClipboardArbitration = {
  epochMs: number;
  node: string;
  mission: string;
  faction: string;
};

function flashButton(btn: HTMLButtonElement | null | undefined, label: string): void {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = label;
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 2000);
}

/* Build footer (shared by both card types) */

function buildFooter(): HTMLDivElement {
  return el("div", { className: "card-footer" }, [
    el("div", { className: "card-footer-left" }, [
      el("span", { className: "card-footer-url", textContent: "arbischedule.com" }),
    ]),
    el("div", { className: "card-footer-right" }, [
      "WARFRAME ",
      el("span", { textContent: "ARBITRATIONS" }),
    ]),
  ]);
}

/* Render card to image and copy to clipboard */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(blob => resolve(blob));
  });
}
async function renderAndCopyImage(card: HTMLElement, btn: HTMLButtonElement): Promise<boolean> {
  document.body.appendChild(card);

  try {
    const canvas = await html2canvas(card, { backgroundColor: "#0d1117", scale: 2 });
    if (card.parentNode) document.body.removeChild(card);

    const blob = await canvasToBlob(canvas);
    if (!blob) {
      flashButton(btn, "✗ err");
      return false;
    }

    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== "function" ||
      typeof ClipboardItem === "undefined"
    ) {
      flashButton(btn, "✗ err");
      return false;
    }

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    flashButton(btn, "✓ img");
    return true;
  } catch {
    if (card.parentNode) document.body.removeChild(card);
    flashButton(btn, "✗ err");
    return false;
  }
}

/* Copy a full day */

async function copyDay(btn: HTMLButtonElement, dayArbs: ClipboardArbitration[], tz: string): Promise<boolean> {
  if (!Array.isArray(dayArbs) || dayArbs.length === 0) {
    flashButton(btn, "✗ err");
    return false;
  }

  const header = formatEpoch(dayArbs[0].epochMs, "day", tz);
  const tzLabel = tz.replace(/_/g, " ") + " · " + getOffset(tz);

  const rows = dayArbs.map(a =>
    el("div", { className: "card-row" }, [
      el("span", { className: "card-time", textContent: formatEpoch(a.epochMs, "time", tz) }),
      el("span", { className: "card-node", textContent: a.node }),
      el("span", { className: "card-mission", textContent: a.mission }),
      el("span", { className: "card-faction", style: getFactionInlineStyle(a.faction), textContent: a.faction }),
    ])
  );

  const card = el("div", { className: "img-card" }, [
    el("div", { className: "card-header", textContent: header }),
    el("div", { className: "card-tz", textContent: tzLabel }),
    ...rows,
    buildFooter(),
  ]);

  return renderAndCopyImage(card, btn);
}

/* Copy a single arbi */

async function copyRow(btn: HTMLButtonElement, arb: ClipboardArbitration, tz: string): Promise<boolean> {
  const date = formatEpoch(arb.epochMs, "short-date", tz);
  const time = formatEpoch(arb.epochMs, "time", tz);
  const countdown = formatCardCountdown(arb.epochMs);

  // The date cell needs a line break then the time below it
  const dateCell = el("span", { className: "card-single-date" }, [
    date,
    el("br"),
    el("span", { className: "card-single-time", textContent: time }),
  ]);

  const card = el("div", { className: "img-card" }, [
    el("div", { className: "card-single-row" }, [
      dateCell,
      el("span", { className: "card-single-node", textContent: arb.node }),
      el("span", { textContent: arb.mission }),
      el("span", { className: "card-faction", style: getFactionInlineStyle(arb.faction), textContent: arb.faction }),
      el("span", { className: "card-single-countdown", textContent: countdown }),
    ]),
    buildFooter(),
  ]);

  return renderAndCopyImage(card, btn);
}
async function copySelected(btn: HTMLButtonElement, selectedArbs: ClipboardArbitration[], tz: string): Promise<boolean> {
  if (!Array.isArray(selectedArbs) || selectedArbs.length === 0) {
    flashButton(btn, "✗ err");
    return false;
  }

  if (selectedArbs.length > MAX_SELECTED_IMAGE_ROWS) {
    flashButton(btn, "✗ max");
    return false;
  }

  const sorted = [...selectedArbs].sort((a, b) => a.epochMs - b.epochMs);
  const tzLabel = tz.replace(/_/g, " ") + " · " + getOffset(tz);

  const rows: HTMLDivElement[] = [];
  let lastDay = "";
  for (const arb of sorted) {
    const day = formatEpoch(arb.epochMs, "day", tz);
    if (day !== lastDay) {
      rows.push(el("div", { className: "card-header", textContent: day }));
      lastDay = day;
    }

    rows.push(
      el("div", { className: "card-row" }, [
        el("span", { className: "card-time", textContent: formatEpoch(arb.epochMs, "time", tz) }),
        el("span", { className: "card-node", textContent: arb.node }),
        el("span", { className: "card-mission", textContent: arb.mission }),
        el("span", { className: "card-faction", style: getFactionInlineStyle(arb.faction), textContent: arb.faction }),
      ])
    );
  }

  const card = el("div", { className: "img-card" }, [
    el("div", { className: "card-header", textContent: `Selected Arbitrations (${sorted.length})` }),
    el("div", { className: "card-tz", textContent: tzLabel }),
    ...rows,
    buildFooter(),
  ]);

  return renderAndCopyImage(card, btn);
}

export { copyRow, copyDay, copySelected };
