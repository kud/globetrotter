import type { Status, ResolvedTheme } from "@/lib/store"

// Status colours are deliberately separated on BOTH hue and lightness so they
// stay distinguishable under colour-vision deficiencies and in greyscale.
// Status colours are deliberately separated on BOTH hue and lightness so they
// stay distinguishable under colour-vision deficiencies and in greyscale.
export const STATUS = {
  visited: "#22c55e", // green
  wishlist: "#a855f7", // violet
  blocked: "#ef4444", // red — boycott / avoid
} as const

export const STATUS_ICON: Record<Status, string> = {
  visited: "✓",
  wishlist: "★",
  blocked: "⊘",
}

export const statusLabel = (status: Status | null | undefined) =>
  status === "visited"
    ? "Visited"
    : status === "wishlist"
      ? "Wishlist"
      : status === "blocked"
        ? "Blocked"
        : "Not yet"

// Map/globe colours that must change with the theme. The DOM uses CSS variables,
// but three.js materials and d3 strokes are plain values, so they read this.
export type MapPalette = {
  land: string
  ocean: string
  graticule: string
  sphereStroke: string
  polygonStroke: string
  atmosphere: string
  // Ocean/sea label text. The flat map uses the --ink-dim CSS var, but the
  // globe's 3D sprite labels need a plain colour value.
  oceanLabel: string
}

export const MAP_PALETTE: Record<ResolvedTheme, MapPalette> = {
  dark: {
    land: "#2a3454",
    ocean: "#0e1530",
    graticule: "rgba(120,160,255,0.10)",
    sphereStroke: "rgba(120,160,255,0.25)",
    polygonStroke: "#0b1020",
    atmosphere: "#5aa9ff",
    oceanLabel: "rgba(150,175,225,0.6)",
  },
  light: {
    land: "#e0e5ee",
    ocean: "#bcd4f0",
    graticule: "rgba(40,80,160,0.12)",
    sphereStroke: "rgba(40,70,120,0.28)",
    polygonStroke: "#9aa6ba",
    atmosphere: "#9cc2ff",
    oceanLabel: "rgba(70,100,150,0.75)",
  },
}

export const statusFill = (
  status: Status | null | undefined,
  palette: MapPalette,
) =>
  status === "visited"
    ? STATUS.visited
    : status === "wishlist"
      ? STATUS.wishlist
      : status === "blocked"
        ? STATUS.blocked
        : palette.land

export const withAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Blend a hex colour toward white by `amount` (0–1). Used to brighten the
// selected country's status fill so selection reads alongside the status hue.
export const lighten = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}
