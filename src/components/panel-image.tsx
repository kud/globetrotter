"use client"

import { useState } from "react"

// A fixed-height illustration slot shared by every sidebar panel. The themed
// gradient placeholder is the base layer and is ALWAYS shown — so while the
// image is still downloading there's a glyph in its place rather than a blank
// box. Once the image loads it fades in over the placeholder; if it errors (or
// there's no src) the placeholder simply stays. The placeholder pulses gently
// while a load is in flight. Reset is handled by the parent passing
// `key={src ?? "placeholder"}`, so a new subject remounts with fresh state.
const PanelImage = ({
  src,
  alt,
  placeholder = "🗺",
}: {
  src: string | null
  alt: string
  placeholder?: string
}) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed
  const loading = showImage && !loaded

  return (
    <figure className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
      <div
        className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--panel-hover)] to-[var(--panel)] ${
          loading ? "animate-pulse" : ""
        }`}
      >
        <span className="text-5xl opacity-40 grayscale">{placeholder}</span>
      </div>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`relative h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </figure>
  )
}

export default PanelImage
