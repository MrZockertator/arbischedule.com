import { loadThemePreference, saveThemePreference } from "../services/preferences.js";
import { getRequiredElement } from "../shared/dom.js";
import type { ThemeState, ThemeVars } from "../types";

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

const THEME_PRESETS: Readonly<Record<string, ThemeVars>> = Object.freeze({
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

const THEME_KEYS = Object.keys(THEME_PRESETS.Default) as string[];
function isHexColor(value: unknown): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || "").trim());
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
function toPx(value: unknown, min: number, max: number, fallback: string): string {
  const fallbackNumber = Number.parseInt(String(fallback).replace("px", ""), 10);
  const raw = Number.parseInt(String(value || "").replace("px", ""), 10);
  const next = Number.isFinite(raw) ? raw : fallbackNumber;
  return `${clamp(next, min, max)}px`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
function decorateThemeVars(vars: ThemeVars): ThemeVars {
  return {
    ...vars,
    "--accent-soft": rgbaFromHex(vars["--accent"], 0.07),
    "--accent-soft-2": rgbaFromHex(vars["--accent"], 0.05),
    "--accent2-soft": rgbaFromHex(vars["--accent2"], 0.12),
    "--accent2-soft-2": rgbaFromHex(vars["--accent2"], 0.08),
    "--modal-backdrop": rgbaFromHex(vars["--bg"], 0.22),
  };
}
function themeVarsEqual(vars: ThemeVars, preset: ThemeVars): boolean {
  return THEME_KEYS.every(key => vars[key] === preset[key]);
}
function detectThemePreset(vars: ThemeVars): string {
  for (const [name, presetVars] of Object.entries(THEME_PRESETS)) {
    if (themeVarsEqual(vars, presetVars)) return name;
  }
  return "Custom";
}
function detectColorPreset(vars: ThemeVars): string {
  for (const [name, presetVars] of Object.entries(THEME_PRESETS)) {
    const sameColors = COLOR_THEME_KEYS.every(key => vars[key] === presetVars[key]);
    if (sameColors) return name;
  }
  return "Custom";
}
function buildThemeFromPreset(presetName: string): ThemeState {
  const hasPreset = Object.prototype.hasOwnProperty.call(THEME_PRESETS, presetName);
  const resolvedPreset = hasPreset ? presetName : "Default";
  return {
    preset: resolvedPreset,
    vars: { ...THEME_PRESETS[resolvedPreset] },
  };
}
function sanitizeThemeVars(raw: ThemeVars = {}): ThemeVars {
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
export function createThemeController(logger: { warn: (error: unknown, context?: Record<string, unknown>) => void }) {
  let activeTheme: ThemeState = buildThemeFromPreset("Default");
  let themeBeforeModal: ThemeState | null = null;
  let themeDraft: ThemeState | null = null;
  let suppressPresetSelectChange = false;
  let previewFrameId = 0;

  const modal = getRequiredElement<HTMLElement>("themeModal");
  const presetSelect = getRequiredElement<HTMLSelectElement>("themePresetSelect");
  function setPresetSelectValue(value: string): void {
    if (presetSelect.value === value) return;
    suppressPresetSelectChange = true;
    presetSelect.value = value;
    suppressPresetSelectChange = false;
  }
  function applyTheme(theme: ThemeState): void {
    const safeVars = sanitizeThemeVars(theme?.vars || THEME_PRESETS.Default);
    const resolvedPreset = detectThemePreset(safeVars);
    const derived = decorateThemeVars(safeVars);

    Object.entries(derived).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value as string, "important");
    });

    activeTheme = {
      preset: resolvedPreset,
      vars: safeVars,
    };
  }

  function loadTheme(): ThemeState {
    const stored = loadThemePreference();
    if (!stored || typeof stored !== "object") {
      return buildThemeFromPreset("Default");
    }

    return {
      preset: typeof stored.preset === "string" ? stored.preset : "Custom",
      vars: sanitizeThemeVars(stored.vars),
    };
  }

  function saveTheme(theme: ThemeState): void {
    saveThemePreference({
      preset: detectThemePreset(theme.vars),
      vars: sanitizeThemeVars(theme.vars),
    });
  }

  function updateSizeOutputs() {
    const base = getRequiredElement<HTMLOutputElement>("themeBaseSizeOut");
    const node = getRequiredElement<HTMLOutputElement>("themeNodeSizeOut");
    const time = getRequiredElement<HTMLOutputElement>("themeTimeSizeOut");

    base.textContent = `${getRequiredElement<HTMLInputElement>("themeBaseSizeInput").value}px`;
    node.textContent = `${getRequiredElement<HTMLInputElement>("themeNodeSizeInput").value}px`;
    time.textContent = `${getRequiredElement<HTMLInputElement>("themeTimeSizeInput").value}px`;
  }
  function populateControls(theme: ThemeState): void {
    const vars = sanitizeThemeVars(theme?.vars || THEME_PRESETS.Default);
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
      const input = getRequiredElement<HTMLInputElement>(id);
      input.value = vars[key];
    });

    getRequiredElement<HTMLSelectElement>("themeFontInput").value = vars["--font"];
    getRequiredElement<HTMLSelectElement>("themeMonoInput").value = vars["--mono"];

    getRequiredElement<HTMLInputElement>("themeBaseSizeInput").value = String(
      Number.parseInt(vars["--fs-base"], 10)
    );
    getRequiredElement<HTMLInputElement>("themeNodeSizeInput").value = String(
      Number.parseInt(vars["--fs-node-name"], 10)
    );
    getRequiredElement<HTMLInputElement>("themeTimeSizeInput").value = String(
      Number.parseInt(vars["--fs-time-val"], 10)
    );

    const detected = detectColorPreset(vars);
    setPresetSelectValue(Object.prototype.hasOwnProperty.call(THEME_PRESETS, detected) ? detected : "Custom");
    updateSizeOutputs();
  }

  function readThemeFromControls(): ThemeState {
    return {
        preset: "Custom",
        vars: sanitizeThemeVars({
        "--bg": getRequiredElement<HTMLInputElement>("themeBgInput").value,
        "--surface": getRequiredElement<HTMLInputElement>("themeSurfaceInput").value,
        "--surface2": getRequiredElement<HTMLInputElement>("themeSurface2Input").value,
        "--border": getRequiredElement<HTMLInputElement>("themeBorderInput").value,
        "--accent": getRequiredElement<HTMLInputElement>("themeAccentInput").value,
        "--accent2": getRequiredElement<HTMLInputElement>("themeAccent2Input").value,
        "--text": getRequiredElement<HTMLInputElement>("themeTextInput").value,
        "--text-strong": getRequiredElement<HTMLInputElement>("themeTextStrongInput").value,
        "--muted": getRequiredElement<HTMLInputElement>("themeMutedInput").value,
        "--font": getRequiredElement<HTMLSelectElement>("themeFontInput").value,
        "--mono": getRequiredElement<HTMLSelectElement>("themeMonoInput").value,
        "--fs-base": `${getRequiredElement<HTMLInputElement>("themeBaseSizeInput").value}px`,
        "--fs-node-name": `${getRequiredElement<HTMLInputElement>("themeNodeSizeInput").value}px`,
        "--fs-time-val": `${getRequiredElement<HTMLInputElement>("themeTimeSizeInput").value}px`,
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
  function applyThemePresetByName(presetName: string): void {
    if (!Object.prototype.hasOwnProperty.call(THEME_PRESETS, presetName)) return;

    const baseVars = sanitizeThemeVars(themeDraft?.vars || activeTheme.vars);
    const presetVars = THEME_PRESETS[presetName] as ThemeVars;

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
      const active = document.activeElement as HTMLElement | null;
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

    const delegatedPreview = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLElement)) return;
      if (!liveInputIds.has(target.id)) return;
      schedulePreview();
    };

    modal.addEventListener("input", delegatedPreview);
    modal.addEventListener("change", delegatedPreview);

    getRequiredElement<HTMLButtonElement>("btnCustomizeUi").addEventListener("click", openThemeModal);
    getRequiredElement<HTMLButtonElement>("themePresetLoad").addEventListener("click", () => {
      applyThemePresetByName(presetSelect.value);
    });

    presetSelect.addEventListener("change", () => {
      if (suppressPresetSelectChange) return;
      if (presetSelect.value === "Custom") return;
      applyThemePresetByName(presetSelect.value);
    });

    getRequiredElement<HTMLButtonElement>("themeApply").addEventListener("click", applyThemeChanges);
    getRequiredElement<HTMLButtonElement>("themeCancel").addEventListener("click", cancelThemeChanges);
    getRequiredElement<HTMLButtonElement>("themeCancelTop").addEventListener("click", cancelThemeChanges);
    getRequiredElement<HTMLButtonElement>("themeReset").addEventListener("click", resetThemeToDefault);

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
