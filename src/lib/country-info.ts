import raw from "@/data/country-info.json"
import capitals from "@/data/capitals.json"

export type CountryInfo = {
  cca2: string
  cca3: string
  name: string
  nameFr: string
  capital: string | null
  region: string | null
  subregion: string | null
  languages: string[]
  currencies: string[]
  population: number | null
  flag: string
  area: number | null
  latlng: [number, number] | null
  // For split territories: the ccn3 id of the sovereign country whose travel
  // advisory applies (feeds are per-country, e.g. Canary Islands → Spain).
  parent?: string
}

const INFO = raw as unknown as Record<string, CountryInfo>
const CAPITALS = capitals as unknown as Record<string, [number, number]>

// Facts for the overseas territories split out in geo.ts (synthetic ids). They
// aren't in the ccn3-keyed datasets, so they're curated here.
const T = (
  parent: string,
  name: string,
  nameFr: string,
  capital: string,
  region: string,
  subregion: string,
  languages: string[],
  population: number,
  flag: string,
  latlng: [number, number],
): CountryInfo => ({
  cca2: "",
  cca3: "",
  name,
  nameFr,
  capital,
  region,
  subregion,
  languages,
  currencies: ["Euro (€)"],
  population,
  flag,
  area: null,
  latlng,
  parent,
})

const TERRITORY_INFO: Record<string, CountryInfo> = {
  "fr-guf": {
    ...T(
      "250",
      "French Guiana",
      "Guyane",
      "Cayenne",
      "Americas",
      "South America",
      ["French"],
      294071,
      "🇬🇫",
      [4, -53],
    ),
  },
  "us-ak": {
    cca2: "US",
    cca3: "USA",
    name: "Alaska",
    nameFr: "Alaska",
    capital: "Juneau",
    region: "Americas",
    subregion: "Northern America",
    languages: ["English"],
    currencies: ["US dollar ($)"],
    population: 733391,
    flag: "🇺🇸",
    area: 1717856,
    latlng: [64, -152],
    parent: "840",
  },
  "us-hi": {
    cca2: "US",
    cca3: "USA",
    name: "Hawaii",
    nameFr: "Hawaï",
    capital: "Honolulu",
    region: "Americas",
    subregion: "Polynesia",
    languages: ["English", "Hawaiian"],
    currencies: ["US dollar ($)"],
    population: 1440196,
    flag: "🇺🇸",
    area: 28311,
    latlng: [21, -157],
    parent: "840",
  },
  "es-ic": T(
    "724",
    "Canary Islands",
    "Îles Canaries",
    "Las Palmas",
    "Africa",
    "Macaronesia",
    ["Spanish"],
    2200000,
    "🇮🇨",
    [28.3, -15.4],
  ),
  "es-ib": T(
    "724",
    "Balearic Islands",
    "Îles Baléares",
    "Palma",
    "Europe",
    "Southern Europe",
    ["Spanish", "Catalan"],
    1170000,
    "🇪🇸",
    [39.6, 2.9],
  ),
  "fr-cor": T(
    "250",
    "Corsica",
    "Corse",
    "Ajaccio",
    "Europe",
    "Southern Europe",
    ["French", "Corsican"],
    340000,
    "🇫🇷",
    [42, 9],
  ),
  "fr-reu": T(
    "250",
    "Réunion",
    "La Réunion",
    "Saint-Denis",
    "Africa",
    "Eastern Africa",
    ["French"],
    870000,
    "🇷🇪",
    [-21.1, 55.5],
  ),
  "fr-glp": T(
    "250",
    "Guadeloupe",
    "Guadeloupe",
    "Basse-Terre",
    "Americas",
    "Caribbean",
    ["French"],
    384000,
    "🇬🇵",
    [16.2, -61.6],
  ),
  "fr-mtq": T(
    "250",
    "Martinique",
    "Martinique",
    "Fort-de-France",
    "Americas",
    "Caribbean",
    ["French"],
    360000,
    "🇲🇶",
    [14.6, -61],
  ),
  "fr-myt": T(
    "250",
    "Mayotte",
    "Mayotte",
    "Mamoudzou",
    "Africa",
    "Eastern Africa",
    ["French"],
    280000,
    "🇾🇹",
    [-12.8, 45.1],
  ),
  "it-sic": T(
    "380",
    "Sicily",
    "Sicile",
    "Palermo",
    "Europe",
    "Southern Europe",
    ["Italian"],
    4800000,
    "🇮🇹",
    [37.6, 14],
  ),
  "it-sar": T(
    "380",
    "Sardinia",
    "Sardaigne",
    "Cagliari",
    "Europe",
    "Southern Europe",
    ["Italian"],
    1580000,
    "🇮🇹",
    [40.1, 9],
  ),
  "pt-mad": T(
    "620",
    "Madeira",
    "Madère",
    "Funchal",
    "Europe",
    "Macaronesia",
    ["Portuguese"],
    250000,
    "🇵🇹",
    [32.7, -16.9],
  ),
  "pt-azo": T(
    "620",
    "Azores",
    "Açores",
    "Ponta Delgada",
    "Europe",
    "Macaronesia",
    ["Portuguese"],
    240000,
    "🇵🇹",
    [37.8, -25.5],
  ),
}

