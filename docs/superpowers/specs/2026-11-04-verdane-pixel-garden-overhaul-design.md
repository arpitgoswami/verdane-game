# Verdane: Pixel Garden Overhaul — Design

Date: 2026-11-04
Status: awaiting approval

## Intent

Make Verdane feel like a finished, cohesive pixel-art garden-defense game instead of a
solid simulation wearing mixed art styles. The existing 24×24 plant sprites are the anchor;
every other visual should be brought up to their level, and the moment-to-moment feedback
should make planting, shooting, and surviving feel good. Gameplay rules and balance stay
untouched.

Why: the simulation is already capable (6 missions, 6 plants, 4 fusions, 7 zombies, seeded
RNG, versioned saves). The weakest link is presentation: bespoke pixel plants next to OS
emoji zombies, a flat checkerboard lawn, no impact feedback, and a menu that does not sell
the fantasy.

## Goals

1. One art language on the canvas: pixel-art world, plants, zombies, sun, mowers, projectiles,
   and effects, all rendered from the same palette and pixel grid.
2. Game feel: placement pop, hit flash, splat/death particles, sun sparkle, explosion ring,
   mower dust, boss shockwave, tasteful screen shake, wave banner, and a pulse on the sun counter.
3. Legible UI: a garden-scene title screen, seed-packet mission cards, a HUD that communicates
   wave progress and cooldown/affordability, and a real "Graft Journal" recipe codex.
4. Lightweight procedural audio: synthesized SFX for plant, shot, hit, sun, explosion, mower,
   wave, win/lose, with a persisted mute toggle. No audio files.
5. Keep it dependency-free: HTML + client-side JS + Tailwind only, no CSS files, no Node, no
   build step, no downloaded art.

## Non-goals

- New plants, zombies, missions, or modes.
- Balance or rule changes (damage, costs, cooldowns, wave budgets stay as-is).
- Multiplayer, backend, or accounts.
- Replacing the plant PNGs.
- A full soundtrack (SFX only).

## Anti-goals

- Any leftover emoji on the canvas (zombies, sun, mower, projectiles).
- Per-frame DOM churn in the HUD.
- Visual randomness leaking into the seeded simulation RNG.
- A redesign that breaks keyboard play, reduced-motion support, or the save format.

## Constraints

- Pure static site: `index.html`, `js/*.js`, Tailwind CDN, Google Fonts, existing PNGs.
- Canvas stays 960×540 internal, DPR-aware; target 60fps on a mid-range laptop.
- The simulation must remain deterministic for a given seed.
- Current accessibility features are preserved and extended to new controls/modals.
- **Touch stays supported.** The HUD must wrap or scroll cleanly on phones, tap targets stay
  large, and tile/fusion preview must work without hover (tap to select, tap again to place).
- **Dev-only verification tooling is allowed outside the shipped site** (temp scripts or a
  headless browser in the system temp folder). Nothing dev-only is added to the project.

## Approaches considered

**A. Emoji polish only.** Replace a few emoji, add CSS transitions. Cheap, but the core
mismatch between hand-made plant art and system emoji remains. Rejected.

**B. In-code pixel atlas + layered canvas + UI/feel pass + procedural audio (chosen).**
Draw zombies, sun, mower, and projectiles as 24×24 pixel matrices in a new `js/art.js`,
pre-render the static garden to an offscreen canvas, add a small effects layer, restyle the
menu/HUD, add a recipe journal, and synthesize SFX with WebAudio. Uses only existing assets
and code; solves the mismatch directly; rules unchanged.

**C. Import a third-party tileset or zombie sprites.** Faster art, but adds downloads,
licensing questions, and a style that would not match the existing plants. Rejected.

## Design

### World rendering (`js/art.js` + `game.js` draw)

- **Static backdrop, pre-rendered once per mission:** house wall and roof on the left, stone
  path, 9×5 lawn with two-tone pixel texture plus seeded blades/pebbles, soil borders, hedge
  and treeline on the right, day palette for normal missions and a cool teal night palette
  for mission 5. Drawn to an offscreen canvas and blitted each frame.
