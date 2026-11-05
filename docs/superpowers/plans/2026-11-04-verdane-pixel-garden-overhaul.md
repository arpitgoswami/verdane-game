# Verdane Pixel Garden Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed emoji/pixel presentation with one cohesive pixel-art garden, add game feel, procedural SFX, a real recipe journal, and a redesigned menu/HUD, without changing any gameplay rules.

**Architecture:** A new `js/art.js` owns a code-drawn pixel sprite atlas and a pre-rendered static garden backdrop. `js/game.js` keeps the deterministic simulation and gains a presentation layer (effects, floats, shake, banner, events) rendered through `Art`. `js/audio.js` synthesizes SFX from WebAudio and is driven by drained game events in `js/main.js`, which also renders the new menu, HUD, journal, and result screens. Styling remains Tailwind utilities only.

**Tech Stack:** Static HTML, client-side JavaScript (no modules/build), Tailwind CDN 3.4.17, Google Fonts, Canvas 2D, WebAudio. Existing 24×24 plant PNGs.

**Spec:** `docs/superpowers/specs/2026-11-04-verdane-pixel-garden-overhaul-design.md`

## Global Constraints

- Pure static site: `index.html`, `js/*.js`, Tailwind CDN, Google Fonts, existing PNGs. No CSS files, no Node in the shipped site, no build step.
- Canvas stays 960×540 internal and DPR-aware; the simulation stays deterministic for a given seed.
- No new plants, zombies, missions, modes, or balance changes.
- Touch remains supported; tap targets stay large and the HUD wraps or scrolls on phones.
- Keyboard play, `aria-label`s, focus trapping, and `prefers-reduced-motion` keep working.
- Dev-only test pages, screenshots, and PNG extraction live in `%TEMP%\verdane-verify\` and are never added to the project.
- This folder is not a git repository, so there are no commit steps. Each task ends with a verification checkpoint instead; do not mark a task done without the stated output.

## Verification Tooling (set up in Task 1)

- Node v24 is available for DOM-free logic tests. Load browser scripts with `vm` and a `window` shim.
- Firefox is the only browser. Use a fresh profile every run:
  `& "C:\Program Files\Mozilla Firefox\firefox.exe" --headless --no-remote --profile "$env:TEMP\verdane-verify\ffprofile" ...`
- UI screenshots: `--screenshot "$env:TEMP\verdane-verify\<name>.png" --window-size=1280,1000 "file:///<path>"`
- **DOM/UI test harness:** copy the real `index.html` to `%TEMP%\verdane-verify\app-test.html`, inject `<base href="file:///C:/Users/Dell/Downloads/verdane-web/verdane-web/">` into `<head>`, and append a `<script>` that waits for `load`, drives the UI (for example `#journalBtn.click()`), and writes assertions or a marker into a `#testout` element. Run Firefox with `--dump-dom > dom.txt` and read `dom.txt`. Screenshots of the same temp copy can inject the state first (open journal, start a mission) and then use `--screenshot`.
- Canvas PNGs: render to a canvas in a temp page, write `canvas.toDataURL()` into the DOM, capture with `--dump-dom > dom.txt`, then extract the base64 to a PNG with Node.
- Read every produced PNG with the `read` tool and judge it; a blank/black image means the check failed, not passed.

## Review Focus

- **Touch mapping after scaling:** a tap near a tile edge must still resolve to the intended cell on a 390px-wide phone; verify with a scaled canvas, not just desktop.
- **Reduced motion:** with `prefers-reduced-motion`, shake and particles must stop while banners, health bars, and state changes remain visible.
- **Save survival:** a version-3 save, a corrupted value, or disabled `localStorage` must not crash or wipe progress after adding the muted setting.
- **Failed placement:** clicking during cooldown, without sun, or on an invalid tile must give feedback and never deduct sun.
- **Modal focus:** journal and result dialogs trap focus, close with Esc/backdrop, and return focus to the triggering button.

---

### Task 1: Pixel art atlas and static world (`js/art.js`)

**Files:**
- Create: `js/art.js`
- Modify: `index.html` (add `<script src="js/art.js"></script>` before `js/game.js`)
- Create (dev only): `%TEMP%\verdane-verify\run-js-test.js`, `sprite-preview.html`

