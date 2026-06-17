"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import Globe, { type GlobeMethods } from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import {
  globeCountryFeatures,
  countryById,
  type CountryFeature,
} from "@/lib/geo"
import { getCountryInfo, getCapitalLatLng } from "@/lib/country-info"
import { useTravelStore, useResolvedTheme } from "@/lib/store"
import { MAP_PALETTE, lighten, baseFill } from "@/lib/colors"
import { OCEANS, oceanTip } from "@/lib/oceans"
import { LAYERS, KIND_ICON, type TransportPoint } from "@/lib/transport"
import { useAdvisoryStore, combinedLevel } from "@/lib/advisory-store"
import { PLANE_PATH, flightTooltip, type LiveFlight } from "@/lib/flight"
import { useISS } from "@/lib/use-iss"
import { useMoon } from "@/lib/use-moon"
import { useSun } from "@/lib/use-sun"
import { phaseEmoji } from "@/lib/moon"
import { ISS_MARKUP } from "@/lib/iss-mark"
import type { Size } from "@/lib/use-element-size"
import { CountryTooltip, type Hover } from "@/components/country-tooltip"

type Props = { size: Size }

type GlobeLabel = {
  text: string
  tip: string
  lat: number
  lng: number
  color: string
  size: number
  dot: number
}

// The single react-globe.gl HTML layer carries the live plane, the selected
// capital marker, and the ISS, discriminated by `kind`.
type HtmlItem =
  | { kind: "flight"; flight: LiveFlight }
  | { kind: "capital"; lat: number; lng: number; name: string }
  | { kind: "iss"; lat: number; lng: number; altKm: number; speedKmh: number }
  | { kind: "moon"; lat: number; lng: number; phase: number; phaseName: string }
  | { kind: "sun"; lat: number; lng: number }

// Module-level accessors so their identity is stable across re-renders — react
// -globe.gl re-digests a layer whenever an accessor's reference changes, and the
// ISS poll re-renders this component every few seconds.
const labelLat = (d: object) => (d as GlobeLabel).lat
const labelLng = (d: object) => (d as GlobeLabel).lng
const labelText = (d: object) => (d as GlobeLabel).text
const labelColor = (d: object) => (d as GlobeLabel).color
const labelSize = (d: object) => (d as GlobeLabel).size
const labelDot = (d: object) => (d as GlobeLabel).dot
// react-globe.gl renders this HTML string as a hover tooltip on the label.
const labelLabel = (d: object) => {
  const l = d as GlobeLabel
  return `<div style="background:rgba(15,20,32,.92);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 10px;font:600 13px system-ui,sans-serif;color:#eef2f8;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.4)">🌊 ${l.text}<div style="font-weight:400;font-size:11px;opacity:.7;margin-top:1px">${l.tip}</div></div>`
}

// Transport-layer points (airports / stations / ports) drawn as GPU dots — a
// dedicated points layer keeps them clickable with native hover tooltips.
type GlobePoint = TransportPoint & { color: string }
const pointLat = (d: object) => (d as GlobePoint).lat
const pointLng = (d: object) => (d as GlobePoint).lng
const pointColor = (d: object) => (d as GlobePoint).color
const pointLabel = (d: object) => {
  const p = d as GlobePoint
  const code = p.code ? `${p.code} · ` : ""
  return `<div style="background:rgba(15,20,32,.92);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 10px;font:600 13px system-ui,sans-serif;color:#eef2f8;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.4)">${KIND_ICON[p.kind]} ${code}${p.name}<div style="font-weight:400;font-size:11px;opacity:.7;margin-top:1px">${p.city}, ${p.country}</div></div>`
}

const htmlLat = (d: object) =>
  (d as HtmlItem).kind === "flight"
    ? (d as { flight: LiveFlight }).flight.lat
    : (d as { lat: number }).lat
const htmlLng = (d: object) =>
  (d as HtmlItem).kind === "flight"
    ? (d as { flight: LiveFlight }).flight.lng
    : (d as { lng: number }).lng
const htmlAltitude = (d: object) => {
  const kind = (d as HtmlItem).kind
  return kind === "moon" || kind === "sun"
    ? 0.55
    : kind === "iss"
      ? 0.12
      : kind === "flight"
        ? 0.05
        : 0.012
}

// The viewer's coordinates, resolved once and reused so re-entering the globe
// view never re-prompts for permission or re-runs the fly-to animation.
let cachedViewerLatLng: { lat: number; lng: number } | null = null

