import { create } from "zustand"
import { getAdvisory, type Advisory } from "@/lib/advisory"
import { getCountryInfo } from "@/lib/country-info"

export type LiveSource = "state" | "canada"

type Sources = Record<LiveSource, Record<string, Advisory>>

// Blended risk level across every source we have (US live-or-snapshot + Canada),
// rounded. Territories inherit their parent country's advisory (feeds are
// per-country), so e.g. the Canary Islands use Spain's level.
export const combinedLevel = (
  id: string,
  sources: Sources,
): number | undefined => {
  const advId = getCountryInfo(id)?.parent ?? id
  const us = sources.state[advId]?.level ?? getAdvisory(advId)?.level
  const ca = sources.canada[advId]?.level
  const levels = [us, ca].filter((n) => typeof n === "number") as number[]
  if (levels.length === 0) return undefined
  return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)
}

type AdvisoryState = {
  sources: Record<LiveSource, Record<string, Advisory>>
  updated: string | null
  loaded: boolean
  loading: boolean
  load: () => Promise<void>
}

export const useAdvisoryStore = create<AdvisoryState>((set, get) => ({
  sources: { state: {}, canada: {} },
  updated: null,
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const res = await fetch("/api/advisories")
      const data = (await res.json()) as {
        updated: string | null
        sources: Record<LiveSource, Record<string, Advisory>>
      }
      set({
        sources: {
          state: data.sources?.state ?? {},
          canada: data.sources?.canada ?? {},
        },
        updated: data.updated,
        loaded: true,
        loading: false,
      })
    } catch {
      // Leave loaded false so the next caller (e.g. opening a panel) retries.
      set({ loading: false })
    }
  },
}))
