"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { useT } from "@/lib/i18n"
import { oceanByName } from "@/lib/oceans"
import PanelImage from "@/components/panel-image"
import PanelHeader from "@/components/panel-header"
import { Stat } from "@/components/panel-stats"

type Summary = { extract: string; url: string; image: string | null }

const OceanPanel = () => {
  const t = useT()
  const ocean = useTravelStore((s) => s.ocean)
  const close = () => useTravelStore.getState().closeOcean()
  const meta = ocean ? oceanByName(ocean) : undefined
  // Keyed by ocean name so a stale summary never flashes when switching.
  const [data, setData] = useState<{ name: string; summary: Summary } | null>(
    null,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closeOcean()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!ocean) return
    const name = ocean
    // North/South halves share the parent ocean's Wikipedia article.
    const title = oceanByName(name)?.wiki ?? name
    let active = true
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.extract) {
          setData({
            name,
            summary: {
              extract: d.extract,
              url: d.content_urls?.desktop?.page ?? "",
              image: d.thumbnail?.source ?? d.originalimage?.source ?? null,
            },
          })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [ocean])

  const summary = data?.name === ocean ? data.summary : null

  return (
    <AnimatePresence>
      {ocean && (
        <motion.aside
          key="ocean"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <PanelHeader
            icon="🌊"
            title={ocean}
            onClose={close}
            closeLabel={t("close")}
          />

          <PanelImage
            key={summary?.image ?? "placeholder"}
            src={summary?.image ?? null}
            alt={ocean}
            placeholder="🌊"
          />

          {meta && (
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="Area"
                value={`${(meta.areaKm2 / 1e6).toFixed(1)}M km²`}
              />
              <Stat
                label="Max depth"
                value={`${meta.maxDepthM.toLocaleString()} m`}
              />
            </div>
          )}

          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            {summary ? summary.extract : "Loading…"}
          </p>

          {summary?.url && (
            <a
              href={summary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              {t("wiki.more")}
            </a>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default OceanPanel
