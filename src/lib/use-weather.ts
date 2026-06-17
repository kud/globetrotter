import { useEffect, useState } from "react"
import { weatherUrl, type Weather } from "@/lib/weather"

// Fetches current weather for a coordinate. Pass null lat/lng (e.g. when no
// panel is open) to skip the request. Keyed by coordinate so a stale response
// never shows for the wrong place.
export const useWeather = (
  lat: number | null,
  lng: number | null,
): Weather | null => {
  const [data, setData] = useState<{ key: string; w: Weather } | null>(null)

  useEffect(() => {
    if (lat == null || lng == null) return
    const key = `${lat},${lng}`
    let active = true
    fetch(weatherUrl(lat, lng))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.current) {
          setData({
            key,
            w: {
              tempC: d.current.temperature_2m,
              humidity: d.current.relative_humidity_2m,
              windKmh: d.current.wind_speed_10m,
              code: d.current.weather_code,
            },
          })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [lat, lng])

  return lat != null && lng != null && data?.key === `${lat},${lng}`
    ? data.w
    : null
}
