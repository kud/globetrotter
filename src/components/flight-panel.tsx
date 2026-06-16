"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore } from "@/lib/store"
import { useT } from "@/lib/i18n"

type Photo = { src: string; link: string | null; photographer: string | null }

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 border-b border-[var(--border)] py-1.5 last:border-0">
    <span className="text-[var(--ink-dim)]">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
)

type AirportLike = { iata?: string; code?: string; name?: string }

// Wikipedia search rather than a direct article URL, since the exact article
// title varies ("Heathrow Airport" vs "London Heathrow Airport").
const airportWiki = (a: AirportLike) => {
  const q = a.name || a.iata || a.code
  return q
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(`${q} airport`)}`
    : null
}

const AirportEnd = ({ airport }: { airport: AirportLike }) => {
  const href = airportWiki(airport)
  const body = (
    <>
      <div className="text-lg font-bold">{airport.iata || airport.code}</div>
      <div className="truncate text-[10px] text-[var(--ink-dim)]">
        {airport.name}
      </div>
    </>
  )
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open airport on Wikipedia"
      className="min-w-0 rounded-lg px-1.5 py-0.5 text-center transition-colors hover:bg-[var(--panel-hover)] hover:text-[var(--accent)]"
    >
      {body}
    </a>
  ) : (
    <div className="min-w-0 text-center">{body}</div>
  )
}

const FlightPanel = () => {
  const t = useT()
  const open = useTravelStore((s) => s.flightOpen)
  const flight = useTravelStore((s) => s.flight)
  const close = () => useTravelStore.getState().closeFlight()
  // Keyed by hex so switching flights never shows the previous plane's photo,
  // and we avoid a synchronous setState reset inside the effect.
  const [photoFor, setPhotoFor] = useState<{
    hex: string
    photo: Photo
  } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().closeFlight()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const hex = flight?.id
  useEffect(() => {
    if (!hex) return
    let active = true
    fetch(`/api/plane-photo?hex=${hex}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.photo?.src) setPhotoFor({ hex, photo: d.photo })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [hex])

  const photo = photoFor && photoFor.hex === hex ? photoFor.photo : null

  return (
    <AnimatePresence>
      {open && flight && (
        <motion.aside
          key="flight"
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-5 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3">
            <div>
              <div className="text-3xl leading-none">✈</div>
              <h2 className="font-display mt-2 text-2xl font-semibold leading-tight">
                {flight.callsign}
              </h2>
              <p className="text-sm text-[var(--ink-dim)]">
                {flight.country || flight.operator || flight.registration || ""}
              </p>
            </div>
            <button
              onClick={close}
              aria-label={t("close")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[var(--ink-dim)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              ✕
            </button>
          </header>

          {photo && (
            <figure className="overflow-hidden rounded-xl border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={flight.callsign}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              {photo.photographer && (
                <figcaption className="bg-[var(--panel-2)] px-2.5 py-1 text-[10px] text-[var(--ink-faint)]">
                  © {photo.photographer} ·{" "}
                  {photo.link ? (
                    <a
                      href={photo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Planespotters
                    </a>
                  ) : (
                    "Planespotters"
                  )}
                </figcaption>
              )}
            </figure>
          )}

          <span
            className="self-start rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{
              background: "color-mix(in srgb, var(--accent) 18%, transparent)",
              color: "var(--accent)",
            }}
          >
            {t("flight.live")}
          </span>

          {flight.origin && flight.destination && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
              <AirportEnd airport={flight.origin} />
              <div className="shrink-0 text-[var(--accent)]">✈</div>
              <AirportEnd airport={flight.destination} />
            </div>
          )}

          <section className="text-sm">
            {flight.type && (
              <Row label={t("flight.aircraft")} value={flight.type} />
            )}
            {flight.operator && (
              <Row label={t("flight.operator")} value={flight.operator} />
            )}
            {flight.registration && (
              <Row
                label={t("flight.registration")}
                value={flight.registration}
              />
            )}
            <Row
              label={t("flight.altitude")}
              value={flight.altKm != null ? `${flight.altKm} km` : "—"}
            />
            <Row label={t("flight.speed")} value={`${flight.speedKmh} km/h`} />
            <Row
              label={t("flight.heading")}
              value={`${Math.round(flight.heading)}°`}
            />
            <Row
              label={t("flight.position")}
              value={`${flight.lat.toFixed(2)}, ${flight.lng.toFixed(2)}`}
            />
          </section>

          <p className="text-[11px] leading-relaxed text-[var(--ink-faint)]">
            {t("flight.note")}
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default FlightPanel
