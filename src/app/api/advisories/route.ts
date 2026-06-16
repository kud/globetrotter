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

// Live advisory levels from each government that publishes a machine-readable
// numeric feed (US State Dept RSS + Canada bulk JSON). Cached 6h upstream.
export const GET = async () => {
  const [state, canada] = await Promise.all([loadUs(), loadCanada()])
  return Response.json({
    updated: new Date().toISOString(),
    sources: { state, canada },
  })
}
