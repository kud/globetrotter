"use client"

import type { ReactNode } from "react"

// The shared sidebar header: a glyph/icon, then the title, then an optional
// subtitle — followed (in each panel) by the illustration and the rest. Every
// panel uses this so clicking a country, ocean, airport, flight, the ISS or the
// Moon all open with the same structure.
const PanelHeader = ({
  icon,
  title,
  subtitle,
  onClose,
  closeLabel = "Close",
}: {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  closeLabel?: string
}) => (
  <header className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="text-3xl leading-none">{icon}</div>
      <h2 className="font-display mt-2 text-2xl font-semibold leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-sm text-[var(--ink-dim)]">{subtitle}</p>
      )}
    </div>
    <button
      onClick={onClose}
      aria-label={closeLabel}
      className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[var(--ink-dim)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
    >
      ✕
    </button>
  </header>
)

export default PanelHeader