**Interfaces:**
- Consumes: nothing.
- Produces: `window.Verdane.Art` with:
  - `Art.MATRICES`: `{ [key]: { palette: Record<string,string>, frames: string[][] } }`, 24×24 frames (boss may be 32×32).
  - `Art.sprite(key, frame?) -> HTMLCanvasElement | null`
  - `Art.draw(ctx, key, x, y, size, opts?) -> boolean` with `opts = { alpha?, frame?, flash?, flip? }`
  - `Art.buildWorld(night: boolean) -> HTMLCanvasElement`
  - `Art.tintKey(key, frame?)` not public; flash handled inside `draw`.
- Required keys: `sun`, `mower`, `pea`, `frost`, `fire`, and `zombie:grunt`, `zombie:cone`, `zombie:bucket`, `zombie:dasher`, `zombie:hurdler`, `zombie:brute`, `zombie:colossus`.

Steps:

- [ ] **1.1 Write the failing atlas test.** In `%TEMP%\verdane-verify\run-js-test.js`, use `vm` with a `window` shim to load `js/art.js`, then assert: every required key exists; every frame is a non-empty array of equal-length strings; every character is `.` or a palette key; the grunt has exactly 2 frames; the colossus sprite is at least 28px wide.
- [ ] **1.2 Run it to fail.** `node "$env:TEMP\verdane-verify\run-js-test.js"` → expect `TypeError` / missing `Verdane.Art`.
- [ ] **1.3 Implement `js/art.js`.** Build a sprite factory that takes string matrices + palette and returns cached offscreen canvases at 1:1 pixel scale (draw with `imageSmoothingEnabled = false`). Define the required matrices: a left-facing zombie base in two walk frames, then cone/bucket hats, a leaner dasher, a hurdler, a bulky brute, and a wide colossus built on the mower. Add pixel sun, mower, pea, frost, and fire tokens. Include a white pre-rendered flash copy per zombie frame. `buildWorld(night)` paints a 960×540 offscreen canvas: house wall/roof/window/door on the left, stone path, 9×5 lawn with two-tone texture plus deterministic blades and pebbles, soil borders, hedge/treeline on the right, day or night palette, and a soft vignette. Guard all `document` use so the file loads under Node.
- [ ] **1.4 Run the atlas test.** Expect all assertions pass.
- [ ] **1.5 Visual check the atlas.** Create `sprite-preview.html` that loads `js/art.js`, draws every key at 6× with labels on a moss background, screenshot it with Firefox, and read the PNG. Iterate on matrices until silhouettes read clearly at 48px. Do not proceed while any sprite is an unrecognizable blob.
- [ ] **1.6 Wire the script tag** into `index.html` before `js/game.js`, and confirm the menu still loads with no console-breaking error (screenshot).

**Checkpoint:** atlas test passes and the sprite screenshot is readable.

---

### Task 2: Render the garden world and all game sprites

**Files:**
- Modify: `js/game.js` (constructor visual state, `draw()`)
- Dev only: `%TEMP%\verdane-verify\render-test.html`, `extract-png.js`

**Interfaces:**
- Consumes: `Verdane.Art` from Task 1.
- Produces: `Game.prototype.draw(ctx)` that uses `Art.buildWorld` and `Art.draw`; `this.world` cached once; no emoji drawn on the canvas.

Steps:

- [ ] **2.1 Write the failing render test.** `render-test.html` loads `js/data.js`, `js/art.js`, `js/game.js`, creates a 960×540 canvas, starts `new Verdane.Game(Verdane.MISSIONS[0], 123)`, seeds a few plants (`place` with enough sun) and zombies (`spawnZ`), steps 120 frames, draws once, then writes `canvas.toDataURL()` into `document.body.textContent`. `extract-png.js` reads `dom.txt`, pulls the base64, writes `canvas.png`.
- [ ] **2.2 Run it to fail.** Capture and read the PNG: it must show the old flat lawn and emoji, proving the harness works.
- [ ] **2.3 Implement world + plant + zombie + sun + mower + projectile drawing.** Cache `this.world = V.Art.buildWorld(!!this.m.noSkySun)` on first draw. Keep plants on their PNGs but add a pixel shadow, a subtle idle bob (`Math.sin(this.t * 2 + p.c * 0.7 + p.r * 0.4)`), and a health bar only when damaged. Draw zombies with `Art.draw` using a 2-frame walk chosen from `Math.floor(this.t * 6 + z.r) % 2`, and the white flash frame when `z.flash > 0`. Draw the pixel sun, mower, and projectiles. Keep the existing cursor, hover ghost, and fusion label working, but tint invalid tiles and draw the ghost through `Art`/PNG consistently.
- [ ] **2.4 Run the render test again.** Read the PNG: no emoji visible; lawn, house, hedge, plants, zombies, sun, and mower all render in the pixel style; no blank regions.
- [ ] **2.5 Grep for emoji in the render path.** `Select-String -Path js/game.js -Pattern '🧟|🌻|🌱|❄|🪵|🌵|💥|🛡|🏦|☄|🦔|☀|🚜'` → no matches inside `draw`. (Data emoji may remain as a fallback for missing sprites, but the canvas must not reach them on a normal load.)

