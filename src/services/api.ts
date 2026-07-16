import axios, { AxiosInstance } from 'axios'
import { getAuthToken, requireAuth } from './firebase'
import type { ModuleDef } from '../config/modules'

// Admin console client for the 8 Land Scanner modules.
//
// Automation modules expose GET /healthz and POST /run. The `publishing`
// delivery service exposes GET /health. No monolithic backend is required —
// the console talks to each module service directly.

function clientFor(module: ModuleDef): AxiosInstance {
  const c = axios.create({
    baseURL: module.baseUrl,
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  })
  c.interceptors.request.use(async (config) => {
    if (requireAuth) {
      const token = await getAuthToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  return c
}

export interface HealthResult {
  ok: boolean
  data: any
  error?: string
}

export async function healthCheck(module: ModuleDef): Promise<HealthResult> {
  const path = module.kind === 'delivery' ? '/health' : '/healthz'
  try {
    const res = await clientFor(module).get(path)
    return { ok: true, data: res.data }
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message || 'unreachable' }
  }
}

export interface RunBody {
  task_id?: string
  zone_id: string
  time?: string
  provider?: string
  data_type?: string
  params?: Record<string, any>
}

export interface RunResult {
  task_id?: string | null
  module: string
  run_id: string
  status: string
  zone_id: string
  output: any
  error?: string | null
  started_at: string
  finished_at: string
}

export async function runModule(module: ModuleDef, body: RunBody): Promise<RunResult> {
  const res = await clientFor(module).post('/run', body)
  return res.data
}

// ---------------------------------------------------------------------------
// Admin task workflow: admin sets a task -> module auto-runs -> result stored.
// Module-1 exposes POST /tasks (create + auto-run + persist) and
// GET /tasks/{task_id} (read back the stored result).
// ---------------------------------------------------------------------------

export interface TaskRecord {
  task_id: string
  module: string
  status: string
  zone_id?: string | null
  time?: string | null
  provider?: string | null
  data_type?: string | null
  tier?: string | null
  params?: Record<string, any>
  run_id?: string | null
  output: any
  error?: string | null
  created_at?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export type TaskBody = RunBody & { tier?: string; task_id?: string }

export async function createModuleTask(module: ModuleDef, body: TaskBody): Promise<TaskRecord> {
  const res = await clientFor(module).post('/tasks', body)
  return res.data
}

export async function getModuleTask(module: ModuleDef, taskId: string): Promise<TaskRecord> {
  const res = await clientFor(module).get(`/tasks/${taskId}`)
  return res.data
}

// ---------------------------------------------------------------------------
// Admin backend (orchestrator + admin DB). This is the canonical path: the
// admin panel triggers an analysis through admin-backend, which fans out to
// modules and persists the result in Postgres/SQLite.
// ---------------------------------------------------------------------------

const adminBackendBaseUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:8080'

export const adminApi = axios.create({
  baseURL: adminBackendBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000
})

adminApi.interceptors.request.use(async (config) => {
  if (requireAuth) {
    const token = await getAuthToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface AnalyzeBody {
  zone_id?: string
  lat?: number
  lon?: number
  polygon?: number[][]  // [[lon,lat],...]  v2 drawn border (3+ pts)
  version?: 'v1' | 'v2'   // v1 (point) | v2 (border) — SEPARATE AOIs
  tier?: string
  user_id?: string
  modules?: string[]
  time?: string
  params?: Record<string, any>
  correlation_id?: string
  task_template_id?: string
}

export interface AnalysisRecord {
  id: string
  zone_id?: string | null
  lat?: number | null
  lon?: number | null
  polygon?: number[][] | null
  correlation_id?: string | null
  created_at: string
  status: string
  modules: string[]
  results: Array<{
    module: string
    status: string
    provider?: string | null
    output: any
    error?: string | null
    started_at?: string | null
    finished_at?: string | null
    run_id?: string | null
    image_urls?: string[]
  }>
  data?: Record<string, any>
  storage_refs?: Record<string, any>
}

export async function analyzeZone(body: AnalyzeBody): Promise<AnalysisRecord> {
  const res = await adminApi.post('/api/v1/analyze', body)
  return res.data
}

// Push a generated (tier-limited) extract to pullpush, which writes it into
// the existing Firebase P2 (user DB) Firestore for the web-user to read.
export interface PushDeliveredBody {
  zone_id: string
  version?: 'v1' | 'v2'
  tier?: string
  user_id?: string | null
  analysis_id?: string
  status?: string
  modules?: string[]
  image_urls?: string[]
  data?: Record<string, any>
}

export async function pushDelivered(body: PushDeliveredBody): Promise<{ status: string }> {
  const res = await publishingApi.post('/api/v1/delivery/push', body)
  return res.data
}

export async function listAnalyses(limit = 50): Promise<AnalysisRecord[]> {
  const res = await adminApi.get('/api/v1/analyses', { params: { limit } })
  return res.data?.data || []
}

export async function getAnalysis(id: string): Promise<AnalysisRecord> {
  const res = await adminApi.get(`/api/v1/analyses/${id}`)
  return res.data
}

// ---------------------------------------------------------------------------
// Publishing backend (P1 delivery service): user zone requests + Autopilot.
// ---------------------------------------------------------------------------

const publishingBaseUrl = import.meta.env.VITE_MODULE_PUBLISHING_URL || 'http://localhost:8000'

export const publishingApi = axios.create({
  baseURL: publishingBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000
})

publishingApi.interceptors.request.use(async (config) => {
  if (requireAuth) {
    const token = await getAuthToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface ZoneRequest {
  request_id: string
  user_id: string
  status: string
  quality?: string
  notes?: string
  zone_id?: string
  admin_notes?: string
  coordinates?: { latitude: number; longitude: number; altitude: number }
  created_at?: any
}

export async function getAutopilot(): Promise<{ enabled: boolean }> {
  const res = await publishingApi.get('/api/v1/admin/autopilot')
  return res.data
}

export async function setAutopilot(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await publishingApi.post('/api/v1/admin/autopilot', { enabled })
  return res.data
}

export async function getZoneRequests(): Promise<ZoneRequest[]> {
  const res = await publishingApi.get('/api/v1/admin/zone-requests')
  return res.data?.data || []
}

// ---------------------------------------------------------------------------
// Admin Task Management operates over the orchestrated analyses store in
// admin-backend (the same store Module-1 feeds). Re-run re-submits the analysis;
// delete removes the stored record.
// ---------------------------------------------------------------------------

export async function asList(r: any, key = 'data'): any[] {
  const body = r?.data ?? r
  const val = body?.[key]
  return Array.isArray(val) ? val : []
}

export async function rerunAnalysis(payload: Record<string, any>) {
  const res = await adminApi.post('/api/v1/analyze', payload)
  return res.data
}

export async function deleteAnalysis(id: string) {
  const res = await adminApi.delete(`/api/v1/analyses/${id}`)
  return res.data
}

export default { healthCheck, runModule, getAutopilot, setAutopilot, getZoneRequests }
