// Live position of the ISS from wheretheiss.at (free, HTTPS, no key). Real
// telemetry: latitude, longitude, altitude (km) and velocity (km/h). Cached a
// few seconds so multiple clients share one upstream call.
const ISS = "https://api.wheretheiss.at/v1/satellites/25544"

type Sat = {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
}

export const GET = async () => {
  try {
    const res = await fetch(ISS, { next: { revalidate: 5 } })
    if (!res.ok) return Response.json({ iss: null })
    const d = (await res.json()) as Sat
    return Response.json({
      iss: {
        lat: d.latitude,
        lng: d.longitude,
        altKm: Math.round(d.altitude),
        speedKmh: Math.round(d.velocity),
      },
    })
  } catch {
    return Response.json({ iss: null })
  }
}
