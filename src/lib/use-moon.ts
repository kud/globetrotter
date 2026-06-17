import { useEffect, useState } from "react"
import { moonInfo, type MoonInfo } from "@/lib/moon"

// The Moon's sublunar point drifts ~15°/hour (Earth's rotation), so recomputing
// once a minute is plenty smooth — and it's a local calculation, no network.
// The marker itself is eased between updates with a CSS transition.
export const useMoon = (): MoonInfo | null => {
  const [moon, setMoon] = useState<MoonInfo | null>(null)
  useEffect(() => {
    const update = () => setMoon(moonInfo(new Date()))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])
  return moon
}
