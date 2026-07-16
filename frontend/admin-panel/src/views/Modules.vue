<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AUTOMATION_MODULES, getModule, type ModuleDef } from '../config/modules'
import { healthCheck, runModule, createModuleTask, analyzeZone, type HealthResult, type RunResult, type TaskRecord } from '../services/api'
import { addRun } from '../services/runs'
import { formatDate } from '../utils'
import {
  defaultPolygonBox,
  validatePolygon,
  buildPolygonParams,
  polygonCentroid,
  type LonLat,
} from '../utils'
import { Play, RefreshCw, CheckCircle2, XCircle, Loader2, Square } from 'lucide-vue-next'

const route = useRoute()

const selectedId = ref<string>(AUTOMATION_MODULES[0]?.id || 'optical')
const selected = computed<ModuleDef | undefined>(() => getModule(selectedId.value))

const health = reactive<Record<string, HealthResult>>({})
const lat = ref('13.0827')
const lon = ref('80.2707')
const time = ref('')
const provider = ref('')
const dataType = ref('')
const paramsText = ref('')
const running = ref(false)
const result = ref<RunResult | null>(null)
const runError = ref('')
const taskId = ref<string | null>(null)
const orchestratorResult = ref<any | null>(null)
const orchestratorError = ref('')

// --- Coordinate mode: a single point, or an N-point area polygon (4,5,6,…) ---
const coordMode = ref<'point' | 'polygon'>('point')
const polygon = reactive<LonLat[]>(defaultPolygonBox(80.2707, 13.0827))
const polygonError = ref('')

function addPolygonPoint() {
  const c = polygonCentroid(polygon)
  polygon.push({ lon: c.lon.toFixed(4), lat: c.lat.toFixed(4) })
}
function removePolygonPoint(i: number) {
  if (polygon.length > 3) polygon.splice(i, 1)
}
function resetPolygon() {
  const baseLon = coordMode.value === 'polygon' && polygon.length ? Number(polygon[0].lon) : Number(lon.value)
  const baseLat = coordMode.value === 'polygon' && polygon.length ? Number(polygon[0].lat) : Number(lat.value)
  polygon.splice(0, polygon.length, ...defaultPolygonBox(baseLon, baseLat))
}

// Build the request body for the current coordinate mode. Returns null on invalid
// input (sets polygonError / runError) so the caller can abort.
function buildBody(tier: string): { zone_id: string; params: Record<string, any> } | null {
  let params: Record<string, any> = {}
  if (paramsText.value.trim()) {
    try {
      params = JSON.parse(paramsText.value)
    } catch (e: any) {
      runError.value = 'params must be valid JSON: ' + e.message
      return null
    }
  }

  if (coordMode.value === 'polygon') {
    const err = validatePolygon(polygon)
    if (err) {
      polygonError.value = err
      runError.value = err
      return null
    }
    polygonError.value = ''
    Object.assign(params, buildPolygonParams(polygon))
    const c = polygonCentroid(polygon)
    return {
      zone_id: `${c.lat.toFixed(5)},${c.lon.toFixed(5)}`,
      params,
    }
  }

  polygonError.value = ''
  return {
    zone_id: `${lat.value},${lon.value}`,
    params,
  }
}

function selectModule(id: string) {
  selectedId.value = id
  const m = getModule(id)
  provider.value = m?.providers[0] || ''
  dataType.value = m?.dataTypes[0] || ''
  paramsText.value = id === 'hydrology' ? '{\n  "site_id": "01646500"\n}' : ''
}

async function refreshHealth(id: string) {
  const m = getModule(id)
  if (!m) return
  health[id] = await healthCheck(m)
}

const sampleZones = [
  { label: 'Chennai', lat: '13.0827', lon: '80.2707' },
  { label: 'New York', lat: '40.7128', lon: '-74.0060' },
  { label: 'London', lat: '51.5074', lon: '-0.1278' },
  { label: 'Sydney', lat: '-33.8688', lon: '151.2093' }
]

async function run() {
  const m = selected.value
  if (!m) return
  running.value = true
  runError.value = ''
  result.value = null
  const built = buildBody('free')
  if (!built) {
    running.value = false
    return
  }
  try {
    const body = {
      zone_id: built.zone_id,
      provider: provider.value || undefined,
      data_type: dataType.value || undefined,
      time: time.value || undefined,
      params: built.params
    }
    const res = await runModule(m, body)
    result.value = res
    addRun({
      id: res.run_id,
      moduleId: m.id,
      moduleName: m.name,
      zone: body.zone_id,
      provider: res.output?.provider || provider.value || '—',
      data_type: dataType.value || '—',
      status: res.status,
      error: res.error || null,
      started_at: res.started_at,
      finished_at: res.finished_at,
      summary: JSON.stringify(res.output).slice(0, 160),
      ts: Date.now(),
      polygon: coordMode.value === 'polygon' ? polygon.map((p) => [Number(p.lon), Number(p.lat)]) : null,
    })
  } catch (e: any) {
    runError.value = e?.response?.data?.detail || e?.message || 'Run failed'
  } finally {
    running.value = false
  }
}

