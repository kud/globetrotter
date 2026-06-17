import { feature } from "topojson-client"
import { geoCentroid } from "d3-geo"
import type { Feature, Geometry, Position } from "geojson"
import topology50 from "world-atlas/countries-50m.json"
import topology110 from "world-atlas/countries-110m.json"
import subunitsRaw from "@/data/subunits.json"

export type CountryProps = { name: string }
export type CountryFeature = Feature<Geometry, CountryProps> & { id: string }

type WorldTopology = typeof topology50

type TerritorySplit = {
  id: string
  name: string
  parentId: string
  match: (centroid: [number, number]) => boolean
}

// Overseas territories that travellers commonly distinguish from the mainland.
// Each parent polygon is routed by its centroid [lon, lat] using a tight bbox
// (so neighbouring territories like Guadeloupe or American Samoa aren't swept
// in); matched polygons become their own clickable pseudo-country.
const TERRITORY_SPLITS: TerritorySplit[] = [
  {
    id: "fr-guf",
    name: "French Guiana",
    parentId: "250",
    match: ([lon, lat]) => lon > -55 && lon < -51 && lat > 1 && lat < 7,
  },
  {
    id: "us-ak",
    name: "Alaska",
    parentId: "840",
    match: ([lon, lat]) => lat > 51 && lon < -129,
  },
  {
    id: "us-hi",
    name: "Hawaii",
    parentId: "840",
    match: ([lon, lat]) => lat > 17 && lat < 24 && lon > -162 && lon < -150,
  },
  // Spain
  {
    id: "es-ic",
    name: "Canary Islands",
    parentId: "724",
    match: ([lon, lat]) => lon > -19 && lon < -13 && lat > 27 && lat < 30,
  },
  {
    id: "es-ib",
    name: "Balearic Islands",
    parentId: "724",
    match: ([lon, lat]) => lon > 0.5 && lon < 4.5 && lat > 38 && lat < 40.5,
  },
  // France (overseas + Corsica)
  {
    id: "fr-cor",
    name: "Corsica",
    parentId: "250",
    match: ([lon, lat]) => lon > 8 && lon < 10 && lat > 41 && lat < 43.5,
  },
  {
    id: "fr-reu",
    name: "Réunion",
    parentId: "250",
    match: ([lon, lat]) => lon > 54 && lon < 57 && lat > -22 && lat < -20,
  },
  {
    id: "fr-glp",
    name: "Guadeloupe",
    parentId: "250",
    match: ([lon, lat]) => lon > -62 && lon < -61 && lat > 15.5 && lat < 16.7,
  },
  {
    id: "fr-mtq",
    name: "Martinique",
    parentId: "250",
    match: ([lon, lat]) => lon > -61.5 && lon < -60.5 && lat > 14 && lat < 15,
  },
  {
    id: "fr-myt",
    name: "Mayotte",
    parentId: "250",
    match: ([lon, lat]) => lon > 44 && lon < 46 && lat > -13.5 && lat < -12,
  },
  // Italy
  {
    id: "it-sic",
    name: "Sicily",
    parentId: "380",
    match: ([lon, lat]) => lon > 11.5 && lon < 16 && lat > 36 && lat < 38.7,
  },
  {
    id: "it-sar",
    name: "Sardinia",
    parentId: "380",
    match: ([lon, lat]) => lon > 7.5 && lon < 10 && lat > 38.5 && lat < 41.8,
  },
  // Portugal
  {
    id: "pt-mad",
    name: "Madeira",
    parentId: "620",
    match: ([lon, lat]) => lon > -17.5 && lon < -16 && lat > 32 && lat < 33.5,
  },
  {
    id: "pt-azo",
    name: "Azores",
    parentId: "620",
    match: ([lon, lat]) => lon > -32 && lon < -24 && lat > 36.5 && lat < 40,
  },
]

const toPolygons = (geom: Geometry): Position[][][] =>
  geom.type === "MultiPolygon"
    ? geom.coordinates
    : geom.type === "Polygon"
      ? [geom.coordinates]
      : []

