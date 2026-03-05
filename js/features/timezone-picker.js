import { getOffset, getLocalTimezone, isValidTimezone } from "../timezone.js";
import { el, clearNode } from "../shared/dom.js";

/**
 * @typedef {{
 *   groups: Record<string, string[]>,
 *   initialTimezone: string,
 *   onTimezoneSelected: (timezone: string) => void,
 *   onTimezoneCleared: (localTimezone: string) => void,
 * }} TimezonePickerOptions
 */

/**
 * @param {TimezonePickerOptions} options
 */
export function createTimezonePicker(options) {
  const {
    groups,
    initialTimezone,
    onTimezoneSelected,
    onTimezoneCleared,
  } = options;

  const tzInput = /** @type {HTMLInputElement} */ (document.getElementById("tzInput"));
  const tzClear = /** @type {HTMLButtonElement} */ (document.getElementById("tzClear"));
  const tzLabel = /** @type {HTMLElement} */ (document.getElementById("tzLabel"));
  const tzListbox = /** @type {HTMLElement} */ (document.getElementById("tzListbox"));
  const tzCombo = /** @type {HTMLElement} */ (document.getElementById("tzCombo"));

  const localTimezone = getLocalTimezone();
  let currentTimezone = isValidTimezone(initialTimezone) ? initialTimezone : localTimezone;
  let focusIndex = -1;

  /**
   * @param {string} timezone
   */
  function setLabel(timezone) {
    tzLabel.textContent = `${timezone.replace(/_/g, " ")} · ${getOffset(timezone)}`;
  }

  /**
   * @param {string} timezone
   */
  function setInputFromTimezone(timezone) {
    if (timezone === localTimezone) {
      tzInput.value = "";
      tzClear.classList.remove("visible");
      return;
    }

    tzInput.value = timezone.replace(/_/g, " ").split("/").pop() || "";
    tzClear.classList.add("visible");
  }

  /**
   * @param {string} filter
   */
  function buildListbox(filter) {
    clearNode(tzListbox);
    focusIndex = -1;
    const q = String(filter || "").toLowerCase();
    let hasAny = false;

    for (const [groupName, zones] of Object.entries(groups)) {
      const matched = q
        ? zones.filter(zone => zone.toLowerCase().replace(/_/g, " ").includes(q))
        : zones;

      if (!matched.length) continue;
      hasAny = true;

      tzListbox.appendChild(el("div", { className: "tz-group-label", textContent: groupName }));

      matched.forEach(zone => {
        const city = zone.replace(/_/g, " ").split("/").pop() || zone;
        const option = el(
          "div",
          {
            className: `tz-option${zone === currentTimezone ? " selected" : ""}`,
            "data-tz": zone,
          },
          [
            el("span", { textContent: city }),
            el("span", { className: "tz-offset", textContent: getOffset(zone) }),
          ]
        );

        option.addEventListener("mousedown", event => {
          event.preventDefault();
          selectTimezone(zone);
        });

        tzListbox.appendChild(option);
      });
    }

    if (!hasAny) {
      tzListbox.appendChild(el("div", { className: "tz-none", textContent: "No match found" }));
    }
  }

  function openList() {
    buildListbox(tzInput.value);
    tzListbox.classList.add("open");
  }

  function closeList() {
    tzListbox.classList.remove("open");
    focusIndex = -1;
  }

  /**
   * @param {string} timezone
   */
  function selectTimezone(timezone) {
    if (!isValidTimezone(timezone)) return;

    currentTimezone = timezone;
    setInputFromTimezone(timezone);
    setLabel(timezone);
    closeList();
    onTimezoneSelected(timezone);
  }

  function clearOverride() {
    currentTimezone = localTimezone;
    setInputFromTimezone(localTimezone);
    setLabel(localTimezone);
    closeList();
    onTimezoneCleared(localTimezone);
  }

  /**
   * @param {KeyboardEvent} event
   */
  function handleKeyNav(event) {
    const options = tzListbox.querySelectorAll(".tz-option");
    if (!options.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusIndex = Math.min(focusIndex + 1, options.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex = Math.max(focusIndex - 1, 0);
    } else if (event.key === "Enter" && focusIndex >= 0) {
      event.preventDefault();
      const focused = options[focusIndex];
      const timezone = focused.getAttribute("data-tz");
      if (timezone) selectTimezone(timezone);
      return;
    } else if (event.key === "Escape") {
      closeList();
      return;
    } else {
      return;
    }

    options.forEach((option, index) => {
      option.classList.toggle("focused", index === focusIndex);
    });

    const focused = options[focusIndex];
    if (focused && typeof focused.scrollIntoView === "function") {
      focused.scrollIntoView({ block: "nearest" });
    }
  }

  function init() {
    setInputFromTimezone(currentTimezone);
    setLabel(currentTimezone);

    tzInput.addEventListener("focus", openList);
    tzInput.addEventListener("input", () => {
      const value = tzInput.value;
      tzClear.classList.toggle("visible", value.length > 0 || currentTimezone !== localTimezone);
      buildListbox(value);
      tzListbox.classList.add("open");
    });

    tzInput.addEventListener("keydown", handleKeyNav);
    tzClear.addEventListener("click", clearOverride);

    document.addEventListener("mousedown", event => {
      const target = event.target;
      if (target instanceof Node && !tzCombo.contains(target)) {
        closeList();
      }
    });
  }

  return {
    init,
    getTimezone() {
      return currentTimezone;
    },
    setTimezone(timezone) {
      currentTimezone = isValidTimezone(timezone) ? timezone : localTimezone;
      setInputFromTimezone(currentTimezone);
      setLabel(currentTimezone);
      closeList();
    },
  };
}
