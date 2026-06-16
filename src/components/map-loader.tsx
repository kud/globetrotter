"use client"

import { useEffect, useState } from "react"

// Tongue-in-cheek status lines that cycle while the map spins up.
const MESSAGES = [
  "Charting the oceans…",
  "Convincing tectonic plates to cooperate…",
  "Asking the whales for directions…",
  "Untangling the international date line…",
  "Catching the trade winds…",
  "Locating you (roughly)…",
]

// Two identical wave periods (each 1440 wide) so a -50% shift loops seamlessly.
const WAVE_PATH =
  "M0,60 C360,20 1080,100 1440,60 C1800,20 2520,100 2880,60 L2880,160 L0,160 Z"

// The animation lives on the wrapping div (animating transform on an <svg>
// element directly is unreliable across browsers).
const Wave = ({
  fill,
  opacity,
  duration,
  height,
}: {
  fill: string
  opacity: number
  duration: number
  height: number
}) => (
  <div
    className="absolute bottom-0 left-0 w-[200%]"
    style={{ height, animation: `wave-shift ${duration}s linear infinite` }}
  >
    <svg
      className="h-full w-full"
      viewBox="0 0 2880 160"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={WAVE_PATH} fill={fill} fillOpacity={opacity} />
    </svg>
  </div>
)

const MapLoader = () => {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1600)
    return () => clearInterval(id)
  }, [])
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: "var(--stage)" }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* A small porthole of water sloshing — two wave layers at different
            speeds give the parallax. */}
        <div
          className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--border-strong)]"
          style={{ background: "var(--panel)" }}
        >
          <Wave fill="#2f6fd0" opacity={0.5} duration={2.6} height={38} />
          <Wave fill="#5aa9ff" opacity={0.85} duration={1.7} height={32} />
        </div>
        <span className="min-h-4 text-xs text-[var(--ink-dim)]">
          {MESSAGES[i]}
        </span>
      </div>
    </div>
  )
}

export default MapLoader
