import { createMemo } from "@/lib/memo"

const ENDPOINT = "https://api.planespotters.net/pub/photos/hex/"
const DAY = 86400

type Photo = {
  src: string | null
  link: string | null
  photographer: string | null
} | null

const cached = createMemo()

/**
 * Photo of a specific aircraft by ICAO24 hex (Planespotters). Proxied because
 * the API asks callers to identify themselves with a descriptive User-Agent,
 * which a browser cannot send — `User-Agent` is a forbidden header name, so
 * `fetch` drops it.
 *
 * Deliberately NOT `next: { revalidate }`, for the same reason as
 * `api/plane-info`: the hex is unbounded, so almost every aircraft the poller
 * lands on was a first Data Cache write, and no TTL caps a first write. See
 * `lib/memo`. A failed lookup is left unmemoised on purpose — a transient 429
 * from a rate limit should not blank the panel for a day.
 */
const lookupPhoto = (hex: string): Promise<Photo> =>
  cached(`photo:${hex}`, DAY, async () => {
    const res = await fetch(`${ENDPOINT}${hex}`, {
      headers: {
        "User-Agent": "Globetrotter/1.0 (+https://globetrotter.kud.io)",
      },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`planespotters ${res.status}`)
    const data = await res.json()
    const p = data.photos?.[0]
    if (!p) return null
    return {
      src: p.thumbnail_large?.src ?? p.thumbnail?.src ?? null,
      link: p.link ?? null,
      photographer: p.photographer ?? null,
    }
  })

/**
 * The answer depends only on the hex, so Vercel's edge keeps it for a day like
 * the memo does, and every visitor who opens the same aircraft after the first
 * is served without a function. "No photo exists" is an answer and is cached;
 * a failed lookup is not, for the same 429 reason as above.
 */
const EDGE_CACHE = `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}`
const NO_STORE = { headers: { "Cache-Control": "no-store" } }

export const GET = async (req: Request) => {
  const hex = new URL(req.url).searchParams.get("hex")
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) {
    return Response.json({ photo: null }, NO_STORE)
  }
  try {
    return Response.json(
      { photo: await lookupPhoto(hex.toLowerCase()) },
      { headers: { "Cache-Control": EDGE_CACHE } },
    )
  } catch {
    return Response.json({ photo: null }, NO_STORE)
  }
}
