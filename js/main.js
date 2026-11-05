/* UI wiring: menu, HUD, journal, audio, loop, input, and viewport scaling. Save logic lives in js/save.js. */
(function () {
  const V = window.Verdane, S = V.Save, $ = id => document.getElementById(id);
  let save = S.load(), game = null, raf = 0, last = 0, acc = 0, lastHud = 0, lastSun = 0;
  let journalReturnFocus = null, journalWasPaused = false, audioStarted = false;
  const cv = $('cv'), ctx = cv.getContext('2d'), modal = $('modal'), journal = $('journal'), missionsPage = $('missions-page');
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const prefersReducedMotion = () => !!(reduceMQ && reduceMQ.matches);
  const clamp = n => Math.max(0, Math.min(1, n));
  const SOUND = { place: 'plant', fuse: 'fuse', shoot: 'shoot', sun: 'sun', kill: 'hit', boom: 'boom', mower: 'mower', wave: 'wave', boss: 'boss', win: 'win', lose: 'lose', error: 'error', vase: 'vase', vaseZombie: 'vase', vaseSun: 'sun', stun: 'stun', split: 'split', summon: 'summon' };

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(V.dim.W * dpr);
    cv.height = Math.round(V.dim.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  fitCanvas();
  addEventListener('resize', fitCanvas);

  function drawSunIcon() {
    const c = $('sunIcon'), x = c.getContext('2d');
    x.clearRect(0, 0, 16, 16);
    if (V.Art) V.Art.draw(x, 'sun', 8, 8, 16);
    else { x.fillStyle = '#ffc94a'; x.beginPath(); x.arc(8, 8, 6, 0, Math.PI * 2); x.fill(); }
  }
  drawSunIcon();

  /* ---------- audio ---------- */
  function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    if (V.Audio) { V.Audio.init(); V.Audio.setMuted(!!save.settings.muted); }
  }
  function syncMute() {
    const muted = !!save.settings.muted;
    document.querySelectorAll('[data-mute]').forEach(b => {
      b.setAttribute('aria-pressed', String(muted));
      b.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    });
    document.querySelectorAll('.mute-on').forEach(el => el.classList.toggle('hidden', muted));
    document.querySelectorAll('.mute-off').forEach(el => el.classList.toggle('hidden', !muted));
    if (V.Audio) V.Audio.setMuted(muted);
  }
  function setMuted(muted) {
    save.settings.muted = !!muted;
    S.save(save);
    syncMute();
  }
  document.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', () => {
    startAudio();
    setMuted(!save.settings.muted);
  }));
  document.addEventListener('pointerdown', startAudio, { capture: true });
  document.addEventListener('keydown', startAudio, { capture: true });
  syncMute();

  /* ---------- helpers ---------- */
  function randomSeed() {
    try {
      const a = new Uint32Array(1);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return a[0] >>> 0;
    } catch (e) {
      return (Math.random() * 0x100000000) >>> 0;
    }
  }
  function highestCompleted() {
    let n = 0;
    while (n < V.MISSIONS.length && save.completed.includes(n + 1)) n++;
    return n;
  }
  function starCount(m) {
    const n = Number(save.stars[m.id]);
    return Number.isFinite(n) ? Math.max(0, Math.min(3, Math.trunc(n))) : 0;
  }
  function totalStars() {
    return V.MISSIONS.reduce((sum, m) => sum + starCount(m), 0);
  }
  function firstEnabledMission() {
    return $('missions-grid').querySelector('button:not([disabled])');
  }
  function spriteSrc(id) {
    return V.Sprites && V.Sprites.src ? V.Sprites.src(id) : '';
  }
  const starLine = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  /* ---------- menu ---------- */
  function showMenu() {
    cancelAnimationFrame(raf); raf = 0;
    if (!journal.classList.contains('hidden')) closeJournal();
    game = null;
    modal.classList.add('hidden');
    $('game').classList.add('hidden');
    $('game').inert = false;
    missionsPage.classList.add('hidden');
    $('menu').classList.remove('hidden');
    $('paused').classList.add('hidden');
    renderMissions();
    const first = firstEnabledMission();
    if (first) first.focus({ preventScroll: true });
  }

  function showMissions() {
    cancelAnimationFrame(raf); raf = 0;
    if (!journal.classList.contains('hidden')) closeJournal();
    game = null;
    modal.classList.add('hidden');
    $('game').classList.add('hidden');
    $('game').inert = false;
    $('menu').classList.add('hidden');
    missionsPage.classList.remove('hidden');
    $('paused').classList.add('hidden');
    renderMissions();
    const first = $('missions-grid').querySelector('button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }

  function renderMissions() {
    const top = Math.min(V.MISSIONS.length, highestCompleted() + 1);
    const stars = totalStars();
    $('progressText').textContent = `${save.completed.length} of ${V.MISSIONS.length} gardens · ${stars} of ${V.MISSIONS.length * 3} stars`;
    const pct = V.MISSIONS.length ? (save.completed.length / V.MISSIONS.length) * 100 : 0;
    $('progressFill').style.width = pct + '%';
    $('missions-grid').innerHTML = '';
    V.MISSIONS.forEach(m => {
      const open = m.id <= top || save.completed.includes(m.id);
      const st = starCount(m);
      const status = save.completed.includes(m.id) ? 'Cleared' : open ? 'Next' : 'Locked';
      const b = document.createElement('button');
      b.type = 'button'; b.disabled = !open;
      b.className = 'group relative overflow-hidden rounded-2xl border p-6 sm:p-8 text-left transition-colors motion-reduce:transition-none ' + (open
        ? 'border-moss-600/70 bg-moss-800/70 hover:border-leaf hover:bg-moss-800/90 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf focus-visible:outline-offset-2 shadow-lg shadow-moss-800/30'
        : 'border-moss-800 bg-ink/40 opacity-50 cursor-not-allowed');
      b.setAttribute('aria-label', `${m.id}. ${m.title}, ${status.toLowerCase()}${st ? ', ' + st + ' of 3 stars' : ''}. ${m.tip}`);
      const thumbs = m.seeds.slice(0, 6).map(id => {
        const src = spriteSrc(id);
        return src
          ? `<img src="${src}" alt="" aria-hidden="true" class="h-9 w-9 [image-rendering:pixelated] ${open ? '' : 'grayscale'}">`
          : '<span class="h-9 w-9" aria-hidden="true"></span>';
      }).join('');
      b.innerHTML = `
        <span class="absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${status === 'Next' ? 'bg-sun text-ink' : status === 'Cleared' ? 'bg-leaf/20 text-leaf' : 'bg-ink/80 text-moss-200/50'}">${status}</span>
        <span class="flex items-start gap-4 pr-20">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-moss-600/60 bg-ink/50 font-display text-xl leading-none text-leaf">${String(m.id).padStart(2, '0')}</span>
          <span class="min-w-0">
            <span class="block font-display text-xl leading-tight text-moss-200">${m.title}</span>
            <span class="mt-1 block text-sm tracking-[0.18em] text-sun" aria-label="${st} of 3 stars">${starLine(st)}</span>
            <span class="mt-2 block text-sm leading-relaxed text-moss-200/70">${m.tip}</span>
          </span>
        </span>
        <span class="mt-4 flex items-center gap-2">
          ${thumbs}
          <span class="ml-auto text-sm text-moss-200/45">${m.waves} waves${m.boss ? ' · boss' : ''}</span>
        </span>`;
      if (open) b.onclick = () => start(m);
      $('missions-grid').appendChild(b);
    });
  }

  /* ---------- journal ---------- */
  function journalCard(id, d, fused) {
    const src = spriteSrc(id);
    const recipe = fused
      ? `<p class="mt-2 rounded-lg bg-leaf/10 px-2 py-1 text-[11px] text-leaf">${V.ALL[d.a].n} + ${V.ALL[d.b].n} &rarr; ${d.n}</p>`
      : '';
    const thumb = src
      ? `<img src="${src}" alt="" aria-hidden="true" class="h-9 w-9 object-contain [image-rendering:pixelated]">`
      : `<span class="font-display text-lg text-leaf" aria-hidden="true">${d.n.charAt(0)}</span>`;
    return `
      <article class="journal-card${fused ? ' journal-fuse' : ''} rounded-2xl border border-moss-600/50 bg-ink/40 p-3">
        <div class="flex items-center gap-3">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-moss-600/50 bg-ink/60">${thumb}</span>
          <div class="min-w-0">
            <h4 class="font-display text-base leading-tight text-moss-200">${d.n}</h4>
            <p class="text-[11px] text-sun">${d.cost} sun${d.cd ? ' · ' + d.cd + 's cooldown' : ''}</p>
          </div>
        </div>
        <p class="mt-2 text-xs leading-relaxed text-moss-200/70">${d.role || ''}</p>
        ${recipe}
      </article>`;
  }

  function renderJournal() {
    const base = Object.keys(V.PLANTS).map(id => journalCard(id, V.PLANTS[id], false)).join('');
    const fuse = Object.keys(V.FUSIONS).map(id => journalCard(id, V.FUSIONS[id], true)).join('');
    $('journalBody').innerHTML = `
      <section aria-labelledby="journal-base">
        <div class="flex items-baseline justify-between gap-3">
          <h3 id="journal-base" class="font-display text-lg text-leaf">Seed stock</h3>
          <span class="text-[11px] uppercase tracking-[0.16em] text-moss-200/45">${Object.keys(V.PLANTS).length} plants</span>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">${base}</div>
      </section>
      <section class="mt-6" aria-labelledby="journal-grafts">
        <div class="flex items-baseline justify-between gap-3">
          <h3 id="journal-grafts" class="font-display text-lg text-sun">Grafts</h3>
          <span class="text-[11px] uppercase tracking-[0.16em] text-moss-200/45">${Object.keys(V.FUSIONS).length} recipes</span>
        </div>
        <p class="mt-1 text-xs text-moss-200/55">Plant a seed onto the first plant to graft. Fused plants keep the health they had.</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">${fuse}</div>
      </section>`;
  }

  function openJournal() {
    if (!journal.classList.contains('hidden')) return;
    renderJournal();
    journalReturnFocus = document.activeElement;
    journalWasPaused = !!(game && game.paused);
    if (game && game.state === 'play' && !game.paused) {
      game.paused = true;
      $('paused').classList.remove('hidden');
    }
    journal.classList.remove('hidden');
    $('journalClose').focus({ preventScroll: true });
  }
  function closeJournal() {
    if (journal.classList.contains('hidden')) return;
    journal.classList.add('hidden');
    if (game && game.state === 'play') {
      game.paused = journalWasPaused;
      $('paused').classList.toggle('hidden', !game.paused);
      if (!game.paused) { last = performance.now(); acc = 0; }
    }
    const back = journalReturnFocus;
    if (back && typeof back.focus === 'function' && document.contains(back)) back.focus({ preventScroll: true });
  }
  $('journalBtn').onclick = openJournal;
  const jb2 = $('journalBtn2'); if (jb2) jb2.onclick = openJournal;
  $('journalBtnGame').onclick = openJournal;
  $('journalResult').onclick = openJournal;
  $('chooseMission').onclick = showMissions;
  $('backToMenu').onclick = showMenu;
  $('journalBtnMissions').onclick = openJournal;
  $('journalClose').onclick = closeJournal;
  journal.addEventListener('mousedown', e => { if (e.target === journal) closeJournal(); });

  /* ---------- game start ---------- */
  function minPrice(pid) {
    const d = V.ALL[pid];
    let min = d.cost;
    Object.entries(V.FUSIONS).forEach(([id, f]) => {
      if (!game.m.fusions.includes(id) || (f.a !== pid && f.b !== pid)) return;
      const other = V.ALL[f.a === pid ? f.b : f.a];
      min = Math.min(min, Math.round(Math.max(0.5 * d.cost, f.cost - other.cost)));
    });
    return min;
  }

  function start(m, seed) {
    missionsPage.classList.add('hidden');
    cancelAnimationFrame(raf);
    if (!journal.classList.contains('hidden')) closeJournal();
    $('menu').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('game').inert = false;
    modal.classList.add('hidden');
    $('paused').classList.add('hidden');

    game = new V.Game(m, seed == null ? randomSeed() : seed >>> 0);
    game.speed = save.settings.speed || 1;
    game.autoSun = save.settings.autoSun !== false;
    game.reduceMotion = prefersReducedMotion();
    syncAutoSun();
    setPaused(false);

    $('title').textContent = m.title;
    $('tip').textContent = m.tip;
    $('packets').innerHTML = '';
    m.seeds.forEach((pid, i) => {
      const d = V.ALL[pid], b = document.createElement('button');
      b.type = 'button';
      b.id = 'pk-' + pid;
      b.className = 'packet group relative flex h-[86px] w-[70px] shrink-0 flex-col items-center justify-center rounded-xl border border-moss-600/70 bg-ink/50 pt-1 transition-colors hover:border-leaf motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf focus-visible:outline-offset-2';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', d.n + ', cost ' + d.cost);
      const src = spriteSrc(pid);
      b.innerHTML = `
        <span class="absolute left-1 top-1 z-10 rounded bg-black/60 px-1 text-[10px] font-bold leading-4 text-moss-200/80">${i + 1}</span>
        <span class="grid h-10 w-10 place-items-center" aria-hidden="true">
          ${src ? `<img class="h-10 w-10 object-contain [image-rendering:pixelated]" src="${src}" alt="">` : ''}
          <span class="monogram ${src ? 'hidden' : ''} font-display text-lg text-leaf">${d.n.charAt(0)}</span>
        </span>
        <span class="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold leading-none text-sun"><span class="h-1.5 w-1.5 rounded-full bg-sun" aria-hidden="true"></span>${d.cost}</span>
        <span class="mt-0.5 max-w-[64px] truncate text-[9px] uppercase tracking-[0.08em] text-moss-200/55">${d.n}</span>
        <span class="cdv absolute inset-x-0 top-0 bg-black/65" style="height:0"></span>
        <span class="cdt absolute inset-x-0 bottom-0 bg-black/65 text-center text-[10px] leading-4 text-white"></span>`;
      if (src) {
        const img = b.querySelector('img'), mono = b.querySelector('.monogram');
        img.onerror = () => { img.classList.add('hidden'); mono.classList.remove('hidden'); };
      }
      b.onclick = () => select(pid);
      $('packets').appendChild(b);
    });

    $('speed').textContent = 'x' + game.speed;
    $('speed').setAttribute('aria-label', 'Game speed x' + game.speed);
    setPaused(false);
    lastSun = game.sun; lastHud = 0;
    last = performance.now(); acc = 0;
    hud(last);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    cv.focus({ preventScroll: true });
  }

  function select(pid) {
    if (!game || game.state !== 'play') return;
    startAudio();
    game.shovel = false;
    game.sel = game.sel === pid ? null : pid;
  }
  function toggleShovel() {
    if (!game || game.state !== 'play') return;
    game.shovel = !game.shovel; game.sel = null;
  }
  function syncAutoSun() {
    const on = !!(game && game.autoSun);
    const el = $('autosun');
    el.setAttribute('aria-pressed', String(on));
    el.classList.toggle('ring-2', on);
    el.classList.toggle('ring-leaf', on);
  }
  function toggleAutoSun() {
    if (!game || game.state !== 'play') return;
    game.autoSun = !game.autoSun;
    save.settings.autoSun = game.autoSun; S.save(save);
    syncAutoSun();
    game.say('Auto-collect sun ' + (game.autoSun ? 'on' : 'off'));
  }
  function setPaused(paused) {
    if (!game || game.state !== 'play') return;
    game.paused = paused;
    const btn = $('pause');
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Resume game (P)' : 'Pause game (P)');
    btn.querySelector('.pause-play').classList.toggle('hidden', !paused);
    btn.querySelector('.pause-stop').classList.toggle('hidden', paused);
    $('paused').classList.toggle('hidden', !paused);
    if (!paused) { last = performance.now(); acc = 0; }
  }
  function togglePause() { if (game) setPaused(!game.paused); }

  /* ---------- loop + HUD ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!game) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (game.paused) acc = 0;
    else {
      acc += dt;
      while (acc >= 1 / 60) { for (let i = 0; i < game.speed; i++) game.step(1 / 60); acc -= 1 / 60; }
    }
    if (V.Audio) {
      const events = game.drainEvents();
      for (const ev of events) { const s = SOUND[ev.type]; if (s) V.Audio.play(s); }
    }
    game.draw(ctx);
    hud(now);
    if (game.state !== 'play' && modal.classList.contains('hidden')) end();
  }

  function hud(now) {
    if (now - lastHud < 60 && game.state === 'play') return;
    lastHud = now;
    const sun = Math.floor(game.sun);
    setText('sun', sun);
    if (sun > lastSun) {
      const el = $('sunPulse');
      el.classList.add('scale-110');
      clearTimeout(el._pulse);
      el._pulse = setTimeout(() => el.classList.remove('scale-110'), 170);
    }
    lastSun = sun;
    setText('note', game.noteT > 0 ? game.note : '');

    const total = game.sched.length, started = game.wi;
    const current = Math.min(Math.max(1, started), total);
    setText('wave', `Wave ${current}/${total}`);
    if (started < total) {
      const left = Math.max(0, Math.ceil(game.sched[started].t - game.t));
      setText('wavenext', `next in ${left}s`);
    } else if (game.bossAt !== null && !game.bossDone) setText('wavenext', 'boss incoming');
    else setText('wavenext', 'final wave');

    let pct = 0;
    if (started > 0) {
      const prevT = game.sched[started - 1].t;
      const nextT = started < total ? game.sched[started].t : game.t;
      const frac = nextT > prevT ? clamp((game.t - prevT) / (nextT - prevT)) : 1;
      pct = clamp((started - 1 + frac) / total);
    } else if (total) pct = clamp((game.t / game.sched[0].t) / total);

    const fill = $('wavefill');
    fill.style.width = (pct * 100).toFixed(1) + '%';
    $('wavebar').setAttribute('aria-valuenow', String(Math.round(pct * 100)));

    const shovel = String(game.shovel);
    if ($('shovel').getAttribute('aria-pressed') !== shovel) $('shovel').setAttribute('aria-pressed', shovel);
    $('shovel').classList.toggle('ring-2', game.shovel);
    $('shovel').classList.toggle('ring-leaf', game.shovel);

    game.m.seeds.forEach(pid => {
      const b = $('pk-' + pid);
      if (!b) return;
      const d = V.ALL[pid], cd = game.cd[pid] || 0, sel = game.sel === pid;
      b.querySelector('.cdv').style.height = (cd > 0 ? 100 * cd / d.cd : 0) + '%';
      const cdText = cd > 0 ? Math.ceil(cd) + 's' : '';
      const cdt = b.querySelector('.cdt');
      if (cdt.textContent !== cdText) cdt.textContent = cdText;
      b.classList.toggle('ring-2', sel);
      b.classList.toggle('ring-leaf', sel);
      b.classList.toggle('border-leaf', sel);
      b.classList.toggle('opacity-45', cd > 0 || game.sun < minPrice(pid));
      const pressed = String(sel);
      if (b.getAttribute('aria-pressed') !== pressed) b.setAttribute('aria-pressed', pressed);
      const label = `${d.n}, cost ${d.cost}${cd > 0 ? ', recharging' : ''}${sel ? ', selected' : ''}`;
      if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
    });
  }

  function setText(id, text) {
    const el = $(id), value = String(text);
    if (el.textContent !== value) el.textContent = value;
  }

  /* ---------- end of mission ---------- */
  function end() {
    const r = game.result, m = game.m, seed = game.seed;
    if (r.won) {
      if (!save.completed.includes(m.id)) save.completed.push(m.id);
      save.completed.sort((a, b) => a - b);
      save.stars[m.id] = Math.max(save.stars[m.id] || 0, r.stars);
      S.save(save);
    }
    const next = V.MISSIONS.find(x => x.id === m.id + 1);
    $('mt').textContent = r.won ? 'Garden defended' : 'The house is breached';
    $('mb').innerHTML = r.won
      ? `<p class="font-display text-4xl tracking-[0.14em] text-sun" aria-label="${r.stars} of 3 stars">${starLine(r.stars)}</p>
         <p class="mt-2">Cleared in <span class="text-moss-200">${Math.round(r.time)}s</span> · par ${m.par}s</p>
         <p class="mt-1 text-xs text-moss-200/60">${game.mowersUsed ? game.mowersUsed + ' mower' + (game.mowersUsed > 1 ? 's' : '') + ' used' : 'No mowers used'} · seed ${seed}</p>`
      : `<p class="text-base text-moss-200">The horde found the door. Build sun early, then walls and shooters in every lane.</p>
         <p class="mt-2 text-xs text-moss-200/60">Wave ${Math.min(Math.max(1, game.wi), game.sched.length)} of ${game.sched.length} · seed ${seed}</p>`;
    $('again').onclick = () => start(m, seed);
    $('menuBtn').onclick = showMenu;
    $('nextBtn').classList.toggle('hidden', !(r.won && next));
    $('nextBtn').onclick = () => { if (next) start(next); };
    $('game').inert = true;
    modal.classList.remove('hidden');
    cancelAnimationFrame(raf); raf = 0;
    const primary = !$('nextBtn').classList.contains('hidden') ? $('nextBtn') : $('again');
    primary.focus({ preventScroll: true });
  }

  /* ---------- modals / focus ---------- */
  function focusables(root) {
    return [...root.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && !el.classList.contains('hidden'));
  }
  function trapFocus(e, root) {
    const f = focusables(root);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }

  /* ---------- pointer + touch ---------- */
  const pos = e => V.toBoard(cv.getBoundingClientRect(), e.clientX, e.clientY);
  cv.addEventListener('mousedown', e => {
    if (!game) return;
    game.showCursor = false;
    if (e.button === 2) { game.cancel(); return; }
    const p = pos(e); game.click(p.x, p.y);
  });
  cv.addEventListener('mousemove', e => { if (!game) return; game.mouse = pos(e); game.showCursor = false; });
  cv.addEventListener('mouseleave', () => { if (game) game.mouse = null; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('touchstart', e => {
    if (!game) return;
    game.showCursor = false;
    const t = e.touches[0];
    const p = V.toBoard(cv.getBoundingClientRect(), t.clientX, t.clientY);
    game.mouse = p; game.click(p.x, p.y); e.preventDefault();
  }, { passive: false });

  /* ---------- keyboard ---------- */
  addEventListener('keydown', e => {
    if (!journal.classList.contains('hidden')) {
      if (e.key === 'Tab') { trapFocus(e, journal); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeJournal(); }
      return;
    }
    if (!modal.classList.contains('hidden')) {
      if (e.key === 'Tab') { trapFocus(e, modal); return; }
      if (e.key === 'Escape') { e.preventDefault(); showMenu(); }
      return;
    }
    if (!game) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const onControl = /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag);
    if (e.key >= '1' && e.key <= '9') { const pid = game.m.seeds[+e.key - 1]; if (pid) select(pid); return; }
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft') { e.preventDefault(); game.moveCursor(-1, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); game.moveCursor(1, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); game.moveCursor(0, -1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); game.moveCursor(0, 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && !onControl) { e.preventDefault(); game.activateCursor(); }
    else if (k === 's') toggleShovel();
    else if (k === 'a') toggleAutoSun();
    else if (k === 'p') togglePause();
    else if (k === 'j') { e.preventDefault(); openJournal(); }
    else if (k === 'm') setMuted(!save.settings.muted);
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (game.sel || game.shovel) game.cancel(); else togglePause();
    }
  });

  /* ---------- controls ---------- */
  $('shovel').onclick = toggleShovel;
  $('pause').onclick = togglePause;
  $('autosun').onclick = toggleAutoSun;
  $('speed').onclick = () => {
    if (!game) return;
    game.speed = game.speed % 3 + 1;
    save.settings.speed = game.speed; S.save(save);
    $('speed').textContent = 'x' + game.speed;
    $('speed').setAttribute('aria-label', 'Game speed x' + game.speed);
  };
  $('quit').onclick = () => {
    if (!game || game.state !== 'play' || confirm('Quit this run? Progress in this mission will be lost.')) showMenu();
  };
  $('reset').onclick = () => {
    if (confirm('Erase all progress?')) { S.reset(); save = S.defaults(); S.save(save); syncMute(); showMenu(); }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && game.state === 'play' && !game.paused) setPaused(true);
  });
  const onMotionChange = () => { if (game) game.reduceMotion = prefersReducedMotion(); };
  if (reduceMQ) {
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onMotionChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onMotionChange);
  }

  showMenu();
})();
