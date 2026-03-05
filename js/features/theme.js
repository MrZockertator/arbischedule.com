import { loadThemePreference, saveThemePreference } from "../services/preferences.js";

const COLOR_THEME_KEYS = Object.freeze([
  "--bg",
  "--surface",
  "--surface2",
  "--border",
  "--accent",
  "--accent2",
  "--text",
  "--text-strong",
  "--muted",
]);

const COLOR_INPUT_TO_VAR = Object.freeze({
  themeBgInput: "--bg",
  themeSurfaceInput: "--surface",
  themeSurface2Input: "--surface2",
  themeBorderInput: "--border",
  themeAccentInput: "--accent",
  themeAccent2Input: "--accent2",
  themeTextInput: "--text",
  themeTextStrongInput: "--text-strong",
  themeMutedInput: "--muted",
});

const FONT_OPTIONS = Object.freeze([
  '"Rajdhani", sans-serif',
  '"Exo 2", sans-serif',
  '"Orbitron", sans-serif',
]);

const MONO_OPTIONS = Object.freeze([
  '"Share Tech Mono", monospace',
  '"Space Mono", monospace',
]);

const THEME_PRESETS = Object.freeze({
  Default: Object.freeze({
    "--bg": "#090c10",
    "--surface": "#0d1117",
    "--surface2": "#151c26",
    "--border": "#1e2d3d",
    "--accent": "#00d4ff",
    "--accent2": "#c8a84b",
    "--text": "#c9d5e0",
    "--text-strong": "#ffffff",
    "--muted": "#4a5a6a",
    "--font": '"Rajdhani", sans-serif',
    "--mono": '"Share Tech Mono", monospace',
    "--fs-base": "16px",
    "--fs-node-name": "14px",
    "--fs-time-val": "18px",
  }),
  Dark: Object.freeze({
    "--bg": "#04070c",
    "--surface": "#0b1018",
    "--surface2": "#131c29",
    "--border": "#23364d",
    "--accent": "#21c4ff",
    "--accent2": "#7cd6a2",
    "--text": "#d2e0ef",
    "--text-strong": "#f6fbff",
    "--muted": "#6d8097",
    "--font": '"Rajdhani", sans-serif',
    "--mono": '"Share Tech Mono", monospace',
    "--fs-base": "16px",
    "--fs-node-name": "14px",
    "--fs-time-val": "18px",
  }),
  HighContrast: Object.freeze({
    "--bg": "#000000",
    "--surface": "#0c0c0c",
    "--surface2": "#161616",
    "--border": "#f5f5f5",
    "--accent": "#00e7ff",
    "--accent2": "#ffd500",
    "--text": "#ffffff",
    "--text-strong": "#ffffff",
    "--muted": "#c8c8c8",
    "--font": '"Exo 2", sans-serif',
    "--mono": '"Space Mono", monospace',
    "--fs-base": "17px",
    "--fs-node-name": "15px",
    "--fs-time-val": "20px",
  }),
  Warm: Object.freeze({
    "--bg": "#120d09",
    "--surface": "#1b140f",
    "--surface2": "#251b14",
    "--border": "#4b3527",
    "--accent": "#ff8f2f",
    "--accent2": "#ffd166",
    "--text": "#f4e8da",
    "--text-strong": "#fff5e8",
    "--muted": "#aa8364",
    "--font": '"Exo 2", sans-serif',
    "--mono": '"Space Mono", monospace',
    "--fs-base": "16px",
    "--fs-node-name": "14px",
    "--fs-time-val": "18px",
  }),
});

const THEME_KEYS = Object.keys(THEME_PRESETS.Default);

/**
 * @param {unknown} value
 */
function isHexColor(value) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || "").trim());
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {string} fallback
 */
function toPx(value, min, max, fallback) {
  const fallbackNumber = Number.parseInt(String(fallback).replace("px", ""), 10);
  const raw = Number.parseInt(String(value || "").replace("px", ""), 10);
  const next = Number.isFinite(raw) ? raw : fallbackNumber;
  return `${clamp(next, min, max)}px`;
}

/**
 * @param {string} hex
 */
