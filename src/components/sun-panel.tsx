"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { useSun } from "@/lib/use-sun"
import { useT } from "@/lib/i18n"
import PanelImage from "@/components/panel-image"
import PanelHeader from "@/components/panel-header"
import { Stat } from "@/components/panel-stats"

// Public-domain NASA/SDO portrait of the Sun, via Wikimedia's filename redirect.
const SUN_PHOTO =
  "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Sun%20by%20the%20Atmospheric%20Imaging%20Assembly%20of%20NASA%27s%20Solar%20Dynamics%20Observatory%20-%2020100819.jpg?width=640"

const SunPanel = () => {
  const t = useT()
  const open = useTravelStore((s) => s.sunOpen)
  const close = () => useTravelStore.getState().closeSun()
  const sun = useSun()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closeSun()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="sun"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <PanelHeader
            icon="☀️"
            title="The Sun"
            subtitle="Our star"
            onClose={close}
            closeLabel={t("close")}
          />

          <PanelImage src={SUN_PHOTO} alt="The Sun" placeholder="☀️" />
          <p className="px-1 text-[10px] text-[var(--ink-faint)]">
            © NASA/SDO · public domain
          </p>

          <span
            className="self-start rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{
              background: "color-mix(in srgb, var(--accent) 18%, transparent)",
              color: "var(--accent)",
            }}
          >
            Live · computed locally
          </span>

          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Distance"
              value={sun ? `${sun.distanceKm.toLocaleString()} km` : "—"}
            />
            <Stat
              label="Overhead at"
              value={sun ? `${sun.lat.toFixed(1)}, ${sun.lng.toFixed(1)}` : "—"}
            />
            <Stat
              label="Season (N. hem.)"
              value={sun ? sun.seasonNorth : "—"}
            />
            <Stat
              label="Distance (AU)"
              value={sun ? sun.distanceAu.toFixed(3) : "—"}
            />
            <Stat
              label="Apparent size"
              value={sun ? `${sun.angularArcmin.toFixed(1)}′` : "—"}
            />
          </div>

          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            The marker shows the subsolar point — where the Sun is directly
            overhead (local solar noon) right now. It tracks west as the Earth
            turns, and drifts north and south with the seasons.
          </p>

          <a
            href="https://en.wikipedia.org/wiki/Sun"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {t("wiki.more")}
          </a>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default SunPanel
