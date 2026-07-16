<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listAnalyses, getAnalysis, rerunAnalysis, deleteAnalysis } from '../services/api'
import { formatDate, badgeClass } from '../utils'
import DataTable from '../components/DataTable.vue'
import Modal from '../components/Modal.vue'
import ActionMenu from '../components/ActionMenu.vue'
import StatCard from '../components/StatCard.vue'
import {
  Eye, RotateCcw, Trash2, RefreshCw, Plus,
} from 'lucide-vue-next'

const loading = ref(true)
const error = ref('')
const tasks = ref<any[]>([])
const showModal = ref(false)
const selectedTask = ref<any | null>(null)
const showCreateModal = ref(false)
const newTaskForm = ref({
  zone_id: '',
  latitude: 13.0827,
  longitude: 80.2707,
  modules: 'optical',
  time: '',
})

// The admin "Task Management" view operates over the orchestrated analyses
// store (admin-backend), which is what the automation modules actually feed.
const columns = computed(() => [
  { key: 'id', label: 'Analysis', sortable: true, filterable: true, width: '130px', render: (row: any) => row.id?.slice(0, 8) || '—' },
  { key: 'zone_id', label: 'Zone', sortable: true, filterable: true, width: '160px' },
  { key: 'modules', label: 'Modules', sortable: false, filterable: false, width: '200px', render: (row: any) => (Array.isArray(row.modules) ? row.modules.join(', ') : '—') },
  { key: 'status', label: 'Status', sortable: true, filterable: true, width: '130px', render: (row: any) => `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(row.status)}">${row.status}</span>` },
  { key: 'created_at', label: 'Created', sortable: true, width: '180px', render: (row: any) => formatDate(row.created_at) },
])

const successCount = computed(() => tasks.value.filter(t => t.status === 'success').length)
const failedCount = computed(() => tasks.value.filter(t => t.status === 'failed').length)
const partialCount = computed(() => tasks.value.filter(t => t.status === 'partial').length)

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listAnalyses(200)
    tasks.value = Array.isArray(data) ? data : (data?.data || [])
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function openDetail(task: any) {
  selectedTask.value = { ...task, results: [] }
  showModal.value = true
  try {
    const full = await getAnalysis(task.id)
    selectedTask.value = full
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load detail'
  }
}

function closeModal() {
  showModal.value = false
  selectedTask.value = null
}

function openCreateModal() {
  newTaskForm.value = {
    zone_id: `zone_${Date.now().toString(36)}`,
    latitude: 13.0827,
    longitude: 80.2707,
    modules: 'optical',
    time: '',
  }
  showCreateModal.value = true
}

async function createTask() {
  const f = newTaskForm.value
  const modules = f.modules.split(',').map((m: string) => m.trim()).filter(Boolean)
  try {
    await rerunAnalysis({
      zone_id: f.zone_id,
      lat: parseFloat(String(f.latitude)),
      lon: parseFloat(String(f.longitude)),
      modules,
      time: f.time || undefined,
    })
    showCreateModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.detail || e?.message || 'Failed to create task')
  }
}

async function retryTask(task: any) {
  try {
    await rerunAnalysis({
      zone_id: task.zone_id,
      lat: task.lat != null ? Number(task.lat) : undefined,
      lon: task.lon != null ? Number(task.lon) : undefined,
      modules: Array.isArray(task.modules) ? task.modules : ['optical'],
    })
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.detail || e?.message || 'Failed to retry')
  }
}

