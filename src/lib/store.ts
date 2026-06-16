import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useEffect, useState } from "react"

export type Status = "visited" | "wishlist" | "blocked"
export type View = "globe" | "map"
export type ResolvedTheme = "dark" | "light"
export type Theme = ResolvedTheme | "system"
export type Locale = "en" | "fr" | "es" | "de"

const THEME_CYCLE: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
}
export type WouldReturn = "yes" | "maybe" | "no"

export type Review = {
  rating?: number
  wouldReturn?: WouldReturn
  liked?: string
  disliked?: string
  bestTime?: string
  visits?: string[]
}

export type Airport = {
  name: string
  iata: string
  code: string
  lat: number | null
  lng: number | null
}

export type LiveFlight = {
  id: string
  callsign: string
  country: string
  lat: number
  lng: number
  heading: number
  speedKmh: number
  altKm: number | null
  type?: string | null
  operator?: string | null
  registration?: string | null
  origin?: Airport | null
  destination?: Airport | null
}

const CYCLE: Record<string, Status | undefined> = {
  none: "wishlist",
  wishlist: "visited",
  visited: "blocked",
  blocked: undefined,
}

export type TravelData = {
  statuses: Record<string, Status>
  notes: Record<string, string>
  reviews: Record<string, Review>
}

export type TravelState = TravelData & {
  view: View
  theme: Theme
  locale: Locale
  localePinned: boolean
  autoSpin: boolean
  southUp: boolean
  toggleSouthUp: () => void
  focusId: string | null
  selectedId: string | null
  flight: LiveFlight | null
  flightOpen: boolean
  setFlight: (flight: LiveFlight | null) => void
  openFlight: () => void
  closeFlight: () => void
  setStatus: (id: string, status: Status | null) => void
  cycle: (id: string) => void
  setNote: (id: string, note: string) => void
  setReview: (id: string, patch: Partial<Review>) => void
  setView: (view: View) => void
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
  setLocale: (locale: Locale) => void
  autoLocale: (locale: Locale) => void
  setAutoSpin: (on: boolean) => void
  focus: (id: string | null) => void
  select: (id: string | null) => void
  reset: () => void
  replaceData: (data: TravelData) => void
}

export const useTravelStore = create<TravelState>()(
  persist(
    (set, get) => ({
      statuses: {},
      notes: {},
      reviews: {},
      view: "globe",
      theme: "system",
      locale: "en",
      localePinned: false,
      autoSpin: false,
      southUp: false,
      focusId: null,
      selectedId: null,
      flight: null,
      flightOpen: false,

      setStatus: (id, status) =>
        set((state) => {
          const next = { ...state.statuses }
          if (status) next[id] = status
          else delete next[id]
          return { statuses: next }
        }),

      cycle: (id) => {
        const current = get().statuses[id] ?? "none"
        get().setStatus(id, CYCLE[current] ?? null)
      },

      setNote: (id, note) =>
        set((state) => {
          const next = { ...state.notes }
          if (note.trim()) next[id] = note
          else delete next[id]
          return { notes: next }
        }),

      setReview: (id, patch) =>
        set((state) => {
          const merged = { ...state.reviews[id], ...patch }
          const cleaned = Object.fromEntries(
            Object.entries(merged).filter(
              ([, v]) => v !== undefined && v !== "",
            ),
          ) as Review
          const next = { ...state.reviews }
          if (Object.keys(cleaned).length > 0) next[id] = cleaned
          else delete next[id]
          return { reviews: next }
        }),

      setView: (view) => set({ view }),
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => set((state) => ({ theme: THEME_CYCLE[state.theme] })),
      setLocale: (locale) => set({ locale, localePinned: true }),
      autoLocale: (locale) =>
        set((state) => (state.localePinned ? {} : { locale })),
      setAutoSpin: (autoSpin) => set({ autoSpin }),
      toggleSouthUp: () => set((state) => ({ southUp: !state.southUp })),
      setFlight: (flight) => set({ flight }),
      openFlight: () => set({ flightOpen: true, selectedId: null }),
      closeFlight: () => set({ flightOpen: false }),
      focus: (focusId) => set({ focusId }),
      select: (selectedId) =>
        set({ selectedId, focusId: selectedId, flightOpen: false }),
      reset: () =>
        set({
          statuses: {},
          notes: {},
          reviews: {},
          focusId: null,
          selectedId: null,
        }),
      replaceData: ({ statuses, notes, reviews }) =>
        set({ statuses, notes, reviews, focusId: null, selectedId: null }),
    }),
    {
      name: "globetrotter:v1",
      version: 4,
      partialize: (state) => ({
        statuses: state.statuses,
        notes: state.notes,
        reviews: state.reviews,
        view: state.view,
        theme: state.theme,
        locale: state.locale,
        localePinned: state.localePinned,
        autoSpin: state.autoSpin,
        southUp: state.southUp,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<TravelState>
        return {
          ...state,
          notes: state.notes ?? {},
          reviews: state.reviews ?? {},
          locale: state.locale ?? "en",
          localePinned: state.localePinned ?? false,
        } as TravelState
      },
    },
  ),
)

export const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const unsub = useTravelStore.persist.onFinishHydration(() =>
      setHydrated(true),
    )
    setHydrated(useTravelStore.persist.hasHydrated())
    return unsub
  }, [])
  return hydrated
}

// Collapses the "system" preference to a concrete theme by watching the OS
// colour-scheme, updating live when the user changes their system appearance.
export const useResolvedTheme = (): ResolvedTheme => {
  const theme = useTravelStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  if (theme === "system") return systemDark ? "dark" : "light"
  return theme
}
