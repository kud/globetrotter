import { useEffect, useRef, useState } from "react"

export type ISS = { lat: number; lng: number; altKm: number; speedKmh: number }

const POLL_MS = 5000
const STEP_MS = 80 // ~12fps interpolation — smooth without flooding re-renders

// Live ISS position, interpolated between 5s polls so the marker glides instead
// of teleporting. Globe-only by construction (the hook lives in views that only
// poll while visible). Longitude is lerped along the shortest path so a date-
// line crossing doesn't sweep backwards across the map.
export const useISS = (): ISS | null => {
  const [pos, setPos] = useState<ISS | null>(null)
  const from = useRef<ISS | null>(null)
  const to = useRef<ISS | null>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    let active = true
    let hasPos = false

    const load = async () => {
      const data = await fetch("/api/iss")
        .then((r) => r.json())
        .catch(() => null)
      if (!active || !data?.iss) return
      from.current = to.current ?? data.iss
      to.current = data.iss
      startedAt.current = performance.now()
      if (!hasPos) {
        hasPos = true
        setPos(data.iss)
      }
    }

    const step = () => {
      const a = from.current
      const b = to.current
      if (!a || !b) return
      const t = Math.min(1, (performance.now() - startedAt.current) / POLL_MS)
      let dLng = b.lng - a.lng
      if (dLng > 180) dLng -= 360
      else if (dLng < -180) dLng += 360
      let lng = a.lng + dLng * t
      if (lng > 180) lng -= 360
      else if (lng < -180) lng += 360
      setPos({
        lat: a.lat + (b.lat - a.lat) * t,
        lng,
        altKm: b.altKm,
        speedKmh: b.speedKmh,
      })
    }

    load()
    const poll = setInterval(load, POLL_MS)
    const ticker = setInterval(step, STEP_MS)
    return () => {
      active = false
      clearInterval(poll)
      clearInterval(ticker)
    }
  }, [])

  return pos
}
