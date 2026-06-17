import { useEffect, useState } from "react"
import { sunInfo, type SunInfo } from "@/lib/moon"

// The subsolar point drifts ~15°/hour as the Earth turns, so recomputing once a
// minute is plenty — and it's a local calculation, no network. The marker is
// eased between updates with a CSS transition.
export const useSun = (): SunInfo | null => {
  const [sun, setSun] = useState<SunInfo | null>(null)
  useEffect(() => {
    const update = () => setSun(sunInfo(new Date()))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])
  return sun
}
