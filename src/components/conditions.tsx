"use client"

import { useWeather } from "@/lib/use-weather"
import { weatherDesc, climateZone } from "@/lib/weather"
import { Stat } from "@/components/panel-stats"

// Current local conditions for a coordinate — live weather (Open-Meteo) plus a
// coarse climate band. Shared by the country and place panels so conditions
// look identical everywhere. Renders nothing without coordinates.
const Conditions = ({
  lat,
  lng,
}: {
  lat: number | null
  lng: number | null
}) => {
  const weather = useWeather(lat, lng)
  if (lat == null || lng == null) return null
  const desc = weather ? weatherDesc(weather.code) : null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-dim)]">
        Conditions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Temperature"
          value={
            weather
              ? `${Math.round(weather.tempC)}°C ${desc?.emoji ?? ""}`
              : "…"
          }
        />
        <Stat label="Humidity" value={weather ? `${weather.humidity}%` : "…"} />
        <Stat
          label="Wind"
          value={weather ? `${Math.round(weather.windKmh)} km/h` : "…"}
        />
        <Stat label="Sky" value={weather && desc ? desc.label : "…"} />
        <Stat label="Climate (approx)" value={climateZone(lat)} />
      </div>
    </section>
  )
}

export default Conditions