const TERRITORY_CAPITALS: Record<string, [number, number]> = {
  "fr-guf": [4.9224, -52.3135], // Cayenne
  "us-ak": [58.3019, -134.4197], // Juneau
  "us-hi": [21.307, -157.8584], // Honolulu
  "es-ic": [28.1, -15.41], // Las Palmas
  "es-ib": [39.57, 2.65], // Palma
  "fr-cor": [41.93, 8.74], // Ajaccio
  "fr-reu": [-20.88, 55.45], // Saint-Denis
  "fr-glp": [16.0, -61.73], // Basse-Terre
  "fr-mtq": [14.6, -61.07], // Fort-de-France
  "fr-myt": [-12.78, 45.23], // Mamoudzou
  "it-sic": [38.12, 13.36], // Palermo
  "it-sar": [39.22, 9.12], // Cagliari
  "pt-mad": [32.65, -16.91], // Funchal
  "pt-azo": [37.74, -25.67], // Ponta Delgada
}

export const getCountryInfo = (id: string): CountryInfo | undefined =>
  INFO[id] ?? TERRITORY_INFO[id]

// Real capital-city coordinates [lat, lng] (not the country centroid).
export const getCapitalLatLng = (id: string): [number, number] | undefined =>
  CAPITALS[id] ?? TERRITORY_CAPITALS[id]

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export type AdvisorySourceId = "france" | "fcdo" | "state" | "canada"
export type AdvisorySource = {
  id: AdvisorySourceId
  label: string
  country: string
  url: (info: CountryInfo) => string
}

const SOURCES: Record<AdvisorySourceId, AdvisorySource> = {
  france: {
    id: "france",
    label: "France Diplomatie",
    country: "🇫🇷 France",
    url: (info) =>
      `https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/${slug(info.nameFr)}/`,
  },
  fcdo: {
    id: "fcdo",
    label: "UK FCDO",
    country: "🇬🇧 United Kingdom",
    url: (info) =>
      `https://www.gov.uk/foreign-travel-advice/${slug(info.name)}`,
  },
  state: {
    id: "state",
    label: "US State Dept",
    country: "🇺🇸 United States",
    url: (info) =>
      `https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/${slug(info.name)}-travel-advisory.html`,
  },
  canada: {
    id: "canada",
    label: "Travel Canada",
    country: "🇨🇦 Canada",
    url: (info) => `https://travel.gc.ca/destinations/${slug(info.name)}`,
  },
}

export const ADVISORY_SOURCES: AdvisorySource[] = Object.values(SOURCES)

export const getAdvisorySource = (id: AdvisorySourceId): AdvisorySource =>
  SOURCES[id]

// Default source matching the visitor's browser language (used when the user
// has not explicitly chosen any).
export const resolveAdvisorySource = (): AdvisorySource => {
  if (typeof navigator === "undefined") return SOURCES.france
  const lang = (navigator.language || "").toLowerCase()
  if (lang.startsWith("fr")) return SOURCES.france
  if (lang === "en-us") return SOURCES.state
  if (lang.startsWith("en")) return SOURCES.fcdo
  return SOURCES.france
}
