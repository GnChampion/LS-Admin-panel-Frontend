<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { publishingApi } from '../services/api'

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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await publishingApi.get('/api/v1/admin/zones')
    zones.value = res.data?.data || []
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
    await publishingApi.patch(`/api/v1/admin/zones/${zoneId}/status`, {
      status: 'blocked',
      block_reason: blockReason.value,
    })
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
    await publishingApi.patch(`/api/v1/admin/zones/${zoneId}/status`, { status: 'active', block_reason: null })
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Unblock failed'
  } finally {
    loading.value = false
  }
}

function zoneId(z: Zone) { return z.id || z.zone_id || '' }

function mapsUrl(z: Zone) {
  const v1 = z.confirmed_v1
  if (v1) return `https://maps.google.com/?q=${v1.lat},${v1.lon}`
  return null
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-800">Zone Management</h3>
        <p class="text-sm text-slate-500 mt-0.5">View, block, and unblock zones</p>
      </div>
      <button @click="load" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
        ↻ Refresh
      </button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{{ error }}</p>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading && !zones.length" class="p-8 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!zones.length" class="p-8 text-center text-slate-400 text-sm">No zones found.</div>
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
          <tr v-for="z in zones" :key="zoneId(z)" class="hover:bg-slate-50">
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
        </tbody>
      </table>
    </div>
  </div>
</template>
