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
import { MAP_PALETTE, statusFill, lighten } from "@/lib/colors"
import { OCEANS } from "@/lib/oceans"
import { useAdvisoryStore, combinedLevel } from "@/lib/advisory-store"
import { PLANE_PATH, flightTooltip, type LiveFlight } from "@/lib/flight"
import { useWhale } from "@/lib/use-whale"
import { WHALE_MARKUP } from "@/lib/whale-mark"
import type { Size } from "@/lib/use-element-size"
import { CountryTooltip, type Hover } from "@/components/country-tooltip"

type Props = { size: Size }

type GlobeLabel = {
  text: string
  lat: number
  lng: number
  color: string
  size: number
  dot: number
}

type FlightArc = {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

// The single react-globe.gl HTML layer carries both the live plane and the
// occasional breaching whale, discriminated by `kind`.
type HtmlItem =
  | { kind: "flight"; flight: LiveFlight }
  | { kind: "whale"; lat: number; lng: number; key: number }
  | { kind: "capital"; lat: number; lng: number; name: string }

// The viewer's coordinates, resolved once and reused so re-entering the globe
// view never re-prompts for permission or re-runs the fly-to animation.
let cachedViewerLatLng: { lat: number; lng: number } | null = null

const DEFAULT_POV = { lat: 25, lng: 10, altitude: 2.4 }

// A five-pointed star inside a thin ring — the cartographic mark for a national
// capital. Shared shape with the flat map; rendered here as raw SVG for the
// globe's imperative HTML layer (and deliberately not an emoji).
const CAPITAL_STAR =
  "M12 5 L13.7 9.65 L18.66 9.84 L14.76 12.9 L16.12 17.66 L12 14.9 L7.89 17.66 L9.24 12.9 L5.34 9.84 L10.3 9.65 Z"
const capitalMarkup = `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="none" stroke="rgba(255,206,77,0.5)" stroke-width="1.3"/><path d="${CAPITAL_STAR}" fill="#ffce4d" stroke="rgba(0,0,0,0.5)" stroke-width="1" stroke-linejoin="round" paint-order="stroke"/></svg>`

const GlobeView = ({ size }: Props) => {
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
  const whale = useWhale()
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
      const fill = statusFill(statuses[f.id], palette)
      // Selection keeps the status colour (so you still see visited/blocked/etc.)
      // but brightened; the accent stroke completes the cue.
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
        lat: o.at[1],
        lng: o.at[0],
        color: palette.oceanLabel,
        size: 0.62,
        dot: 0,
      })),
    [palette.oceanLabel],
  )

  // A dashed great-circle arc from the live flight to its destination, mirroring
  // the flat map's flight path line.
  const flightArcs = useMemo(() => {
    const dest = flight?.destination
    if (!flight || dest?.lat == null || dest?.lng == null) return []
    return [
      {
        startLat: flight.lat,
        startLng: flight.lng,
        endLat: dest.lat,
        endLng: dest.lng,
      },
    ]
  }, [flight])

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
    if (whale)
      items.push({
        kind: "whale",
        lat: whale.lat,
        lng: whale.lng,
        key: whale.key,
      })
    return items
  }, [flight, capital, whale])

  const htmlElement = useCallback((d: object) => {
    const item = d as HtmlItem
    if (item.kind === "whale") {
      // react-globe.gl positions this element via its `transform`; the breach
      // animation must live on an inner element or it overrides the positioning
      // and the whale flies off into space.
      const el = document.createElement("div")
      el.style.pointerEvents = "none"
      const inner = document.createElement("div")
      inner.className = "whale-breach"
      inner.innerHTML = WHALE_MARKUP
      el.appendChild(inner)
      return el
    }
    if (item.kind === "capital") {
      const el = document.createElement("div")
      el.style.pointerEvents = "none"
      el.style.display = "flex"
      el.style.alignItems = "center"
      el.style.gap = "4px"
      el.style.whiteSpace = "nowrap"
      el.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,.6))"
      // Name rendered as DOM text (not a sprite label) so accents survive.
      el.innerHTML = `${capitalMarkup}<span style="font:600 12px var(--font-geist-sans),system-ui,sans-serif;color:#ffce4d;text-shadow:0 1px 2px rgba(0,0,0,.7)">${item.name}</span>`
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

  const southUpMounted = useRef(false)
  useEffect(() => {
    // Skip the initial run so it doesn't override the geolocation fly-to; only
    // respond to actual compass toggles.
    if (!southUpMounted.current) {
      southUpMounted.current = true
      return
    }
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
    <div className="h-full w-full" onMouseMove={onMove}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={oceanMaterial}
        showAtmosphere
        atmosphereColor={palette.atmosphere}
        atmosphereAltitude={0.18}
        polygonsData={globeCountryFeatures}
        polygonAltitude={0.01}
        polygonCapColor={capColor}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={palette.polygonStroke}
        onPolygonHover={onPolygonHover}
        onPolygonClick={handleClick}
        polygonsTransitionDuration={150}
        labelsData={labels}
        labelLat={(d) => (d as GlobeLabel).lat}
        labelLng={(d) => (d as GlobeLabel).lng}
        labelText={(d) => (d as GlobeLabel).text}
        labelColor={(d) => (d as GlobeLabel).color}
        labelSize={(d) => (d as GlobeLabel).size}
        labelDotRadius={(d) => (d as GlobeLabel).dot}
        labelResolution={2}
        labelAltitude={0.013}
        labelsTransitionDuration={0}
        arcsData={flightArcs}
        arcStartLat={(d) => (d as FlightArc).startLat}
        arcStartLng={(d) => (d as FlightArc).startLng}
        arcEndLat={(d) => (d as FlightArc).endLat}
        arcEndLng={(d) => (d as FlightArc).endLng}
        arcColor={() => "#5aa9ff"}
        arcStroke={0.4}
        arcDashLength={0.5}
        arcDashGap={0.18}
        arcAltitudeAutoScale={0.3}
        arcsTransitionDuration={0}
        htmlElementsData={htmlItems}
        htmlLat={(d) =>
          (d as HtmlItem).kind === "flight"
            ? (d as { flight: LiveFlight }).flight.lat
            : (d as { lat: number }).lat
        }
        htmlLng={(d) =>
          (d as HtmlItem).kind === "flight"
            ? (d as { flight: LiveFlight }).flight.lng
            : (d as { lng: number }).lng
        }
        htmlAltitude={(d) => ((d as HtmlItem).kind === "flight" ? 0.05 : 0.012)}
        htmlElement={htmlElement}
      />
      {hover && <CountryTooltip hover={hover} />}
    </div>
  )
}

export default GlobeView
