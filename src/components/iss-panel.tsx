"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { useISS } from "@/lib/use-iss"
import { ISS_MARKUP } from "@/lib/iss-mark"
import PanelImage from "@/components/panel-image"

// Public-domain NASA photo of the ISS, via Wikimedia's filename-based redirect
// (no fragile path hash). Falls back gracefully if it ever fails to load.
const ISS_PHOTO =
  "https://commons.wikimedia.org/wiki/Special:FilePath/International%20Space%20Station%20after%20undocking%20of%20STS-132.jpg?width=640"

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 border-b border-[var(--border)] py-1.5 last:border-0">
    <span className="text-[var(--ink-dim)]">{label}</span>
    <span className="text-right font-medium tabular-nums">{value}</span>
  </div>
)

const ISSPanel = () => {
  const open = useTravelStore((s) => s.issOpen)
  const close = () => useTravelStore.getState().closeISS()
  const iss = useISS()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closeISS()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="iss"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-5 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3">
            <div>
              <span
                className="block"
                dangerouslySetInnerHTML={{ __html: ISS_MARKUP }}
              />
              <h2 className="font-display mt-2 text-2xl font-semibold leading-tight">
                ISS
              </h2>
              <p className="text-sm text-[var(--ink-dim)]">
                International Space Station
              </p>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[var(--ink-dim)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              ✕
            </button>
          </header>

          <div className="flex flex-col gap-1">
            <PanelImage
              src={ISS_PHOTO}
              alt="International Space Station"
              placeholder="🛰"
            />
            <p className="px-1 text-[10px] text-[var(--ink-faint)]">
              © NASA · public domain
            </p>
          </div>

          <span
            className="self-start rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{
              background: "color-mix(in srgb, var(--accent) 18%, transparent)",
              color: "var(--accent)",
            }}
          >
            Live · wheretheiss.at
          </span>

          <section className="text-sm">
            <Row label="Altitude" value={iss ? `${iss.altKm} km` : "—"} />
            <Row
              label="Speed"
              value={iss ? `${iss.speedKmh.toLocaleString()} km/h` : "—"}
            />
            <Row
              label="Position"
              value={iss ? `${iss.lat.toFixed(2)}, ${iss.lng.toFixed(2)}` : "—"}
            />
          </section>

          <a
            href="https://en.wikipedia.org/wiki/International_Space_Station"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Read on Wikipedia ↗
          </a>

          <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
            Live position from wheretheiss.at · orbits Earth ~16 times a day.
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default ISSPanel
