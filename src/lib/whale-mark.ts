// A side-view breaching whale (spout, body, fluke, pectoral fin, eye), rendered
// as raw SVG so it can be used both in the globe's imperative HTML layer and the
// flat map's React overlay. Deliberately not an emoji, for a cleaner look.
export const WHALE_MARKUP = `<svg width="42" height="42" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <g stroke="#9bd6ff" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
    <path d="M27 17 C27 10 24 8 25 4"/>
    <path d="M27 17 C23 12 19 12 18 10"/>
    <path d="M27 17 C31 12 34 13 36 12"/>
  </g>
  <ellipse cx="30" cy="37" rx="22" ry="13" fill="#2f6fb0"/>
  <path d="M50 33 C58 28 62 30 62 30 C58 33 58 37 61 40 C56 41 52 39 49 38 Z" fill="#2f6fb0"/>
  <path d="M13 40 C25 50 44 47 49 41 C42 47 26 49 13 40 Z" fill="#bfe0fb" opacity="0.6"/>
  <path d="M27 46 C30 53 37 54 41 53 C35 55 28 53 25 47 Z" fill="#255d96"/>
  <circle cx="21" cy="34" r="2.4" fill="#08111f"/>
</svg>`
