"use client"

import type { CSSProperties, ReactNode } from "react"

// The single hover-tooltip shell used by every map hover — countries, oceans,
// transport markers, the plane, the ISS and the Moon — so they all look and
// behave identically. `extra` is an optional leading slot (e.g. the country
// risk meter). `position` is "fixed" for cursor-following hovers and "absolute"
// for tooltips anchored to a marker's projected screen point.
export const HoverTip = ({
  icon,
  title,
  detail,
  extra,
  style,
  position = "fixed",
}: {
  icon?: ReactNode
  title: ReactNode
  detail?: ReactNode
  extra?: ReactNode
  style: CSSProperties
  position?: "fixed" | "absolute"
}) => (
  <div
    className={`pointer-events-none ${position} z-20 flex -translate-x-1/2 -translate-y-[135%] items-center gap-2.5 whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] px-3.5 py-2.5 text-[13px] text-[var(--ink)] shadow-lg`}
    style={style}
  >
    {extra}
    <span className="flex flex-col">
      <span className="font-semibold">
        {icon && <span className="mr-1.5">{icon}</span>}
        {title}
      </span>
      {detail && (
        <span className="text-[11px] font-normal text-[var(--ink-dim)]">
          {detail}
        </span>
      )}
    </span>
  </div>
)

export default HoverTip
