export function badgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-red-100 text-red-700',
    online: 'bg-emerald-100 text-emerald-700',
    offline: 'bg-red-100 text-red-700',
    degraded: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    planned: 'bg-slate-100 text-slate-500',
    unknown: 'bg-slate-100 text-slate-500'
  }
  return map[status] || 'bg-slate-100 text-slate-600'
}

export function formatDate(value: any): string {
  if (!value) return '—'
  // Firestore DatetimeWithNanoseconds
  if (typeof value.toDate === 'function') return value.toDate().toLocaleString()
  // Firestore serialized {seconds, nanoseconds}
  if (value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toLocaleString()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toLocaleString()
  }
  return String(value)
}

// ---------------------------------------------------------------------------
// Polygon (admin/task) coordinates.
//
// The optical module accepts an arbitrary area as a ring of [lon, lat] vertices
// (4, 5, 6, … points) — not just a single point. These helpers build and
// validate that ring for the Run / Run-as-task console.
// ---------------------------------------------------------------------------

export interface LonLat {
  lon: string
  lat: string
}

export const MIN_POLYGON_POINTS = 3

/** A default 4-point box around a center (lon, lat) for quick area tasks. */
export function defaultPolygonBox(centerLon: number, centerLat: number, span = 0.1): LonLat[] {
  const h = span / 2
  return [
    { lon: String(centerLon - h), lat: String(centerLat - h) },
    { lon: String(centerLon + h), lat: String(centerLat - h) },
    { lon: String(centerLon + h), lat: String(centerLat + h) },
    { lon: String(centerLon - h), lat: String(centerLat + h) },
  ]
}

/** Validate a [lon, lat] vertex ring; returns an error string or null. */
export function validatePolygon(points: LonLat[]): string | null {
  if (points.length < MIN_POLYGON_POINTS) {
    return `Area needs at least ${MIN_POLYGON_POINTS} points (4-6 are typical).`
  }
  for (let i = 0; i < points.length; i++) {
    const lon = Number(points[i].lon)
    const lat = Number(points[i].lat)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return `Point ${i + 1} must be numeric coordinates.`
    }
    if (lon < -180 || lon > 180) return `Point ${i + 1} longitude out of range [-180, 180].`
    if (lat < -90 || lat > 90) return `Point ${i + 1} latitude out of range [-90, 90].`
  }
  return null
}

/** Build the params.polygon ring ([[lon, lat], ...]) the backend expects. */
export function buildPolygonParams(points: LonLat[]): { polygon: number[][] } {
  return { polygon: points.map((p) => [Number(p.lon), Number(p.lat)]) }
}

/** Area-weighted centroid (lon, lat) — used to label an area task. */
export function polygonCentroid(points: LonLat[]): { lon: number; lat: number } {
  const ring = points.map((p) => [Number(p.lon), Number(p.lat)])
  if (ring.length === 0) return { lon: 0, lat: 0 }
  let area2 = 0, cx = 0, cy = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[(i + 1) % ring.length]
    const cross = x0 * y1 - x1 * y0
    area2 += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  if (area2 === 0) {
    const n = ring.length
    return {
      lon: ring.reduce((s, p) => s + p[0], 0) / n,
      lat: ring.reduce((s, p) => s + p[1], 0) / n,
    }
  }
  area2 *= 0.5
  return { lon: cx / (6 * area2), lat: cy / (6 * area2) }
}

