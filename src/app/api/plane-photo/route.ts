const ENDPOINT = "https://api.planespotters.net/pub/photos/hex/"
const ONE_DAY = 86400

// Photo of a specific aircraft by ICAO24 hex (Planespotters). Proxied because
// the API needs a descriptive User-Agent, which browsers can't set.
export const GET = async (req: Request) => {
  const hex = new URL(req.url).searchParams.get("hex")
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) {
    return Response.json({ photo: null })
  }
  try {
    const res = await fetch(`${ENDPOINT}${hex.toLowerCase()}`, {
      headers: {
        "User-Agent": "Globetrotter/1.0 (+https://globetrotter.kud.io)",
      },
      next: { revalidate: ONE_DAY },
    })
    if (!res.ok) throw new Error(`planespotters ${res.status}`)
    const data = await res.json()
    const p = data.photos?.[0]
    if (!p) return Response.json({ photo: null })
    return Response.json({
      photo: {
        src: p.thumbnail_large?.src ?? p.thumbnail?.src ?? null,
        link: p.link ?? null,
        photographer: p.photographer ?? null,
      },
    })
  } catch {
    return Response.json({ photo: null })
  }
}
