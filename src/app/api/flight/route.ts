import { getCache } from "@vercel/functions"
import { FLIGHT_SEEDS } from "@/lib/flight-seeds"

/**
 * How long a region's payload is held. TEN minutes, and the number is a spend
 * ceiling rather than a freshness preference — lower it and the bill scales with
 * traffic again.
 *
 * It was 60s, which is the poll period, and the two together meant this cache
 * almost never returned a hit. A random region per request means any one key
 * comes round about every eight minutes; expiring it after one guaranteed it was
 * gone before it was next asked for, so nearly every request missed and every
 * miss is a write. Moving off the Data Cache (see below) changed which meter that
 * billed and not the rate: the free tier's 200k Runtime Cache Writes was 75%
 * spent.
 *
 * Above the revisit interval, writes stop tracking traffic at all and are capped
 * at keys ÷ TTL — eight regions over ten minutes, so ~35k a month however many
 * people show up. The visible liveness survives because the per-visitor seed
 * picks a different aircraft out of the payload each minute regardless; only the
 * positions inside it age, and a ten-minute-old ADS-B snapshot still has
 * everything in it airborne.
 */
const REGION_TTL = 600

/**
 * Search radius in nautical miles. Fifty, not the 250 this started with.
 *
 * 250nm returns ~395 aircraft and 243KB per region; 50nm returns ~89, of which
 * about 50 are airborne and so eligible for the pick below. Fifty candidates is
 * far more than a random choice needs, and adsb.lol is fed by volunteers, so the
 * five-fold cut is bandwidth taken off a donated feed rather than a saving of
 * ours.
 */
const RADIUS_NM = 50

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

// An empty answer is a gap, not news: left off the edge so the next poll retries.
const noFlight = () =>
  Response.json({ flight: null }, { headers: { "Cache-Control": "no-store" } })

// Deliberately NOT `next: { revalidate }`. The Data Cache bills every
// revalidation as an ISR write; the Runtime Cache is a regional KV that isn't
// billed that way. That move fixed which meter was charged and not the rate —
// REGION_TTL above is what actually caps the writes. Caching the region payload
// rather than the response is what keeps the per-visitor seed free to pick a
// different aircraft each minute.
const fetchRegion = async (lat: number, lon: number) => {
  const cache = getCache()
  const key = `adsb:${lat},${lon}`
  const hit = await cache.get(key)
  if (hit) return hit as { ac?: Aircraft[] }
  const res = await fetch(
    `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${RADIUS_NM}`,
    {
      headers: { "User-Agent": "Globetrotter/1.0" },
      cache: "no-store",
    },
  )
  if (!res.ok) throw new Error(`adsb ${res.status}`)
  const data = (await res.json()) as { ac?: Aircraft[] }
  await cache.set(key, data, { ttl: REGION_TTL })
  return data
}

/**
 * How long Vercel's edge keeps each answer. With the FLIGHT_SEEDS distinct
 * seeds the route answers to, it caps invocations at seeds per EDGE_TTL —
 * ~64 a minute — however many tabs are polling, where a free random seed made
 * every poll from every tab a function call.
 *
 * 64 is eight aircraft per region across the eight regions: a viewer still
 * lands somewhere new each minute, and two viewers who draw the same seed in
 * the same minute simply see the same plane. The edge copy is a minute old at
 * most, well inside the ten-minute payload it was cut from anyway.
 */
const EDGE_TTL = 60
const EDGE_CACHE = `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${EDGE_TTL}`

// One live aircraft from adsb.lol (free, no key, deploy-friendly). The client
// sends a fresh seed each minute to rotate region + aircraft.
export const GET = async (req: Request) => {
  try {
    const seedParam = new URL(req.url).searchParams.get("seed")
    const seed = seedParam ? Math.abs(Math.trunc(Number(seedParam))) % FLIGHT_SEEDS : 0
    if (!Number.isFinite(seed)) return noFlight()
    const [lat, lon] = REGIONS[seed % REGIONS.length]
    const data = await fetchRegion(lat, lon)
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
    if (airborne.length === 0) return noFlight()
    // Region from the low bits, aircraft from the rest, so the eight seeds a
    // region gets pick eight different aircraft rather than repeating one.
    const a = airborne[Math.floor(seed / REGIONS.length) % airborne.length]
    return Response.json(
      {
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
      },
      { headers: { "Cache-Control": EDGE_CACHE } },
    )
  } catch {
    return noFlight()
  }
}
