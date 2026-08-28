# WebAbacus

**English** | [한국어](README.ko.md) | [日本語](README.ja.md)

A configurable, touch-and-mouse-friendly soroban abacus built for the browser.

🔗 **Live demo:** https://saramjh.github.io/webabacus/

## Features

- Configurable rod count (1–21), applied live — resizing preserves whatever value is already on the abacus
- Modern 1+4 bead layout (one heaven bead worth 5, four earth beads worth 1 each)
- Full mouse, touch, and keyboard support via the Pointer Events API — dragging a bead only ever moves the bead you grabbed and whatever sits between it and the beam, never a bead your cursor merely passes over
- A two-finger "swipe the beam" gesture clears the whole abacus at once, animated — just like the real thing
- Place-value dot markers every three rods, like a physical soroban
- Scales to fit any screen size or orientation without ever being clipped
- Icon-based controls instead of text labels, so there's no language barrier in the UI

## Tech stack

- TypeScript
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/) for the core logic test suite
- No UI framework — plain DOM

## Project structure

```
src/
  core/         # Abacus state, arithmetic, and validation — framework/DOM-agnostic, unit-tested
    abacus.ts
    abacus.test.ts
    types.ts
  ui/
    renderer.ts # DOM rendering and pointer/touch/keyboard interaction
  main.ts       # wires the core logic to the UI
  style.css
```

The core (`src/core/`) has no dependency on the DOM and can be reused with any UI layer.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and produce a production build in dist/
npm run test      # run the core logic test suite
npm run preview   # preview the production build locally
```

## Deployment

Pushing to `main` runs the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the project and publishes `dist/` to GitHub Pages.

One-time setup: in the repository's **Settings → Pages**, set the source to **GitHub Actions**.
