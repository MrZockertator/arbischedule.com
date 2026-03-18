import { getOffset, getLocalTimezone } from "../timezone.js";
import { el, clearNode, getRequiredElement } from "../shared/dom.js";

type TimezonePickerOptions = {
  groups: Record<string, string[]>;
  initialTimezone: string;
  onTimezoneSelected: (timezone: string) => void;
  onTimezoneCleared: (localTimezone: string) => void;
};
function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") return false;

  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function createTimezonePicker(options: TimezonePickerOptions) {
  const {
    groups,
    initialTimezone,
    onTimezoneSelected,
    onTimezoneCleared,
  } = options;

  const tzInput = getRequiredElement<HTMLInputElement>("tzInput");
  const tzClear = getRequiredElement<HTMLButtonElement>("tzClear");
  const tzLabel = getRequiredElement<HTMLElement>("tzLabel");
  const tzListbox = getRequiredElement<HTMLElement>("tzListbox");
  const tzCombo = getRequiredElement<HTMLElement>("tzCombo");

  const localTimezone = getLocalTimezone();
  let currentTimezone = isValidTimezone(initialTimezone) ? initialTimezone : localTimezone;
  let focusIndex = -1;
  function setLabel(timezone: string): void {
    tzLabel.textContent = `${timezone.replace(/_/g, " ")} · ${getOffset(timezone)}`;
  }
  function setInputFromTimezone(timezone: string): void {
    if (timezone === localTimezone) {
      tzInput.value = "";
      tzClear.classList.remove("visible");
      return;
    }

    tzInput.value = timezone.replace(/_/g, " ").split("/").pop() || "";
    tzClear.classList.add("visible");
  }
  function buildListbox(filter: string): void {
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

        option.addEventListener("mousedown", (event: MouseEvent) => {
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
  function selectTimezone(timezone: string): void {
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
  function handleKeyNav(event: KeyboardEvent): void {
    const options = tzListbox.querySelectorAll<HTMLElement>(".tz-option");
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
    setTimezone(timezone: string) {
      currentTimezone = isValidTimezone(timezone) ? timezone : localTimezone;
      setInputFromTimezone(currentTimezone);
      setLabel(currentTimezone);
      closeList();
    },
  };
}