**Checkpoint:** render PNG shows a coherent pixel garden and the emoji grep is clean.

---

### Task 3: Game feel, effects, and event stream

**Files:**
- Modify: `js/game.js` (constructor, `place`, `hurt`, `explode`, `collectSunAt`, `startMower`, wave spawn, boss spawn, `finish`, `step`, `draw`)
- Dev only: `%TEMP%\verdane-verify\events-test.js`, updated `render-test.html`

**Interfaces:**
- Consumes: `Game` from Task 2.
- Produces:
  - `game.events: Array<{type: string, [key: string]: any}>`
  - `game.emit(type, data?)`, `game.drainEvents() -> events`
  - Event types: `place`, `fuse`, `shoot`, `sun`, `kill`, `boom`, `mower`, `wave`, `boss`, `win`, `lose`, `error`
  - Visual state on `game`: `particles`, `floats`, `shake`, `banner`, all updated in `step` and drawn in `draw`.

Steps:

- [ ] **3.1 Write the failing events test.** In `events-test.js`, load `js/data.js` + `js/game.js` under a `window` shim, construct mission 1 with seed 123, set `g.sun = 1000`, then: `g.place('peashooter', 0, 0)` → `drainEvents()` contains `place`; `g.place('peashooter', 0, 0)` with 0 sun later → `error` and sun unchanged; `g.spawnZ('grunt', 0, 500); g.hurt(g.zs[0], 9999, 'shot')` → contains `kill`; `g.collectSunAt` on an injected sun → contains `sun`; `g.finish(true)` → contains `win`.
- [ ] **3.2 Run it to fail.** Expect missing `drainEvents`.
- [ ] **3.3 Implement events and effects.** Add a capped event buffer (max 32 per frame). Emit at the sources listed above. Add capped particle/floating-text arrays (particles ≤ 180, floats ≤ 24) and helper methods `puff`, `floatText`, `ring`, `setBanner`. Spawn: leaf puff + placement pop on place/fuse; splat particles and a kill puff on damage/death; sparkle and `+sun` float on collect; ring, particles, and shake on explosion; dust and shake on mower; banner and shake on boss; a wave banner on each wave. Store `p.pop` on planted objects and decay it in `step`. Apply shake by translating the whole scene in `draw`, with magnitude clamped and decayed. Skip particles and shake entirely when `this.reduceMotion` is true, but keep banners and floats.
- [ ] **3.4 Add the reduce-motion test.** In `events-test.js`, set `g.reduceMotion = true`, trigger an explosion, step once, and assert `g.particles.length === 0`, `g.shake === 0`, and `g.banner` still exists when a wave is due.
- [ ] **3.5 Re-run events tests.** All assertions pass.
- [ ] **3.6 Visual check effects.** Update `render-test.html` to trigger a placement, a kill, an explosion, and a wave banner, then screenshot. Read the PNG and confirm effects are visible but not covering the board. If Firefox headless captures a frame before effects appear, step the exact frames where the effects live and assert they exist in the DOM dump as well as the PNG.

**Checkpoint:** events tests pass; effects PNG is legible.

---

### Task 4: Procedural audio and mute persistence

**Files:**
- Create: `js/audio.js`
- Modify: `index.html` (script tag before `js/main.js`), `js/save.js`, `js/main.js`
- Dev only: `%TEMP%\verdane-verify\save-test.js`, `audio-test.html`

**Interfaces:**
- Consumes: game events from Task 3.
- Produces:
  - `window.Verdane.Audio = { init(), play(name), setMuted(bool), isMuted() }`
  - `Save.VERSION === 4`; `save.settings.muted: boolean`
  - `main.js` drains events once per frame and maps them to sound names.

Steps:

