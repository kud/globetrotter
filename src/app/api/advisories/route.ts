import { parseAdvisoryFeed, parseCanadaFeed } from "@/lib/advisory-feed"

const US_FEED = "https://travel.state.gov/_res/rss/TAsTWs.xml"
const CA_FEED =
  "https://data.international.gc.ca/travel-voyage/index-alpha-eng.json"
const SIX_HOURS = 21600

const loadUs = async () => {
  try {
    const res = await fetch(US_FEED, {
      headers: { "User-Agent": "Mozilla/5.0 (Globetrotter)" },
      next: { revalidate: SIX_HOURS },
    })
    if (!res.ok) throw new Error(`us ${res.status}`)
    return parseAdvisoryFeed(await res.text())
  } catch {
    return {}
  }
}

const loadCanada = async () => {
  try {
    const res = await fetch(CA_FEED, { next: { revalidate: SIX_HOURS } })
    if (!res.ok) throw new Error(`ca ${res.status}`)
    return parseCanadaFeed(await res.json())
  } catch {
    return {}
  }
}

/**
 * The response is the same for every visitor, so it is cached at Vercel's edge
 * for as long as the upstream fetches are: without this header every page load
 * ran a function just to replay the Data Cache. Stale-while-revalidate keeps
 * the refresh off the visitor's path. A response with both feeds empty is a
 * failure, not news, and is left uncached so the next request retries.
 */
const EDGE_CACHE = `public, s-maxage=${SIX_HOURS}, stale-while-revalidate=${SIX_HOURS * 4}`

// Live advisory levels from each government that publishes a machine-readable
// numeric feed (US State Dept RSS + Canada bulk JSON). Cached 6h upstream.
export const GET = async () => {
  const [state, canada] = await Promise.all([loadUs(), loadCanada()])
  const empty =
    Object.keys(state).length === 0 && Object.keys(canada).length === 0
  return Response.json(
    { updated: new Date().toISOString(), sources: { state, canada } },
    { headers: { "Cache-Control": empty ? "no-store" : EDGE_CACHE } },
  )
}
