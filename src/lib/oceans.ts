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
  avgDepthM: number
  volumeMkm3: number // millions of km³
  deepest: string // name of the deepest point
}

type Stats = Omit<Ocean, "name" | "at">

const PACIFIC: Stats = {
  wiki: "Pacific Ocean",
  areaKm2: 165250000,
  maxDepthM: 10911,
  avgDepthM: 4280,
  volumeMkm3: 669.88,
  deepest: "Challenger Deep",
}
const ATLANTIC: Stats = {
  wiki: "Atlantic Ocean",
  areaKm2: 106460000,
  maxDepthM: 8376,
  avgDepthM: 3646,
  volumeMkm3: 310.41,
  deepest: "Milwaukee Deep",
}

export const OCEANS: Ocean[] = [
  { name: "North Pacific Ocean", at: [-150, 25], ...PACIFIC },
  { name: "South Pacific Ocean", at: [-120, -30], ...PACIFIC },
  { name: "North Atlantic Ocean", at: [-38, 28], ...ATLANTIC },
  { name: "South Atlantic Ocean", at: [-18, -32], ...ATLANTIC },
  {
    name: "Indian Ocean",
    at: [80, -28],
    wiki: "Indian Ocean",
    areaKm2: 70560000,
    maxDepthM: 7290,
    avgDepthM: 3741,
    volumeMkm3: 264.0,
    deepest: "Java Trench",
  },
  {
    name: "Arctic Ocean",
    at: [5, 81],
    wiki: "Arctic Ocean",
    areaKm2: 15560000,
    maxDepthM: 5550,
    avgDepthM: 1205,
    volumeMkm3: 18.07,
    deepest: "Molloy Deep",
  },
  {
    name: "Mediterranean Sea",
    at: [17, 36],
    wiki: "Mediterranean Sea",
    areaKm2: 2500000,
    maxDepthM: 5267,
    avgDepthM: 1500,
    volumeMkm3: 3.75,
    deepest: "Calypso Deep",
  },
]

export const oceanByName = (name: string) => OCEANS.find((o) => o.name === name)

// Short one-line summary for hover tooltips.
export const oceanTip = (o: Ocean) =>
  `${(o.areaKm2 / 1e6).toFixed(1)}M km² · max depth ${o.maxDepthM.toLocaleString()} m`
