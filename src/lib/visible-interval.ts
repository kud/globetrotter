/**
 * `setInterval` that only runs while the tab is visible.
 *
 * Every poller on the page used to keep firing in background tabs, so a tab
 * left open overnight cost the same requests (and, for `/api/*`, the same
 * Vercel function invocations) as one being looked at. Here the timer stops
 * when `document.visibilityState` turns "hidden" and, on return, ticks once
 * straight away so the view is fresh, then resumes its rhythm.
 *
 * A tab opened in the background does not tick at all until it is first shown.
 * Returns a cleanup that clears the timer and the listener.
 */
export const everyWhileVisible = (
  tick: () => void,
  ms: number,
): (() => void) => {
  let id: ReturnType<typeof setInterval> | null = null
  const start = () => {
    if (id !== null) return
    tick()
    id = setInterval(tick, ms)
  }
  const stop = () => {
    if (id === null) return
    clearInterval(id)
    id = null
  }
  const onChange = () =>
    document.visibilityState === "hidden" ? stop() : start()
  onChange()
  document.addEventListener("visibilitychange", onChange)
  return () => {
    stop()
    document.removeEventListener("visibilitychange", onChange)
  }
}
