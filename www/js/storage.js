const SAVE_KEY = 'paopaolong-elder-save';
const SAVE_VERSION = 12;

const GameStorage = {
  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, ...data }));
    } catch (_) {}
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.v !== SAVE_VERSION) {
        localStorage.removeItem(SAVE_KEY);
        return null;
      }
      return data;
    } catch (_) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
  },

  clear() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
  }
};