- [ ] **4.1 Write the failing save test.** Load `js/data.js` + `js/save.js` under a `window` shim. Assert: `V.Save.migrate({v:3,completed:[1],stars:{1:2},settings:{speed:2,autoSun:false}})` returns `v:4`, keeps `speed:2`/`autoSun:false`, and sets `muted:false`; `sanitize({...migrated,settings:{muted:'yes'}})`, `muted === false`; a future `v:5` save still returns `null`.
- [ ] **4.2 Run it to fail.** Expect version 3 / no muted.
- [ ] **4.3 Implement save VERSION 4.** Add `muted:false` to defaults and sanitization; add `MIGRATIONS[3] = s => ({...s, v:4, settings: Object.assign({muted:false}, s.settings)})`. Keep backup behavior unchanged.
- [ ] **4.4 Implement `js/audio.js`.** Lazily create `AudioContext` on `init()`; return quietly when unavailable. Synthesize short envelopes for `click`, `plant`, `fuse`, `shoot`, `hit`, `sun`, `boom`, `mower`, `wave`, `win`, `lose`, `error`. Route through a master gain (low default), gate on `muted`, and never start before a user gesture.
- [ ] **4.5 Wire audio into `main.js`.** Call `V.Audio.init()` on the first pointerdown/keydown; set `V.Audio.setMuted(save.settings.muted)` at load; in `loop`, drain events and play the mapped sound; add a mute button in the HUD and menu that toggles, persists, and updates `aria-pressed`.
- [ ] **4.6 Run the save test.** All assertions pass.
- [ ] **4.7 Headless smoke test audio.** `audio-test.html` calls `Audio.init(); Audio.play('plant'); Audio.setMuted(true); Audio.play('sun');` and writes any thrown error into the DOM. Run `--dump-dom` and confirm it contains `ok` and no stack trace.

**Checkpoint:** save test passes; audio page reports `ok`; mute button persists across reload (verify in a screenshot run or DOM dump).

---

### Task 5: Menu hero, seed-packet mission cards, and Graft Journal

**Files:**
- Modify: `index.html` (menu markup, new journal modal), `js/main.js` (`showMenu`, journal wiring), `js/data.js` (role blurbs)

**Interfaces:**
- Consumes: `Verdane.ALL`, `Verdane.PLANTS`, `Verdane.FUSIONS`, `Verdane.Sprites.src`.
- Produces: `#journalBtn`, `#journal`, `#journalBody`, `#journalClose`; `openJournal()`, `closeJournal()` in `main.js`; every plant/fusion has a `role` string.

Steps:

- [ ] **5.1 Write the failing DOM test.** Generate `app-test.html` per Verification Tooling, inject a script that clicks `#journalBtn`, and assert: `#journalBtn` exists; `#journalBody` contains 10 plant cards and 4 fusion recipe rows; every mission card is a `button` with a non-empty `aria-label` or visible title. Write `journal=ok plants=10 fusions=4` or the failure into `#testout` and capture with `--dump-dom`.
- [ ] **5.2 Run it to fail.** Expect missing journal markup.
- [ ] **5.3 Add role blurbs.** Give all 6 plants and 4 fusions a one-line `role` in `js/data.js`. No balance edits.
- [ ] **5.4 Add the menu hero and cards.** In `index.html`, build a rounded moss hero with the `Verdane` wordmark, subtitle "The Graft Journal", three plant sprites (`sunsprout`, `peashooter`, `barkwall`) as pixel accents, and a three-step how-to strip (Plant → Fuse → Defend). Add a "Graft Journal" button beside the missions heading. Restyle mission cards in `showMenu` as seed packets: number badge, title, stars, tip, a row of seed sprite thumbnails, a clear "Next" / "Locked" / "Cleared" state, and a full-card `aria-label`.
- [ ] **5.5 Add the journal modal.** Markup mirrors the result modal with a scrollable body. `openJournal()` renders two sections: base plants (sprite, name, cost, role) and grafts (sprite, name, cost, `A + B → C` recipe, role). Close on button, backdrop, and Esc; trap focus; return focus to `#journalBtn`. Add a `J` hotkey during play that pauses nothing but opens the journal, closing on Esc.
- [ ] **5.6 Run the DOM test and screenshots.** Verify the counts and labels, then screenshot at 1280px and 390px. Read both PNGs: no overlap, no clipped text, cards readable on a phone.

**Checkpoint:** journal counts pass; desktop and phone menu screenshots look intentional.

---

### Task 6: HUD redesign, result dialog, and touch layout

**Files:**
- Modify: `index.html` (HUD/game section, result modal classes), `js/main.js` (`hud`, `end`, mute/status wiring)

