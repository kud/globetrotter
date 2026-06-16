"use client"

import { ADVISORY_META } from "@/lib/advisory"
import { useT, statusKey } from "@/lib/i18n"
import type { Status } from "@/lib/store"

export type Hover = {
  name: string
  flag: string
  status: Status | undefined
  level: number | undefined
  x: number
  y: number
}

// Vertical 4-step risk meter (green→red), filling up to the advisory level.
export const RiskMeter = ({ level }: { level: number }) => (
  <span className="flex flex-col-reverse gap-0.5">
    {[1, 2, 3, 4].map((seg) => (
      <span
        key={seg}
        className="h-1.5 w-1.5 rounded-[1px]"
        style={{
          background: ADVISORY_META[seg as 1 | 2 | 3 | 4].color,
          opacity: seg <= level ? 1 : 0.18,
        }}
      />
    ))}
  </span>
)

// Cursor-following country tooltip shared by the flat map and the globe so both
// hovers look and behave identically.
export const CountryTooltip = ({ hover }: { hover: Hover }) => {
  const t = useT()
  return (
    <div
      className="pointer-events-none fixed z-10 flex -translate-x-1/2 -translate-y-[130%] items-center gap-2 whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] shadow-lg"
      style={{ left: hover.x, top: hover.y }}
    >
      {hover.level && <RiskMeter level={hover.level} />}
      <span>
        <strong>
          {hover.flag} {hover.name}
        </strong>
        <span className="ml-2 text-[11px] text-[var(--ink-dim)]">
          {t(statusKey(hover.status))}
        </span>
      </span>
    </div>
  )
}
