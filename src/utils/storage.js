// Tiny, safe localStorage helpers. Everything is namespaced under "krosalita:".
const NS = 'krosalita:';

export const loadJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveJSON = (key, value) => {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    // quota exceeded / private mode — fail quietly
    return false;
  }
};

export const removeKey = (key) => {
  try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
};

export const loadString = (key, fallback = '') => {
  try { return localStorage.getItem(NS + key) ?? fallback; } catch { return fallback; }
};

export const saveString = (key, value) => {
  try { localStorage.setItem(NS + key, value); return true; } catch { return false; }
};