async function deleteTask(task: any) {
  if (!confirm('Delete this task and its results?')) return
  try {
    await deleteAnalysis(task.id)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.detail || e?.message || 'Failed to delete')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Task Management</h1>
        <p class="text-sm text-slate-500 mt-1">Create and manage orchestrated analyses (automation-module runs)</p>
      </div>
      <div class="flex gap-2">
        <button @click="openCreateModal" class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 flex items-center gap-2">
          <Plus class="w-4 h-4" /> Create Task
        </button>
        <button @click="load" :disabled="loading" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> Refresh
        </button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <StatCard title="Success" :value="successCount" icon="CheckCircle" color="emerald" />
      <StatCard title="Partial" :value="partialCount" icon="RotateCcw" color="blue" />
      <StatCard title="Failed" :value="failedCount" icon="XCircle" color="red" />
    </div>

    <DataTable
      :data="tasks"
      :columns="columns"
      key-field="id"
      title="Tasks"
      :loading="loading"
      :searchable="true"
      :filterable="true"
      :paginated="true"
      :page-size="15"
      :page-sizes="[15, 25, 50, 100]"
      :sortable="true"
      :show-column-picker="true"
      :show-export="true"
      default-sort="{ key: 'created_at', order: 'desc' }"
    >
      <template #actions="{ row }">
        <ActionMenu :items="[
          { label: 'View Details', icon: Eye, action: 'view' },
          { label: 'Retry', icon: RotateCcw, action: 'retry', variant: 'primary' },
          { label: 'Delete', icon: Trash2, action: 'delete', variant: 'danger' },
        ]" @view="openDetail(row)" @retry="retryTask(row)" @delete="deleteTask(row)" />
      </template>
    </DataTable>

    <Modal v-model="showModal" :title="'Task #' + (selectedTask?.id?.slice(0, 8) || '')" size="lg">
      <div v-if="selectedTask" class="space-y-6">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><span class="text-slate-400">Analysis ID</span> <p class="text-slate-700">{{ selectedTask.id }}</p></div>
          <div><span class="text-slate-400">Zone</span> <p class="text-slate-700">{{ selectedTask.zone_id }}</p></div>
          <div><span class="text-slate-400">Status</span> <p class="text-slate-700"><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeClass(selectedTask.status)">{{ selectedTask.status }}</span></p></div>
          <div><span class="text-slate-400">Modules</span> <p class="text-slate-700">{{ Array.isArray(selectedTask.modules) ? selectedTask.modules.join(', ') : '—' }}</p></div>
          <div><span class="text-slate-400">Created</span> <p class="text-slate-700">{{ formatDate(selectedTask.created_at) }}</p></div>
          <div v-if="selectedTask.lat != null"><span class="text-slate-400">Location</span> <p class="text-slate-700">{{ selectedTask.lat }}, {{ selectedTask.lon }}</p></div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-2">Module results</h4>
          <div class="space-y-3">
            <div v-for="r in (selectedTask.results || [])" :key="r.module" class="rounded-lg border border-slate-200 p-3">
              <div class="flex items-center gap-2 mb-2">
                <strong class="text-slate-700">{{ r.module }}</strong>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeClass(r.status)">{{ r.status }}</span>
                <span v-if="r.provider" class="text-xs text-slate-400">· {{ r.provider }}</span>
              </div>
              <pre class="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-72">{{ JSON.stringify(r.output, null, 2) }}</pre>
            </div>
            <p v-if="!selectedTask.results?.length" class="text-sm text-slate-400">No module results.</p>
          </div>
        </div>
      </div>
      <template #footer>
        <button @click="showModal = false" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100">Close</button>
      </template>
    </Modal>

    <Modal v-model="showCreateModal" title="Create Task" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-slate-500 mb-1">Zone ID</label>
          <input v-model="newTaskForm.zone_id" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-1">Latitude</label>
            <input v-model="newTaskForm.latitude" type="number" step="0.0001" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Longitude</label>
            <input v-model="newTaskForm.longitude" type="number" step="0.0001" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">Modules (comma-separated)</label>
          <input v-model="newTaskForm.modules" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1">Time (optional, YYYY-MM-DD)</label>
          <input v-model="newTaskForm.time" placeholder="leave blank for latest" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
      </div>
      <template #footer>
        <button @click="showCreateModal = false" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100">Cancel</button>
        <button @click="createTask" class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">Create</button>
      </template>
    </Modal>
  </div>
</template>
