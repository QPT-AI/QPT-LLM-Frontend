# QPT — Beyond Electricity

A single-page, full-screen scroll-driven site for QPT, built with React 18 + Vite and Three.js (via `@react-three/fiber` / `@react-three/drei`).

## Getting started

```bash
npm install
npm run dev       # start local dev server
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

Requires Node 18+.

## Features

- **Scroll-based scene navigation** — mousewheel, touch swipe, and arrow/Page keys move one full-screen scene at a time, with a slide transition and a clickable progress rail on the right edge.
- **Light / dark mode** — toggle in the top-right corner, persisted to `localStorage`, respects the system preference on first visit.
- **i18n** — English, Spanish, Russian, German via `react-i18next`. Brand terms (the giant "Q / P / T" word treatments) and the Scene 6 generated text are intentionally left untranslated, per spec. Add a language by dropping a new JSON file in `src/i18n/` and registering it in `src/i18n/index.js`.
- **One component per scene** — `src/components/scenes/Scene1.jsx` … `Scene8.jsx`, each lazy-loaded and code-split; the heavier Three.js canvases (Scenes 2–4) only mount while their scene is the active one.
- **Adaptive text outline** — all headline/body text carries a stroke (`-webkit-text-stroke` + soft glow) that flips between white (dark mode) and black (light mode), keeping text legible over any background.

## Project structure

```
src/
  components/
    scenes/          Scene1.jsx … Scene8.jsx
    ui/               ThemeToggle, LanguageSwitcher, ProgressRail
    SceneManager.jsx  scroll/touch/keyboard navigation engine
  context/
    ThemeContext.jsx  light/dark state + persistence
  i18n/
    en.json / es.json / ru.json / de.json
    index.js          i18next setup
  styles/
    global.css        design tokens, typography, layout, chrome
  App.jsx
  main.jsx
```

## Design tokens

| Token | Value |
|---|---|
| Quantum green | `#5BAD1E` |
| Photonic amber | `#F0AB00` |
| Thermodynamic orange | `#E8690A` |
| Ternary compute gray | `#8A8A8A` |
| Bio compute teal | `#1AAB7C` |

Typefaces: **Space Grotesk** (display), **IBM Plex Mono** (labels/eyebrows/terminal), **Inter** (body).

## Notes

- The production bundle currently ships Three.js/fiber/drei in one chunk (~880 kB / ~234 kB gzipped). If you want to shrink it further, look at `build.rolldownOptions.output` in `vite.config.js` for manual chunking.
- Reduced-motion preference is respected globally (animations collapse to near-instant).
