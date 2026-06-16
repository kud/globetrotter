import info from "@/data/country-info.json"
import type { Advisory, AdvisoryLevel } from "@/lib/advisory"

type Info = { name: string; cca3: string; cca2: string }
const INFO = info as unknown as Record<string, Info>

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const byName: Record<string, string> = {}
const byCca3: Record<string, string> = {}
const byCca2: Record<string, string> = {}
for (const [id, c] of Object.entries(INFO)) {
  byName[slug(c.name)] = id
  byCca3[c.cca3] = id
  if (c.cca2) byCca2[c.cca2] = id
}

const ALIAS: Record<string, string> = {
  burma: "MMR",
  "democratic-republic-of-the-congo": "COD",
  "republic-of-the-congo": "COG",
  "cote-d-ivoire": "CIV",
  "israel-the-west-bank-and-gaza": "ISR",
  "the-bahamas": "BHS",
  "north-korea": "PRK",
  "south-korea": "KOR",
  micronesia: "FSM",
  "federated-states-of-micronesia": "FSM",
  "timor-leste": "TLS",
  eswatini: "SWZ",
  "cabo-verde": "CPV",
  "the-gambia": "GMB",
  gambia: "GMB",
  turkey: "TUR",
  "the-kyrgyz-republic": "KGZ",
  "kyrgyz-republic": "KGZ",
  "kingdom-of-denmark": "DNK",
}

const idFor = (name: string): string | undefined => {
  const s = slug(name)
  return byName[s] ?? (ALIAS[s] ? byCca3[ALIAS[s]] : undefined)
}

export const parseAdvisoryFeed = (xml: string): Record<string, Advisory> => {
  const out: Record<string, Advisory> = {}
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  for (const item of items) {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(
      /&amp;/g,
      "&",
    )
    const m = title.match(/^(.*?)\s*-\s*Level\s*(\d)\s*:\s*(.*)$/)
    if (!m) continue
    const id = idFor(m[1])
    if (!id) continue
    out[id] = { level: Number(m[2]) as AdvisoryLevel, headline: m[3].trim() }
  }
  return out
}

type CanadaEntry = { "country-iso": string; "advisory-state": number }

// Canada's bulk JSON: advisory-state 0..3 → our 1..4 scale (same semantics).
export const parseCanadaFeed = (raw: {
  data?: Record<string, CanadaEntry>
}): Record<string, Advisory> => {
  const out: Record<string, Advisory> = {}
  for (const e of Object.values(raw.data ?? {})) {
    const id = byCca2[e["country-iso"]]
    const state = e["advisory-state"]
    if (!id || typeof state !== "number") continue
    const level = Math.min(4, Math.max(1, state + 1)) as AdvisoryLevel
    out[id] = { level, headline: "" }
  }
  return out
}
