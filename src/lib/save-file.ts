import { countryById } from "@/lib/geo"
import type { Review, Status, TravelData } from "@/lib/store"

export const SAVE_APP = "globetrotter"
export const SAVE_VERSION = 3

export type SaveEntry = {
  id: string
  name: string
  status?: Status
  note?: string
  review?: Review
}
export type SaveFile = {
  app: typeof SAVE_APP
  version: number
  exportedAt: string
  countries: SaveEntry[]
}

export const buildSaveFile = ({
  statuses,
  notes,
  reviews,
}: TravelData): SaveFile => {
  const ids = new Set([
    ...Object.keys(statuses),
    ...Object.keys(notes),
    ...Object.keys(reviews),
  ])
  return {
    app: SAVE_APP,
    version: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    countries: [...ids].map((id) => ({
      id,
      name: countryById.get(id)?.name ?? id,
      ...(statuses[id] ? { status: statuses[id] } : {}),
      ...(notes[id] ? { note: notes[id] } : {}),
      ...(reviews[id] ? { review: reviews[id] } : {}),
    })),
  }
}

const isStatus = (value: unknown): value is Status =>
  value === "visited" || value === "wishlist" || value === "blocked"

export const parseSaveFile = (raw: string): TravelData => {
  const data = JSON.parse(raw) as Partial<SaveFile>
  if (data.app !== SAVE_APP || !Array.isArray(data.countries)) {
    throw new Error("This file is not a Globetrotter save.")
  }
  const statuses: Record<string, Status> = {}
  const notes: Record<string, string> = {}
  const reviews: Record<string, Review> = {}
  for (const entry of data.countries) {
    if (!entry || typeof entry.id !== "string") continue
    if (isStatus(entry.status)) statuses[entry.id] = entry.status
    if (typeof entry.note === "string" && entry.note.trim()) {
      notes[entry.id] = entry.note
    }
    if (entry.review && typeof entry.review === "object") {
      reviews[entry.id] = entry.review
    }
  }
  return { statuses, notes, reviews }
}

export const downloadSaveFile = (file: SaveFile) => {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const stamp = file.exportedAt.slice(0, 10)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `globetrotter-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
