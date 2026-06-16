const ONE_MINUTE = 60

// Busy regions to rotate through (lat, lon) so there's always something airborne.
const REGIONS: [number, number][] = [
  [51.5, -0.13], // London
  [40.71, -74.01], // New York
  [34.05, -118.24], // Los Angeles
  [35.68, 139.69], // Tokyo
  [25.2, 55.27], // Dubai
  [48.85, 2.35], // Paris
  [1.35, 103.82], // Singapore
  [-33.87, 151.21], // Sydney
]

type Aircraft = {
  hex?: string
  flight?: string
  lat?: number
  lon?: number
  track?: number
  gs?: number
  alt_baro?: number | string
  gnd?: boolean
}

// One live aircraft from adsb.lol (free, no key, deploy-friendly). The client
// sends a fresh seed each minute to rotate region + aircraft.
export const GET = async (req: Request) => {
  try {
    const seedParam = new URL(req.url).searchParams.get("seed")
    const seed = seedParam ? Math.abs(Number(seedParam)) : 0
    const [lat, lon] = REGIONS[seed % REGIONS.length]
    const res = await fetch(
      `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/250`,
      {
        headers: { "User-Agent": "Globetrotter/1.0" },
        next: { revalidate: ONE_MINUTE },
      },
    )
    if (!res.ok) throw new Error(`adsb ${res.status}`)
    const data = (await res.json()) as { ac?: Aircraft[] }
    const airborne = (data.ac ?? []).filter(
      (a) =>
        !a.gnd &&
        typeof a.lat === "number" &&
        typeof a.lon === "number" &&
        typeof a.gs === "number" &&
        a.gs > 120 &&
        typeof a.alt_baro === "number" &&
        String(a.flight ?? "").trim().length > 2,
    )
    if (airborne.length === 0) return Response.json({ flight: null })
    const a = airborne[seed % airborne.length]
    return Response.json({
      flight: {
        id: String(a.hex),
        callsign: String(a.flight).trim(),
        country: "",
        lat: a.lat,
        lng: a.lon,
        heading: a.track ?? 0,
        speedKmh: Math.round((a.gs as number) * 1.852),
        altKm: Math.round((a.alt_baro as number) * 0.0003048 * 10) / 10,
      },
    })
  } catch {
    return Response.json({ flight: null })
  }
}
