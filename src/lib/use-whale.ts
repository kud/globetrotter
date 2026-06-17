import { useEffect, useState } from "react"

export type Whale = { lat: number; lng: number; key: number }

// Deep open-ocean breach points [lat, lng], chosen well clear of any coastline
// so the whale always surfaces over water (the ocean *label* positions sit too
// close to land — the Mediterranean and Arctic ones especially).
const WHALE_SPOTS: [number, number][] = [
  [25, -150], // North Pacific
  [5, -140], // Equatorial Pacific
  [-20, -120], // South Pacific
  [-50, -120], // far South Pacific
  [33, -45], // North Atlantic
  [-25, -20], // South Atlantic
  [-30, 80], // Indian Ocean
  [-45, 90], // Southern Indian Ocean
]

// Surfaces a whale at a random open-ocean point roughly every 2–3 minutes; it
// stays up for the breach animation, then dives. The first breach comes a
// little sooner so it's actually discoverable.
const BREACH_VISIBLE_MS = 3200
const FIRST_DELAY_MS = 25000
const nextDelay = () => 120000 + Math.random() * 60000

export const useWhale = (): Whale | null => {
  const [whale, setWhale] = useState<Whale | null>(null)
  useEffect(() => {
    let nextTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>
    const breach = () => {
      const [lat, lng] =
        WHALE_SPOTS[Math.floor(Math.random() * WHALE_SPOTS.length)]
      setWhale({ lat, lng, key: Date.now() })
      hideTimer = setTimeout(() => setWhale(null), BREACH_VISIBLE_MS)
      nextTimer = setTimeout(breach, nextDelay())
    }
    nextTimer = setTimeout(breach, FIRST_DELAY_MS)
    return () => {
      clearTimeout(nextTimer)
      clearTimeout(hideTimer)
    }
  }, [])
  return whale
}
