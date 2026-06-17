"use client"

import { useState } from "react"

// A fixed-height illustration slot shared by every sidebar panel. It always
// renders something: the Wikipedia lead image when available, otherwise a
// subtle gradient placeholder with a themed glyph. On a load error it falls
// back to the same placeholder. Reset behaviour is handled by the parent
// passing `key={src ?? "placeholder"}`, so a new subject remounts it.
const PanelImage = ({
  src,
  alt,
  placeholder = "🗺",
}: {
  src: string | null
  alt: string
  placeholder?: string
}) => {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  return (
    <figure className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--border)]">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--panel-hover)] to-[var(--panel)]">
          <span className="text-5xl opacity-40 grayscale">{placeholder}</span>
        </div>
      )}
    </figure>
  )
}

export default PanelImage
