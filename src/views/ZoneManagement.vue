<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { listAdminZones, setZoneStatus, listZoneTasks, type FirestoreTask } from '../services/api'

interface Zone {
  id?: string
  zone_id?: string
  user_id: string
  status: string
  block_reason?: string
  confirmed_v1?: { lat: number; lon: number } | null
  confirmed_v2?: { coordinates: number[][] } | null
  created_at?: any
}

const zones = ref<Zone[]>([])
const loading = ref(false)
const error = ref('')
const blockReason = ref('')
const blockingId = ref<string | null>(null)
const filterStatus = ref('')
const filterUser = ref('')
const zoneTasks = ref<FirestoreTask[]>([])
const viewingTasksFor = ref<string | null>(null)
const tasksLoading = ref(false)

const filtered = computed(() => {
  return zones.value.filter(z => {
    if (filterStatus.value && z.status !== filterStatus.value) return false
    if (filterUser.value && !z.user_id.toLowerCase().includes(filterUser.value.toLowerCase())) return false
    return true
  })
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    zones.value = await listAdminZones()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load zones'
  } finally {
    loading.value = false
  }
}

async function blockZone(zoneId: string) {
  if (!blockReason.value.trim()) { error.value = 'Enter a block reason'; return }
  loading.value = true
  try {
    await setZoneStatus(zoneId, 'blocked', blockReason.value)
    blockingId.value = null
    blockReason.value = ''
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Block failed'
  } finally {
    loading.value = false
  }
}

async function unblockZone(zoneId: string) {
  loading.value = true
  try {
    await setZoneStatus(zoneId, 'active', null)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Unblock failed'
  } finally {
    loading.value = false
  }
}

async function viewTasks(zoneId: string) {
  if (viewingTasksFor.value === zoneId) {
    viewingTasksFor.value = null
    zoneTasks.value = []
    return
  }
  viewingTasksFor.value = zoneId
  tasksLoading.value = true
  try {
    zoneTasks.value = await listZoneTasks(zoneId)
  } catch (e: any) {
    error.value = e?.message || 'Failed to load tasks'
  } finally {
    tasksLoading.value = false
  }
}

function zoneId(z: Zone) { return z.id || z.zone_id || '' }

function mapsUrl(z: Zone) {
  const v1 = z.confirmed_v1
  if (v1) return `https://maps.google.com/?q=${v1.lat},${v1.lon}`
  return null
}

let timer: any = null

onMounted(() => {
  load()
  timer = setInterval(load, 20000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-slate-800">Zone Management</h3>
        <p class="text-sm text-slate-500 mt-0.5">View, block, and unblock zones</p>
      </div>
      <button @click="load" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
        ↻ Refresh
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <select v-model="filterStatus" class="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
        <option value="">All statuses</option>
        <option value="active">active</option>
        <option value="blocked">blocked</option>
        <option value="pending_edit">pending_edit</option>
      </select>
      <input v-model="filterUser" placeholder="Filter by user ID…"
        class="px-3 py-2 text-sm border border-slate-300 rounded-lg w-56" />
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{{ error }}</p>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading && !zones.length" class="p-8 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!filtered.length" class="p-8 text-center text-slate-400 text-sm">No zones found.</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone ID</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">AOI</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-for="z in filtered" :key="zoneId(z)">
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-mono text-xs text-slate-600">{{ zoneId(z) }}</td>
              <td class="px-4 py-3 text-xs text-slate-500 truncate max-w-[140px]">{{ z.user_id }}</td>
              <td class="px-4 py-3 text-xs text-slate-500">
                <span v-if="z.confirmed_v1" class="mr-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">v1</span>
                <span v-if="z.confirmed_v2" class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">v2</span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="{
                    'bg-green-100 text-green-700': z.status === 'active',
                    'bg-red-100 text-red-700': z.status === 'blocked',
                    'bg-yellow-100 text-yellow-700': z.status === 'pending_edit',
                  }">
                  {{ z.status }}
                </span>
                <span v-if="z.block_reason" class="ml-2 text-xs text-slate-400">{{ z.block_reason }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2 justify-end items-center">
                  <a v-if="mapsUrl(z)" :href="mapsUrl(z)!" target="_blank"
                    class="text-xs text-brand-600 hover:underline">Map</a>
                  <button @click="viewTasks(zoneId(z))"
                    class="text-xs text-slate-600 hover:underline">
                    {{ viewingTasksFor === zoneId(z) ? 'Hide Tasks' : 'Tasks' }}
                  </button>
                  <template v-if="z.status !== 'blocked'">
                    <template v-if="blockingId === zoneId(z)">
                      <input v-model="blockReason" placeholder="Reason…"
                        class="text-xs px-2 py-1 border border-slate-300 rounded w-32" />
                      <button @click="blockZone(zoneId(z))"
                        class="text-xs text-red-600 hover:underline">Confirm</button>
                      <button @click="blockingId = null"
                        class="text-xs text-slate-400 hover:underline">Cancel</button>
                    </template>
                    <button v-else @click="blockingId = zoneId(z); blockReason = ''"
                      class="text-xs text-red-500 hover:underline">Block</button>
                  </template>
                  <button v-else @click="unblockZone(zoneId(z))"
                    class="text-xs text-green-600 hover:underline">Unblock</button>
                </div>
              </td>
            </tr>
            <!-- Tasks sub-row -->
            <tr v-if="viewingTasksFor === zoneId(z)" class="bg-slate-50">
              <td colspan="5" class="px-6 py-3">
                <div v-if="tasksLoading" class="text-xs text-slate-400">Loading tasks…</div>
                <div v-else-if="!zoneTasks.length" class="text-xs text-slate-400">No tasks for this zone.</div>
                <div v-else class="space-y-1">
                  <div v-for="t in zoneTasks" :key="t.id || t.task_id"
                    class="flex items-center gap-3 text-xs text-slate-600">
                    <span class="font-mono">{{ t.id || t.task_id }}</span>
                    <span>{{ t.module }}</span>
                    <span class="px-1.5 py-0.5 rounded-full text-[11px] font-semibold"
                      :class="{
                        'bg-green-100 text-green-700': t.status === 'done_exact',
                        'bg-yellow-100 text-yellow-700': t.status === 'done_partial',
                        'bg-blue-100 text-blue-700': ['running','retry_running'].includes(t.status),
                        'bg-red-100 text-red-700': t.status === 'failed',
                        'bg-slate-100 text-slate-600': !['done_exact','done_partial','running','retry_running','failed'].includes(t.status),
                      }">{{ t.status }}</span>
                    <span v-if="t.quality_score != null">{{ (t.quality_score * 100).toFixed(0) }}%</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
