# Verdane Garden Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 768×256 pixel-art garden hero image to the menu, generated from the project palette.

**Architecture:** A throwaway Pillow script renders a 384×128 scene and nearest-neighbour scales it 2×. The shipped change is the PNG plus one `<img>` in `index.html`.

**Tech Stack:** Python 3.13 + Pillow 11 (temp only), static HTML/Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-04-verdane-garden-hero-design.md`

## Global Constraints

- Output exactly 768×256 PNG at `assets/garden-hero.png`.
- No anti-aliasing, blur, or photographic look; 2× nearest-neighbour only.
- Palette anchored on ink `#0e1a15`, moss `#1b3326`/`#3f7a52`, leaf `#8fd16a`, sun `#ffc94a`, bloom `#e8708a`.
- Generator script stays in `%TEMP%\opencode`; no new project dependencies or CSS files.
- Do not touch the canvas/game rendering, save format, or plant sprites.

## Review Focus

- **Mobile width:** at 390 px the banner must scale down without horizontal scroll or clipping.
- **Pixel crispness:** the browser must not smooth the image (`image-rendering: pixelated`).
- **Menu flow:** the banner must sit above the wordmark and keep mission cards reachable.
- **Broken asset path:** a missing PNG should still leave a usable menu (alt text, no layout collapse).

---

### Task 1: Generate the garden hero PNG

**Files:**
- Create: `%TEMP%\opencode\verdane_garden_hero.py`
- Create: `assets/garden-hero.png`

**Interfaces:**
- Produces: `assets/garden-hero.png` — RGB PNG, 768×256.

- [ ] **Step 1: Write the generator script**

Render at 384×128 with a fixed seed, then `resize((768, 256), Image.NEAREST)`. Scene layers in order: dithered sky + sun + clouds, distant hills, cottage (wall, roof, chimney, lit window), hedge/tree, lawn bands + tufts, path stones, fence, stylised plants, foreground leaves, final palette-safe dither/verification.

- [ ] **Step 2: Run it**

Run: `python "$env:TEMP\opencode\verdane_garden_hero.py"`
Expected: writes `assets/garden-hero.png` and prints `768 256`.

- [ ] **Step 3: Verify the image**

Run: `python -c "from PIL import Image; im=Image.open('assets/garden-hero.png'); print(im.size, im.mode)"`
Expected: `(768, 256) RGB`.

- [ ] **Step 4: Inspect visually**

Open the PNG. Expected: readable cottage/garden/sun composition at banner size, crisp pixels, no accidental text or noise.

### Task 2: Wire the hero into the menu

**Files:**
- Modify: `index.html` (inside `<main id="menu">`, before `<h1>`)

**Interfaces:**
- Consumes: `assets/garden-hero.png` from Task 1.
- Produces: a menu `<img>` with width 768, height 256, descriptive alt, and pixelated rendering.

- [ ] **Step 1: Insert the banner**

Add the `<img>` from the spec immediately before the `<h1>`; keep existing classes and layout untouched.

- [ ] **Step 2: Verify markup**

Run: `Select-String -Path index.html -Pattern 'garden-hero'`
Expected: one match with `src="assets/garden-hero.png"`, `width="768"`, `height="256"`, `image-rendering:pixelated`, and a non-empty `alt`.

- [ ] **Step 3: Visual check at desktop and mobile widths**

Serve the folder and screenshot the menu at 768 px and 390 px widths; confirm the banner is crisp, sits above "Verdane", causes no horizontal scroll, and mission cards still render.
