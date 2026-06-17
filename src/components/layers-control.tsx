"use client"

import { useTravelStore } from "@/lib/store"
import { LAYERS } from "@/lib/transport"

// Floating toggles for the travel-gateway overlays (airports / stations /
// ports). All off by default; each layer's points are drawn on both the flat
// map and the globe only while its toggle is active.
const LayersControl = () => {
  const layers = useTravelStore((s) => s.layers)
  const toggleLayer = useTravelStore((s) => s.toggleLayer)

  return (
    <div className="absolute bottom-5 left-5 z-10 flex flex-col gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 p-1.5 shadow-lg backdrop-blur">
      {LAYERS.map((layer) => {
        const on = layers[layer.id]
        return (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            aria-pressed={on}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--ink)] transition-colors"
            style={{ background: on ? `${layer.color}22` : "transparent" }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{
                background: on ? layer.color : "transparent",
                borderColor: layer.color,
              }}
            />
            {layer.label}
          </button>
        )
      })}
    </div>
  )
}

export default LayersControl
