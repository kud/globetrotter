import { useEffect } from "react"
import { useTravelStore, type LiveFlight } from "@/lib/store"

export type { LiveFlight }

// Top-view airplane (24×24), nose pointing up (north) so a rotate by the flight's
// heading points it the right way.
export const PLANE_PATH =
  "M22 16v-2l-8.5-5V3.5a1.5 1.5 0 0 0-3 0V9L2 14v2l8.5-2.5V19L8 20.5V22l4-1 4 1v-1.5L13.5 19v-5.5z"

// One real aircraft from adsb.lol (via our proxy). Rotates to a fresh random
// flight each minute; lives in the shared store so map + panel stay in sync.
export const useFlightPoller = () => {
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const seed = Math.floor(Math.random() * 1e9)
        const res = await fetch(`/api/flight?seed=${seed}`)
        const { flight } = await res.json()
        if (!active) return
        if (!flight) {
          useTravelStore.getState().setFlight(null)
          return
        }
        useTravelStore.getState().setFlight(flight)
        // Enrich (type, operator, route + airport coords) without blocking the pin.
        const info = await fetch(
          `/api/plane-info?hex=${flight.id}&callsign=${flight.callsign}`,
        ).then((r) => r.json())
        if (active && useTravelStore.getState().flight?.id === flight.id) {
          useTravelStore.getState().setFlight({ ...flight, ...info })
        }
      } catch {
        // Keep the last known flight on a transient failure.
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])
}

export const flightTooltip = (f: LiveFlight) =>
  `✈ ${f.callsign}${f.country ? ` · ${f.country}` : ""}${f.altKm != null ? ` · ${f.altKm} km` : ""} · ${f.speedKmh} km/h`
