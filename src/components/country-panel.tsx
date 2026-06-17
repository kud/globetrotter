"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTravelStore, type Status, type WouldReturn } from "@/lib/store"
import { useT, dateLocale } from "@/lib/i18n"
import { countryById } from "@/lib/geo"
import {
  getCountryInfo,
  getCapitalLatLng,
  ADVISORY_SOURCES,
  type CountryInfo,
} from "@/lib/country-info"
import {
  getAdvisory,
  ADVISORY_META,
  ADVISORY_SNAPSHOT,
  ADVISORY_SOURCE_NAME,
} from "@/lib/advisory"
import { useAdvisoryStore } from "@/lib/advisory-store"
import { STATUS, withAlpha } from "@/lib/colors"
import { StatusIcon } from "@/components/icons"
import PanelImage from "@/components/panel-image"
import PanelHeader from "@/components/panel-header"
import { Fact } from "@/components/panel-stats"
import Conditions from "@/components/conditions"

const numberFmt = new Intl.NumberFormat("en-US")
const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const StatusButton = ({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors"
    style={
      active
        ? {
            borderColor: color,
            background: color ? withAlpha(color, 0.18) : undefined,
            color,
          }
        : { borderColor: "var(--border)", color: "var(--ink-dim)" }
    }
  >
    {children}
  </button>
)

const STAR_GOLD = "#f5b50a"

const StarRating = ({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number | undefined) => void
}) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        onClick={() => onChange(value === n ? undefined : n)}
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
        className="text-2xl leading-none transition-transform hover:scale-110"
        style={{ color: n <= value ? STAR_GOLD : "var(--border)" }}
      >
        ★
      </button>
    ))}
  </div>
)

const RETURN_OPTIONS: { value: WouldReturn; color: string }[] = [
  { value: "yes", color: "#22c55e" },
  { value: "maybe", color: "#eab308" },
  { value: "no", color: "#ef4444" },
]

const ReturnToggle = ({
  value,
  onChange,
}: {
  value: WouldReturn | undefined
  onChange: (next: WouldReturn | undefined) => void
}) => {
  const t = useT()
  return (
    <div className="flex gap-2">
      {RETURN_OPTIONS.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(active ? undefined : o.value)}
            className="flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors"
            style={
              active
                ? {
                    borderColor: o.color,
                    background: withAlpha(o.color, 0.18),
                    color: o.color,
                  }
                : { borderColor: "var(--border)", color: "var(--ink-dim)" }
            }
          >
            {t(`return.${o.value}`)}
          </button>
        )
      })}
    </div>
  )
}

const ReflectionField = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">
      {label}
    </span>
    {children}
  </label>
)

export const formatVisit = (ym: string) => {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1).toLocaleDateString(
    dateLocale(useTravelStore.getState().locale),
    { month: "short", year: "numeric" },
  )
}

