"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { countries, countryById, totalCountries } from "@/lib/geo"
import { getCountryInfo } from "@/lib/country-info"
import { useT, statusKey } from "@/lib/i18n"
import { formatVisit } from "@/components/country-panel"
import { useTravelStore, useHasHydrated, type Status } from "@/lib/store"
import { STATUS, withAlpha } from "@/lib/colors"
import { buildSaveFile, downloadSaveFile, parseSaveFile } from "@/lib/save-file"
import {
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  SearchIcon,
  StatusIcon,
  CopyIcon,
  PasteIcon,
  GlobeIcon,
} from "@/components/icons"

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-xl bg-[var(--panel-2)] px-2 py-3 text-center">
    <span className="block text-2xl font-bold leading-none">{value}</span>
    <span className="mt-1 block text-[0.7rem] uppercase tracking-wide text-[var(--ink-dim)]">
      {label}
    </span>
  </div>
)

const MiniStars = ({ rating }: { rating: number }) => (
  <span
    className="shrink-0 text-[0.7rem] leading-none tracking-tight"
    style={{ color: "#f5b50a" }}
    title={`${rating}/5`}
  >
    {"★".repeat(rating)}
    <span className="text-[var(--border)]">{"★".repeat(5 - rating)}</span>
  </span>
)

const StatusTag = ({ status }: { status: Status }) => {
  const t = useT()
  const color = STATUS[status]
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
      style={{ background: withAlpha(color, 0.18), color }}
    >
      <StatusIcon status={status} width={11} height={11} />{" "}
      {t(statusKey(status))}
    </span>
  )
}

