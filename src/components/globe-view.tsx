"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import Globe, { type GlobeMethods } from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import { countryFeatures, countryById, type CountryFeature } from "@/lib/geo"
import { getCountryInfo, getCapitalLatLng } from "@/lib/country-info"
import { useTravelStore, useResolvedTheme } from "@/lib/store"
import { useT, statusKey } from "@/lib/i18n"
import { MAP_PALETTE, statusFill } from "@/lib/colors"
import { ADVISORY_META } from "@/lib/advisory"
import { useAdvisoryStore, combinedLevel } from "@/lib/advisory-store"
import { PLANE_PATH, flightTooltip, type LiveFlight } from "@/lib/flight"
import type { Size } from "@/lib/use-element-size"

type Props = { size: Size }

// Inline HTML risk meter (matches the flat map's RiskMeter) for globe labels.
const meterHtml = (level: number | undefined) => {
  if (!level) return ""
  const seg = (n: 1 | 2 | 3 | 4) =>
    `<span style="display:block;width:6px;height:6px;border-radius:1px;background:${ADVISORY_META[n].color};opacity:${n <= level ? 1 : 0.18}"></span>`
  return `<span style="display:flex;flex-direction:column-reverse;gap:2px">${seg(1)}${seg(2)}${seg(3)}${seg(4)}</span>`
}

const GlobeView = ({ size }: Props) => {
  const t = useT()
  const flight = useTravelStore((s) => s.flight)
  const southUp = useTravelStore((s) => s.southUp)
  const liveSources = useAdvisoryStore((s) => s.sources)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const statuses = useTravelStore((s) => s.statuses)
  const theme = useResolvedTheme()
  const autoSpin = useTravelStore((s) => s.autoSpin)
  const focusId = useTravelStore((s) => s.focusId)
  const selectedId = useTravelStore((s) => s.selectedId)
  const select = useTravelStore((s) => s.select)

  const palette = MAP_PALETTE[theme]

  const oceanMaterial = useMemo(
    () => new MeshPhongMaterial({ color: palette.ocean, shininess: 6 }),
    [palette.ocean],
  )

  const capColor = useCallback(
    (d: object) => statusFill(statuses[(d as CountryFeature).id], palette),
    [statuses, palette],
  )

  const label = useCallback(
    (d: object) => {
      const f = d as CountryFeature
      const status = statuses[f.id]
      const flag = getCountryInfo(f.id)?.flag ?? ""
      const meter = meterHtml(combinedLevel(f.id, liveSources))
      return `<div style="display:flex;align-items:center;gap:8px;font:13px var(--font-geist-sans),system-ui,sans-serif;white-space:nowrap;background:var(--panel);color:var(--ink);padding:6px 10px;border-radius:8px;border:1px solid var(--border-strong);box-shadow:0 10px 20px rgba(0,0,0,.3)">
        ${meter}
        <span><strong>${flag} ${f.properties.name}</strong><span style="margin-left:8px;color:var(--ink-dim);font-size:11px">${t(statusKey(status))}</span></span>
      </div>`
    },
    [statuses, t, liveSources],
  )

  const altitude = useCallback(
    (d: object) => {
      const id = (d as CountryFeature).id
      if (id === selectedId) return 0.07
      return statuses[id] ? 0.04 : 0.008
    },
    [statuses, selectedId],
  )

  const strokeColor = useCallback(
    (d: object) =>
      (d as CountryFeature).id === selectedId
        ? "#5aa9ff"
        : palette.polygonStroke,
    [selectedId, palette],
  )

  const handleClick = useCallback(
    (d: object) => select((d as CountryFeature).id),
    [select],
  )

  const capitalPoints = useMemo(() => {
    if (!selectedId) return []
    const info = getCountryInfo(selectedId)
    const coord = getCapitalLatLng(selectedId)
    if (!info?.capital || !coord) return []
    return [{ lat: coord[0], lng: coord[1], label: info.capital }]
  }, [selectedId])

  const pointLabel = useCallback(
    (d: object) =>
      `<div style="font:12px var(--font-geist-sans),sans-serif;white-space:nowrap;background:var(--panel);color:var(--ink);padding:4px 8px;border-radius:7px;border:1px solid var(--border-strong)"><span style="color:#ffce4d">★</span> ${(d as { label: string }).label}</div>`,
    [],
  )

  const planeElement = useCallback((d: object) => {
    const f = d as LiveFlight
    const el = document.createElement("div")
    el.title = flightTooltip(f)
    el.style.color = "#ffffff"
    el.style.cursor = "pointer"
    el.onclick = () => useTravelStore.getState().openFlight()
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="transform:rotate(${f.heading}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))"><path d="${PLANE_PATH}"/></svg>`
    return el
  }, [])

  useEffect(() => {
    globeRef.current?.pointOfView({ lat: 25, lng: 10, altitude: 2.4 }, 0)
  }, [])

  useEffect(() => {
    const pov = globeRef.current?.pointOfView()
    if (!pov) return
    globeRef.current?.pointOfView({ lat: southUp ? -40 : 30 }, 800)
  }, [southUp])

  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = autoSpin
    controls.autoRotateSpeed = 0.6
  }, [autoSpin, size.width])

  useEffect(() => {
    if (!focusId) return
    const target = countryById.get(focusId)
    if (!target) return
    const [lng, lat] = target.centroid
    globeRef.current?.pointOfView({ lat, lng, altitude: 1.6 }, 900)
  }, [focusId])

  return (
    <Globe
      ref={globeRef}
      width={size.width}
      height={size.height}
      backgroundColor="rgba(0,0,0,0)"
      globeMaterial={oceanMaterial}
      showAtmosphere
      atmosphereColor={palette.atmosphere}
      atmosphereAltitude={0.18}
      polygonsData={countryFeatures}
      polygonAltitude={altitude}
      polygonCapColor={capColor}
      polygonSideColor={() => "rgba(90,169,255,0.25)"}
      polygonStrokeColor={strokeColor}
      polygonLabel={label}
      onPolygonClick={handleClick}
      polygonsTransitionDuration={200}
      htmlElementsData={flight ? [flight] : []}
      htmlLat={(d) => (d as LiveFlight).lat}
      htmlLng={(d) => (d as LiveFlight).lng}
      htmlAltitude={0.05}
      htmlElement={planeElement}
      pointsData={capitalPoints}
      pointLat={(d) => (d as { lat: number }).lat}
      pointLng={(d) => (d as { lng: number }).lng}
      pointColor={() => "#ffce4d"}
      pointAltitude={0.09}
      pointRadius={0.32}
      pointLabel={pointLabel}
      pointsTransitionDuration={300}
    />
  )
}

export default GlobeView