const DEFAULT_POV = { lat: 25, lng: 10, altitude: 2.4 }

// A round gold spot — the capital marker (matches the flat map's capital dot).
const capitalMarkup = `<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.5" fill="#ffffff" stroke="rgba(0,0,0,0.5)" stroke-width="1.2" paint-order="stroke"/></svg>`

const GlobeView = ({ size }: Props) => {
  const flight = useTravelStore((s) => s.flight)
  const liveSources = useAdvisoryStore((s) => s.sources)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const statuses = useTravelStore((s) => s.statuses)
  const theme = useResolvedTheme()
  const autoSpin = useTravelStore((s) => s.autoSpin)
  const focusId = useTravelStore((s) => s.focusId)
  const selectedId = useTravelStore((s) => s.selectedId)
  const select = useTravelStore((s) => s.select)
  const layerState = useTravelStore((s) => s.layers)
  const iss = useISS()
  const moon = useMoon()
  const sun = useSun()
  const [hover, setHover] = useState<Hover | null>(null)
  const mouse = useRef({ x: 0, y: 0 })

  const palette = MAP_PALETTE[theme]

  const oceanMaterial = useMemo(
    () => new MeshPhongMaterial({ color: palette.ocean, shininess: 6 }),
    [palette.ocean],
  )

  // Selection is shown by the cap fill (a cheap material swap) rather than by
  // lifting the country with altitude — altitude changes force every country's
  // 3D mesh to be re-tessellated, which is the main globe-interaction cost.
  const capColor = useCallback(
    (d: object) => {
      const f = d as CountryFeature
      const fill = baseFill(f.id, statuses[f.id], palette)
      // Selection keeps the status/ice colour but brightened.
      return f.id === selectedId ? lighten(fill, 0.32) : fill
    },
    [statuses, selectedId, palette],
  )

  // Cursor-following hover, identical to the flat map: track the pointer and,
  // when react-globe.gl reports a hovered polygon, populate the shared tooltip.
  const onMove = useCallback((e: MouseEvent) => {
    mouse.current = { x: e.clientX, y: e.clientY }
    setHover((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
  }, [])

  const onPolygonHover = useCallback(
    (d: object | null) => {
      if (!d) return setHover(null)
      const f = d as CountryFeature
      setHover({
        name: f.properties.name,
        flag: getCountryInfo(f.id)?.flag ?? "",
        status: statuses[f.id],
        level: combinedLevel(f.id, liveSources),
        capital: getCountryInfo(f.id)?.capital ?? null,
        subregion: getCountryInfo(f.id)?.subregion ?? null,
        x: mouse.current.x,
        y: mouse.current.y,
      })
    },
    [statuses, liveSources],
  )

  const handleClick = useCallback(
    (d: object) => select((d as CountryFeature).id),
    [select],
  )

  const onLabelClick = useCallback(
    (d: object) => useTravelStore.getState().openOcean((d as GlobeLabel).text),
    [],
  )

  const onPointClick = useCallback(
    (d: object) => useTravelStore.getState().openPlace(d as TransportPoint),
    [],
  )

  const points = useMemo<GlobePoint[]>(
    () =>
      LAYERS.filter((l) => layerState[l.id]).flatMap((l) =>
        l.data.map((p) => ({ ...p, color: l.color })),
      ),
    [layerState],
  )

  // The selected country's capital, if known — drives both the name label and
  // the star icon below.
  const capital = useMemo(() => {
    if (!selectedId) return null
    const info = getCountryInfo(selectedId)
    const coord = getCapitalLatLng(selectedId)
    if (!info?.capital || !coord) return null
    return { name: info.capital, lat: coord[0], lng: coord[1] }
  }, [selectedId])

  // Ocean names as billboard sprite labels (plain ASCII, so the sprite font is
  // fine). The capital name is rendered as a DOM element instead — sprite text
  // drops accented glyphs (e.g. "Brasília" → "Bras?lia").
  const labels = useMemo<GlobeLabel[]>(
    () =>
      OCEANS.map((o) => ({
        text: o.name,
        tip: oceanTip(o),
        lat: o.at[1],
        lng: o.at[0],
        color: palette.oceanLabel,
        size: 0.62,
        dot: 0,
      })),
    [palette.oceanLabel],
  )

  const htmlItems = useMemo<HtmlItem[]>(() => {
    const items: HtmlItem[] = []
    if (flight) items.push({ kind: "flight", flight })
    if (capital)
      items.push({
        kind: "capital",
        lat: capital.lat,
        lng: capital.lng,
        name: capital.name,
      })
    if (iss)
      items.push({
        kind: "iss",
        lat: iss.lat,
        lng: iss.lng,
        altKm: iss.altKm,
        speedKmh: iss.speedKmh,
      })
    if (moon)
      items.push({
        kind: "moon",
        lat: moon.lat,
        lng: moon.lng,
        phase: moon.phase,
        phaseName: moon.phaseName,
      })
    if (sun) items.push({ kind: "sun", lat: sun.lat, lng: sun.lng })
    return items
  }, [flight, capital, iss, moon, sun])

  const htmlElement = useCallback((d: object) => {
    const item = d as HtmlItem
    if (item.kind === "capital") {
      const el = document.createElement("div")
      el.style.pointerEvents = "none"
      el.style.display = "flex"
      el.style.alignItems = "center"
      el.style.gap = "4px"
      el.style.whiteSpace = "nowrap"
      el.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,.6))"
      // Name rendered as DOM text (not a sprite label) so accents survive.
      el.innerHTML = `${capitalMarkup}<span style="font:600 12px var(--font-geist-sans),system-ui,sans-serif;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,.7)">${item.name}</span>`
      return el
    }
    if (item.kind === "moon") {
      const el = document.createElement("div")
      el.className = "plane-hit"
      el.style.position = "relative"
      el.style.padding = "8px"
      el.style.cursor = "pointer"
      el.style.pointerEvents = "auto"
      el.style.fontSize = "26px"
      el.style.lineHeight = "1"
      el.style.filter = "drop-shadow(0 1px 3px rgba(0,0,0,.6))"
      el.title = `Moon · ${item.phaseName}`
      el.onclick = () => useTravelStore.getState().openMoon()
      el.innerHTML = `${phaseEmoji(item.phase)}<div class="plane-tip" style="position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:2px;white-space:nowrap;background:var(--panel);color:var(--ink);border:1px solid var(--border-strong);border-radius:8px;padding:4px 8px;box-shadow:0 8px 18px rgba(0,0,0,.35);font:13px var(--font-geist-sans),system-ui,sans-serif"><strong>🌙 Moon</strong><span style="margin-left:6px;color:var(--ink-dim);font-size:11px">${item.phaseName}</span></div>`
      return el
    }
    if (item.kind === "sun") {
      const el = document.createElement("div")
      el.className = "plane-hit"
      el.style.position = "relative"
      el.style.padding = "8px"
      el.style.cursor = "pointer"
      el.style.pointerEvents = "auto"
      el.style.fontSize = "26px"
      el.style.lineHeight = "1"
      el.style.filter = "drop-shadow(0 0 6px rgba(255,200,80,.7))"
      el.title = "Sun · overhead here"
      el.onclick = () => useTravelStore.getState().openSun()
      el.innerHTML = `☀️<div class="plane-tip" style="position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:2px;white-space:nowrap;background:var(--panel);color:var(--ink);border:1px solid var(--border-strong);border-radius:8px;padding:4px 8px;box-shadow:0 8px 18px rgba(0,0,0,.35);font:13px var(--font-geist-sans),system-ui,sans-serif"><strong>☀️ Sun</strong><span style="margin-left:6px;color:var(--ink-dim);font-size:11px">overhead here</span></div>`
      return el
    }
    if (item.kind === "iss") {
      const el = document.createElement("div")
      el.className = "plane-hit"
      el.style.position = "relative"
      el.style.padding = "10px"
      el.style.cursor = "pointer"
      el.style.pointerEvents = "auto"
      el.title = `ISS · ${item.altKm} km · ${item.speedKmh} km/h`
      el.onclick = () => useTravelStore.getState().openISS()
      el.innerHTML = `${ISS_MARKUP}<div class="plane-tip" style="position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:2px;white-space:nowrap;background:var(--panel);color:var(--ink);border:1px solid var(--border-strong);border-radius:8px;padding:4px 8px;box-shadow:0 8px 18px rgba(0,0,0,.35);font:13px var(--font-geist-sans),system-ui,sans-serif"><strong>🛰 ISS</strong><span style="margin-left:6px;color:var(--ink-dim);font-size:11px">${item.altKm} km · ${item.speedKmh} km/h</span></div>`
      return el
    }
    const f = item.flight
    const el = document.createElement("div")
    el.className = "plane-hit"
    el.title = flightTooltip(f)
    el.style.color = "#ffffff"
    el.style.cursor = "pointer"
    el.style.position = "relative"
    // Generous padding enlarges the click/hover target around the small icon.
    el.style.padding = "12px"
    // Opt in to pointer events so the click hits the plane (opens the flight
    // panel) instead of falling through to the globe's polygon click.
    el.style.pointerEvents = "auto"
    el.onclick = () => useTravelStore.getState().openFlight()
    // The plane art points north (up). On a sphere, screen-up isn't local north,
    // so derive the on-screen travel direction from two projected points (the
    // plane and a point just ahead along its heading) and rotate to that.
    let rot = f.heading
    const globe = globeRef.current
    if (globe) {
      const rad = Math.PI / 180
      const lat2 = f.lat + Math.cos(f.heading * rad) * 1.5
      const lng2 =
        f.lng +
        (Math.sin(f.heading * rad) * 1.5) /
          Math.max(0.25, Math.cos(f.lat * rad))
      const a = globe.getScreenCoords(f.lat, f.lng)
      const b = globe.getScreenCoords(lat2, lng2)
      if (a && b) rot = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90
    }
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:block;transform:rotate(${rot}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))"><path d="${PLANE_PATH}"/></svg><div class="plane-tip" style="position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:2px;white-space:nowrap;background:var(--panel);color:var(--ink);border:1px solid var(--border-strong);border-radius:8px;padding:4px 8px;box-shadow:0 8px 18px rgba(0,0,0,.35);font:13px var(--font-geist-sans),system-ui,sans-serif"><strong>✈ ${f.callsign}</strong><span style="margin-left:6px;color:var(--ink-dim);font-size:11px">${f.speedKmh} km/h</span></div>`
    return el
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    // If a country is already selected, the focus effect centres on it — don't
    // override that with the geolocation/default fly-to. Geolocation only frames
    // the globe when nothing is selected.
    if (useTravelStore.getState().selectedId) return
    // Re-entering the globe: fly straight to the known viewer location.
    if (cachedViewerLatLng) {
      globe.pointOfView({ ...cachedViewerLatLng, altitude: 1.8 }, 0)
      return
    }
    // First entry: show the default framing immediately, then animate to the
    // viewer's location once geolocation resolves. A denial or timeout simply
    // leaves the default in place.
    globe.pointOfView(DEFAULT_POV, 0)
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedViewerLatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        globeRef.current?.pointOfView(
          { ...cachedViewerLatLng, altitude: 1.8 },
          1200,
        )
      },
      () => {},
      { timeout: 6000 },
    )
  }, [])

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
    <div className="h-full w-full" onMouseMove={onMove}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={oceanMaterial}
        showAtmosphere
        atmosphereColor={palette.atmosphere}
        atmosphereAltitude={0.1}
        polygonsData={globeCountryFeatures}
        polygonAltitude={0.01}
        polygonCapColor={capColor}
        polygonSideColor="rgba(0,0,0,0)"
        polygonStrokeColor={palette.polygonStroke}
        onPolygonHover={onPolygonHover}
        onPolygonClick={handleClick}
        polygonsTransitionDuration={150}
        labelsData={labels}
        labelLat={labelLat}
        labelLng={labelLng}
        labelText={labelText}
        labelColor={labelColor}
        labelSize={labelSize}
        labelDotRadius={labelDot}
        labelLabel={labelLabel}
        onLabelClick={onLabelClick}
        labelResolution={2}
        labelAltitude={0.013}
        labelsTransitionDuration={0}
        pointsData={points}
        pointLat={pointLat}
        pointLng={pointLng}
        pointColor={pointColor}
        pointLabel={pointLabel}
        onPointClick={onPointClick}
        pointAltitude={0.012}
        pointRadius={0.32}
        // Minimal cylinder facets — at this dot size it's visually identical
        // but cuts vertex work when the ~1.2k-airport layer is on.
        pointResolution={4}
        pointsTransitionDuration={0}
        htmlElementsData={htmlItems}
        htmlLat={htmlLat}
        htmlLng={htmlLng}
        htmlAltitude={htmlAltitude}
        htmlElement={htmlElement}
      />
      {hover && <CountryTooltip hover={hover} />}
    </div>
  )
}

export default GlobeView