const MonthPicker = ({
  existing,
  onPick,
}: {
  existing: string[]
  onPick: (ym: string) => void
}) => {
  const t = useT()
  const locale = useTravelStore((s) => s.locale)
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" })
  const today = new Date()
  const thisYear = today.getFullYear()
  const thisMonth = today.getMonth()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(thisYear)

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
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
      >
        ＋ {t("visit.addtrip")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-1.5 w-60 rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setYear((y) => y - 1)}
                aria-label={t("picker.prevYear")}
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-dim)] hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]"
              >
                ‹
              </button>
              <span className="text-sm font-semibold">{year}</span>
              <button
                onClick={() => setYear((y) => Math.min(y + 1, thisYear))}
                disabled={year >= thisYear}
                aria-label={t("picker.nextYear")}
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--ink-dim)] hover:bg-[var(--panel-hover)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => {
                const ym = `${year}-${String(i + 1).padStart(2, "0")}`
                const future =
                  year > thisYear || (year === thisYear && i > thisMonth)
                const already = existing.includes(ym)
                return (
                  <button
                    key={i}
                    disabled={future || already}
                    onClick={() => {
                      onPick(ym)
                      setOpen(false)
                    }}
                    className={`rounded-md px-2 py-1.5 text-xs capitalize transition-colors disabled:opacity-30 ${
                      already
                        ? "bg-[var(--accent)]/20 font-semibold text-[var(--accent)]"
                        : "hover:bg-[var(--panel-hover)]"
                    }`}
                  >
                    {monthFmt.format(new Date(2000, i, 1))}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const VisitsEditor = ({
  visits,
  onChange,
}: {
  visits: string[]
  onChange: (next: string[]) => void
}) => (
  <div className="flex flex-col gap-2">
    {visits.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {visits.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs"
          >
            {formatVisit(v)}
            <button
              onClick={() => onChange(visits.filter((x) => x !== v))}
              aria-label={`Remove ${formatVisit(v)}`}
              className="text-[var(--ink-dim)] hover:text-[var(--danger)]"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    )}
    <MonthPicker
      existing={visits}
      onPick={(ym) => onChange([...visits, ym].sort())}
    />
  </div>
)

const SourceLinks = ({ info }: { info: CountryInfo }) => (
  <div className="flex flex-wrap gap-1.5">
    {ADVISORY_SOURCES.map((s) => (
      <a
        key={s.id}
        href={s.url(info)}
        target="_blank"
        rel="noopener noreferrer"
        title={`${s.label} — official travel advice`}
        className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--ink-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        {s.country} ↗
      </a>
    ))}
  </div>
)

const CountryPanel = () => {
  const t = useT()
  const selectedId = useTravelStore((s) => s.selectedId)
  const statuses = useTravelStore((s) => s.statuses)
  const notes = useTravelStore((s) => s.notes)
  const setStatus = useTravelStore((s) => s.setStatus)
  const setNote = useTravelStore((s) => s.setNote)
  const reviews = useTravelStore((s) => s.reviews)
  const setReview = useTravelStore((s) => s.setReview)
  const close = () => useTravelStore.getState().select(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useTravelStore.getState().select(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const liveSources = useAdvisoryStore((s) => s.sources)
  const liveUpdated = useAdvisoryStore((s) => s.updated)
  const locale = useTravelStore((s) => s.locale)

  // Ensure live advisories are loaded (retries if the initial fetch failed) so
  // Canada — which has no offline snapshot — reliably appears alongside the US.
  useEffect(() => {
    if (selectedId) useAdvisoryStore.getState().load()
  }, [selectedId])
  // Keyed by country+locale so a stale summary never flashes, and so we avoid a
  // synchronous setState reset inside the effect.
  const [wikiFor, setWikiFor] = useState<{
    key: string
    data: { extract: string; url: string; image: string | null }
  } | null>(null)

  useEffect(() => {
    const id = selectedId
    const cinfo = id ? getCountryInfo(id) : undefined
    if (!cinfo) return
    let active = true
    const lang = locale === "fr" ? "fr" : "en"
    const title = locale === "fr" ? (cinfo.nameFr ?? cinfo.name) : cinfo.name
    const key = `${id}:${locale}`
    fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.extract && d.type !== "disambiguation") {
          setWikiFor({
            key,
            data: {
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
  }, [selectedId, locale])

  const wiki =
    wikiFor && wikiFor.key === `${selectedId}:${locale}` ? wikiFor.data : null

  const info = selectedId ? getCountryInfo(selectedId) : undefined
  const name = selectedId
    ? (info?.name ?? countryById.get(selectedId)?.name ?? t("unknown"))
    : ""
  const status = selectedId ? statuses[selectedId] : undefined
  const review = selectedId ? reviews[selectedId] : undefined
  const patchReview = (patch: Parameters<typeof setReview>[1]) => {
    if (selectedId) setReview(selectedId, patch)
  }
  // Conditions are sampled at the capital (falling back to the country centroid).
  const capCoord = selectedId ? getCapitalLatLng(selectedId) : null
  const condLat = capCoord?.[0] ?? info?.latlng?.[0] ?? null
  const condLng = capCoord?.[1] ?? info?.latlng?.[1] ?? null

  // Territories inherit the sovereign country's advisory (feeds are per-country),
  // and the official links point there too.
  const advisoryId = info?.parent ?? selectedId
  const advisoryInfo = info?.parent ? getCountryInfo(info.parent) : info
  // Per-government live levels: US (live RSS, else bundled snapshot) + Canada (live).
  const usLive = advisoryId ? liveSources.state[advisoryId] : undefined
  const usAdvisory =
    usLive ?? (advisoryId ? getAdvisory(advisoryId) : undefined)
  const caLive = advisoryId ? liveSources.canada[advisoryId] : undefined
  const levels = [
    usAdvisory && {
      flag: "🇺🇸",
      name: "US State Dept",
      meta: ADVISORY_META[usAdvisory.level],
      level: usAdvisory.level,
    },
    caLive && {
      flag: "🇨🇦",
      name: "Canada",
      meta: ADVISORY_META[caLive.level],
      level: caLive.level,
    },
  ].filter(Boolean) as {
    flag: string
    name: string
    meta: (typeof ADVISORY_META)[1]
    level: number
  }[]
  const isLive = Boolean(liveUpdated)
  const primary = levels[0]

  const setTo = (next: Status | null) => {
    if (selectedId) setStatus(selectedId, next)
  }

  return (
    <AnimatePresence>
      {selectedId && (
        <motion.aside
          key={selectedId}
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[min(360px,92vw)] flex-col gap-5 overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
        >
          <PanelHeader
            icon={info?.flag ?? "🗺"}
            title={name}
            subtitle={
              info?.subregion && (
                <>
                  {info.subregion}
                  {advisoryInfo && info.parent && (
                    <>
                      {" · "}
                      {locale === "fr"
                        ? advisoryInfo.nameFr
                        : advisoryInfo.name}
                    </>
                  )}
                </>
              )
            }
            onClose={close}
            closeLabel={t("close")}
          />

          <PanelImage
            key={wiki?.image ?? "placeholder"}
            src={wiki?.image ?? null}
            alt={name}
            placeholder={info?.flag ?? "🗺"}
          />

          <div className="grid grid-cols-2 gap-2">
            <StatusButton active={!status} onClick={() => setTo(null)}>
              <StatusIcon width={15} height={15} /> {t("status.notyet")}
            </StatusButton>
            <StatusButton
              active={status === "wishlist"}
              color={STATUS.wishlist}
              onClick={() => setTo("wishlist")}
            >
              <StatusIcon status="wishlist" width={15} height={15} />{" "}
              {t("status.wishlist")}
            </StatusButton>
            <StatusButton
              active={status === "visited"}
              color={STATUS.visited}
              onClick={() => setTo("visited")}
            >
              <StatusIcon status="visited" width={15} height={15} />{" "}
              {t("status.visited")}
            </StatusButton>
            <StatusButton
              active={status === "blocked"}
              color={STATUS.blocked}
              onClick={() => setTo("blocked")}
            >
              <StatusIcon status="blocked" width={15} height={15} />{" "}
              {t("status.blocked")}
            </StatusButton>
          </div>

          {info && (
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
                {t("safety.title")}
              </h3>
              {levels.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {levels.map((l) => (
                      <span
                        key={l.name}
                        title={`${l.name} · ${l.meta.label}`}
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          background: withAlpha(l.meta.color, 0.18),
                          color: l.meta.color,
                        }}
                      >
                        {l.flag}{" "}
                        {t("safety.level", { n: l.level, short: l.meta.short })}
                      </span>
                    ))}
                  </div>
                  {primary && <p className="text-sm">{primary.meta.label}</p>}
                </>
              ) : (
                <p className="text-sm text-[var(--ink-dim)]">
                  {t("safety.none")}
                </p>
              )}
              {info.parent && advisoryInfo && (
                <p className="text-[11px] italic text-[var(--ink-faint)]">
                  {t("safety.parent", {
                    country:
                      locale === "fr" ? advisoryInfo.nameFr : advisoryInfo.name,
                  })}
                </p>
              )}
              <SourceLinks info={advisoryInfo ?? info} />
              {levels.length > 0 && (
                <p className="text-[11px] text-[var(--ink-faint)]">
                  {isLive
                    ? t("safety.live", {
                        source: "US + Canada",
                        date: new Date(liveUpdated!).toLocaleDateString(
                          dateLocale(useTravelStore.getState().locale),
                        ),
                      })
                    : t("safety.snapshot", {
                        source: ADVISORY_SOURCE_NAME,
                        date: ADVISORY_SNAPSHOT,
                      })}
                </p>
              )}
            </section>
          )}

          {info && (
            <section className="text-sm">
              {info.parent && advisoryInfo && (
                <Fact
                  label={t("fact.partof")}
                  value={
                    locale === "fr" ? advisoryInfo.nameFr : advisoryInfo.name
                  }
                />
              )}
              {info.capital && (
                <Fact label={t("fact.capital")} value={info.capital} />
              )}
              {info.region && (
                <Fact label={t("fact.region")} value={info.region} />
              )}
              {info.population != null && (
                <Fact
                  label={t("fact.population")}
                  value={compactFmt.format(info.population)}
                />
              )}
              {info.languages.length > 0 && (
                <Fact
                  label={t("fact.languages")}
                  value={info.languages.join(", ")}
                />
              )}
              {info.currencies.length > 0 && (
                <Fact
                  label={t("fact.currency")}
                  value={info.currencies.join(", ")}
                />
              )}
              {info.area && (
                <Fact
                  label={t("fact.area")}
                  value={`${numberFmt.format(info.area)} km²`}
                />
              )}
              {info.callingCode && (
                <Fact label={t("fact.calling")} value={info.callingCode} />
              )}
              {info.tld && <Fact label={t("fact.tld")} value={info.tld} />}
            </section>
          )}

          <Conditions lat={condLat} lng={condLng} />

          {wiki && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
                {t("about")}
              </h3>
              <p className="line-clamp-5 text-sm leading-relaxed text-[var(--ink-dim)]">
                {wiki.extract}
              </p>
              {wiki.url && (
                <a
                  href={wiki.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  {t("wiki.more")}
                </a>
              )}
            </section>
          )}

          {status === "visited" && (
            <section className="flex flex-col gap-4 rounded-xl border border-[var(--border)] p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
                {t("visit.title")}
              </h3>
              <ReflectionField label={t("visit.when")}>
                <VisitsEditor
                  visits={review?.visits ?? []}
                  onChange={(visits) =>
                    patchReview({ visits: visits.length ? visits : undefined })
                  }
                />
              </ReflectionField>
              <ReflectionField label={t("visit.rating")}>
                <StarRating
                  value={review?.rating ?? 0}
                  onChange={(rating) => patchReview({ rating })}
                />
              </ReflectionField>
              <ReflectionField label={t("visit.return")}>
                <ReturnToggle
                  value={review?.wouldReturn}
                  onChange={(wouldReturn) => patchReview({ wouldReturn })}
                />
              </ReflectionField>
              <ReflectionField label={t("visit.loved")}>
                <textarea
                  value={review?.liked ?? ""}
                  onChange={(e) => patchReview({ liked: e.target.value })}
                  placeholder={t("visit.loved.ph")}
                  rows={2}
                  className="resize-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </ReflectionField>
              <ReflectionField label={t("visit.didnt")}>
                <textarea
                  value={review?.disliked ?? ""}
                  onChange={(e) => patchReview({ disliked: e.target.value })}
                  placeholder={t("visit.didnt.ph")}
                  rows={2}
                  className="resize-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </ReflectionField>
              <ReflectionField label={t("visit.besttime")}>
                <input
                  type="text"
                  value={review?.bestTime ?? ""}
                  onChange={(e) => patchReview({ bestTime: e.target.value })}
                  placeholder={t("visit.besttime.ph")}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </ReflectionField>
            </section>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">
              {status === "wishlist" ? t("notes.wishlist") : t("notes.visited")}
            </span>
            <textarea
              value={selectedId ? (notes[selectedId] ?? "") : ""}
              onChange={(e) =>
                selectedId && setNote(selectedId, e.target.value)
              }
              placeholder={
                status === "wishlist"
                  ? t("notes.wishlist.ph")
                  : t("notes.visited.ph")
              }
              rows={4}
              className="resize-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default CountryPanel
