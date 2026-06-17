"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { select } from "d3-selection"
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom"
import "d3-transition"
import { countryFeatures, countryById, type CountryFeature } from "@/lib/geo"
import { OCEANS, oceanTip } from "@/lib/oceans"
import {
  LAYERS,
  KIND_ICON,
  KIND_COLOR,
  type TransportPoint,
} from "@/lib/transport"
import { getCountryInfo, getCapitalLatLng } from "@/lib/country-info"
import { useTravelStore, useResolvedTheme } from "@/lib/store"
import { PLANE_PATH } from "@/lib/flight"
import { useISS } from "@/lib/use-iss"
import { useMoon } from "@/lib/use-moon"
import { ISS_MARKUP } from "@/lib/iss-mark"
import {
  MAP_PALETTE,
  STATUS,
  baseFill,
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
        // Borders convey STATUS only (wishlist dashed, blocked dotted, in their
        // own colour); selection is the brightened fill — no extra outline,
        // which on island-heavy countries just traced every coast in bright blue.
        const patterned = status === "wishlist" || status === "blocked"
        const stroke = patterned ? STATUS[status] : palette.polygonStroke
        const dash =
          status === "wishlist"
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
                ? lighten(baseFill(f.id, status, palette), 0.32)
                : baseFill(f.id, status, palette)
            }
            stroke={stroke}
            strokeWidth={patterned ? 1 : 0.5}
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
  const openISS = useTravelStore((s) => s.openISS)
  const openMoon = useTravelStore((s) => s.openMoon)
  const southUp = useTravelStore((s) => s.southUp)
  const liveSources = useAdvisoryStore((s) => s.sources)
  const statuses = useTravelStore((s) => s.statuses)
  const theme = useResolvedTheme()
  const selectedId = useTravelStore((s) => s.selectedId)
  const focusId = useTravelStore((s) => s.focusId)
  const focusForce = useTravelStore((s) => s.focusForce)
  const selectCountry = useTravelStore((s) => s.select)
  const openOcean = useTravelStore((s) => s.openOcean)
  const openPlace = useTravelStore((s) => s.openPlace)
  const layerState = useTravelStore((s) => s.layers)
  const [hover, setHover] = useState<Hover | null>(null)
  const [planeHover, setPlaneHover] = useState(false)
  const [issHover, setIssHover] = useState(false)
  const [oceanHover, setOceanHover] = useState<{
    name: string
    tip: string
    x: number
    y: number
  } | null>(null)
  const [placeHover, setPlaceHover] = useState<{
    title: string
    sub: string
    x: number
    y: number
  } | null>(null)
  const [clusterMenu, setClusterMenu] = useState<{
    members: TransportPoint[]
    x: number
    y: number
  } | null>(null)
  const iss = useISS()
  const moon = useMoon()
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
      return p ? { name: o.name, tip: oceanTip(o), x: p[0], y: p[1] } : null
    }).filter(Boolean) as {
      name: string
      tip: string
      x: number
      y: number
    }[]
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

  const places = useMemo(() => {
    const out: { p: TransportPoint; color: string; x: number; y: number }[] = []
    for (const layer of LAYERS) {
      if (!layerState[layer.id]) continue
      for (const p of layer.data) {
        const xy = project([p.lng, p.lat])
        if (xy) out.push({ p, color: layer.color, x: xy[0], y: xy[1] })
      }
    }
    return out
  }, [layerState, project])

  // Group markers that sit within ~18px of each other on screen so dense areas
  // (LA's two ports, Tokyo's airport+station+port) collapse into one spot the
  // user can click to disambiguate — instead of needing to zoom in to separate
  // them. The threshold is in base coordinates, so it shrinks as you zoom in
  // and clusters naturally split back into individual markers.
  type Place = (typeof places)[number]
  const clusters = useMemo(() => {
    const thr = 18 / t.k
    const thr2 = thr * thr
    const used = new Array(places.length).fill(false)
    const out: { x: number; y: number; members: Place[] }[] = []
    for (let i = 0; i < places.length; i++) {
      if (used[i]) continue
      used[i] = true
      const members = [places[i]]
      for (let j = i + 1; j < places.length; j++) {
        if (used[j]) continue
        const dx = places[i].x - places[j].x
        const dy = places[i].y - places[j].y
        if (dx * dx + dy * dy < thr2) {
          used[j] = true
          members.push(places[j])
        }
      }
      out.push({ x: members[0].x, y: members[0].y, members })
    }
    return out
  }, [places, t.k])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    // Coalesce zoom/pan events to one state update per animation frame — d3-zoom
    // can fire faster than 60/s on a trackpad, and each setT re-renders.
    let raf = 0
    let next: Transform | null = null
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 24])
      .on("zoom", (e) => {
        next = { k: e.transform.k, x: e.transform.x, y: e.transform.y }
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = 0
          if (next) setT(next)
        })
      })
    zoomRef.current = behavior
    svg.call(behavior)
    return () => {
      svg.on(".zoom", null)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [size.width, size.height])

  // Recenter on the focused country. A deliberate sidebar pick (focusForce)
  // always flies in and zooms to k=2.5. A plain map-click only recenters when
  // already zoomed in — at the full world view it leaves the overview alone and
  // pans at the *current* zoom rather than forcing a new level.
  useEffect(() => {
    if (!focusId || !svgRef.current || !zoomRef.current) return
    const c = countryById.get(focusId)
    if (!c) return
    const p = project(c.centroid)
    if (!p) return
    const [x, y] = p
    if (!focusForce && t.k <= 1.05) return
    const k = focusForce ? 2.5 : t.k
    select(svgRef.current)
      .transition()
      .duration(700)
      .call(
        zoomRef.current.transform,
        zoomIdentity
          .translate(size.width / 2 - k * x, size.height / 2 - k * y)
          .scale(k),
      )
    // Pan only when the focused country changes, not on every resize/re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

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
  const issScreen = iss ? project([iss.lng, iss.lat]) : null
  const moonScreen = moon ? project([moon.lng, moon.lat]) : null

  // Infinite horizontal wrap: one world is exactly `size.width` wide, so we tile
  // copies of the base map at ±world offsets. Render only the copies the
  // viewport actually spans (usually 1–2) — derived from the current pan/zoom —
  // so panning across the antimeridian is seamless without a wall of blank.
  const worldW = size.width
  // The −0.5 epsilon stops a copy whose left edge sits exactly on the viewport's
  // right edge (e.g. at the untouched origin) from rendering fully off-screen.
  const firstCopy = Math.floor(-t.x / t.k / worldW)
  const lastCopy = Math.floor((size.width - 0.5 - t.x) / t.k / worldW)
  const copies: number[] = []
  for (let i = firstCopy; i <= lastCopy && copies.length < 5; i++)
    copies.push(i)

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
          {copies.map((ci) => (
            <g
              key={`world-${ci}`}
              transform={ci === 0 ? undefined : `translate(${ci * worldW}, 0)`}
            >
              <g pointerEvents="none">
                {oceans.map((o) => (
                  <text
                    key={`${o.name}-${o.x.toFixed(0)}`}
                    x={o.x}
                    y={o.y}
                    textAnchor="middle"
                    transform={
                      southUp ? `rotate(180 ${o.x} ${o.y})` : undefined
                    }
                    fill="var(--ink-dim)"
                    pointerEvents="auto"
                    onClick={() => openOcean(o.name)}
                    onMouseEnter={(e) =>
                      setOceanHover({
                        name: o.name,
                        tip: o.tip,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                    onMouseMove={(e) =>
                      setOceanHover((h) =>
                        h ? { ...h, x: e.clientX, y: e.clientY } : h,
                      )
                    }
                    onMouseLeave={() => setOceanHover(null)}
                    style={{
                      fontSize: `${11 / t.k}px`,
                      fontStyle: "italic",
                      letterSpacing: `${1.5 / t.k}px`,
                      opacity: 0.7,
                      cursor: "pointer",
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
              {clusters.map((cl) => {
                if (cl.members.length === 1) {
                  const { p, color, x, y } = cl.members[0]
                  return (
                    <circle
                      key={`${p.kind}-${p.name}`}
                      cx={x}
                      cy={y}
                      r={3.2 / t.k}
                      fill={color}
                      stroke="var(--panel)"
                      strokeWidth={1 / t.k}
                      paintOrder="stroke"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        openPlace(p)
                      }}
                      onMouseEnter={(e) =>
                        setPlaceHover({
                          title: `${p.code ? `${p.code} · ` : ""}${p.name}`,
                          sub: `${p.city}, ${p.country}`,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setPlaceHover((h) =>
                          h ? { ...h, x: e.clientX, y: e.clientY } : h,
                        )
                      }
                      onMouseLeave={() => setPlaceHover(null)}
                    />
                  )
                }
                return (
                  <g
                    key={`cluster-${cl.x.toFixed(1)}-${cl.y.toFixed(1)}`}
                    transform={`translate(${cl.x},${cl.y})`}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPlaceHover(null)
                      setClusterMenu({
                        members: cl.members.map((m) => m.p),
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }}
                  >
                    <g transform={southUp ? "rotate(180)" : undefined}>
                      <circle
                        r={6.5 / t.k}
                        fill="var(--accent)"
                        stroke="var(--panel)"
                        strokeWidth={1.4 / t.k}
                        paintOrder="stroke"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--accent-ink)"
                        style={{
                          fontSize: `${7.5 / t.k}px`,
                          fontWeight: 700,
                          pointerEvents: "none",
                        }}
                      >
                        {cl.members.length}
                      </text>
                    </g>
                  </g>
                )
              })}
              {capital && (
                <g
                  transform={`translate(${capital.x},${capital.y})${southUp ? " rotate(180)" : ""}`}
                  pointerEvents="none"
                >
                  <circle
                    r={3.5 / t.k}
                    fill="#ffffff"
                    stroke="var(--panel)"
                    strokeWidth={1.3 / t.k}
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
          ))}
          {flight && flightPos && (
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
          )}
          {iss && issScreen && (
            <g
              className="cursor-pointer"
              style={{
                transform: `translate(${issScreen[0]}px, ${issScreen[1]}px)`,
                transition: "transform 4.9s linear",
              }}
              onClick={openISS}
              onMouseEnter={() => setIssHover(true)}
              onMouseLeave={() => setIssHover(false)}
            >
              <g
                transform={`scale(${1 / t.k})${southUp ? " rotate(180)" : ""} translate(-15,-15)`}
                dangerouslySetInnerHTML={{ __html: ISS_MARKUP }}
              />
            </g>
          )}
          {moon && moonScreen && (
            <g
              className="cursor-pointer"
              style={{
                transform: `translate(${moonScreen[0]}px, ${moonScreen[1]}px)`,
                transition: "transform 60s linear",
              }}
              onClick={openMoon}
            >
              {/* A soft moonlight halo (faint outer glow + bright core) rather
                  than an emoji — abstract and map-like. Constant screen size. */}
              <g transform={`scale(${1 / t.k})`}>
                <circle r={11} fill="#dfe6ff" opacity={0.16} />
                <circle r={6.5} fill="#eef2ff" opacity={0.4} />
                <circle
                  r={3.4}
                  fill="#fbfcff"
                  opacity={0.95}
                  stroke="rgba(110,130,190,0.55)"
                  strokeWidth={0.6}
                  paintOrder="stroke"
                />
                <title>Moon · {moon.phaseName}</title>
              </g>
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

      {oceanHover && (
        <div
          className="pointer-events-none fixed z-10 flex -translate-x-1/2 -translate-y-[130%] flex-col whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] shadow-lg"
          style={{ left: oceanHover.x, top: oceanHover.y }}
        >
          <strong>🌊 {oceanHover.name}</strong>
          <span className="text-[11px] text-[var(--ink-dim)]">
            {oceanHover.tip}
          </span>
        </div>
      )}

      {placeHover && (
        <div
          className="pointer-events-none fixed z-10 flex -translate-x-1/2 -translate-y-[130%] flex-col whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] shadow-lg"
          style={{ left: placeHover.x, top: placeHover.y }}
        >
          <strong>{placeHover.title}</strong>
          <span className="text-[11px] text-[var(--ink-dim)]">
            {placeHover.sub}
          </span>
        </div>
      )}

      {clusterMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setClusterMenu(null)}
          />
          <div
            className="fixed z-30 max-h-72 w-60 -translate-x-1/2 -translate-y-[108%] overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] p-1.5 shadow-2xl"
            style={{ left: clusterMenu.x, top: clusterMenu.y }}
          >
            <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--ink-dim)]">
              {clusterMenu.members.length} places here
            </p>
            {clusterMenu.members.map((m) => (
              <button
                key={`${m.kind}-${m.name}`}
                onClick={() => {
                  openPlace(m)
                  setClusterMenu(null)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--panel-hover)]"
              >
                <span style={{ color: KIND_COLOR[m.kind] }}>
                  {KIND_ICON[m.kind]}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[var(--ink)]">{m.name}</span>
                  <span className="truncate text-[11px] text-[var(--ink-dim)]">
                    {m.city}, {m.country}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

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

      {iss && issScreen && issHover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[150%] whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] shadow-lg"
          style={
            southUp
              ? {
                  left: size.width - (t.x + issScreen[0] * t.k),
                  top: size.height - (t.y + issScreen[1] * t.k),
                }
              : {
                  left: t.x + issScreen[0] * t.k,
                  top: t.y + issScreen[1] * t.k,
                }
          }
        >
          <strong>ISS</strong>
          <span className="ml-2 text-[11px] text-[var(--ink-dim)]">
            {iss.altKm} km · {iss.speedKmh} km/h
          </span>
        </div>
      )}
    </div>
  )
}

export default FlatMap
