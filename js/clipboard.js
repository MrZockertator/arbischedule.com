import { formatEpoch, getOffset } from "./timezone.js";
import { el } from "./shared/dom.js";
import { getFactionInlineStyle } from "./shared/faction.js";
import { formatCardCountdown } from "./shared/countdown.js";

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

/* Build footer (shared by both card types) */

function buildFooter() {
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

function renderAndCopyImage(card, btn) {
  document.body.appendChild(card);

  if (typeof html2canvas !== "function") {
    document.body.removeChild(card);
    flashButton(btn, "✗ err");
    return;
  }

  html2canvas(card, { backgroundColor: "#0d1117", scale: 2 })
    .then(canvas => {
      document.body.removeChild(card);
      canvas.toBlob(blob => {
        if (!blob) {
          flashButton(btn, "✗ err");
          return;
        }
        if (
          !navigator.clipboard ||
          typeof navigator.clipboard.write !== "function" ||
          typeof ClipboardItem === "undefined"
        ) {
          flashButton(btn, "✗ err");
          return;
        }

        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(() => flashButton(btn, "✓ img"))
          .catch(() => flashButton(btn, "✗ err"));
      });
    })
    .catch(() => {
      if (card.parentNode) document.body.removeChild(card);
      flashButton(btn, "✗ err");
    });
}

/* Copy a full day */

function copyDay(btn, dayArbs, tz) {
  if (!Array.isArray(dayArbs) || dayArbs.length === 0) {
    flashButton(btn, "✗ err");
    return;
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

  renderAndCopyImage(card, btn);
}

/* Copy a single arbi */

function copyRow(btn, arb, tz) {
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

  renderAndCopyImage(card, btn);
}

export { copyRow, copyDay };
