"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTravelStore } from "@/lib/store"
import { useAdvisoryStore } from "@/lib/advisory-store"
import { useElementSize } from "@/lib/use-element-size"
import { useT, LOCALES, detectLocale } from "@/lib/i18n"
import { useFlightPoller } from "@/lib/flight"
import FlatMap from "@/components/flat-map"
import MapLoader from "@/components/map-loader"
import CountryPanel from "@/components/country-panel"
import FlightPanel from "@/components/flight-panel"
import ISSPanel from "@/components/iss-panel"
import MoonPanel from "@/components/moon-panel"
import OceanPanel from "@/components/ocean-panel"
import PlacePanel from "@/components/place-panel"
import LayersControl from "@/components/layers-control"
import {
  GlobeIcon,
  MapIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from "@/components/icons"

const GlobeView = dynamic(() => import("@/components/globe-view"), {
  ssr: false,
  loading: () => <MapLoader />,
})

const ViewToggle = () => {
  const t = useT()
  const view = useTravelStore((s) => s.view)
  const setView = useTravelStore((s) => s.setView)
  const base =
    "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm transition-colors cursor-pointer"
  const active = "bg-[var(--accent)] text-[var(--accent-ink)] font-semibold"
  const idle = "text-[var(--ink-dim)] hover:text-[var(--ink)]"
  return (
    <div className="inline-flex gap-1 rounded-full bg-[var(--panel)] p-1">
      <button
        className={`${base} ${view === "map" ? active : idle}`}
        onClick={() => setView("map")}
      >
        <MapIcon width={16} height={16} /> {t("view.map")}
      </button>
      <button
        className={`${base} ${view === "globe" ? active : idle}`}
        onClick={() => setView("globe")}
      >
        <GlobeIcon width={16} height={16} /> {t("view.globe")}
      </button>
    </div>
  )
}

const SpinToggle = () => {
  const t = useT()
  const autoSpin = useTravelStore((s) => s.autoSpin)
  const setAutoSpin = useTravelStore((s) => s.setAutoSpin)
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--ink-dim)]">
      <input
        type="checkbox"
        checked={autoSpin}
        onChange={(e) => setAutoSpin(e.target.checked)}
        className="accent-[var(--accent)]"
      />
      {t("autospin")}
    </label>
  )
}

const LanguageSelect = () => {
  const locale = useTravelStore((s) => s.locale)
  const setLocale = useTravelStore((s) => s.setLocale)
  const [open, setOpen] = useState(false)
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] pl-2.5 pr-2.5 text-sm font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]"
      >
        <span className="text-base leading-none">{current.flag}</span>
        {current.short}
        <span className="text-[9px] opacity-70">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] py-1 shadow-2xl">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setLocale(l.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--panel-hover)] ${
                  l.id === locale
                    ? "font-semibold text-[var(--accent)]"
                    : "text-[var(--ink)]"
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {l.id === locale && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ThemeToggle = () => {
  const t = useT()
  const theme = useTravelStore((s) => s.theme)
  const cycleTheme = useTravelStore((s) => s.cycleTheme)
  const Icon =
    theme === "system" ? MonitorIcon : theme === "dark" ? MoonIcon : SunIcon
  return (
    <button
      onClick={cycleTheme}
      aria-label={t("theme.toggle")}
      title={t(`theme.${theme}`)}
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--ink-dim)] hover:text-[var(--ink)]"
    >
      <Icon width={17} height={17} />
    </button>
  )
}

const Compass = () => {
  const t = useT()
  const southUp = useTravelStore((s) => s.southUp)
  const toggleSouthUp = useTravelStore((s) => s.toggleSouthUp)
  return (
    <button
      onClick={toggleSouthUp}
      title={t("compass")}
      aria-label={t("compass")}
      className="absolute right-5 top-20 z-10 text-[var(--ink-dim)] opacity-50 transition-[opacity,transform] duration-500 hover:opacity-90"
      style={{ transform: southUp ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <svg
        width="52"
        height="52"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="50" cy="50" r="46" strokeWidth="1.5" opacity="0.5" />
        <circle cx="50" cy="50" r="37" strokeWidth="2" />
        <g strokeWidth="2" strokeLinecap="round">
          <line x1="50" y1="5" x2="50" y2="15" />
          <line x1="50" y1="85" x2="50" y2="95" />
          <line x1="5" y1="50" x2="15" y2="50" />
          <line x1="85" y1="50" x2="95" y2="50" />
        </g>
        <path
          d="M50 20 L57 50 L50 80 L43 50 Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M50 20 L57 50 L43 50 Z" fill="currentColor" stroke="none" />
        <text
          x="50"
          y="14"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="currentColor"
          stroke="none"
        >
          N
        </text>
      </svg>
    </button>
  )
}

const MapStage = () => {
  const view = useTravelStore((s) => s.view)
  const [ref, size] = useElementSize<HTMLDivElement>()
  const ready = size.width > 0 && size.height > 0
  useFlightPoller()

  useEffect(() => {
    useTravelStore.getState().autoLocale(detectLocale())
    useAdvisoryStore.getState().load()
  }, [])

  return (
    <main
      className="relative flex h-full flex-col"
      style={{ background: "var(--stage)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <ViewToggle />
        <div className="flex items-center gap-3">
          {view === "globe" && <SpinToggle />}
          <LanguageSelect />
          <ThemeToggle />
        </div>
      </div>

      <div ref={ref} className="relative min-h-0 flex-1">
        {!ready && <MapLoader />}
        {ready && (
          <>
            {/* Flat map stays mounted (cheap SVG) and just hides under the
                globe. The globe is mounted ONLY while it's the active view and
                unmounts on leave — so its WebGL render loop never runs in the
                background slowing the tab, and flat-map-only users never load
                three.js at all. */}
            <div
              className="absolute inset-0"
              style={{ visibility: view === "globe" ? "hidden" : "visible" }}
            >
              <FlatMap size={size} />
            </div>
            {view === "globe" && (
              <div className="absolute inset-0">
                <GlobeView size={size} />
              </div>
            )}
          </>
        )}
      </div>
      {view === "map" && <Compass />}
      {ready && <LayersControl />}
      <CountryPanel />
      <FlightPanel />
      <ISSPanel />
      <MoonPanel />
      <OceanPanel />
      <PlacePanel />
    </main>
  )
}

export default MapStage
