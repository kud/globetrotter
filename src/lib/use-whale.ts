import { useEffect, useState } from "react"
import { OCEANS } from "@/lib/oceans"

export type Whale = { lat: number; lng: number; key: number }

// Surfaces a whale at a random ocean roughly every 2–3 minutes; it stays up for
// the duration of the breach animation, then dives. The first breach comes a
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
      const ocean = OCEANS[Math.floor(Math.random() * OCEANS.length)]
      setWhale({ lat: ocean.at[1], lng: ocean.at[0], key: Date.now() })
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
