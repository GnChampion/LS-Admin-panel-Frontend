<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getAutopilot, setAutopilot, getZoneRequests, type ZoneRequest } from '../services/api'
import { RefreshCw, Power, CheckCircle2, Clock, XCircle, Zap } from 'lucide-vue-next'

const autopilot = ref(false)
const requests = ref<ZoneRequest[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
let timer: any = null

async function refresh() {
  error.value = ''
  try {
    const [ap, reqs] = await Promise.all([getAutopilot(), getZoneRequests()])
    autopilot.value = ap.enabled
    requests.value = reqs
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load zone requests'
  } finally {
    loading.value = false
  }
}

async function toggleAutopilot() {
  saving.value = true
  error.value = ''
  try {
    const next = !autopilot.value
    const res = await setAutopilot(next)
    autopilot.value = res.enabled
    // Re-fetch the request list: enabling autopilot queues existing pending ones.
    await refresh()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to update Autopilot'
  } finally {
    saving.value = false
  }
}

const pendingCount = computed(() => requests.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => requests.value.filter((r) => r.status === 'approved').length)

function fmtCoord(r: ZoneRequest): string {
  // New spec: v1 point
  if (r.v1) return `${r.v1.lat.toFixed(4)}, ${r.v1.lon.toFixed(4)}`
  // Legacy spec: coordinates object
  const c = r.coordinates
  if (!c) return '—'
  return `${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}`
}

function statusBadge(status: string) {
  if (status === 'approved') return { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
  if (status === 'rejected') return { cls: 'bg-red-100 text-red-700', icon: XCircle }
  return { cls: 'bg-amber-100 text-amber-700', icon: Clock }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 10000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<template>
  <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{{ error }}</div>

  <!-- Autopilot control -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center"
        :class="autopilot ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'">
        <Zap class="w-5 h-5" />
      </div>
      <div>
        <div class="font-semibold text-slate-800">Autopilot Mode</div>
        <div class="text-xs text-slate-400">
          {{ autopilot
            ? 'All new zone requests are auto-approved and processed without admin clearance.'
            : 'Requests wait for manual admin approval.' }}
        </div>
      </div>
    </div>
    <button
      @click="toggleAutopilot"
      :disabled="saving"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60"
      :class="autopilot ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
      <Power class="w-4 h-4" />
      {{ saving ? 'Saving…' : (autopilot ? 'Enabled' : 'Disabled') }}
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-slate-800">{{ requests.length }}</div>
      <div class="text-xs text-slate-400 mt-1">Total requests</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-amber-600">{{ pendingCount }}</div>
      <div class="text-xs text-slate-400 mt-1">Pending</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-emerald-600">{{ approvedCount }}</div>
      <div class="text-xs text-slate-400 mt-1">Approved</div>
    </div>
  </div>

  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-slate-700">Zone Requests</h3>
    <button @click="refresh" class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
      <RefreshCw class="w-3 h-3" /> Refresh
    </button>
  </div>

  <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

  <div v-else-if="requests.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-sm text-slate-400">
    No zone requests yet.
  </div>

  <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
        <tr>
          <th class="text-left font-medium px-4 py-3">User</th>
          <th class="text-left font-medium px-4 py-3">Coordinates</th>
          <th class="text-left font-medium px-4 py-3">AOI</th>
          <th class="text-left font-medium px-4 py-3">Quality</th>
          <th class="text-left font-medium px-4 py-3">Status</th>
          <th class="text-left font-medium px-4 py-3">Zone</th>
          <th class="text-left font-medium px-4 py-3">Notes</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="r in requests" :key="r.request_id" class="hover:bg-slate-50">
          <td class="px-4 py-3 text-slate-700 font-mono text-xs">{{ r.user_id }}</td>
          <td class="px-4 py-3 text-slate-600 text-xs">{{ fmtCoord(r) }}</td>
          <td class="px-4 py-3 text-xs">
            <span v-if="r.v1" class="mr-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">v1</span>
            <span v-if="r.v2" class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">v2</span>
            <span v-if="!r.v1 && !r.v2" class="text-slate-400">legacy</span>
          </td>
          <td class="px-4 py-3 text-slate-600">{{ r.quality || '—' }}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              :class="statusBadge(r.status).cls">
              <component :is="statusBadge(r.status).icon" class="w-3 h-3" /> {{ r.status }}
            </span>
          </td>
          <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ r.zone_id || '—' }}</td>
          <td class="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{{ r.notes || r.admin_notes || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