- **Pixel sprites built in code:** a tiny sprite factory turns string matrices + palettes into
  cached offscreen canvases. Zombie body base with hats/gear for grunt, cone, bucket, dasher,
  hurdler, brute, and colossus; two-frame walk cycle; pre-rendered white flash copy. Sun token,
  mower, pea/frost/fire projectiles, and leaf/spark particles also come from the factory.
- **Plants:** keep the PNGs, add a subtle idle bob, elliptical shadow, health bar, and a
  squash/stretch placement pop.
- **Effects:** capped particle pools for splats, deaths, sun sparkle, mower dust, and explosion
  rings; floating text for sun gains and big hits; short screen shake on explosion, mower, and
  boss events; a central wave banner. All suppressed or reduced under `prefers-reduced-motion`.
- **Hover/aim:** ghost plant with valid/invalid tile tint, fusion label, and pixel-grid cursor.

### UI (`index.html` + `main.js`)

**Flavor (approved): modern garden UI.** Keep Bricolage Grotesque/Figtree and rounded Tailwind
panels; the pixel plants, sun, and effects are the focal art. Add pixel accents (borders,
badges, icons) without a pixel font. Text stays crisp and mobile-friendly.

- **Menu:** hero wordmark "Verdane" with a pixel garden motif built from existing plant sprites;
  a three-step "how to play" strip; mission cards as seed packets with number badge, stars, tip,
  seed thumbnails, locked/next states; a Graft Journal button.
- **HUD:** sun counter with pixel sun and gain pulse; seed packets with large sprite, cost,
  hotkey, cooldown veil, ready glow, selected ring, unaffordable state; segmented wave progress
  with next-wave countdown; compact icon buttons for shovel, auto-sun, speed, pause, journal,
  mute, menu, each with tooltip + `aria-label`.
- **Graft Journal modal:** all 6 base plants and 4 fusions with sprite, cost, role blurb, and
  recipe notation (`Barkwall + Pea Pod → Bulwark Pod`). Reachable from the menu and with `J`
  during play.
- **Result modal:** garden-framed, stars shown large, clear stats, same retry/next/menu flow.

### Audio (`js/audio.js`)

Lazy WebAudio context created on the first user gesture. Short synthesized blips/noise bursts
for plant, shoot, hit, sun collect, explosion, mower, wave, win, and lose. Master mute persisted
in the save. No files, no autoplay before interaction.

### Data and saves

- `js/data.js`: add a one-line role/blurb per plant and fusion for the journal. No balance edits.
- `js/save.js`: bump to VERSION 4 and add `settings.muted` with a migration; keep sanitization
  and backup behavior.

## What is left to the builder

- Exact pixel matrices, palettes, and frame timing for each zombie.
- Particle caps, shake magnitudes, and easing curves.
- Synth oscillator/noise recipes and gain levels.
- Whether the wave banner is canvas or DOM (canvas preferred for centering).

## Risks and mitigations

- **Procedural sprites could look worse than emoji.** Build a standalone sprite preview page,
  verify with headless screenshots, and iterate on matrices before wiring them into the game.
- **Effects could tank frame rate.** Pre-render the backdrop and sprite frames; cap live
  particles; no shadow blur in the hot loop.
- **Audio could annoy or fail to autoplay.** Default to subtle, start on first gesture, provide
  a visible mute control and persist it.
- **Scope creep.** Cap the UI work at menu, HUD, journal, and result; no new game systems.

## Success criteria

- No emoji is drawn on the game canvas.
- A full mission runs at 60fps with effects active on a mid-range laptop.
- Planting, shooting, collecting sun, taking damage, and losing a mower all produce clear
  audio-visual feedback.
- The journal explains every plant and fusion without leaving the game.
- Keyboard, screen-reader labels, focus handling, and reduced motion still work.
- The project still contains only HTML, JS, Tailwind, and image assets.