const splitTerritories = (features: CountryFeature[]): CountryFeature[] => {
  const out: CountryFeature[] = []
  for (const f of features) {
    const defs = TERRITORY_SPLITS.filter((t) => t.parentId === f.id)
    if (defs.length === 0) {
      out.push(f)
      continue
    }
    const parentPolys: Position[][][] = []
    const buckets = new Map<string, Position[][][]>()
    for (const coords of toPolygons(f.geometry)) {
      const centroid = geoCentroid({
        type: "Polygon",
        coordinates: coords,
      }) as [number, number]
      const def = defs.find((d) => d.match(centroid))
      if (def) {
        const bucket = buckets.get(def.id) ?? []
        bucket.push(coords)
        buckets.set(def.id, bucket)
      } else {
        parentPolys.push(coords)
      }
    }
    out.push({
      ...f,
      geometry: { type: "MultiPolygon", coordinates: parentPolys },
    })
    for (const def of defs) {
      const polys = buckets.get(def.id)
      if (!polys || polys.length === 0) continue
      out.push({
        type: "Feature",
        id: def.id,
        properties: { name: def.name },
        geometry: { type: "MultiPolygon", coordinates: polys },
      } as CountryFeature)
    }
  }
  return out
}

// Some source polygons share a normalised id (e.g. Australia and the Ashmore &
// Cartier Islands are both ISO 036). Merge them into a single feature so ids
// stay unique — otherwise React list keys collide and id-keyed lookups (status,
// countryById) silently overwrite one country with another.
const mergeById = (features: CountryFeature[]): CountryFeature[] => {
  const byId = new Map<string, CountryFeature>()
  for (const f of features) {
    const prev = byId.get(f.id)
    byId.set(
      f.id,
      prev
        ? {
            ...prev,
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                ...toPolygons(prev.geometry),
                ...toPolygons(f.geometry),
              ],
            },
          }
        : f,
    )
  }
  return [...byId.values()]
}

// Constituent nations / subdivisions that travellers count as distinct visits
// (e.g. England, Scotland, Wales, Northern Ireland). Unlike TERRITORY_SPLITS —
// which routes separate island polygons by centroid — these are real internal
// boundaries (Great Britain is one contiguous polygon), so the geometry is
// bundled. Each id is "PARENT-xxx"; the parent admin0 feature is replaced by
// its subunits. Data-driven: add more by extending src/data/subunits.json.
const SUBUNITS = subunitsRaw as unknown as {
  id: string
  name: string
  geometry: Geometry
}[]
const SUBUNIT_PARENTS = new Set(SUBUNITS.map((s) => s.id.split("-")[0]))

const injectSubunits = (features: CountryFeature[]): CountryFeature[] => [
  ...features.filter((f) => !SUBUNIT_PARENTS.has(f.id)),
  ...SUBUNITS.map(
    (s) =>
      ({
        type: "Feature",
        id: s.id,
        properties: { name: s.name },
        geometry: s.geometry,
      }) as CountryFeature,
  ),
]

const buildFeatures = (topology: WorldTopology): CountryFeature[] => {
  const collection = feature(
    topology,
    topology.objects.countries,
  ) as unknown as { features: CountryFeature[] }
  const normalized = collection.features
    .filter((f) => f.id != null && f.properties?.name)
    // Normalise ISO numeric ids (e.g. "040" -> "40") so they join the bundled
    // country-info / capitals / advisory datasets, which use unpadded keys.
    .map((f) => ({ ...f, id: String(parseInt(String(f.id), 10)) }))
    // Drop polygons whose id isn't a number (a handful of unnamed artefacts).
    .filter((f) => f.id !== "NaN")
  return injectSubunits(mergeById(splitTerritories(normalized)))
}

// 50m detail for the flat map (crisp coastlines; SVG handles the vertex count
// cheaply and it zooms to 9×).
export const countryFeatures: CountryFeature[] = buildFeatures(topology50)

// 110m detail for the globe: ~7× fewer vertices. The globe re-renders the whole
// scene every frame and ray-casts the meshes on every hover, so triangle count
// directly drives GPU/CPU load — 50m there pegged Firefox. Borders are a touch
// coarser at globe zoom, which is an acceptable trade for smoothness.
export const globeCountryFeatures: CountryFeature[] = buildFeatures(
  topology110 as unknown as WorldTopology,
)

export type Country = { id: string; name: string; centroid: [number, number] }

export const countries: Country[] = countryFeatures
  .map((f) => ({
    id: f.id,
    name: f.properties.name,
    centroid: geoCentroid(f) as [number, number],
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export const countryById = new Map<string, Country>(
  countries.map((c) => [c.id, c]),
)

export const totalCountries = countries.length
