/**
 * @param {string} tag
 * @param {Record<string, string | number | boolean>} [attrs]
 * @param {Array<Node | string> | Node | string} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      node.className = String(value);
    } else if (key === "textContent") {
      node.textContent = String(value);
    } else if (key === "style" && typeof value === "string") {
      node.setAttribute("style", value);
    } else if (key === "title") {
      node.title = String(value);
    } else if (key === "type") {
      if (node instanceof HTMLInputElement || node instanceof HTMLButtonElement) {
        node.type = String(value);
      } else {
        node.setAttribute(key, String(value));
      }
    } else if (key === "value") {
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLSelectElement ||
        node instanceof HTMLOptionElement ||
        node instanceof HTMLButtonElement
      ) {
        node.value = String(value);
      } else {
        node.setAttribute(key, String(value));
      }
    } else if (key === "colSpan" && node instanceof HTMLTableCellElement) {
      node.colSpan = Number(value);
    } else {
      node.setAttribute(key, String(value));
    }
  }

  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    if (typeof child === "string") {
      node.appendChild(document.createTextNode(child));
    } else if (child) {
      node.appendChild(child);
    }
  }

  return node;
}

/**
 * @param {HTMLElement | null} node
 */
export function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * @template T
 * @param {(value: T) => void} fn
 * @param {number} waitMs
 * @returns {(value: T) => void}
 */
export function debounce(fn, waitMs = 140) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  return value => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(value);
    }, waitMs);
  };
}