const Sidebar = () => {
  const t = useT()
  const hydrated = useHasHydrated()
  const statuses = useTravelStore((s) => s.statuses)
  const notes = useTravelStore((s) => s.notes)
  const reviews = useTravelStore((s) => s.reviews)
  const cycle = useTravelStore((s) => s.cycle)
  const select = useTravelStore((s) => s.select)
  const reset = useTravelStore((s) => s.reset)
  const replaceData = useTravelStore((s) => s.replaceData)
  const fileRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [filter, setFilter] = useState<
    "all" | "visited" | "wishlist" | "blocked"
  >("all")
  const [sort, setSort] = useState<"name" | "rating" | "recent">("name")
  const listRef = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ top: false, bottom: false })

  const onListScroll = () => {
    const el = listRef.current
    if (!el) return
    setEdge({
      top: el.scrollTop > 4,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    })
  }

  const { visited, wishlist, marked, avgRating, ratedCount } = useMemo(() => {
    const entries = Object.entries(statuses)
    const ids = new Set([
      ...Object.keys(statuses),
      ...Object.keys(notes),
      ...Object.keys(reviews),
    ])
    const ratings = Object.values(reviews)
      .map((r) => r.rating)
      .filter((n): n is number => typeof n === "number")
    return {
      visited: entries.filter(([, s]) => s === "visited").length,
      wishlist: entries.filter(([, s]) => s === "wishlist").length,
      ratedCount: ratings.length,
      avgRating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
      marked: [...ids]
        .map((id) => {
          const parentId = getCountryInfo(id)?.parent
          return {
            id,
            status: statuses[id],
            hasNote: Boolean(notes[id]),
            rating: reviews[id]?.rating,
            lastVisit: [...(reviews[id]?.visits ?? [])].sort().at(-1),
            name: countryById.get(id)?.name ?? id,
            parent: parentId
              ? (countryById.get(parentId)?.name ??
                getCountryInfo(parentId)?.name)
              : undefined,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [statuses, notes, reviews])

  const percent = Math.round((visited / totalCountries) * 100)

  const visible = useMemo(() => {
    const list = marked.filter((c) => filter === "all" || c.status === filter)
    if (sort === "rating") {
      return [...list].sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name),
      )
    }
    if (sort === "recent") {
      return [...list].sort(
        (a, b) =>
          (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "") ||
          a.name.localeCompare(b.name),
      )
    }
    return list
  }, [marked, filter, sort])

  useEffect(() => {
    onListScroll()
  }, [visible])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return countries
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
        return aStarts - bStarts || a.name.localeCompare(b.name)
      })
      .slice(0, 6)
  }, [query])

  const pick = (id: string) => {
    select(id)
    setQuery("")
  }

  const applyParsed = (next: ReturnType<typeof parseSaveFile>) => {
    const count = Object.keys(next.statuses).length
    if (
      (Object.keys(statuses).length > 0 || Object.keys(notes).length > 0) &&
      !window.confirm(t("import.confirm", { count }))
    )
      return
    replaceData(next)
  }

  const handleExport = () =>
    downloadSaveFile(buildSaveFile({ statuses, notes, reviews }))

  const handleImport = async (file: File) => {
    try {
      applyParsed(parseSaveFile(await file.text()))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("import.error"))
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(buildSaveFile({ statuses, notes, reviews }), null, 2),
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.alert(t("copy.fail"))
    }
  }

  // A paste-into-field flow instead of navigator.clipboard.readText(), which
  // triggers the browser's clipboard-permission popover.
  const handlePasteSubmit = () => {
    try {
      applyParsed(parseSaveFile(pasteText))
      setPasteOpen(false)
      setPasteText("")
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("import.error"))
    }
  }

  return (
    <aside className="flex h-full flex-col gap-4 border-r border-[var(--border)] bg-[var(--panel)] p-5">
      <header>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          ✦ {t("eyebrow")}
        </p>
        <h1 className="font-display mt-1.5 flex items-center gap-2 text-[1.7rem] font-semibold leading-none tracking-tight">
          <GlobeIcon width={24} height={24} className="text-[var(--accent)]" />
          Globetrotter
        </h1>
        <p className="font-display mt-1.5 text-sm italic text-[var(--ink-dim)]">
          {t("tagline")}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat
          value={hydrated ? String(visited) : "—"}
          label={t("stat.visited")}
        />
        <Stat
          value={hydrated ? String(wishlist) : "—"}
          label={t("stat.wishlist")}
        />
        <Stat value={hydrated ? `${percent}%` : "—"} label={t("stat.world")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-[0.7rem]">
          <span className="uppercase tracking-wide text-[var(--ink-dim)]">
            {t("stat.visited")}
          </span>
          <span className="font-semibold tabular-nums text-[var(--ink)]">
            {hydrated ? `${visited} / ${totalCountries} · ${percent}%` : "—"}
          </span>
        </div>
        <div className="relative h-2.5 rounded-full bg-[var(--panel-2)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{
              width: hydrated ? `${percent}%` : "0%",
              background: "linear-gradient(90deg, #2bff88, #29d3ff)",
              boxShadow:
                "0 0 5px rgba(43,255,136,0.75), 0 0 12px rgba(41,211,255,0.55)",
            }}
          />
        </div>
      </div>

      {hydrated && ratedCount > 0 && (
        <p className="-mt-2 text-[0.78rem] text-[var(--ink-dim)]">
          <span style={{ color: "#f5b50a" }}>★</span>{" "}
          {t("avg", { r: avgRating.toFixed(1), n: ratedCount })}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">
          {t("search.label")}
        </span>
        <div className="relative">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-dim)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) pick(suggestions[0].id)
              if (e.key === "Escape") setQuery("")
            }}
            placeholder={t("search.placeholder")}
            autoComplete="off"
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--panel)] shadow-xl">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => pick(c.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--panel-hover)]"
                  >
                    <span className="text-base leading-none">
                      {getCountryInfo(c.id)?.flag ?? "🏳️"}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      <p className="text-[0.78rem] leading-relaxed text-[var(--ink-dim)]">
        {t("hint")}
      </p>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-dim)]">
          {t("countries.title")}{" "}
          {hydrated && marked.length > 0 && (
            <span className="text-[var(--ink-faint)]">({marked.length})</span>
          )}
        </h2>
        {hydrated && marked.length > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex gap-0.5 rounded-lg bg-[var(--panel-2)] p-0.5 text-[0.7rem]">
              {(["all", "visited", "wishlist", "blocked"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2 py-1 capitalize transition-colors ${
                    filter === f
                      ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]"
                      : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
                  }`}
                >
                  {t(`filter.${f}`)}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label={t("sort.aria")}
              className="ml-auto rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-[0.7rem] text-[var(--ink-dim)] outline-none"
            >
              <option value="name">{t("sort.name")}</option>
              <option value="rating">{t("sort.rating")}</option>
              <option value="recent">{t("sort.recent")}</option>
            </select>
          </div>
        )}
        {hydrated && marked.length === 0 && (
          <p className="text-sm text-[var(--ink-faint)]">
            {t("countries.empty")}
          </p>
        )}
        {hydrated && marked.length > 0 && visible.length === 0 && (
          <p className="text-sm text-[var(--ink-faint)]">
            {t("countries.none")}
          </p>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {edge.top && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[var(--panel)] to-transparent" />
          )}
          <ul
            ref={listRef}
            onScroll={onListScroll}
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1"
          >
            {visible.map((c) => (
              <li
                key={c.id}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent bg-[var(--panel-2)] px-2.5 py-1.5 text-sm hover:border-[var(--accent)]"
                onClick={() => select(c.id)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">
                    {c.name}
                    {c.parent && (
                      <span className="text-[var(--ink-faint)]">
                        {" "}
                        · {c.parent}
                      </span>
                    )}
                  </span>
                  {c.rating != null && <MiniStars rating={c.rating} />}
                  {c.lastVisit && (
                    <span className="shrink-0 text-[0.68rem] text-[var(--ink-faint)]">
                      {formatVisit(c.lastVisit)}
                    </span>
                  )}
                  {c.hasNote && (
                    <span
                      title={t("roll.hasNote")}
                      className="shrink-0 text-[var(--ink-faint)]"
                    >
                      📝
                    </span>
                  )}
                </span>
                {c.status ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cycle(c.id)
                    }}
                    title={t("roll.changeStatus")}
                    className="cursor-pointer"
                  >
                    <StatusTag status={c.status} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cycle(c.id)
                    }}
                    title={t("roll.markWishlist")}
                    className="cursor-pointer rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  >
                    {t("roll.note")}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {edge.bottom && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-[var(--panel)] to-transparent" />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-dim)]">
          {t("save.title")}
        </h2>
        <p className="mb-2 text-[0.78rem] text-[var(--ink-dim)]">
          {t("save.desc")}
        </p>
        <div className="mb-2 flex gap-2">
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm hover:border-[var(--accent)] hover:bg-[var(--panel-hover)]"
            style={
              copied
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : undefined
            }
          >
            <CopyIcon width={16} height={16} />{" "}
            {copied ? t("copied") : t("copy")}
          </button>
          <button
            onClick={() => setPasteOpen((o) => !o)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm hover:border-[var(--accent)] hover:bg-[var(--panel-hover)]"
            style={
              pasteOpen
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : undefined
            }
          >
            <PasteIcon width={16} height={16} /> {t("paste")}
          </button>
        </div>
        {pasteOpen && (
          <div className="mb-2 flex flex-col gap-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t("paste.placeholder")}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-2.5 font-mono text-xs outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm hover:border-[var(--accent)] hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("paste.load")}
            </button>
          </div>
        )}
        <div className="mb-2 flex gap-2">
          <button
            onClick={handleExport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm hover:border-[var(--accent)] hover:bg-[var(--panel-hover)]"
          >
            <DownloadIcon width={16} height={16} /> {t("export")}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm hover:border-[var(--accent)] hover:bg-[var(--panel-hover)]"
          >
            <UploadIcon width={16} height={16} /> {t("import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ""
            }}
          />
        </div>
        <button
          onClick={() => {
            if (window.confirm(t("reset.confirm"))) reset()
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[var(--danger)]/40 px-3 py-2.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
        >
          <TrashIcon width={16} height={16} /> {t("reset")}
        </button>
      </section>

      <footer className="text-[0.7rem] leading-relaxed text-[var(--ink-faint)]">
        {t("footer")}
      </footer>
    </aside>
  )
}

export default Sidebar
