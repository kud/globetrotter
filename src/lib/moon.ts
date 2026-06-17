// Real Moon data, computed locally (no dependency, no network) so it works
// offline. The maths is the low-precision lunar model popularised by SunCalc
// (Vladimir Agafonkin, MIT) — accurate to a fraction of a degree, which is far
// more than enough to place a marker and report the phase.
//
// We expose the *sublunar point*: the geographic lat/lng where the Moon is at
// the zenith right now. That's the natural place to pin a Moon marker on a map.

const rad = Math.PI / 180
const dayMs = 1000 * 60 * 60 * 24
const J1970 = 2440588
const J2000 = 2451545
const e = rad * 23.4397 // obliquity of the ecliptic

const toDays = (date: Date) => date.valueOf() / dayMs - 0.5 + J1970 - J2000

const rightAscension = (l: number, b: number) =>
  Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l))
const declination = (l: number, b: number) =>
  Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l))

// Greenwich mean sidereal time, in radians.
const gmst = (d: number) => rad * (280.16 + 360.9856235 * d)

const sunCoords = (d: number) => {
  const M = rad * (357.5291 + 0.98560028 * d)
  const C =
    rad *
    (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const L = M + C + rad * 102.9372 + Math.PI
  return { dec: declination(L, 0), ra: rightAscension(L, 0) }
}

const moonCoords = (d: number) => {
  const L = rad * (218.316 + 13.176396 * d) // ecliptic longitude
  const M = rad * (134.963 + 13.064993 * d) // mean anomaly
  const F = rad * (93.272 + 13.22935 * d) // mean distance
  const l = L + rad * 6.289 * Math.sin(M)
  const b = rad * 5.128 * Math.sin(F)
  const dt = 385001 - 20905 * Math.cos(M) // distance to Earth, km
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt }
}

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const

// Map the 0..1 phase to one of the eight named phases (quarters get a small
// window so they're not swallowed by the crescents/gibbous bands).
const phaseName = (phase: number) => {
  const slots: [number, number][] = [
    [0.0, 0],
    [0.03, 1],
    [0.22, 2],
    [0.28, 3],
    [0.47, 4],
    [0.53, 5],
    [0.72, 6],
    [0.78, 7],
    [0.97, 0],
  ]
  for (let i = slots.length - 1; i >= 0; i--) {
    if (phase >= slots[i][0]) return PHASE_NAMES[slots[i][1]]
  }
  return PHASE_NAMES[0]
}

export type MoonInfo = {
  lat: number // sublunar latitude (°)
  lng: number // sublunar longitude (°)
  distanceKm: number
  fraction: number // illuminated fraction, 0..1
  phase: number // 0=new, 0.5=full, 1=new
  phaseName: string
}

export const moonInfo = (date: Date): MoonInfo => {
  const d = toDays(date)
  const m = moonCoords(d)
  const s = sunCoords(d)

  // Sublunar point: latitude is the declination; longitude is the right
  // ascension measured against the current Greenwich sidereal time.
  const lat = m.dec / rad
  let lng = ((m.ra - gmst(d)) / rad) % 360
  lng = ((((lng + 180) % 360) + 360) % 360) - 180

  // Illumination + phase (geocentric).
  const phi = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) +
      Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
  )
  const sdist = 149598000 // km, Earth–Sun
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi))
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) -
      Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  )
  const fraction = (1 + Math.cos(inc)) / 2
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI

  return {
    lat,
    lng,
    distanceKm: Math.round(m.dist),
    fraction,
    phase,
    phaseName: phaseName(phase),
  }
}

// A glyph for the current phase, handy for markers/placeholders.
export const phaseEmoji = (phase: number) => {
  const idx = Math.round(phase * 8) % 8
  return ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][idx]
}
