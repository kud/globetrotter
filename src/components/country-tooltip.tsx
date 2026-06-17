"use client"

import { ADVISORY_META } from "@/lib/advisory"
import { useT, statusKey } from "@/lib/i18n"
import type { Status } from "@/lib/store"
import { STATUS, badgeStyle } from "@/lib/colors"
import { useResolvedTheme } from "@/lib/store"
import { HoverTip } from "@/components/hover-tip"

// The status shown as a small coloured pill (like the sidebar badge) rather
// than plain text — "Not yet" is a neutral pill.
const StatusPill = ({ status }: { status: Status | undefined }) => {
  const t = useT()
  const theme = useResolvedTheme()
  return (
    <span
      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={
        status
          ? badgeStyle(STATUS[status], theme)
          : { background: "var(--panel-hover)", color: "var(--ink-dim)" }
      }
    >
      {t(statusKey(status))}
    </span>
  )
}

export type Hover = {
  name: string
  flag: string
  status: Status | undefined
  level: number | undefined
  capital: string | null
  subregion: string | null
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
  return (
    <HoverTip
      style={{ left: hover.x, top: hover.y }}
      extra={hover.level ? <RiskMeter level={hover.level} /> : undefined}
      icon={hover.flag}
      title={
        <span className="inline-flex items-center">
          {hover.name}
          <StatusPill status={hover.status} />
        </span>
      }
      detail={
        hover.capital || hover.subregion
          ? [hover.capital, hover.subregion].filter(Boolean).join(" · ")
          : undefined
      }
    />
  )
}
