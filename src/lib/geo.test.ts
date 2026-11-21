import { readFileSync, writeFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import type { Topology } from "topojson-specification"
import { buildFeatures, COUNTRIES_50M_URL, indexCountries } from "@/lib/geo"

const root = path.resolve(import.meta.dirname, "../..")
const upstream = path.join(
  root,
  "node_modules/world-atlas/countries-50m.json",
)
const served = path.join(root, "public", COUNTRIES_50M_URL)
const index = path.join(root, "src/data/countries.json")

describe("50m country data", () => {
  it("serves world-atlas's own 50m topology, unchanged", () => {
    expect(readFileSync(served)).toEqual(readFileSync(upstream))
  })

  // Regenerate with: UPDATE_COUNTRY_INDEX=1 npm test -- geo
  it("keeps the committed country index in step with the 50m features", () => {
    const topology = JSON.parse(readFileSync(upstream, "utf8")) as Topology
    const built = indexCountries(buildFeatures(topology))
    if (process.env.UPDATE_COUNTRY_INDEX) {
      writeFileSync(index, `${JSON.stringify(built)}\n`)
    }
    expect(JSON.parse(readFileSync(index, "utf8"))).toEqual(built)
  })
})
