<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MODULES, AUTOMATION_MODULES, type ModuleDef } from '../config/modules'
import { healthCheck, type HealthResult } from '../services/api'
import { Activity, CheckCircle2, XCircle, CircleSlash } from 'lucide-vue-next'

const router = useRouter()
const health = ref<Record<string, HealthResult>>({})
const loading = ref(true)
const error = ref('')
let timer: any = null

async function refresh() {
  const results = await Promise.all(
    MODULES.map(async (m) => [m.id, await healthCheck(m)] as const)
  )
  const map: Record<string, HealthResult> = {}
  for (const [id, r] of results) map[id] = r
  health.value = map
  loading.value = false
}

function statusOf(m: ModuleDef): 'online' | 'offline' {
  return health.value[m.id]?.ok ? 'online' : 'offline'
}
function liveBadge(m: ModuleDef) {
  return m.live ? 'Live' : 'Prototype'
}

const onlineCount = computed(() => MODULES.filter((m) => statusOf(m) === 'online').length)
const liveCount = computed(() => MODULES.filter((m) => m.live).length)

function openModule(m: ModuleDef) {
  router.push({ path: '/modules', query: { module: m.id } })
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 15000)
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<template>
  <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{{ error }}</div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-slate-800">{{ onlineCount }} / {{ MODULES.length }}</div>
      <div class="text-xs text-slate-400 mt-1">Modules online</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-slate-800">{{ liveCount }}</div>
      <div class="text-xs text-slate-400 mt-1">Live (zero-auth)</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-slate-800">{{ AUTOMATION_MODULES.length }}</div>
      <div class="text-xs text-slate-400 mt-1">/run modules</div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div class="text-2xl font-bold text-slate-800">1</div>
      <div class="text-xs text-slate-400 mt-1">Delivery service</div>
    </div>
  </div>

  <div class="flex items-center justify-between mt-6 mb-3">
    <h3 class="text-sm font-semibold text-slate-700">Modules</h3>
    <button @click="refresh" class="text-xs text-brand-600 hover:underline">Refresh</button>
  </div>

  <div v-if="loading" class="text-sm text-slate-400">Checking module health…</div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    <div v-for="m in MODULES" :key="m.id"
      class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition cursor-pointer"
      @click="openModule(m)">
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold text-slate-800">{{ m.name }}</div>
          <div class="text-xs text-slate-400">{{ m.id }} · Group {{ m.group }}</div>
        </div>
        <span v-if="statusOf(m) === 'online'" class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 class="w-4 h-4" /> online
        </span>
        <span v-else class="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <XCircle class="w-4 h-4" /> offline
        </span>
      </div>
      <p class="text-xs text-slate-500 mt-2 line-clamp-2">{{ m.description }}</p>
      <div class="flex items-center gap-2 mt-3">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          :class="m.live ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
          <Activity class="w-3 h-3" /> {{ liveBadge(m) }}
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
          <CircleSlash v-if="m.kind === 'delivery'" class="w-3 h-3" /> {{ m.kind === 'delivery' ? 'delivery' : '/run' }}
        </span>
      </div>
      <div class="text-[11px] text-slate-400 mt-3 truncate">{{ m.baseUrl }}</div>
    </div>
  </div>
</template>
