<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { publishingApi, listTiers, type Tier } from '../services/api'

interface UserRow {
  user_id: string
  email?: string
  display_name?: string
  tier_id?: string
  subscription_status?: string
  created_at?: number
  disabled?: boolean
}

const users = ref<UserRow[]>([])
const tiers = ref<Tier[]>([])
const loading = ref(false)
const error = ref('')
const assigningId = ref<string | null>(null)
const assignTierId = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [uRes, tList] = await Promise.all([
      publishingApi.get('/api/v1/users'),
      listTiers(),
    ])
    users.value = uRes.data?.data || []
    tiers.value = tList
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function assignTier(userId: string) {
  if (!assignTierId.value) return
  loading.value = true
  try {
    await publishingApi.post(`/api/v1/admin/users/${userId}/tier`, { tier_id: assignTierId.value })
    assigningId.value = null
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Assign failed'
  } finally {
    loading.value = false
  }
}

function fmtDate(ts?: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-800">User Management</h3>
        <p class="text-sm text-slate-500 mt-0.5">View users and assign tiers</p>
      </div>
      <button @click="load" class="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
        ↻ Refresh
      </button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{{ error }}</p>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading && !users.length" class="p-8 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!users.length" class="p-8 text-center text-slate-400 text-sm">No users found.</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="u in users" :key="u.user_id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">{{ u.display_name || u.email || '—' }}</div>
              <div class="text-xs text-slate-400 font-mono">{{ u.user_id }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {{ u.tier_id || 'free' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs" :class="u.disabled ? 'text-red-500' : 'text-green-600'">
                {{ u.disabled ? 'disabled' : (u.subscription_status || 'free') }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">{{ fmtDate(u.created_at) }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2 justify-end items-center">
                <template v-if="assigningId === u.user_id">
                  <select v-model="assignTierId"
                    class="text-xs px-2 py-1 border border-slate-300 rounded">
                    <option value="">Select tier…</option>
                    <option v-for="t in tiers" :key="t.tier_id" :value="t.tier_id">{{ t.tier_name }}</option>
                  </select>
                  <button @click="assignTier(u.user_id)"
                    class="text-xs text-brand-600 hover:underline">Save</button>
                  <button @click="assigningId = null"
                    class="text-xs text-slate-400 hover:underline">Cancel</button>
                </template>
                <button v-else @click="assigningId = u.user_id; assignTierId = u.tier_id || ''"
                  class="text-xs text-brand-600 hover:underline">Assign Tier</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
