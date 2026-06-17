"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { KIND_COLOR, KIND_ICON, type TransportPoint } from "@/lib/transport"
import PanelImage from "@/components/panel-image"
import PanelHeader from "@/components/panel-header"

type Summary = { extract: string; url: string; image: string | null }

const KIND_LABEL = {
  airport: "Airport",
  station: "Train station",
  port: "Seaport",
} as const

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--panel-hover)] px-3 py-2">
    <span className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">
      {label}
    </span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
)

const placeKey = (p: TransportPoint) => `${p.name}@${p.lat},${p.lng}`

const PlacePanel = () => {
  const place = useTravelStore((s) => s.place)
  const close = () => useTravelStore.getState().closePlace()
  // Keyed by place identity so a stale summary never flashes when switching.
  const [data, setData] = useState<{ key: string; summary: Summary } | null>(
    null,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closePlace()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!place) return
    const key = placeKey(place)
    let active = true
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.wiki)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return
        setData({
          key,
          summary: {
            extract: d?.extract ?? "",
            url: d?.content_urls?.desktop?.page ?? "",
            image: d?.thumbnail?.source ?? d?.originalimage?.source ?? null,
          },
        })
      })
      .catch(() => {
        if (active)
          setData({ key, summary: { extract: "", url: "", image: null } })
      })
    return () => {
      active = false
    }
  }, [place])

  const summary = place && data?.key === placeKey(place) ? data.summary : null

  return (
    <AnimatePresence>
      {place && (
        <motion.aside
          key="place"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <PanelHeader
            icon={
              <span style={{ color: KIND_COLOR[place.kind] }}>
                {KIND_ICON[place.kind]}
              </span>
            }
            title={place.name}
            subtitle={
              <span className="flex items-center gap-1.5">
                {KIND_LABEL[place.kind]}
                {place.code && (
                  <span className="rounded bg-[var(--panel-hover)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink)]">
                    {place.code}
                  </span>
                )}
              </span>
            }
            onClose={close}
          />

          <PanelImage
            key={summary?.image ?? "placeholder"}
            src={summary?.image ?? null}
            alt={place.name}
            placeholder={KIND_ICON[place.kind]}
          />

          <div className="grid grid-cols-2 gap-2">
            <Stat label="City" value={place.city} />
            <Stat label="Country" value={place.country} />
            <Stat
              label="Coordinates"
              value={`${place.lat.toFixed(2)}, ${place.lng.toFixed(2)}`}
            />
          </div>

          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            {summary
              ? summary.extract || "No description available."
              : "Loading…"}
          </p>

          {summary?.url && (
            <a
              href={summary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Read on Wikipedia ↗
            </a>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default PlacePanel
