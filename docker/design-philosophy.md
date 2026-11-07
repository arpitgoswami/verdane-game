# Design Philosophy: Modern Minimalist Portfolio (Awwwards Quality)

## Core Vision

A **Modern Minimalist** portfolio that prioritizes clarity, purpose, and visual harmony. The design communicates expertise through restraint — every element serves a function, and every surface tells a story. Inspired by Awwwards award-winning minimalist portfolios, this site emphasizes intentionality, narrative flow, and polished interaction.

## Thesis

**"Less is not empty; less is intentional."**

Each component — typography, color, spacing, and interaction — is chosen to remove friction and amplify meaning. The portfolio is a curated showcase, not a collection of projects.

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background (light) | #F8F9FA | Page canvas — warm, neutral, non-distracting |
| Primary Text | #1A1A1A | Body copy — high contrast, readable |
| Accent | #2563EB | CTA buttons, key highlights — one bold accent |
| Secondary Text | #6B7280 | Subheadings, captions — softer contrast |
| Success | #10B981 | Badges, completed projects — positive reinforcement |
| Error | #DC2626 | Error states — clear but not alarming |

## Typography

- **Display (H1)** — `Inter` — 700 weight, 3.5rem, line-height 1.2
- **Headings (H2-H4)** — `Inter` — 600 weight, 1.8rem, line-height 1.4
- **Body** — `Inter` — 400 weight, 1rem, line-height 1.6
- **Captions** — `Inter` — 500 weight, 0.875rem

**Hierarchy**: Size + weight + color. No decorative weights. No italic for emphasis.

## Layout & Composition

- **Grid**: Single column on mobile, 2–3 columns on tablet, 4+ on desktop
- **Margins**: Equal outer margins (16–32px). No section huddled on one side.
- **Gaps**: 120–240px between sections on desktop. 60–80px on mobile.
- **Balance**: Asymmetry inside the grid. One off-center element per section.
- **Hero**: Full-width, centered, with generous breathing room.

## Interaction

- **Hover**: Subtle lift (scale 1.02), shadow increase, border color shift.
- **Focus**: Clear outline, visible ring, no default browser styling.
- **Transitions**: Smooth (200ms), purposeful, never decorative.
- **Reduced Motion**: Full respect. All animations have `prefers-reduced-motion` fallback.

## Motion

- **Signature move**: One deliberate reveal per section (hero entrance, project card hover).
- **Scroll**: Smooth, natural acceleration. No jarring jumps.
- **Feedback**: Every interactive element has clear state (hover, focus, active, idle).
- **No generic animations** — only those that explain state or guide attention.

## Art Direction

- **Hero**: Original imagery (abstract representation of craft) with a GSAP intro sequence.
- **Project Cards**: White background, subtle shadow, slight border-radius (12px), intentional image crops.
- **No stock placeholders** — every image is original or purposefully drawn.
- **Three.js**: Subtle spatial depth on the hero (abstract data visualization) — only when it supports the narrative.

## Quality Gates

1. **System check** — Does it use established type, color, spacing, radius, icon, and motion language?
2. **Hierarchy check** — Is the most important content obvious without decorative labels?
3. **Composition check** — Are alignment, balance, proximity, overlap, and negative space intentional?
4. **Typography check** — Are roles distinct, readable, and optically spaced?
5. **Color check** — Does each gradient, glow, border, shadow have a clear role?
6. **Product truth** — Are imagery, copy, metrics, screenshots specific and honest?
7. **Interaction check** — Are active, hover, focus, loading, empty, error, disabled, selected, and success states present?
8. **Motion & access** — Does motion help, remain performant, preserve input, and respect reduced-motion preferences?

## Validation

- Run production build and fix every failure.
- Check at desktop and mobile sizes.
- Verify keyboard navigation, visible focus, touch behavior, content with JS unavailable, static media fallbacks, and `prefers-reduced-motion` behavior.
- Ensure only one smooth-scroll engine is installed and initialized.
- Search for placeholders, copied reference identity, unsupported claims, misleading logos, uncredited media.

## Reference

- **Theme**: Modern Minimalist (theme-factory)
- **Inspiration**: Awwwards award-winning minimalist portfolios — focus on whitespace, typography, and purposeful detail.
- **Design System**: Inter font, neutral palette, flat design.
