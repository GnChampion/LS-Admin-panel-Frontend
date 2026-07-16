// Registry of the 8 Land Scanner backend modules.
//
// Each automation module is a stateless FastAPI service exposing:
//   GET  /healthz  -> { status, module, firebase }
//   POST /run      -> { task_id, module, run_id, status, zone_id, output, error, started_at, finished_at }
//
// `publishing` is the P1 delivery service (different contract) and is listed as
// a `delivery` service: health via GET /health, no /run console.
//
// Base URLs can be overridden with VITE_MODULE_<ID>_URL (sensible local defaults below).

export type ModuleKind = 'automation' | 'delivery'

export interface ModuleDef {
  id: string
  name: string
  group: 'A' | 'B' | 'C'
  kind: ModuleKind
  baseUrl: string
  description: string
  providers: string[]
  dataTypes: string[]
  live: boolean // has live, zero-auth data (vs prototype-mock placeholders)
  notes: string
}

const env = (k: string, d: string) => (import.meta.env[k] as string | undefined) || d

export const MODULES: ModuleDef[] = [
  {
    id: 'optical',
    name: 'Optical Imagery',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_OPTICAL_URL', 'http://localhost:8001'),
    description: 'Analysis-ready optical imagery: preview tiles (NASA GIBS) + Sentinel-2 L2A COG (Planetary Computer, Copernicus DSE).',
    providers: ['gibs', 'planetary-computer', 'sentinel-2-dse'],
    dataTypes: ['true-color', 'sentinel-2-l2a'],
    live: true,
    notes: 'GIBS = zero-auth preview tiles. Planetary Computer & Copernicus DSE = analysis-ready Sentinel-2 L2A COG (10/20/60m). DSE needs OAuth2 creds.'
  },
  {
    id: 'spectral',
    name: 'Spectral Indices',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_SPECTRAL_URL', 'http://localhost:8002'),
    description: 'Vegetation/water indices (NDVI/NDWI/EVI/SAVI). Prototype output — live compute deferred to Group B.',
    providers: ['prototype-mock'],
    dataTypes: ['ndvi', 'ndwi', 'evi', 'savi'],
    live: false,
    notes: 'Placeholder schema only. Live rasters via Copernicus DSE / GEE / Planetary Computer.'
  },
  {
    id: 'elevation',
    name: 'Elevation / Terrain',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_ELEVATION_URL', 'http://localhost:8003'),
    description: 'DEM terrain metrics (elevation/slope/aspect/hillshade). Prototype output — live DEM deferred to Group B.',
    providers: ['prototype-mock'],
    dataTypes: ['terrain'],
    live: false,
    notes: 'Placeholder schema only. Live DEM via COP-DEM / SRTM / OpenTopography (Group B).'
  },
  {
    id: 'radar',
    name: 'Radar (SAR)',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_RADAR_URL', 'http://localhost:8004'),
    description: 'SAR backscatter (VV/VH). Prototype output — live acquisition deferred to Group B.',
    providers: ['prototype-mock'],
    dataTypes: ['grd'],
    live: false,
    notes: 'Placeholder schema only. Live Sentinel-1/NISAR via Copernicus DSE / ASF DAAC (Group B).'
  },
  {
    id: 'land-cover',
    name: 'Land Cover',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_LAND_COVER_URL', 'http://localhost:8005'),
    description: 'Class-distribution map (ESA WorldCover 11-class). Prototype output — live classification deferred to Group B.',
    providers: ['prototype-mock'],
    dataTypes: ['map'],
    live: false,
    notes: 'Placeholder schema only. Live WorldCover / Dynamic World via Group B.'
  },
  {
    id: 'weather',
    name: 'Weather',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_WEATHER_URL', 'http://localhost:8006'),
    description: 'Forecast + current conditions via Open-Meteo (global) and NOAA NWS (US). Live, zero-auth.',
    providers: ['open-meteo', 'noaa-nws'],
    dataTypes: ['current', 'forecast'],
    live: true,
    notes: 'Open-Meteo global, NOAA NWS US-only. NASA POWER / ECMWF CDS need keys (Group B).'
  },
  {
    id: 'hydrology',
    name: 'Hydrology',
    group: 'A',
    kind: 'automation',
    baseUrl: env('VITE_MODULE_HYDROLOGY_URL', 'http://localhost:8007'),
    description: 'Streamflow via USGS NWIS (US gages). Live, zero-auth. JRC surface water deferred to Group B (GEE).',
    providers: ['usgs-nwis', 'jrc-gsw'],
    dataTypes: ['streamflow'],
    live: true,
    notes: 'USGS NWIS streamflow live. Pass params.site_id to target a gage (e.g. 01646500). JRC GSW needs GEE.'
  },
  {
    id: 'publishing',
    name: 'Publishing / Delivery (P1)',
    group: 'A',
    kind: 'delivery',
    baseUrl: env('VITE_MODULE_PUBLISHING_URL', 'http://localhost:8000'),
    description: 'P1 -> P2 delivery service (Firebase/Supabase/ImageKit sync). Different contract: GET /health, webhook endpoints.',
    providers: [],
    dataTypes: [],
    live: true,
    notes: 'Delivery/sync layer, not a /run module. Health via GET /health; sync is a later phase.'
  }
]

export const AUTOMATION_MODULES = MODULES.filter((m) => m.kind === 'automation')

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id)
}
