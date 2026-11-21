import { useEffect, useState } from "react"
import { everyWhileVisible } from "@/lib/visible-interval"

export type ISS = { lat: number; lng: number; altKm: number; speedKmh: number }

// Called straight from the browser: wheretheiss.at is keyless and sends
// Access-Control-Allow-Origin: *, so a proxy route would hide no credential and
// reshape nothing — it would only add a Vercel Data Cache write per poll. Its
// budget is 350 requests per 5 minutes per client IP, which is why every
// consumer shares ONE interval: three components call this hook, and three
// independent 5s timers would spend half that budget from a single tab. The
// interval also pauses while the tab is hidden; nobody is watching it move.
const ENDPOINT = "https://api.wheretheiss.at/v1/satellites/25544"
const POLL_MS = 5000

type Sat = {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
}

let current: ISS | null = null
let stopPolling: (() => void) | null = null
const listeners = new Set<(value: ISS | null) => void>()

const load = async () => {
  try {
    const res = await fetch(ENDPOINT)
    if (!res.ok) return
    const d = (await res.json()) as Sat
    current = {
      lat: d.latitude,
      lng: d.longitude,
      altKm: Math.round(d.altitude),
      speedKmh: Math.round(d.velocity),
    }
    listeners.forEach((notify) => notify(current))
  } catch {
    // Keep the last known position on a transient failure.
  }
}

// The flat map glides the marker between positions with a CSS transition tuned
// to this interval; the globe rebuilds its marker each poll and ticks instead.
export const useISS = (): ISS | null => {
  const [iss, setIss] = useState<ISS | null>(current)
  useEffect(() => {
    listeners.add(setIss)
    if (!stopPolling) stopPolling = everyWhileVisible(load, POLL_MS)
    return () => {
      listeners.delete(setIss)
      if (listeners.size === 0 && stopPolling) {
        stopPolling()
        stopPolling = null
      }
    }
  }, [])
  return iss
}
