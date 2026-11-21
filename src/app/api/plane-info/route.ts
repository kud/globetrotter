import { createMemo } from "@/lib/memo"

const AIRCRAFT = "https://hexdb.io/api/v1/aircraft/"
const ROUTE = "https://hexdb.io/api/v1/route/icao/"
const AIRPORT = "https://hexdb.io/api/v1/airport/icao/"
const DAY = 86400
const HOUR = 3600

/**
 * Deliberately NOT `next: { revalidate }` — see `lib/memo` for why an unbounded
 * key space cannot be write-capped by a TTL. Up to four lookups a poll, most of
 * them new, put this well past what `/api/flight` was costing before its own
 * TTL was fixed.
 *
 * Failed lookups are memoised too: an obscure hex that hexdb does not know is
 * exactly the one that would otherwise be re-asked on every poll.
 */
const cached = createMemo()

const EDGE_CACHE = `public, s-maxage=${HOUR}, stale-while-revalidate=${HOUR}`

type Airport = {
  name: string
  iata: string
  code: string
  lat: number | null
  lng: number | null
} | null

const lookupAirport = (icao: string): Promise<Airport> =>
  cached(`airport:${icao}`, DAY, async () => {
    try {
      const res = await fetch(`${AIRPORT}${icao}`, { cache: "no-store" })
      if (!res.ok) return null
      const a = await res.json()
      return {
        name: a.airport ?? icao,
        iata: a.iata ?? "",
        code: icao,
        lat: typeof a.latitude === "number" ? a.latitude : null,
        lng: typeof a.longitude === "number" ? a.longitude : null,
      }
    } catch {
      return null
    }
  })

type Aircraft = {
  type: string | null
  operator: string | null
  registration: string | null
}

const lookupAircraft = (hex: string): Promise<Aircraft | null> =>
  cached(`aircraft:${hex}`, DAY, async () => {
    try {
      const res = await fetch(`${AIRCRAFT}${hex}`, { cache: "no-store" })
      if (!res.ok) return null
      const a = await res.json()
      return {
        type: [a.Manufacturer, a.Type].filter(Boolean).join(" ").trim() || null,
        operator: a.RegisteredOwners || null,
        registration: a.Registration || null,
      }
    } catch {
      return null
    }
  })

const lookupRoute = (callsign: string): Promise<string | null> =>
  cached(`route:${callsign}`, HOUR, async () => {
    try {
      const res = await fetch(`${ROUTE}${encodeURIComponent(callsign)}`, {
        cache: "no-store",
      })
      if (!res.ok) return null
      const r = await res.json()
      return String(r.route ?? "") || null
    } catch {
      return null
    }
  })

// Enriches a live flight with aircraft type / operator / registration (by hex)
// and its route (by callsign) via hexdb.io — community ADS-B metadata.
export const GET = async (req: Request) => {
  const params = new URL(req.url).searchParams
  const hex = params.get("hex")
  const callsign = params.get("callsign")
  const out: {
    type: string | null
    operator: string | null
    registration: string | null
    origin: Airport
    destination: Airport
  } = {
    type: null,
    operator: null,
    registration: null,
    origin: null,
    destination: null,
  }
  try {
    if (hex && /^[0-9a-f]{6}$/i.test(hex)) {
      const aircraft = await lookupAircraft(hex.toLowerCase())
      if (aircraft) {
        out.type = aircraft.type
        out.operator = aircraft.operator
        out.registration = aircraft.registration
      }
    }
    if (callsign) {
      const route = await lookupRoute(callsign.trim())
      const parts = String(route ?? "").split("-")
      if (parts.length === 2 && parts[0] && parts[1]) {
        const [origin, destination] = await Promise.all([
          lookupAirport(parts[0]),
          lookupAirport(parts[1]),
        ])
        out.origin = origin
        out.destination = destination
      }
    }
  } catch {
    // Partial/empty enrichment is fine — the panel shows what it has.
  }
  // Keyed on hex + callsign, so the edge serves every later visitor who lands
  // on the same aircraft, for as long as its shortest memo (the route's hour).
  // An answer with nothing in it is most likely a failed lookup (the helpers
  // fold errors into null), so it stays off the edge and the next asker retries.
  const empty = Object.values(out).every((v) => v === null)
  return Response.json(out, {
    headers: { "Cache-Control": empty ? "no-store" : EDGE_CACHE },
  })
}
