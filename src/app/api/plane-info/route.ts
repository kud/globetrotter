const AIRCRAFT = "https://hexdb.io/api/v1/aircraft/"
const ROUTE = "https://hexdb.io/api/v1/route/icao/"
const AIRPORT = "https://hexdb.io/api/v1/airport/icao/"
const DAY = 86400
const HOUR = 3600

type Airport = {
  name: string
  iata: string
  code: string
  lat: number | null
  lng: number | null
} | null

const lookupAirport = async (icao: string): Promise<Airport> => {
  try {
    const res = await fetch(`${AIRPORT}${icao}`, { next: { revalidate: DAY } })
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
}

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
      const res = await fetch(`${AIRCRAFT}${hex.toLowerCase()}`, {
        next: { revalidate: DAY },
      })
      if (res.ok) {
        const a = await res.json()
        out.type =
          [a.Manufacturer, a.Type].filter(Boolean).join(" ").trim() || null
        out.operator = a.RegisteredOwners || null
        out.registration = a.Registration || null
      }
    }
    if (callsign) {
      const res = await fetch(
        `${ROUTE}${encodeURIComponent(callsign.trim())}`,
        {
          next: { revalidate: HOUR },
        },
      )
      if (res.ok) {
        const r = await res.json()
        const parts = String(r.route ?? "").split("-")
        if (parts.length === 2 && parts[0] && parts[1]) {
          const [origin, destination] = await Promise.all([
            lookupAirport(parts[0]),
            lookupAirport(parts[1]),
          ])
          out.origin = origin
          out.destination = destination
        }
      }
    }
  } catch {
    // Partial/empty enrichment is fine — the panel shows what it has.
  }
  return Response.json(out)
}
