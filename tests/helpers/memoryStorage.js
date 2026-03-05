export function createMemoryStorage() {
  /** @type {Record<string, string>} */
  let state = {};

  return {
    get length() {
      return Object.keys(state).length;
    },
    clear() {
      state = {};
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    key(index) {
      return Object.keys(state)[index] || null;
    },
    removeItem(key) {
      delete state[key];
    },
    setItem(key, value) {
      state[key] = String(value);
    },
  };
}
