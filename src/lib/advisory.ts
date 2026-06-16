import advisories from "@/data/advisories.json"

export type AdvisoryLevel = 1 | 2 | 3 | 4
export type Advisory = { level: AdvisoryLevel; headline: string }

const DATA = advisories as Record<string, Advisory>

export const getAdvisory = (id: string): Advisory | undefined => DATA[id]

// Snapshot of the US State Department advisory levels (authoritative, offline).
// The detail panel links out to the visitor's local official source for live detail.
export const ADVISORY_SNAPSHOT = "June 2026"
export const ADVISORY_SOURCE_NAME = "US State Dept"

export const ADVISORY_META: Record<
  AdvisoryLevel,
  { label: string; short: string; color: string }
> = {
  1: {
    label: "Exercise normal precautions",
    short: "Low risk",
    color: "#22c55e",
  },
  2: {
    label: "Exercise increased caution",
    short: "Caution",
    color: "#eab308",
  },
  3: { label: "Reconsider travel", short: "High risk", color: "#f97316" },
  4: { label: "Do not travel", short: "Extreme risk", color: "#ef4444" },
}
