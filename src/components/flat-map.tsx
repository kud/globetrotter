"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { select } from "d3-selection"
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom"
import "d3-transition"
import { countryFeatures, type CountryFeature } from "@/lib/geo"
import { OCEANS } from "@/lib/oceans"
import { getCountryInfo, getCapitalLatLng } from "@/lib/country-info"
import { useTravelStore, useResolvedTheme } from "@/lib/store"
import { PLANE_PATH } from "@/lib/flight"
import { useWhale } from "@/lib/use-whale"
import { WHALE_MARKUP } from "@/lib/whale-mark"
import {
  MAP_PALETTE,
  STATUS,
  statusFill,
  lighten,
  type MapPalette,
} from "@/lib/colors"
import { useAdvisoryStore, combinedLevel } from "@/lib/advisory-store"
import type { Status } from "@/lib/store"
import type { Size } from "@/lib/use-element-size"
import { PlusIcon, MinusIcon, TargetIcon } from "@/components/icons"
import { CountryTooltip, type Hover } from "@/components/country-tooltip"

type Props = { size: Size }
type Transform = { k: number; x: number; y: number }

// Five-pointed star centred at the origin — the cartographic mark for a capital.
const starPath = (outer: number, inner: number) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`
  })
  return `M${points.join("L")}Z`
}

// Memoised so zoom/pan (which only changes the parent <g> transform) doesn't
// reconcile ~250 country paths every frame — the main flat-map FPS win.
const CountryPaths = memo(function CountryPaths({
  paths,
  statuses,
  selectedId,
  palette,
  onSelect,
  onEnter,
  onMove,
  onLeave,
}: {
  paths: { f: CountryFeature; d: string }[]
  statuses: Record<string, Status>
  selectedId: string | null
  palette: MapPalette
  onSelect: (id: string) => void
  onEnter: (f: CountryFeature, e: MouseEvent) => void
  onMove: (e: MouseEvent) => void
  onLeave: () => void
}) {
  return (
    <>
      {paths.map(({ f, d }) => {
        const selected = f.id === selectedId
        const status = statuses[f.id]
        // Subtle textural cue per status: wishlist dashed, blocked dotted (both
        // in their own colour), visited/selected solid.
        const patterned =
          !selected && (status === "wishlist" || status === "blocked")
        const stroke = selected
          ? palette.selectedStroke
          : status === "wishlist" || status === "blocked"
            ? STATUS[status]
            : palette.polygonStroke
        const dash = selected
          ? undefined
          : status === "wishlist"
            ? "3 2.5"
            : status === "blocked"
              ? "0.5 3"
              : undefined
        return (
          <path
            key={f.id}
            d={d}
            fill={
              selected
                ? lighten(statusFill(status, palette), 0.32)
                : statusFill(status, palette)
            }
            stroke={stroke}
            strokeWidth={selected ? 1.6 : patterned ? 1 : 0.5}
            strokeDasharray={dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer transition-[fill,stroke,stroke-width] duration-150 ease-out"
            onClick={() => onSelect(f.id)}
            onMouseEnter={(e) => onEnter(f, e)}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          />
        )
      })}
    </>
  )
})

const FlatMap = ({ size }: Props) => {
  const flight = useTravelStore((s) => s.flight)
  const openFlight = useTravelStore((s) => s.openFlight)
  const southUp = useTravelStore((s) => s.southUp)
  const liveSources = useAdvisoryStore((s) => s.sources)
  const statuses = useTravelStore((s) => s.statuses)
  const theme = useResolvedTheme()
  const selectedId = useTravelStore((s) => s.selectedId)
  const selectCountry = useTravelStore((s) => s.select)
  const [hover, setHover] = useState<Hover | null>(null)
  const [planeHover, setPlaneHover] = useState(false)
  const whale = useWhale()
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const palette = MAP_PALETTE[theme]

  const onSelect = useCallback(
    (id: string) => selectCountry(id),
    [selectCountry],
  )
  const onEnter = useCallback(
    (f: CountryFeature, e: MouseEvent) =>
      setHover({
        name: f.properties.name,
        flag: getCountryInfo(f.id)?.flag ?? "",
        status: statuses[f.id],
        level: combinedLevel(f.id, liveSources),
        capital: getCountryInfo(f.id)?.capital ?? null,
        subregion: getCountryInfo(f.id)?.subregion ?? null,
        x: e.clientX,
        y: e.clientY,
      }),
    [statuses, liveSources],
  )
  const onMove = useCallback(
    (e: MouseEvent) =>
      setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h)),
    [],
  )
  const onLeave = useCallback(() => setHover(null), [])

  const { paths, oceans, project } = useMemo(() => {
    // Web Mercator: a strictly rectangular grid (vertical meridians, horizontal
    // parallels) so the map reads as a flat wall map with no polar curvature.
    const scale = size.width / (2 * Math.PI)
    // Clip to the FULL map square (±85.05° → ±π·scale), not the viewport, so
    // every landmass renders complete (the SVG viewport crops what's visible).
    // Clipping to the viewport would truncate land sitting off-frame at zoom 1.
    const half = Math.PI * scale
    const projection = geoMercator()
      .scale(scale)
      .translate([size.width / 2, size.height / 2])
      .clipExtent([
        [0, size.height / 2 - half],
        [size.width, size.height / 2 + half],
      ])
    const path = geoPath(projection)
    const oceans = OCEANS.map((o) => {
      const p = projection(o.at)
      return p ? { name: o.name, x: p[0], y: p[1] } : null
    }).filter(Boolean) as { name: string; x: number; y: number }[]
    return {
      paths: countryFeatures.map((f) => ({ f, d: path(f) ?? "" })),
      oceans,
      project: projection,
    }
  }, [size.width, size.height])

  const capital = useMemo(() => {
    if (!selectedId) return null
    const info = getCountryInfo(selectedId)
    const coord = getCapitalLatLng(selectedId)
    if (!info?.capital || !coord) return null
    const point = project([coord[1], coord[0]])
    return point ? { name: info.capital, x: point[0], y: point[1] } : null
  }, [selectedId, project])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 9])
      .on("zoom", (e) =>
        setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }),
      )
    zoomRef.current = behavior
    svg.call(behavior)
    return () => {
      svg.on(".zoom", null)
    }
  }, [size.width, size.height])

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomRef.current.scaleBy, factor)
  }
  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, zoomIdentity)
  }

  if (size.width === 0) return null

  const flightPos = flight ? project([flight.lng, flight.lat]) : null
  const whaleScreen = whale ? project([whale.lng, whale.lat]) : null
  const destPos =
    flight?.destination?.lat != null && flight.destination.lng != null
      ? project([flight.destination.lng, flight.destination.lat])
      : null

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="block cursor-grab active:cursor-grabbing"
        style={{ background: palette.ocean }}
        role="img"
        aria-label="Flat world map"
      >
        <g
          transform={`${southUp ? `rotate(180 ${size.width / 2} ${size.height / 2}) ` : ""}translate(${t.x},${t.y}) scale(${t.k})`}
        >
          <g pointerEvents="none">
            {oceans.map((o) => (
              <text
                key={`${o.name}-${o.x.toFixed(0)}`}
                x={o.x}
                y={o.y}
                textAnchor="middle"
                transform={southUp ? `rotate(180 ${o.x} ${o.y})` : undefined}
                fill="var(--ink-dim)"
                style={{
                  fontSize: `${11 / t.k}px`,
                  fontStyle: "italic",
                  letterSpacing: `${1.5 / t.k}px`,
                  opacity: 0.7,
                }}
              >
                {o.name}
              </text>
            ))}
          </g>
          <CountryPaths
            paths={paths}
            statuses={statuses}
            selectedId={selectedId}
            palette={palette}
            onSelect={onSelect}
            onEnter={onEnter}
            onMove={onMove}
            onLeave={onLeave}
          />
          {flight && flightPos && (
            <>
              {destPos ? (
                <line
                  x1={flightPos[0]}
                  y1={flightPos[1]}
                  x2={destPos[0]}
                  y2={destPos[1]}
                  stroke="var(--accent)"
                  strokeWidth={1.2}
                  strokeDasharray="2 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.55}
                  pointerEvents="none"
                />
              ) : null}
              {destPos ? (
                <circle
                  cx={destPos[0]}
                  cy={destPos[1]}
                  r={3 / t.k}
                  fill="var(--accent)"
                  pointerEvents="none"
                />
              ) : null}
              <g
                transform={`translate(${flightPos[0]},${flightPos[1]}) rotate(${flight.heading})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setPlaneHover(true)}
                onMouseLeave={() => setPlaneHover(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  openFlight()
                }}
              >
                {!destPos && (
                  <line
                    x1={0}
                    y1={-7 / t.k}
                    x2={0}
                    y2={-72 / t.k}
                    stroke="var(--accent)"
                    strokeWidth={1.2}
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.55}
                  />
                )}
                <circle r={11 / t.k} fill="transparent" />
                <path
                  d={PLANE_PATH}
                  transform={`scale(${1.05 / t.k}) translate(-12,-12)`}
                  fill="#ffffff"
                  stroke="var(--ink)"
                  strokeWidth={0.5 / t.k}
                  paintOrder="stroke"
                />
              </g>
            </>
          )}
          {capital && (
            <g
              transform={`translate(${capital.x},${capital.y})${southUp ? " rotate(180)" : ""}`}
              pointerEvents="none"
            >
              <circle
                r={7 / t.k}
                fill="none"
                stroke="rgba(255,206,77,0.5)"
                strokeWidth={1.2 / t.k}
              />
              <path
                d={starPath(4.6 / t.k, 1.9 / t.k)}
                fill="#ffce4d"
                stroke="var(--panel)"
                strokeWidth={1 / t.k}
                strokeLinejoin="round"
                paintOrder="stroke"
              />
              <text
                x={7.5 / t.k}
                y={3.6 / t.k}
                fill="var(--ink)"
                stroke="var(--panel)"
                strokeWidth={3 / t.k}
                paintOrder="stroke"
                style={{ fontSize: `${12 / t.k}px`, fontWeight: 600 }}
              >
                {capital.name}
              </text>
            </g>
          )}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.6)}
          aria-label="Zoom in"
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 text-[var(--ink)] backdrop-blur hover:border-[var(--accent)]"
        >
          <PlusIcon />
        </button>
        <button
          onClick={() => zoomBy(1 / 1.6)}
          aria-label="Zoom out"
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 text-[var(--ink)] backdrop-blur hover:border-[var(--accent)]"
        >
          <MinusIcon />
        </button>
        <button
          onClick={resetZoom}
          aria-label="Reset view"
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)]/90 text-[var(--ink)] backdrop-blur hover:border-[var(--accent)]"
        >
          <TargetIcon />
        </button>
      </div>

      {hover && <CountryTooltip hover={hover} />}

      {flight && flightPos && planeHover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[150%] whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] shadow-lg"
          style={
            southUp
              ? {
                  left: size.width - (t.x + flightPos[0] * t.k),
                  top: size.height - (t.y + flightPos[1] * t.k),
                }
              : {
                  left: t.x + flightPos[0] * t.k,
                  top: t.y + flightPos[1] * t.k,
                }
          }
        >
          <strong>✈ {flight.callsign}</strong>
          <span className="ml-2 text-[11px] text-[var(--ink-dim)]">
            {flight.speedKmh} km/h
          </span>
        </div>
      )}

      {whale && whaleScreen && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={
            southUp
              ? {
                  left: size.width - (t.x + whaleScreen[0] * t.k),
                  top: size.height - (t.y + whaleScreen[1] * t.k),
                }
              : {
                  left: t.x + whaleScreen[0] * t.k,
                  top: t.y + whaleScreen[1] * t.k,
                }
          }
        >
          <span
            key={whale.key}
            className="whale-breach block"
            dangerouslySetInnerHTML={{ __html: WHALE_MARKUP }}
          />
        </div>
      )}
    </div>
  )
}

export default FlatMap
