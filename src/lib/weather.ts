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

// A rough biome/vegetation guess from latitude plus live temperature and
// humidity (a weak dryness proxy). Honest flavour, not a survey — labelled
// "approx" in the UI. Humidity/temp are optional (climate-only fallback).
export const biome = (
  lat: number,
  tempC?: number | null,
  humidity?: number | null,
) => {
  const a = Math.abs(lat)
  if ((tempC != null && tempC <= -2) || a >= 66.5) return "Tundra / Polar"
  if (a >= 55) return "Boreal forest (taiga)"
  const arid = humidity != null && humidity < 40
  if (a < 23.5) return arid ? "Tropical savanna" : "Tropical rainforest"
  if (a < 35) return arid ? "Desert / arid" : "Subtropical forest"
  return arid ? "Temperate grassland" : "Temperate forest"
}

export const weatherUrl = (lat: number, lng: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
