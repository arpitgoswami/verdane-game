/* Versioned, defensive save handling. No DOM access so it can be unit-tested in Node. */
(function () {
  const V = window.Verdane;
  const KEY = 'verdane.save', BACKUP_KEY = KEY + '.backup', VERSION = 5;
  const SPEEDS = [1, 2, 3];

  const defaults = () => ({ v: VERSION, completed: [], stars: {}, puzzles: {}, vases: {}, settings: { speed: 1, autoSun: true, muted: false } });
  const toInt = v => (v === null || v === '' || typeof v === 'boolean' ? NaN : Number(v));
  const clampInt = (v, min, max, fallback = 0) => {
    const n = toInt(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
  };

  // Only board IDs from the matching table survive, clamped to 0-3, highest wins.
  const sanitizeStarMap = (raw, boards) => {
    const out = {};
    const ids = new Set((Array.isArray(boards) ? boards : []).map(b => b.id));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [key, value] of Object.entries(raw)) {
      if (!ids.has(key)) continue;
      const n = clampInt(value, 0, 3, 0);
      out[key] = Math.max(out[key] || 0, n);
    }
    return out;
  };

  function sanitize(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const max = V.MISSIONS.length;
    const asId = v => {
      const n = toInt(v);
      return Number.isInteger(n) && n >= 1 && n <= max ? n : 0;
    };
    const completed = Array.isArray(s.completed)
      ? [...new Set(s.completed.map(asId).filter(Boolean))].sort((a, b) => a - b)
      : [];
    const stars = {};
    if (s.stars && typeof s.stars === 'object' && !Array.isArray(s.stars)) {
      for (const [key, value] of Object.entries(s.stars)) {
        const id = asId(key);
        if (!id) continue;
        const n = clampInt(value, 0, 3, 0);
        stars[id] = Math.max(stars[id] || 0, n);
      }
    }
    const rawSpeed = toInt(s.settings && s.settings.speed);
    const speed = SPEEDS.includes(rawSpeed) ? rawSpeed : 1;
    const autoSun = s.settings && typeof s.settings.autoSun === 'boolean' ? s.settings.autoSun : true;
    const muted = s.settings && typeof s.settings.muted === 'boolean' ? s.settings.muted : false;
    const puzzles = sanitizeStarMap(s.puzzles, V.PUZZLES);
    const vases = sanitizeStarMap(s.vases, V.VASES);
    return { v: VERSION, completed, stars, puzzles, vases, settings: { speed, autoSun, muted } };
  }

  // Add a new entry here whenever VERSION increases. Each step receives the old object.
  const MIGRATIONS = {
    1: s => Object.assign({}, s, { v: 2, settings: Object.assign({ speed: 1 }, s.settings) }),
    2: s => Object.assign({}, s, { v: 3, settings: Object.assign({ autoSun: true }, s.settings) }),
    3: s => Object.assign({}, s, { v: 4, settings: Object.assign({ muted: false }, s.settings) }),
    4: s => Object.assign({}, s, { v: 5, puzzles: {}, vases: {} }),
  };

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return defaults();
    let s = Object.assign({}, raw);
    let v = Number(s.v);
    if (!Number.isFinite(v) || v < 1) v = 1;
    s.v = v;
    if (v > VERSION) return null; // newer save: keep it, but don't pretend to understand it
    while (s.v < VERSION) {
      const step = MIGRATIONS[s.v];
      if (!step) { s.v = VERSION; break; }
      s = step(s);
    }
    return sanitize(s);
  }

  const getStorage = storage => {
    if (storage) return storage;
    try { return window.localStorage; } catch (e) { return null; }
  };

  function load(storage) {
    const st = getStorage(storage);
    if (!st) return defaults();
    let raw;
    try { raw = JSON.parse(st.getItem(KEY)); } catch (e) { return defaults(); }
    if (!raw || typeof raw !== 'object') return defaults();
    const migrated = migrate(raw);
    if (!migrated) {
      try { st.setItem(BACKUP_KEY, JSON.stringify(raw)); } catch (e) { /* ignore */ }
      return defaults();
    }
    return migrated;
  }

  function save(data, storage) {
    const st = getStorage(storage);
    if (!st) return false;
    try { st.setItem(KEY, JSON.stringify(sanitize(data))); return true; } catch (e) { return false; }
  }

  function reset(storage) {
    const st = getStorage(storage);
    if (!st) return false;
    try { st.removeItem(KEY); st.removeItem(BACKUP_KEY); return true; } catch (e) { return false; }
  }

  window.Verdane.Save = { KEY, BACKUP_KEY, VERSION, defaults, sanitize, migrate, load, save, reset };
})();
