type AttrValue = string | number | boolean;
type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  children: Child[] | Child = []
): HTMLElementTagNameMap[K] {
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

export function clearNode(node: HTMLElement | null): void {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function getRequiredElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing required element: #${id}`);
  return node as T;
}

export function debounce<T>(fn: (value: T) => void, waitMs = 140): (value: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return value => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(value);
    }, waitMs);
  };
}
