import { describe, expect, it } from "vitest"
import { getCountryInfo } from "@/lib/country-info"
import { buildOptions, pickTarget, quizPool } from "@/lib/quiz"

// A seeded generator, so every run draws the same rounds.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

describe("quiz pool", () => {
  it("keeps only findable countries: a region and at least 10 000 km²", () => {
    const pool = quizPool()
    expect(pool.length).toBeGreaterThan(100)
    for (const id of pool) {
      const info = getCountryInfo(id)
      expect(info?.region).toBeTruthy()
      expect(info?.area ?? 0).toBeGreaterThanOrEqual(10_000)
    }
  })
})

describe("pickTarget", () => {
  it("never repeats the previous country", () => {
    const pool = quizPool()
    const rand = seeded(1)
    let previous: string | null = null
    for (let i = 0; i < 200; i++) {
      const next = pickTarget(pool, previous, rand)
      expect(next).not.toBe(previous)
      expect(pool).toContain(next)
      previous = next
    }
  })

  it("falls back to the only country left", () => {
    expect(pickTarget(["FRA"], "FRA", seeded(2))).toBe("FRA")
  })
})

describe("buildOptions", () => {
  it("offers four distinct names, the answer among them", () => {
    const pool = quizPool()
    const rand = seeded(3)
    for (let i = 0; i < 100; i++) {
      const target = pickTarget(pool, null, rand)
      const options = buildOptions(target, pool, rand)
      expect(options).toHaveLength(4)
      expect(options).toContain(target)
      const names = options.map((id) => getCountryInfo(id)?.name)
      expect(new Set(names).size).toBe(4)
    }
  })
})
