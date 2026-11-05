# Verdane Garden Hero — Design

Date: 2026-11-04
Status: approved

## Intent

Give the title screen the garden scene the pixel-garden overhaul calls for: a single
pixel-art hero banner that sells the fantasy before the player picks a mission, in the
same visual language as the 24×24 plant sprites.

## Goals

1. One hand-built pixel-art garden scene — cottage, lawn rows, path, hedge, golden-hour
   sky — rendered at 384×128 logical pixels and exported at 2× (768×256).
2. Palette and pixel density read as the same world as `assets/sprites/plants/*.png`.
3. A crisp, responsive banner above the menu wordmark with no layout regressions.

## Non-goals

- Replacing the in-game procedural lawn or any canvas rendering.
- New plants, animation, parallax, or a second time-of-day variant.
- Text inside the image; the existing "Verdane" wordmark stays as live HTML.
- Downloaded art, new dependencies, or a build step.

## Anti-goals

- Filtered/anti-aliased pixels, blur, or a painted/photographic look.
- A banner that pushes mission cards below the fold on a phone.
- A generator script left in the shipped project.

## Constraints

- Pure static site: HTML, client-side JS, Tailwind CDN, image assets.
- Image generation runs in `%TEMP%\opencode` with Pillow; only the PNG enters the repo.
- Output exactly 768×256 PNG (3:1), displayed at `max-w-3xl` (768 px) and scaled down.
- Palette anchored on ink `#0e1a15`, moss `#1b3326`/`#3f7a52`, leaf `#8fd16a`,
  sun `#ffc94a`, bloom `#e8708a`, with a teal-to-cream sky and muted soil/stone/wood.

## Approaches considered

**A. One generated PNG + `<img>` on the menu (chosen).** Cheapest, matches the plants,
works with the existing static site, and can be reviewed as an image.

**B. Canvas-drawn hero animation.** More alive, but duplicates the game's art code,
adds runtime cost, and delays the scene behind JS.

**C. CSS-only motif from the plant sprites.** Guaranteed consistent but is a collage,
not the "garden scene" the design asks for.

## Design

**Asset:** `assets/garden-hero.png`, 768×256, no alpha needed, nearest-neighbour 2×.

**Composition (left → right):**
- Sky: teal top fading to warm cream at the horizon with ordered dithering; low sun on
  the right with a dithered halo; two small pixel clouds; hazy distant hills.
- Left: cottage wall with tiled roof edge, chimney, and a warm lit window.
- Middle: lawn rows in perspective, a stone path toward the cottage, a low wooden fence,
  and a handful of stylised plants (shooters, sun bloom, frost bud) in the beds.
- Right: layered hedge and a taller tree, warm rim light on the sun side.
- Foreground: dark leafy border and grass tufts for depth; a couple of tiny flowers.

**Integration:** inside `<main id="menu">`, before the `<h1>`:
`<img src="assets/garden-hero.png" width="768" height="256" alt="Pixel-art cottage garden at golden hour: a lit window, rows of vegetables, a stone path, and a hedge under a low sun." class="w-full h-auto rounded-xl border border-moss-600 [image-rendering:pixelated]">`
No new CSS file; no JS changes.

## What is left to the builder

- Exact pixel shapes, dither matrix, cloud/hedge silhouettes, plant placement, and the
  precise warm/cool shading runs.
- Final alt wording if the scene changes materially.

## Success criteria

- `assets/garden-hero.png` exists and is exactly 768×256.
- The menu shows the banner above "Verdane" without horizontal scroll and with crisp,
  non-blurred pixels.
- Mission cards remain reachable on a 390 px-wide viewport.
- No new dependencies, scripts, or console errors.
