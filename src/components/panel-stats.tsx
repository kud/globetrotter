// Shared label/value primitives for the sidebar panels, so every panel renders
// facts the same way. `Stat` is a boxed card (used by the object-info panels —
// ocean, place, Moon, ISS); `Fact` is a bordered row (used by the dense detail
// panels — country, flight).
export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--panel-hover)] px-3 py-2">
    <span className="text-[10px] uppercase tracking-wide text-[var(--ink-dim)]">
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
)

export const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 border-b border-[var(--border)] py-1.5 last:border-0">
    <span className="text-[var(--ink-dim)]">{label}</span>
    <span className="text-right font-medium tabular-nums">{value}</span>
  </div>
)
