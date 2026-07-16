<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listAnalyses, getAnalysis, deleteAnalysis, pushDelivered } from '../services/api'
import { formatDate, badgeClass } from '../utils'
import { RefreshCw, Trash2, Eye, Send } from 'lucide-vue-next'

const loading = ref(true)
const error = ref('')
const list = ref<any[]>([])
const openId = ref('')
const detail = ref<any>(null)
const deleting = ref(false)
const pushing = ref<string | null>(null)
const pushMsg = ref('')

const columns = [
  { key: 'id', label: 'Analysis', width: '130px', render: (r: any) => r.id?.slice(0, 10) || '—' },
  { key: 'zone_id', label: 'Zone', width: '150px' },
  { key: 'version', label: 'Ver', width: '70px', render: (r: any) => r.version || 'v1' },
  { key: 'status', label: 'Status', width: '120px', render: (r: any) => `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(r.status)}">${r.status}</span>` },
  { key: 'modules', label: 'Modules', width: '220px', render: (r: any) => (Array.isArray(r.modules) ? r.modules.join(', ') : '—') },
  { key: 'created_at', label: 'Created', width: '180px', render: (r: any) => formatDate(r.created_at) },
]

const totals = (s: string) => list.value.filter((a) => a.status === s).length

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listAnalyses(100)
    list.value = Array.isArray(data) ? data : (data?.data || [])
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load analyses'
  } finally {
    loading.value = false
  }
}

async function open(id: string) {
  if (openId.value === id) {
    openId.value = ''
    detail.value = null
    return
  }
  openId.value = id
  detail.value = null
  try {
    detail.value = await getAnalysis(id)
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load detail'
  }
}

async function remove(id: string) {
  if (!confirm('Delete this analysis and its module results?')) return
  deleting.value = true
  try {
    await deleteAnalysis(id)
    if (openId.value === id) {
      openId.value = ''
      detail.value = null
    }
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.detail || e?.message || 'Delete failed')
  } finally {
    deleting.value = false
  }
}

// Push the generated, tier-limited extract to pullpush -> Firebase P2 (user DB).
async function pushToUser(a: any) {
  pushing.value = a.id
  pushMsg.value = ''
  try {
    const res = await pushDelivered({
      zone_id: a.zone_id || a.id,
      version: a.version || 'v1',
      tier: a.tier || 'free',
      user_id: a.user_id || null,
      analysis_id: a.id,
      status: a.status,
      modules: a.modules,
      image_urls: a.storage_refs?.image_urls || [],
      data: a.data || {}
    })
    pushMsg.value = res.status === 'success' ? `Pushed ${a.zone_id || a.id} (${a.version || 'v1'})` : 'Push returned no success'
  } catch (e: any) {
    pushMsg.value = e?.response?.data?.detail || e?.message || 'Push failed'
  } finally {
    pushing.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Analyses</h1>
        <p class="text-sm text-slate-500 mt-1">
          Orchestrated runs produced by the automation modules (via admin-backend).
        </p>
      </div>
      <button @click="load" :disabled="loading"
        class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2">
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> Refresh
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-400">Total</p>
        <p class="text-2xl font-bold text-slate-800">{{ list.length }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-400">Success</p>
        <p class="text-2xl font-bold text-emerald-600">{{ totals('success') }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-400">Failed / Partial</p>
        <p class="text-2xl font-bold text-red-600">{{ totals('failed') + totals('partial') }}</p>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>
    <p v-if="pushMsg" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{{ pushMsg }}</p>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th v-for="c in columns" :key="c.key" class="text-left px-4 py-3 font-medium" :style="{ width: c.width }">{{ c.label }}</th>
            <th class="text-right px-4 py-3 font-medium w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="a in list" :key="a.id">
            <tr class="border-t border-slate-100 hover:bg-slate-50">
              <td v-for="c in columns" :key="c.key" class="px-4 py-3 text-slate-700" v-html="c.render ? c.render(a) : a[c.key]"></td>
                <td class="px-4 py-3 text-right">
                  <div class="inline-flex gap-1.5">
                    <button @click="open(a.id)" class="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="View"><Eye class="w-4 h-4" /></button>
                    <button @click="pushToUser(a)" :disabled="pushing === a.id" class="p-1.5 rounded-md border border-slate-200 text-brand-600 hover:bg-brand-50 disabled:opacity-40" title="Push to user (P2)"><Send class="w-4 h-4" /></button>
                    <button @click="remove(a.id)" :disabled="deleting" class="p-1.5 rounded-md border border-slate-200 text-red-500 hover:bg-red-50 disabled:opacity-40" title="Delete"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </td>
            </tr>
            <tr v-if="openId === a.id && detail" class="border-t border-slate-100 bg-slate-50">
              <td colspan="6" class="px-6 py-4">
                <div class="space-y-3">
                  <div v-for="r in detail.results" :key="r.module" class="rounded-lg border border-slate-200 bg-white p-3">
                    <div class="flex items-center gap-2 mb-2">
                      <strong class="text-slate-700">{{ r.module }}</strong>
                      <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" :class="badgeClass(r.status)">{{ r.status }}</span>
                      <span v-if="r.provider" class="text-xs text-slate-400">· {{ r.provider }}</span>
                    </div>
                    <pre class="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-72">{{ JSON.stringify(r.output, null, 2) }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loading && !list.length">
            <td colspan="6" class="px-4 py-10 text-center text-slate-400">No analyses yet — run one from the Modules page or the web app.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
