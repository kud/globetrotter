// Live local weather via Open-Meteo (free, no API key, CORS-friendly) plus a
// coarse climate band derived from latitude. Used to enrich the country and
// place panels with current conditions.
export type Weather = {
  tempC: number
  humidity: number
  windKmh: number
  code: number
  elevationM: number | null
  timezone: string | null
}

// WMO weather codes → a short label and a glyph.
const WMO: Record<number, { label: string; emoji: string }> = {
  0: { label: "Clear sky", emoji: "☀️" },
  1: { label: "Mainly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Rime fog", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌦️" },
  56: { label: "Freezing drizzle", emoji: "🌧️" },
  57: { label: "Freezing drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌦️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  66: { label: "Freezing rain", emoji: "🌧️" },
  67: { label: "Freezing rain", emoji: "🌧️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "🌨️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  77: { label: "Snow grains", emoji: "🌨️" },
  80: { label: "Rain showers", emoji: "🌦️" },
  81: { label: "Rain showers", emoji: "🌧️" },
  82: { label: "Violent showers", emoji: "⛈️" },
  85: { label: "Snow showers", emoji: "🌨️" },
  86: { label: "Snow showers", emoji: "🌨️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm", emoji: "⛈️" },
  99: { label: "Thunderstorm", emoji: "⛈️" },
}

export const weatherDesc = (code: number) =>
  WMO[code] ?? { label: "—", emoji: "🌡️" }

// Coarse climate band from latitude — a rough indicator (a single point can't
// capture a whole country), labelled "approx" in the UI.
export const climateZone = (lat: number) => {
  const a = Math.abs(lat)
  if (a < 23.5) return "Tropical"
  if (a < 35) return "Subtropical"
  if (a < 55) return "Temperate"
  if (a < 66.5) return "Subpolar"
  return "Polar"
}

// A rough biome/vegetation guess. Latitude is the primary signal (a stable
// proxy for the long-term climate that defines vegetation); current humidity
// only nudges the warmer bands toward arid. Today's *temperature* is
// deliberately NOT used — a cold winter day doesn't make a temperate city
// tundra. Honest flavour, labelled "approx" in the UI.
export const biome = (lat: number, humidity?: number | null) => {
  const a = Math.abs(lat)
  if (a >= 66.5) return "Tundra / Polar"
  if (a >= 55) return "Boreal forest (taiga)"
  const arid = humidity != null && humidity < 35
  if (a < 23.5) return arid ? "Tropical savanna" : "Tropical rainforest"
  if (a < 35) return arid ? "Desert / arid" : "Subtropical forest"
  return arid ? "Temperate grassland" : "Temperate forest"
}

// Meteorological season for the location's hemisphere (month is 0-indexed).
const NORTH_SEASON = [
  "Winter",
  "Winter",
  "Spring",
  "Spring",
  "Spring",
  "Summer",
  "Summer",
  "Summer",
  "Autumn",
  "Autumn",
  "Autumn",
  "Winter",
] as const
const OPPOSITE: Record<string, string> = {
  Winter: "Summer",
  Summer: "Winter",
  Spring: "Autumn",
  Autumn: "Spring",
}
export const season = (lat: number, month: number) => {
  const n = NORTH_SEASON[month]
  return lat >= 0 ? n : OPPOSITE[n]
}

// Curated monsoon / rainy-season belts: [west, south, east, north] bbox + the
// months (0-indexed) the wet season typically runs. Approximate — for flavour.
const MONSOON: { box: [number, number, number, number]; months: number[] }[] = [
  { box: [68, 8, 97, 30], months: [5, 6, 7, 8] }, // South Asia
  { box: [92, -10, 130, 25], months: [4, 5, 6, 7, 8, 9] }, // Southeast Asia
  { box: [-17, 7, 30, 17], months: [5, 6, 7, 8] }, // West Africa
  { box: [100, 22, 146, 40], months: [5, 6, 7] }, // East Asia
  { box: [-90, -5, -45, 12], months: [11, 0, 1, 2] }, // N. South America
]
export const isMonsoon = (lat: number, lng: number, month: number) =>
  MONSOON.some(
    (m) =>
      lng >= m.box[0] &&
      lat >= m.box[1] &&
      lng <= m.box[2] &&
      lat <= m.box[3] &&
      m.months.includes(month),
  )

export const weatherUrl = (lat: number, lng: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