async function runAsTask() {
  const m = selected.value
  if (!m) return
  running.value = true
  runError.value = ''
  result.value = null
  taskId.value = null
  const built = buildBody('free')
  if (!built) {
    running.value = false
    return
  }
  try {
    const body = {
      zone_id: built.zone_id,
      provider: provider.value || undefined,
      data_type: dataType.value || undefined,
      time: time.value || undefined,
      tier: 'free',
      params: built.params
    }
    const task: TaskRecord = await createModuleTask(m, body)
    taskId.value = task.task_id
    // Map the stored task back into the existing result display.
    result.value = {
      module: task.module,
      run_id: task.run_id || '',
      status: task.status,
      zone_id: task.zone_id || body.zone_id,
      output: task.output,
      error: task.error,
      started_at: task.started_at || '',
      finished_at: task.finished_at || ''
    }
    addRun({
      id: task.task_id,
      moduleId: m.id,
      moduleName: m.name,
      zone: body.zone_id,
      provider: task.output?.provider || provider.value || '—',
      data_type: dataType.value || '—',
      status: task.status,
      error: task.error || null,
      started_at: task.started_at || '',
      finished_at: task.finished_at || '',
      summary: JSON.stringify(task.output).slice(0, 160),
      ts: Date.now(),
      polygon: coordMode.value === 'polygon' ? polygon.map((p) => [Number(p.lon), Number(p.lat)]) : null,
    })
  } catch (e: any) {
    runError.value = e?.response?.data?.detail || e?.message || 'Task run failed'
  } finally {
    running.value = false
  }
}

async function runViaOrchestrator() {
  const m = selected.value
  if (!m) return
  running.value = true
  runError.value = ''
  orchestratorError.value = ''
  orchestratorResult.value = null
  const built = buildBody('free')
  if (!built) {
    running.value = false
    return
  }
  try {
    const body = {
      zone_id: built.zone_id,
      lat: coordMode.value === 'polygon' ? undefined : Number(lat.value),
      lon: coordMode.value === 'polygon' ? undefined : Number(lon.value),
      polygon: coordMode.value === 'polygon' ? polygon.map((p) => [Number(p.lon), Number(p.lat)]) : undefined,
      modules: [m.id],
      time: time.value || undefined,
      params: built.params,
    }
    const rec = await analyzeZone(body)
    orchestratorResult.value = rec
    addRun({
      id: rec.id,
      moduleId: m.id,
      moduleName: m.name,
      zone: body.zone_id,
      provider: rec.results?.[0]?.provider || '—',
      data_type: '—',
      status: rec.status,
      error: null,
      started_at: rec.results?.[0]?.started_at || '',
      finished_at: rec.results?.[0]?.finished_at || '',
      summary: JSON.stringify(rec.results?.[0]?.output || {}).slice(0, 160),
      ts: Date.now(),
      polygon: body.polygon,
    })
  } catch (e: any) {
    orchestratorError.value = e?.response?.data?.detail || e?.message || 'Orchestrator run failed'
  } finally {
    running.value = false
  }
}

const outputJson = computed(() => (result.value ? JSON.stringify(result.value.output, null, 2) : ''))

onMounted(async () => {
  const q = route.query.module as string | undefined
  if (q && getModule(q)) selectModule(q)
  else selectModule(selectedId.value)
  await Promise.all(AUTOMATION_MODULES.map((m) => refreshHealth(m.id)))
})

