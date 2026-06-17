// Major waters labelled subtly for a touch of cartography. Shared by the flat
// map (SVG <text>) and the globe (billboard labels). The Pacific and Atlantic
// are labelled north and south (they're vast); both halves share the parent
// ocean's Wikipedia article and stats. Coordinates are [lng, lat].
export type Ocean = {
  name: string
  wiki: string // Wikipedia article title (the parent ocean)
  at: [number, number]
  areaKm2: number
  maxDepthM: number
}

export const OCEANS: Ocean[] = [
  {
    name: "North Pacific Ocean",
    wiki: "Pacific Ocean",
    at: [-150, 25],
    areaKm2: 165250000,
    maxDepthM: 10911,
  },
  {
    name: "South Pacific Ocean",
    wiki: "Pacific Ocean",
    at: [-120, -30],
    areaKm2: 165250000,
    maxDepthM: 10911,
  },
  {
    name: "North Atlantic Ocean",
    wiki: "Atlantic Ocean",
    at: [-38, 28],
    areaKm2: 106460000,
    maxDepthM: 8376,
  },
  {
    name: "South Atlantic Ocean",
    wiki: "Atlantic Ocean",
    at: [-18, -32],
    areaKm2: 106460000,
    maxDepthM: 8376,
  },
  {
    name: "Indian Ocean",
    wiki: "Indian Ocean",
    at: [80, -28],
    areaKm2: 70560000,
    maxDepthM: 7290,
  },
  {
    name: "Arctic Ocean",
    wiki: "Arctic Ocean",
    at: [5, 81],
    areaKm2: 15560000,
    maxDepthM: 5550,
  },
  {
    name: "Mediterranean Sea",
    wiki: "Mediterranean Sea",
    at: [17, 36],
    areaKm2: 2500000,
    maxDepthM: 5267,
  },
]

export const oceanByName = (name: string) => OCEANS.find((o) => o.name === name)

// Short one-line summary for hover tooltips.
export const oceanTip = (o: Ocean) =>
  `${(o.areaKm2 / 1e6).toFixed(1)}M km² · max depth ${o.maxDepthM.toLocaleString()} m`
