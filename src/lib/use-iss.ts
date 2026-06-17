import { useEffect, useState } from "react"

export type ISS = { lat: number; lng: number; altKm: number; speedKmh: number }

// Live ISS position, polled every 5s. The marker is animated between positions
// with a CSS transition (see the flat map / globe markers) rather than by
// re-rendering at high frequency, so the map stays cheap.
export const useISS = (): ISS | null => {
  const [iss, setIss] = useState<ISS | null>(null)
  useEffect(() => {
    let active = true
    const load = async () => {
      const data = await fetch("/api/iss")
        .then((r) => r.json())
        .catch(() => null)
      if (active && data?.iss) setIss(data.iss)
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