**Interfaces:**
- Consumes: `game.sun`, `game.sched`, `game.wi`, `game.cd`, `game.sel`, `game.shovel`, `game.autoSun`, `game.speed`, `game.result`.
- Produces: HUD nodes `#sun`, `#sunPulse`, `#wave`, `#wavefill`, `#packets`, `#shovel`, `#autosun`, `#speed`, `#pause`, `#journalBtnGame`, `#mute`, `#quit`; packet cards keep `#pk-<id>`, `.cdv`, `.cdt`; `Verdane.toBoard(rect, clientX, clientY) -> {x, y}` exported from `js/game.js` and used by `main.js` pointer/touch handlers.

Steps:

- [ ] **6.1 Write the failing HUD and mapping tests.** In `events-test.js`, assert `Verdane.toBoard({left:0,top:0,width:390,height:219.375}, 195, 109.6875)` returns approximately `{x:480, y:270}` and that `game.cell(480, 270)` is `{c:4, r:2}` (phone-sized canvas still maps to the right tile). In `app-test.html`, start mission 1 and assert: `#sun` shows 150, `#wave` contains `Wave 1/`, `#wavefill` exists, every seed has a packet button with `aria-pressed`, and mute/journal controls expose `aria-label`s.
- [ ] **6.2 Run both to fail.** Expect missing `toBoard` and HUD nodes.
- [ ] **6.3 Implement the HUD and `toBoard`.** One rounded panel: sun counter with pixel sun icon and a pulse class when sun increases; a wave block with `Wave n/total`, next-wave countdown, and a segmented fill bar; compact icon buttons for shovel, auto-sun, speed, pause, journal, mute, menu (inline SVG, `aria-label`, `aria-pressed` where toggleable). Below it, a horizontally scrollable packet strip: 64×80 cards with the plant sprite, cost, hotkey badge, cooldown veil + seconds, ready glow, selected ring, and unaffordable dimming. Keep the `hidden` toggle logic for pause/overlay. Replace the local `pos` math with `Verdane.toBoard` so mouse and touch share one tested mapping.
- [ ] **6.4 Mobile pass.** Ensure the panel wraps at 390px, packets scroll with `min-w-0`/`shrink-0`, buttons are at least 44px tall, and the canvas keeps its 16:9 aspect. Screenshot at 390px and confirm the mapping test from 6.1 covers the scaled tap math.
- [ ] **6.5 Restyle the result dialog.** Garden-framed card, large stars, clear win/loss copy, time/par/mower stats, seed line, and the same retry/next/menu actions with focus restored. Add a small "View journal" action.
- [ ] **6.6 Run HUD test and screenshots.** Screenshot the game at 1280px and 390px, plus a result dialog and the journal-open state. Read every PNG; fix clipping/overflow before moving on.

**Checkpoint:** HUD test passes; all four screenshots are clean at both widths.

---

### Task 7: Final verification, performance, and docs

**Files:**
- Modify: `README.md`
- Verify: whole project

Steps:

- [ ] **7.1 Run all logic tests.** `node "$env:TEMP\verdane-verify\run-js-test.js"` and `node "$env:TEMP\verdane-verify\events-test.js"` and `node "$env:TEMP\verdane-verify\save-test.js"` → all pass.
- [ ] **7.2 Perf check.** Temp `perf.html` builds the game, warms 60 frames, then times 600 `step + draw` iterations and writes `avg=<ms>` to the DOM. Run `--dump-dom`. Headless software rendering may exceed 16.7ms; record the number and require `< 33ms`, then spot-check that no per-frame allocation loop or un-capped particle array exists.
- [ ] **7.3 Content and style audit.** `Get-ChildItem -Recurse -File` shows only `.html`, `.js`, `.md`, `.png`; no `css/`, `node_modules`, `package.json`, `tests/`, or `tools/`. Grep the canvas draw path for emoji (same list as Task 2.5) → none.
- [ ] **7.4 Accessibility audit.** DOM dump proves: all buttons have accessible names; both modals trap focus and close on Esc; `prefers-reduced-motion` path leaves banners/health bars visible and suppresses shake/particles (covered by Task 3.4).
- [ ] **7.5 Update `README.md`.** Describe the new art/audio/UI files, controls including `J`, the journal, mute, and the temp-only verification approach. Remove anything stale.
- [ ] **7.6 Final screenshots.** Menu, journal, gameplay, and result at desktop and phone widths. Read them all before declaring done.

**Checkpoint:** every listed command has passing output, and the screenshots show the finished game.
