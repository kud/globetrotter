import { countries } from "@/lib/geo"
import { getCountryInfo } from "@/lib/country-info"

// Micro-territories (Monaco, Vatican…) aren't findable on the map, so the
// quiz pool skips anything smaller than 10 000 km².
const MIN_AREA_KM2 = 10_000

let POOL: string[] | null = null

export const quizPool = (): string[] => {
  if (!POOL) {
    POOL = countries
      .filter((c) => {
        const info = getCountryInfo(c.id)
        return info?.region != null && (info.area ?? 0) >= MIN_AREA_KM2
      })
      .map((c) => c.id)
  }
  return POOL
}

// Fisher–Yates.
const shuffle = (list: string[], rand: () => number): string[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export const pickTarget = (
  pool: string[],
  previous: string | null,
  rand = Math.random,
): string => {
  const candidates = previous ? pool.filter((id) => id !== previous) : pool
  const list = candidates.length > 0 ? candidates : pool
  return list[Math.floor(rand() * list.length)]
}

export const buildOptions = (
  targetId: string,
  pool: string[],
  rand = Math.random,
): string[] => {
  const target = getCountryInfo(targetId)
  const sameSub = pool.filter(
    (id) => getCountryInfo(id)?.subregion === target?.subregion,
  )
  const sameRegion = pool.filter(
    (id) => getCountryInfo(id)?.region === target?.region,
  )
  const picked = target ? [targetId] : []
  const seen = new Set(picked.map((id) => getCountryInfo(id)?.name))
  const fill = (candidates: string[]) => {
    for (const id of shuffle(candidates, rand)) {
      if (picked.length >= 4) return
      const name = getCountryInfo(id)?.name
      if (id !== targetId && name && !seen.has(name)) {
        seen.add(name)
        picked.push(id)
      }
    }
  }
  // Names must be distinct — several ids (subunits, territories) can share one.
  fill(sameSub.filter((id) => id !== targetId))
  fill(sameRegion.filter((id) => id !== targetId))
  fill(pool)
  return shuffle(picked, rand)
}
