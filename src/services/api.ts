import axios, { AxiosInstance } from 'axios'
import { getAuthToken, requireAuth } from './firebase'
import type { ModuleDef } from '../config/modules'

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
// Admin backend (orchestrator + admin DB)
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
  polygon?: number[][]
  version?: 'v1' | 'v2'
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
  version?: string | null
  task_id?: string | null
  user_id?: string | null
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
    quality_score?: number | null
  }>
  data?: Record<string, any>
  storage_refs?: Record<string, any>
}

export async function analyzeZone(body: AnalyzeBody): Promise<AnalysisRecord> {
  const res = await adminApi.post('/api/v1/analyze', body)
  return res.data
}

export interface PushDeliveredBody {
  zone_id: string
  module: string
  task_id?: string | null
  user_id?: string | null
  quality_score?: number | null
  attempt_number?: number
  delivery_1?: Record<string, any> | null
  delivery_2?: Record<string, any> | null
}

// ---------------------------------------------------------------------------
// Publishing backend (P1 delivery service)
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

export interface ZoneRequest {
  request_id: string
  user_id: string
  status: string
  quality?: string
  notes?: string
  zone_id?: string
  admin_notes?: string
  v1?: { lat: number; lon: number } | null
  v2?: { coordinates: number[][] } | null
  coordinates?: { latitude: number; longitude: number; altitude: number }
  created_at?: any
}

export async function getAutopilot(): Promise<{ enabled: boolean }> {
  const res = await publishingApi.get('/api/v1/admin/autopilot')
  return { enabled: res.data?.enabled ?? res.data?.data?.enabled ?? false }
}

export async function setAutopilot(enabled: boolean): Promise<{ enabled: boolean }> {
  const res = await publishingApi.post('/api/v1/admin/autopilot', { enabled })
  return { enabled: res.data?.enabled ?? res.data?.data?.enabled ?? enabled }
}

export async function getZoneRequests(): Promise<ZoneRequest[]> {
  const res = await publishingApi.get('/api/v1/admin/zone-requests')
  return res.data?.data || []
}

export function asList(r: any, key = 'data'): any[] {
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

// ---------------------------------------------------------------------------
// Tier management — publishing backend, P1 Firestore tiers/
// Schema matches backend TierCreate/TierUpdate and FirebaseService.list_tiers()
// ---------------------------------------------------------------------------

export interface TierLimits {
  max_zones?: number
  max_versions_per_zone?: number
  allowed_modules?: string[]
  max_resolution?: 'low' | 'medium' | 'high'
  v2_access?: boolean
  max_tasks_per_day?: number
}

export interface Tier {
  tier_id: string
  tier_name: string
  description?: string
  tier_level: 'free' | 'standard' | 'pro' | 'enterprise'
  status: 'active' | 'inactive'
  stripe_price_id?: string | null
  limits?: TierLimits
}

export async function listTiers(): Promise<Tier[]> {
  const res = await publishingApi.get('/api/v1/tiers')
  return res.data?.data || []
}

export async function createTier(data: Tier): Promise<{ tier_id: string }> {
  // Backend TierCreate uses tier_name, description, tier_level, status, features
  // We store limits inside features for now until backend adds limits field
  const payload = {
    tier_id: data.tier_id,
    tier_name: data.tier_name,
    description: data.description || '',
    tier_level: data.tier_level,
    status: data.status,
    stripe_price_id: data.stripe_price_id || null,
    features: data.limits || {},
    limits: data.limits || {},
  }
  const res = await publishingApi.post('/api/v1/tiers', payload)
  return res.data
}

export async function updateTier(tierId: string, data: Partial<Tier>): Promise<void> {
  const payload: Record<string, any> = {}
  if (data.tier_name !== undefined) payload.tier_name = data.tier_name
  if (data.description !== undefined) payload.description = data.description
  if (data.tier_level !== undefined) payload.tier_level = data.tier_level
  if (data.status !== undefined) payload.status = data.status
  if (data.stripe_price_id !== undefined) payload.stripe_price_id = data.stripe_price_id
  if (data.limits !== undefined) { payload.features = data.limits; payload.limits = data.limits }
  await publishingApi.put(`/api/v1/tiers/${tierId}`, payload)
}

export async function deleteTier(tierId: string): Promise<void> {
  await publishingApi.delete(`/api/v1/tiers/${tierId}`)
}

// ---------------------------------------------------------------------------
// Task management — publishing backend, P1 Firestore tasks/
// ---------------------------------------------------------------------------

export interface FirestoreTask {
  id?: string
  task_id?: string
  zone_id: string
  user_id?: string
  module: string
  status: string
  attempt_number?: number
  quality_score?: number | null
  next_retry_at?: string | null
  error_reason?: string | null
  created_at?: any
  requirement?: { aoi_version: string; output_type: string; resolution: string }
  adjustment?: Record<string, any> | null
}

export async function listTasks(limit = 100): Promise<FirestoreTask[]> {
  const res = await publishingApi.get('/api/v1/tasks', { params: { limit } })
  return res.data?.data || []
}

// Cancel a scheduled retry — deletes the scheduled_retries doc, does NOT delete the task
export async function cancelScheduledRetry(taskId: string): Promise<void> {
  await publishingApi.delete(`/api/v1/tasks/${taskId}/retry`)
}

// Manually re-trigger a task by re-running analysis via admin-backend
export async function retriggerTask(task: FirestoreTask): Promise<void> {
  await adminApi.post('/api/v1/analyze', {
    zone_id: task.zone_id,
    modules: [task.module],
    params: {
      task_id: task.id || task.task_id,
      attempt_number: (task.attempt_number || 1),
    },
  })
}

// ---------------------------------------------------------------------------
// Zone management — publishing backend, P1 Firestore zones/
// ---------------------------------------------------------------------------

export async function listAdminZones(limit = 100): Promise<any[]> {
  const res = await publishingApi.get('/api/v1/admin/zones', { params: { limit } })
  return res.data?.data || []
}

export async function setZoneStatus(zoneId: string, status: 'active' | 'blocked', blockReason?: string | null): Promise<void> {
  await publishingApi.patch(`/api/v1/admin/zones/${zoneId}/status`, {
    status,
    block_reason: blockReason ?? null,
  })
}

export async function listZoneTasks(zoneId: string, limit = 50): Promise<FirestoreTask[]> {
  const res = await publishingApi.get('/api/v1/tasks', { params: { limit } })
  const all: FirestoreTask[]= res.data?.data || []
  return all.filter(t => t.zone_id === zoneId)
}

export async function retryTask(taskId: string): Promise<any> {
  const res = await publishingApi.post(`/api/v1/tasks/${taskId}/retry`)
  return res.data
}

// ---------------------------------------------------------------------------
// User management — publishing backend, P2 Firebase Auth + Firestore
// ---------------------------------------------------------------------------

export interface UserRow {
  user_id: string
  email?: string
  display_name?: string
  tier_id?: string
  subscription_status?: string
  created_at?: number
  disabled?: boolean
}

export async function listUsers(limit = 100): Promise<UserRow[]> {
  const res = await publishingApi.get('/api/v1/users', { params: { limit } })
  return res.data?.data || []
}

export async function adminAssignTier(userId: string, tierId: string): Promise<void> {
  await publishingApi.post(`/api/v1/admin/users/${userId}/tier`, { tier_id: tierId })
}

export default { healthCheck, runModule, getAutopilot, setAutopilot, getZoneRequests }
