"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { useMoon } from "@/lib/use-moon"
import { phaseEmoji } from "@/lib/moon"
import { useT } from "@/lib/i18n"
import PanelImage from "@/components/panel-image"
import PanelHeader from "@/components/panel-header"
import { Stat } from "@/components/panel-stats"

// Public-domain full-Moon photo (Gregory H. Revera) via Wikimedia's filename
// redirect, so there's no fragile path hash to break.
const MOON_PHOTO =
  "https://commons.wikimedia.org/wiki/Special:FilePath/FullMoon2010.jpg?width=640"

const MoonPanel = () => {
  const t = useT()
  const open = useTravelStore((s) => s.moonOpen)
  const close = () => useTravelStore.getState().closeMoon()
  const moon = useMoon()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closeMoon()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="moon"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <PanelHeader
            icon={moon ? phaseEmoji(moon.phase) : "🌙"}
            title="The Moon"
            subtitle={moon ? moon.phaseName : "Earth's natural satellite"}
            onClose={close}
            closeLabel={t("close")}
          />

          <PanelImage src={MOON_PHOTO} alt="The Moon" placeholder="🌕" />
          <p className="px-1 text-[10px] text-[var(--ink-faint)]">
            © Gregory H. Revera · CC BY-SA
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
              label="Illumination"
              value={moon ? `${Math.round(moon.fraction * 100)}%` : "—"}
            />
            <Stat
              label="Distance"
              value={moon ? `${moon.distanceKm.toLocaleString()} km` : "—"}
            />
            <Stat label="Phase" value={moon ? moon.phaseName : "—"} />
            <Stat
              label="Age"
              value={moon ? `${moon.ageDays.toFixed(1)} days` : "—"}
            />
            <Stat
              label="Next full moon"
              value={
                moon
                  ? moon.daysToFull < 0.5
                    ? "Today"
                    : `in ${Math.round(moon.daysToFull)} days`
                  : "—"
              }
            />
            <Stat
              label="Apparent size"
              value={moon ? `${moon.angularArcmin.toFixed(1)}′` : "—"}
            />
            <Stat
              label="Overhead at"
              value={
                moon ? `${moon.lat.toFixed(1)}, ${moon.lng.toFixed(1)}` : "—"
              }
            />
          </div>

          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            The marker shows the sublunar point — where the Moon is directly
            overhead right now. It drifts west as the Earth turns beneath it.
          </p>

          <a
            href="https://en.wikipedia.org/wiki/Moon"
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

export default MoonPanel
