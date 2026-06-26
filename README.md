<div align="center">

<img src="public/icons/icon-512.png" width="160" alt="Globetrotter icon" />

&nbsp;

&nbsp;

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![MIT](https://img.shields.io/badge/MIT-22C55E?style=flat-square&logoColor=white)

**Track the countries you've visited and want to go — with live safety advisories, real-time flights, and a travel journal that never leaves your device.**

[Features](#-features) • [Live Demo](#-live-demo) • [Quick Start](#-quick-start) • [Development](#-development)

</div>

---

## 🌟 Features

- 🗺 **Two complementary views** — a pannable, zoomable Mercator SVG map (default) and an interactive WebGL 3D globe; switch between them from the header toolbar; the globe centres on your location via the Geolocation API on first open
- 🏳 **Country status tracking** — cycle any country through Visited / Wishlist / Blocked with a single click; wishlist countries show a dashed border, blocked a dotted one; a neon progress bar counts your tally against the 195 sovereign countries of the world
- 🛡 **Live travel advisories** — blended US State Department and Canada advisory feeds behind a shared API route, combined into a 4-step risk meter shown on the hover tooltip on both views; territories inherit their parent country's advisory automatically
- ✈ **Live flight tracking** — a random real aircraft from adsb.lol rotates every minute; a destination arc, aircraft photo from Planespotters, and clickable Wikipedia links for origin and destination airports appear in a slide-in panel
- ⭐ **Capital city markers** — a five-pointed star inside a ring marks the capital of the selected country on both the flat map and the globe
- 📝 **Travel journal** — per-country free-text notes, 5-star ratings, a "would return?" toggle, best-time-to-visit, and a month-picker for logging multiple visit dates; all stored alongside status data
- 🐋 **Breaching whale easter egg** — a whale surfaces at a random ocean location roughly every two minutes (first breach within 25 seconds so it's actually discoverable); it works on both views
- 💾 **Privacy-first, offline-capable** — all data persists to `localStorage` and is never sent anywhere; export/import via file download or paste-in-field JSON flow; full PWA with service worker; four-language UI (EN / FR / ES / DE) with automatic locale detection; light, dark, and system themes; north/south-up compass toggle

## 🔗 Live Demo

**[globetrotter.kud.io](https://globetrotter.kud.io)**

## 🚀 Quick Start

```bash
git clone https://github.com/kud/globetrotter.git
cd globetrotter
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click any country on the flat map or globe to see facts, set a status, write journal notes, and start building your personal atlas.

## 🔧 Development

### Project tree

```
src/
├── app/
│   ├── api/
│   │   ├── advisories/   # Proxies US + Canada advisory feeds and merges them
│   │   ├── flight/       # Random live aircraft from adsb.lol
│   │   ├── plane-info/   # Aircraft type, operator, and route via hexdb
│   │   └── plane-photo/  # Aircraft photo from Planespotters
│   ├── layout.tsx        # Root layout — fonts, theme flash prevention, PWA register
│   ├── manifest.ts       # Web App Manifest for PWA install
│   └── page.tsx          # Entry: <Sidebar> + <MapStage>
├── components/
│   ├── flat-map.tsx      # D3-zoom SVG Mercator map with capital stars and whale
│   ├── globe-view.tsx    # WebGL 3D globe (react-globe.gl + Three.js) with whale
│   ├── map-stage.tsx     # Toolbar: view toggle, auto-spin, language, theme, compass
│   ├── sidebar.tsx       # Stats, search, country list, sort/filter, export/import
│   ├── country-panel.tsx # Slide-in detail panel with facts, status, and journal
│   ├── country-tooltip.tsx # Cursor-following tooltip with flag, name, risk meter
│   └── flight-panel.tsx  # Slide-in live flight details, photo, and airport links
├── lib/
│   ├── store.ts          # Zustand store (persisted to localStorage, v4 migration)
│   ├── advisory.ts       # Bundled US State Dept advisory snapshot
│   ├── advisory-store.ts # Live advisory fetch (US RSS + Canada), blended level
│   ├── advisory-feed.ts  # Feed parsing helpers
│   ├── flight.ts         # adsb.lol poller (60-second interval)
│   ├── geo.ts            # TopoJSON → GeoJSON country features
│   ├── country-info.ts   # Country metadata + capital coordinates
│   ├── colors.ts         # Theme-aware colour palette and status colours
│   ├── i18n.ts           # Translations (en / fr / es / de)
│   ├── oceans.ts         # Ocean label coordinates, shared by both views
│   ├── use-whale.ts      # Whale easter-egg timer hook
│   └── save-file.ts      # JSON export / import / clipboard helpers
└── data/
    ├── advisories.json   # Bundled US State Dept advisory snapshot
    ├── capitals.json     # Capital city lat/lng index
    └── country-info.json # Country metadata (flags, region, population…)
```

### Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the Next.js development server |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build locally   |
| `npm run lint`  | Run ESLint across the codebase       |

## 🏗 Tech Stack

| Library                                                        | Role                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Next.js 16](https://nextjs.org)                               | React framework, App Router, API route handlers                   |
| [React 19](https://react.dev)                                  | UI layer                                                          |
| [Three.js 0.184](https://threejs.org)                          | WebGL renderer underpinning the globe                             |
| [react-globe.gl](https://github.com/vasturiano/react-globe.gl) | Globe primitives: polygons, HTML elements, arcs                   |
| [D3 (geo / zoom / selection / transition)](https://d3js.org)   | Flat map projection, pan/zoom, country path rendering             |
| [topojson-client](https://github.com/topojson/topojson-client) | TopoJSON → GeoJSON conversion for country borders                 |
| [world-atlas](https://github.com/topojson/world-atlas)         | Bundled 110m TopoJSON world topology                              |
| [Zustand 5](https://zustand-demo.pmnd.rs)                      | Client state with `localStorage` persistence and schema migration |
| [Framer Motion](https://www.framer-motion.com)                 | Slide-in panel animations                                         |
| [Tailwind CSS v4](https://tailwindcss.com)                     | Utility-first styling                                             |
| [TypeScript 5](https://www.typescriptlang.org)                 | Type safety across the entire codebase                            |

---

MIT © [kud](https://github.com/kud) — Made with ❤️
