import { useEffect, useState } from "react"

export type ISS = { lat: number; lng: number; altKm: number; speedKmh: number }

// Polls the live ISS position every few seconds. Globe-only by construction:
// this hook lives in the globe view, which only mounts while the globe is shown.
export const useISS = (): ISS | null => {
  const [iss, setIss] = useState<ISS | null>(null)
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await fetch("/api/iss").then((r) => r.json())
        if (active && data.iss) setIss(data.iss)
      } catch {
        // Keep the last known position on a transient failure.
      }
    }
    load()
    const id = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])
  return iss
}
