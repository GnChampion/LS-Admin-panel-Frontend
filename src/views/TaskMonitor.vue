<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { listTasks, cancelScheduledRetry, retriggerTask, type FirestoreTask } from '../services/api'

const tasks = ref<FirestoreTask[]>([])
const loading = ref(false)
const error = ref('')
const detail = ref<FirestoreTask | null>(null)
let timer: any = null

const STATUS_CLASS: Record<string, string> = {
  pending:               'bg-slate-100 text-slate-600',
  running:               'bg-blue-100 text-blue-700',
  done_exact:            'bg-green-100 text-green-700',
  done_partial:          'bg-yellow-100 text-yellow-700',
  adjusted:              'bg-orange-100 text-orange-700',
  retry_running:         'bg-blue-100 text-blue-700',
  permanently_adjusted:  'bg-orange-100 text-orange-800',
  failed:                'bg-red-100 text-red-700',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await listTasks(100)
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

async function cancelRetry(taskId: string) {
  loading.value = true
  try {
    // Cancels the scheduled_retries entry — does NOT delete the task record
    await cancelScheduledRetry(taskId)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Cancel failed'
  } finally {
    loading.value = false
  }
}

async function retrigger(task: FirestoreTask) {
  loading.value = true
  try {
    await retriggerTask(task)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Re-trigger failed'
  } finally {
    loading.value = false
  }
}

function taskId(t: FirestoreTask) { return t.id || t.task_id || '' }

function fmtDate(v: any) {
  if (!v) return '—'
  try { return new Date(typeof v === 'string' ? v : v.seconds * 1000).toLocaleString() }
  catch { return String(v) }
}

onMounted(() => {
  load()
  timer = setInterval(load, 15000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-800">Task Monitor</h3>
        <p class="text-sm text-slate-500 mt-0.5">All tasks, status, retry state</p>
      </div>
      <button @click="load" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
        ↻ Refresh
      </button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{{ error }}</p>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading && !tasks.length" class="p-8 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!tasks.length" class="p-8 text-center text-slate-400 text-sm">No tasks found.</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Retry</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="t in tasks" :key="taskId(t)" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="font-mono text-xs text-slate-600">{{ taskId(t) }}</div>
              <div class="text-xs text-slate-400">zone: {{ t.zone_id }}</div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-600">{{ t.module }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="STATUS_CLASS[t.status] || 'bg-slate-100 text-slate-600'">
                {{ t.status }}
              </span>
              <span v-if="t.status === 'permanently_adjusted'" class="ml-1 text-xs text-orange-600">Final</span>
              <div v-if="t.error_reason" class="text-xs text-red-500 mt-0.5">{{ t.error_reason }}</div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-600">
              {{ t.quality_score != null ? (t.quality_score * 100).toFixed(0) + '%' : '—' }}
              <span v-if="t.attempt_number" class="text-slate-400 ml-1">#{{ t.attempt_number }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">{{ fmtDate(t.next_retry_at) }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2 justify-end">
                <button @click="detail = detail && taskId(detail) === taskId(t) ? null : t"
                  class="text-xs text-brand-600 hover:underline">Detail</button>
                <button @click="retrigger(t)"
                  class="text-xs text-blue-600 hover:underline">Re-trigger</button>
                <button v-if="['adjusted', 'retry_running'].includes(t.status)"
                  @click="cancelRetry(taskId(t))"
                  class="text-xs text-red-500 hover:underline">Cancel Retry</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail panel -->
    <div v-if="detail" class="mt-4 bg-white rounded-xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-slate-800 text-sm">Task Detail — {{ taskId(detail) }}</h4>
        <button @click="detail = null" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div><span class="text-slate-400">Zone:</span> {{ detail.zone_id }}</div>
        <div><span class="text-slate-400">Module:</span> {{ detail.module }}</div>
        <div><span class="text-slate-400">AOI version:</span> {{ detail.requirement?.aoi_version || '—' }}</div>
        <div><span class="text-slate-400">Resolution:</span> {{ detail.requirement?.resolution || '—' }}</div>
        <div><span class="text-slate-400">Output type:</span> {{ detail.requirement?.output_type || '—' }}</div>
        <div><span class="text-slate-400">Created:</span> {{ fmtDate(detail.created_at) }}</div>
      </div>
      <div v-if="detail.adjustment" class="mt-3 p-3 bg-orange-50 rounded-lg text-xs text-orange-800">
        <p class="font-semibold mb-1">Adjustment</p>
        <p>Provider: {{ (detail.adjustment as any).provider_used }}</p>
        <p>Resolution: {{ (detail.adjustment as any).resolution_used }}</p>
        <p>Coverage: {{ (detail.adjustment as any).coverage_pct }}%</p>
        <p>Reason: {{ (detail.adjustment as any).reason }}</p>
      </div>
    </div>
  </div>
</template>