watch(() => route.query.module, (q) => {
  if (q && getModule(q as string)) selectModule(q as string)
})
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
    <!-- Module list -->
    <div class="space-y-2">
      <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Automation modules</h3>
      <button v-for="m in AUTOMATION_MODULES" :key="m.id"
        @click="selectModule(m.id)"
        class="w-full text-left rounded-xl border p-3 transition"
        :class="selectedId === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'">
        <div class="flex items-center justify-between">
          <span class="font-medium text-slate-800 text-sm">{{ m.name }}</span>
          <span v-if="health[m.id]?.ok" class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span v-else class="w-2 h-2 rounded-full bg-red-400"></span>
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5">{{ m.id }} · {{ m.live ? 'live' : 'prototype' }}</div>
      </button>
    </div>

    <!-- Run console -->
    <div v-if="selected" class="space-y-4">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-slate-800">{{ selected.name }}</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ selected.description }}</p>
          </div>
          <button @click="refreshHealth(selected.id)" class="text-xs text-brand-600 hover:underline">Health</button>
        </div>
        <div class="mt-3">
          <span v-if="health[selected.id]?.ok" class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 class="w-4 h-4" /> online
          </span>
          <span v-else class="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <XCircle class="w-4 h-4" /> offline (start the service)
          </span>
          <span class="text-[11px] text-slate-400 ml-2">{{ selected.baseUrl }}</span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Run job</h4>

        <!-- Coordinate mode: single point OR N-point area polygon (4,5,6,…) -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-slate-500">Area:</span>
          <div class="inline-flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button type="button" @click="coordMode = 'point'"
              :class="coordMode === 'point' ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'"
              class="px-3 py-1.5">Point</button>
            <button type="button" @click="coordMode = 'polygon'"
              :class="coordMode === 'polygon' ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'"
              class="px-3 py-1.5 flex items-center gap-1">
              <Square class="w-3.5 h-3.5" /> Polygon
            </button>
          </div>
        </div>

        <!-- Point mode -->
        <div v-if="coordMode === 'point'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-1">Latitude</label>
            <input v-model="lat" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Longitude</label>
            <input v-model="lon" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
        </div>
        <div v-if="coordMode === 'point'" class="flex flex-wrap gap-1.5 mt-2">
          <button v-for="z in sampleZones" :key="z.label" @click="lat = z.lat; lon = z.lon"
            class="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">{{ z.label }}</button>
        </div>

        <!-- Polygon mode -->
        <div v-else class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs text-slate-500">
              Area ring — {{ polygon.length }} point(s). Each row is
              <span class="font-mono">[lon, lat]</span>. 4–6 points typical.
            </p>
            <div class="flex gap-1.5">
              <button type="button" @click="addPolygonPoint"
                class="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">+ Point</button>
              <button type="button" @click="resetPolygon"
                class="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">Reset box</button>
            </div>
          </div>
          <div class="space-y-1.5">
            <div v-for="(p, i) in polygon" :key="i" class="flex items-center gap-2">
              <span class="w-6 text-[11px] text-slate-400 text-right">{{ i + 1 }}</span>
              <input v-model="p.lon" placeholder="lon" class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-mono" />
              <input v-model="p.lat" placeholder="lat" class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-mono" />
              <button type="button" @click="removePolygonPoint(i)" :disabled="polygon.length <= 3"
                class="px-2 py-1.5 rounded-md border border-slate-200 text-red-500 hover:bg-red-50 disabled:opacity-40">✕</button>
            </div>
          </div>
          <p v-if="polygonError" class="text-xs text-red-600">{{ polygonError }}</p>
        </div>
        <div class="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label class="block text-xs text-slate-500 mb-1">Provider</label>
            <select v-model="provider" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option v-for="p in selected.providers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Data type</label>
            <select v-model="dataType" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option v-for="d in selected.dataTypes" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Time (optional)</label>
            <input v-model="time" placeholder="YYYY-MM-DD" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-xs text-slate-500 mb-1">Params (JSON, optional)</label>
          <textarea v-model="paramsText" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"></textarea>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button @click="run" :disabled="running"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-60">
            <Loader2 v-if="running" class="w-4 h-4 animate-spin" />
            <Play v-else class="w-4 h-4" />
            {{ running ? 'Running…' : 'Run module' }}
          </button>
          <button @click="runAsTask" :disabled="running"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-500 text-brand-600 hover:bg-brand-50 text-sm font-semibold disabled:opacity-60">
            <Loader2 v-if="running" class="w-4 h-4 animate-spin" />
            <Play v-else class="w-4 h-4" />
            {{ running ? 'Running…' : 'Run as task' }}
          </button>
          <button @click="runViaOrchestrator" :disabled="running"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold disabled:opacity-60">
            <Loader2 v-if="running" class="w-4 h-4 animate-spin" />
            <Play v-else class="w-4 h-4" />
            {{ running ? 'Running…' : 'Run via orchestrator' }}
          </button>
        </div>
        <p v-if="runError" class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ runError }}</p>
        <p v-if="orchestratorError" class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ orchestratorError }}</p>
      </div>

      <div v-if="result" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-slate-700">Result</h4>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="result.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
            {{ result.status }}
          </span>
        </div>
        <div class="text-xs text-slate-400 mb-2">
          run_id {{ result.run_id.slice(0, 10) }} · {{ result.started_at }} → {{ result.finished_at }}
          <span v-if="taskId" class="ml-2 text-brand-600">task_id {{ taskId.slice(0, 10) }} (stored)</span>
        </div>
        <pre class="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-96">{{ outputJson }}</pre>
      </div>

      <div v-if="orchestratorResult" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-slate-700">Orchestrator Result</h4>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="orchestratorResult.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
            {{ orchestratorResult.status }}
          </span>
        </div>
        <div class="text-xs text-slate-400 mb-2">
          analysis_id {{ orchestratorResult.id?.slice(0, 10) }} · {{ orchestratorResult.created_at }}
        </div>
        <pre class="text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-96">{{ JSON.stringify(orchestratorResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