function hexToRgb(hex) {
  const normalized = String(hex || "").trim();
  const stripped = normalized.startsWith("#") ? normalized.slice(1) : normalized;

  let full = "";
  if (/^[0-9a-f]{3}$/i.test(stripped)) {
    full = stripped.split("").map(ch => `${ch}${ch}`).join("");
  } else if (/^[0-9a-f]{8}$/i.test(stripped)) {
    full = stripped.slice(0, 6);
  } else if (/^[0-9a-f]{6}$/i.test(stripped)) {
    full = stripped;
  } else {
    return null;
  }

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/**
 * @param {string} hex
 * @param {number} alpha
 */
function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * @param {Record<string, string>} vars
 */
function decorateThemeVars(vars) {
  return {
    ...vars,
    "--accent-soft": rgbaFromHex(vars["--accent"], 0.07),
    "--accent-soft-2": rgbaFromHex(vars["--accent"], 0.05),
    "--accent2-soft": rgbaFromHex(vars["--accent2"], 0.12),
    "--accent2-soft-2": rgbaFromHex(vars["--accent2"], 0.08),
    "--modal-backdrop": rgbaFromHex(vars["--bg"], 0.22),
  };
}

/**
 * @param {Record<string, string>} vars
 * @param {Record<string, string>} preset
 */
function themeVarsEqual(vars, preset) {
  return THEME_KEYS.every(key => vars[key] === preset[key]);
}

/**
 * @param {Record<string, string>} vars
 */
function detectThemePreset(vars) {
  for (const [name, presetVars] of Object.entries(THEME_PRESETS)) {
    if (themeVarsEqual(vars, presetVars)) return name;
  }
  return "Custom";
}

/**
 * @param {Record<string, string>} vars
 */
function detectColorPreset(vars) {
  for (const [name, presetVars] of Object.entries(THEME_PRESETS)) {
    const sameColors = COLOR_THEME_KEYS.every(key => vars[key] === presetVars[key]);
    if (sameColors) return name;
  }
  return "Custom";
}

/**
 * @param {string} presetName
 */
function buildThemeFromPreset(presetName) {
  const hasPreset = Object.prototype.hasOwnProperty.call(THEME_PRESETS, presetName);
  const resolvedPreset = hasPreset ? presetName : "Default";
  return {
    preset: resolvedPreset,
    vars: { ...THEME_PRESETS[resolvedPreset] },
  };
}

/**
 * @param {Record<string, string>} raw
 */
function sanitizeThemeVars(raw = {}) {
  const defaults = THEME_PRESETS.Default;

  const safeFont = FONT_OPTIONS.includes(raw["--font"])
    ? raw["--font"]
    : defaults["--font"];

  const safeMono = MONO_OPTIONS.includes(raw["--mono"])
    ? raw["--mono"]
    : defaults["--mono"];

  return {
    "--bg": isHexColor(raw["--bg"]) ? raw["--bg"] : defaults["--bg"],
    "--surface": isHexColor(raw["--surface"]) ? raw["--surface"] : defaults["--surface"],
    "--surface2": isHexColor(raw["--surface2"]) ? raw["--surface2"] : defaults["--surface2"],
    "--border": isHexColor(raw["--border"]) ? raw["--border"] : defaults["--border"],
    "--accent": isHexColor(raw["--accent"]) ? raw["--accent"] : defaults["--accent"],
    "--accent2": isHexColor(raw["--accent2"]) ? raw["--accent2"] : defaults["--accent2"],
    "--text": isHexColor(raw["--text"]) ? raw["--text"] : defaults["--text"],
    "--text-strong": isHexColor(raw["--text-strong"])
      ? raw["--text-strong"]
      : defaults["--text-strong"],
    "--muted": isHexColor(raw["--muted"]) ? raw["--muted"] : defaults["--muted"],
    "--font": safeFont,
    "--mono": safeMono,
    "--fs-base": toPx(raw["--fs-base"], 14, 22, defaults["--fs-base"]),
    "--fs-node-name": toPx(raw["--fs-node-name"], 12, 22, defaults["--fs-node-name"]),
    "--fs-time-val": toPx(raw["--fs-time-val"], 16, 30, defaults["--fs-time-val"]),
  };
}

/**
 * @param {{warn: (error: unknown, context?: Record<string, unknown>) => void}} logger
 */
export function createThemeController(logger) {
  /** @type {{preset: string, vars: Record<string, string>}} */
  let activeTheme = buildThemeFromPreset("Default");
  /** @type {{preset: string, vars: Record<string, string>} | null} */
  let themeBeforeModal = null;
  /** @type {{preset: string, vars: Record<string, string>} | null} */
  let themeDraft = null;
  let suppressPresetSelectChange = false;
  let previewFrameId = 0;

  const modal = /** @type {HTMLElement} */ (document.getElementById("themeModal"));
  const presetSelect = /** @type {HTMLSelectElement} */ (document.getElementById("themePresetSelect"));

  /**
   * @param {string} value
   */
  function setPresetSelectValue(value) {
    if (presetSelect.value === value) return;
    suppressPresetSelectChange = true;
    presetSelect.value = value;
    suppressPresetSelectChange = false;
  }

  /**
   * @param {{preset: string, vars: Record<string, string>}} theme
   */
  function applyTheme(theme) {
    const safeVars = sanitizeThemeVars(theme?.vars || THEME_PRESETS.Default);
    const resolvedPreset = detectThemePreset(safeVars);
    const derived = decorateThemeVars(safeVars);

    Object.entries(derived).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value, "important");
    });

    activeTheme = {
      preset: resolvedPreset,
      vars: safeVars,
    };
  }

  function loadTheme() {
    const stored = loadThemePreference();
    if (!stored || typeof stored !== "object") {
      return buildThemeFromPreset("Default");
    }

    return {
      preset: typeof stored.preset === "string" ? stored.preset : "Custom",
      vars: sanitizeThemeVars(stored.vars),
    };
  }

  function saveTheme(theme) {
    saveThemePreference({
      preset: detectThemePreset(theme.vars),
      vars: sanitizeThemeVars(theme.vars),
    });
  }

  function updateSizeOutputs() {
    const base = /** @type {HTMLOutputElement} */ (document.getElementById("themeBaseSizeOut"));
    const node = /** @type {HTMLOutputElement} */ (document.getElementById("themeNodeSizeOut"));
    const time = /** @type {HTMLOutputElement} */ (document.getElementById("themeTimeSizeOut"));

    base.textContent = `${/** @type {HTMLInputElement} */ (document.getElementById("themeBaseSizeInput")).value}px`;
    node.textContent = `${/** @type {HTMLInputElement} */ (document.getElementById("themeNodeSizeInput")).value}px`;
    time.textContent = `${/** @type {HTMLInputElement} */ (document.getElementById("themeTimeSizeInput")).value}px`;
  }

  /**
   * @param {{preset: string, vars: Record<string, string>}} theme
   */
  function populateControls(theme) {
    const vars = sanitizeThemeVars(theme?.vars || THEME_PRESETS.Default);

    /** @type {[string, string][]} */
    const colorInputs = [
      ["themeBgInput", "--bg"],
      ["themeSurfaceInput", "--surface"],
      ["themeSurface2Input", "--surface2"],
      ["themeBorderInput", "--border"],
      ["themeAccentInput", "--accent"],
      ["themeAccent2Input", "--accent2"],
      ["themeTextInput", "--text"],
      ["themeTextStrongInput", "--text-strong"],
      ["themeMutedInput", "--muted"],
    ];

    colorInputs.forEach(([id, key]) => {
      const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
      input.value = vars[key];
    });

    /** @type {HTMLSelectElement} */ (document.getElementById("themeFontInput")).value = vars["--font"];
    /** @type {HTMLSelectElement} */ (document.getElementById("themeMonoInput")).value = vars["--mono"];

    /** @type {HTMLInputElement} */ (document.getElementById("themeBaseSizeInput")).value = String(
      Number.parseInt(vars["--fs-base"], 10)
    );
    /** @type {HTMLInputElement} */ (document.getElementById("themeNodeSizeInput")).value = String(
      Number.parseInt(vars["--fs-node-name"], 10)
    );
    /** @type {HTMLInputElement} */ (document.getElementById("themeTimeSizeInput")).value = String(
      Number.parseInt(vars["--fs-time-val"], 10)
    );

    const detected = detectColorPreset(vars);
    setPresetSelectValue(Object.prototype.hasOwnProperty.call(THEME_PRESETS, detected) ? detected : "Custom");
    updateSizeOutputs();
  }

  function readThemeFromControls() {
    return {
      preset: "Custom",
      vars: sanitizeThemeVars({
        "--bg": /** @type {HTMLInputElement} */ (document.getElementById("themeBgInput")).value,
        "--surface": /** @type {HTMLInputElement} */ (document.getElementById("themeSurfaceInput")).value,
        "--surface2": /** @type {HTMLInputElement} */ (document.getElementById("themeSurface2Input")).value,
        "--border": /** @type {HTMLInputElement} */ (document.getElementById("themeBorderInput")).value,
        "--accent": /** @type {HTMLInputElement} */ (document.getElementById("themeAccentInput")).value,
        "--accent2": /** @type {HTMLInputElement} */ (document.getElementById("themeAccent2Input")).value,
        "--text": /** @type {HTMLInputElement} */ (document.getElementById("themeTextInput")).value,
        "--text-strong": /** @type {HTMLInputElement} */ (document.getElementById("themeTextStrongInput")).value,
        "--muted": /** @type {HTMLInputElement} */ (document.getElementById("themeMutedInput")).value,
        "--font": /** @type {HTMLSelectElement} */ (document.getElementById("themeFontInput")).value,
        "--mono": /** @type {HTMLSelectElement} */ (document.getElementById("themeMonoInput")).value,
        "--fs-base": `${/** @type {HTMLInputElement} */ (document.getElementById("themeBaseSizeInput")).value}px`,
        "--fs-node-name": `${/** @type {HTMLInputElement} */ (document.getElementById("themeNodeSizeInput")).value}px`,
        "--fs-time-val": `${/** @type {HTMLInputElement} */ (document.getElementById("themeTimeSizeInput")).value}px`,
      }),
    };
  }

  function previewThemeFromControls() {
    try {
      themeDraft = readThemeFromControls();
      applyTheme(themeDraft);

      if (document.activeElement !== presetSelect) {
        const detected = detectColorPreset(themeDraft.vars);
        setPresetSelectValue(
          Object.prototype.hasOwnProperty.call(THEME_PRESETS, detected) ? detected : "Custom"
        );
      }

      updateSizeOutputs();
    } catch (error) {
      logger.warn(error, { phase: "theme.preview" });
    }
  }

  function schedulePreview() {
    if (previewFrameId) {
      cancelAnimationFrame(previewFrameId);
    }
    previewFrameId = requestAnimationFrame(() => {
      previewFrameId = 0;
      previewThemeFromControls();
    });
  }

  /**
   * @param {string} presetName
   */
  function applyThemePresetByName(presetName) {
    if (!Object.prototype.hasOwnProperty.call(THEME_PRESETS, presetName)) return;

    const baseVars = sanitizeThemeVars(themeDraft?.vars || activeTheme.vars);
    const presetVars = THEME_PRESETS[presetName];

    const merged = { ...baseVars };
    COLOR_THEME_KEYS.forEach(key => {
      merged[key] = presetVars[key];
    });

    themeDraft = {
      preset: presetName,
      vars: sanitizeThemeVars(merged),
    };

    populateControls(themeDraft);
    applyTheme(themeDraft);
    setPresetSelectValue(presetName);
  }

  function openThemeModal() {
    themeBeforeModal = {
      preset: activeTheme.preset,
      vars: { ...activeTheme.vars },
    };

    themeDraft = {
      preset: activeTheme.preset,
      vars: { ...activeTheme.vars },
    };

    populateControls(themeDraft);
    modal.removeAttribute("inert");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeThemeModal() {
    if (previewFrameId) {
      cancelAnimationFrame(previewFrameId);
      previewFrameId = 0;
    }

    if (modal.contains(document.activeElement)) {
      const active = /** @type {HTMLElement | null} */ (document.activeElement);
      active?.blur();
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");

    const trigger = document.getElementById("btnCustomizeUi");
    if (trigger instanceof HTMLElement) trigger.focus();
  }

  function cancelThemeChanges() {
    if (themeBeforeModal) applyTheme(themeBeforeModal);
    closeThemeModal();
  }

  function applyThemeChanges() {
    themeDraft = readThemeFromControls();
    applyTheme(themeDraft);
    saveTheme(activeTheme);
    closeThemeModal();
  }

  function resetThemeToDefault() {
    themeDraft = buildThemeFromPreset("Default");
    populateControls(themeDraft);
    applyTheme(themeDraft);
  }

  function bindEvents() {
    const liveInputIds = new Set([
      ...Object.keys(COLOR_INPUT_TO_VAR),
      "themeBaseSizeInput",
      "themeNodeSizeInput",
      "themeTimeSizeInput",
      "themeFontInput",
      "themeMonoInput",
    ]);

    const delegatedPreview = event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!liveInputIds.has(target.id)) return;
      schedulePreview();
    };

    modal.addEventListener("input", delegatedPreview);
    modal.addEventListener("change", delegatedPreview);

    document.getElementById("btnCustomizeUi")?.addEventListener("click", openThemeModal);
    document.getElementById("themePresetLoad")?.addEventListener("click", () => {
      applyThemePresetByName(presetSelect.value);
    });

    presetSelect.addEventListener("change", () => {
      if (suppressPresetSelectChange) return;
      if (presetSelect.value === "Custom") return;
      applyThemePresetByName(presetSelect.value);
    });

    document.getElementById("themeApply")?.addEventListener("click", applyThemeChanges);
    document.getElementById("themeCancel")?.addEventListener("click", cancelThemeChanges);
    document.getElementById("themeCancelTop")?.addEventListener("click", cancelThemeChanges);
    document.getElementById("themeReset")?.addEventListener("click", resetThemeToDefault);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (!modal.classList.contains("open")) return;
      event.preventDefault();
      cancelThemeChanges();
    });
  }

  function init() {
    activeTheme = loadTheme();
    applyTheme(activeTheme);
    bindEvents();
  }

  return {
    init,
    getActiveTheme() {
      return activeTheme;
    },
  };
}
