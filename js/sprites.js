/* Pixel-art sprite loader + canvas draw helper.
 * draw() returns false while an image is loading or missing, so callers can
 * keep their emoji fallback. No build step is needed at runtime.
 */
(function () {
  const V = window.Verdane;
  const M = window.VerdaneSpriteManifest || { base: '', sprites: {} };
  const cache = new Map();

  const entry = id => (M.sprites && M.sprites[id]) || null;
  const src = id => {
    const e = entry(id);
    return e ? (M.base || '') + e.file : '';
  };

  function load(id) {
    if (cache.has(id)) return cache.get(id);
    const e = entry(id);
    if (!e || typeof Image === 'undefined') { cache.set(id, null); return null; }
    const img = new Image();
    img.decoding = 'async';
    img.alt = '';
    img.onerror = () => { img._failed = true; };
    img.src = src(id);
    cache.set(id, img);
    return img;
  }

  function ready(id) {
    const img = load(id);
    return !!(img && !img._failed && img.complete && img.naturalWidth > 0);
  }

  function draw(ctx, id, x, y, size, alpha) {
    const e = entry(id);
    if (!e) return false;
    const img = load(id);
    if (!img || img._failed || !img.complete || !img.naturalWidth) return false;
    const s = size || e.draw || e.w * 2;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    ctx.restore();
    return true;
  }

  // Preload everything; a failed image simply leaves the emoji fallback in place.
  Object.keys(M.sprites || {}).forEach(load);

  V.Sprites = { draw, ready, src, entry, preload: load, manifest: M };
})();
