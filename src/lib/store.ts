import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useSyncExternalStore } from "react"

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
  issOpen: boolean
  ocean: string | null
  setFlight: (flight: LiveFlight | null) => void
  openFlight: () => void
  closeFlight: () => void
  openISS: () => void
  closeISS: () => void
  openOcean: (name: string) => void
  closeOcean: () => void
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
      view: "map",
      theme: "system",
      locale: "en",
      localePinned: false,
      autoSpin: false,
      southUp: false,
      focusId: null,
      selectedId: null,
      flight: null,
      flightOpen: false,
      issOpen: false,
      ocean: null,

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
      openFlight: () =>
        set({
          flightOpen: true,
          issOpen: false,
          ocean: null,
          selectedId: null,
        }),
      closeFlight: () => set({ flightOpen: false }),
      openISS: () =>
        set({
          issOpen: true,
          flightOpen: false,
          ocean: null,
          selectedId: null,
        }),
      closeISS: () => set({ issOpen: false }),
      openOcean: (ocean) =>
        set({
          ocean,
          flightOpen: false,
          issOpen: false,
          selectedId: null,
        }),
      closeOcean: () => set({ ocean: null }),
      focus: (focusId) => set({ focusId }),
      select: (selectedId) =>
        set({
          selectedId,
          focusId: selectedId,
          flightOpen: false,
          issOpen: false,
          ocean: null,
        }),
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
        // `view` is intentionally not persisted so the app always opens on the
        // flat map (the better planning view) rather than the last-used view.
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

export const useHasHydrated = () =>
  useSyncExternalStore(
    (onChange) => useTravelStore.persist.onFinishHydration(onChange),
    () => useTravelStore.persist.hasHydrated(),
    () => false,
  )

// Subscribes to the OS colour-scheme via useSyncExternalStore, so there's no
// setState-in-effect and it updates live when the user changes appearance.
const useSystemDark = () =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true,
  )

// Collapses the "system" preference to a concrete theme.
export const useResolvedTheme = (): ResolvedTheme => {
  const theme = useTravelStore((s) => s.theme)
  const systemDark = useSystemDark()
  if (theme === "system") return systemDark ? "dark" : "light"
  return theme
}
