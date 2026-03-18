export function createMemoryStorage(): Storage {
  let state: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(state).length;
    },
    clear() {
      state = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    key(index: number) {
      return Object.keys(state)[index] || null;
    },
    removeItem(key: string) {
      delete state[key];
    },
    setItem(key: string, value: string) {
      state[key] = String(value);
    },
  };
}
