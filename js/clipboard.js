import { formatEpoch, getOffset } from "./timezone.js";

/* Helpers */

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function buildCountdown(epochMs) {
  const diff = epochMs - Date.now();
  if (diff <= 0) return "NOW";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function factionBorderStyle(f) {
  const colors = {
    grineer: "#e05a2b", corpus: "#4ba3e0", infested: "#6abf47",
    corrupted: "#b06ae0", orokin: "#c8a84b", murmur: "#e8e8e8",
  };
  const fl = f.toLowerCase();
  const match = Object.entries(colors).find(([k]) => fl.includes(k));
  const c = match ? match[1] : "#4a5a6a";
  return `border-color:${c};color:${c}`;
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

/* Render card to image and copy to clipboard */

function renderAndCopyImage(card, btn) {
  document.body.appendChild(card);

  // html2canvas is loaded globally from CDN
  html2canvas(card, { backgroundColor: "#0d1117", scale: 2 })
    .then(canvas => {
      document.body.removeChild(card);
      canvas.toBlob(blob => {
        if (!blob) {
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
  const card = document.createElement("div");
  card.className = "img-card";

  const header = escapeHtml(formatEpoch(dayArbs[0].epochMs, "day", tz));
  const tzLabel = escapeHtml(tz.replace(/_/g, " ") + " · " + getOffset(tz));

  const rows = dayArbs.map(a => `
    <div class="card-row">
      <span class="card-time">${escapeHtml(formatEpoch(a.epochMs, "time", tz))}</span>
      <span class="card-node">${escapeHtml(a.node)}</span>
      <span class="card-mission">${escapeHtml(a.mission)}</span>
      <span class="card-faction" style="${factionBorderStyle(a.faction)}">${escapeHtml(a.faction)}</span>
    </div>`).join("");

  card.innerHTML = `
    <div class="card-header">${header}</div>
    <div class="card-tz">${tzLabel}</div>
    ${rows}
    <div class="card-footer">
      <div class="card-footer-left">
        <span class="card-footer-url">arbischedule.com</span>
      </div>
      <div class="card-footer-right">
        WARFRAME <span>ARBITRATIONS</span>
      </div>
    </div>`;

  renderAndCopyImage(card, btn);
}

/* Copy a single arbi */

function copyRow(btn, arb, tz) {
  const card = document.createElement("div");
  card.className = "img-card";

  const date = escapeHtml(formatEpoch(arb.epochMs, "short-date", tz));
  const time = escapeHtml(formatEpoch(arb.epochMs, "time", tz));
  const countdown = escapeHtml(buildCountdown(arb.epochMs));

  card.innerHTML = `
    <div class="card-single-row">
      <span class="card-single-date">${date}<br><span class="card-single-time">${time}</span></span>
      <span class="card-single-node">${escapeHtml(arb.node)}</span>
      <span>${escapeHtml(arb.mission)}</span>
      <span class="card-faction" style="${factionBorderStyle(arb.faction)}">${escapeHtml(arb.faction)}</span>
      <span class="card-single-countdown">${countdown}</span>
    </div>
    <div class="card-footer">
      <div class="card-footer-left">
        <span class="card-footer-url">arbischedule.com</span>
      </div>
      <div class="card-footer-right">
        WARFRAME <span>ARBITRATIONS</span>
      </div>
    </div>`;

  renderAndCopyImage(card, btn);
}

export { copyRow, copyDay };
