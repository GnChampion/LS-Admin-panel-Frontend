<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listTiers, createTier, updateTier, deleteTier, type Tier } from '../services/api'

const tiers = ref<Tier[]>([])
const loading = ref(false)
const error = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)

const MODULES = ['optical', 'weather', 'elevation', 'radar', 'land-cover', 'hydrology', 'spectral']

const blank = (): Tier => ({
  tier_id: '',
  tier_name: '',
  description: '',
  tier_level: 'free',
  status: 'active',
  stripe_price_id: null,
  limits: {
    max_zones: 5,
    max_versions_per_zone: 1,
    allowed_modules: ['optical'],
    max_resolution: 'high',
    v2_access: false,
    max_tasks_per_day: 10,
  },
})

const form = ref<Tier>(blank())

async function load() {
  loading.value = true
  error.value = ''
  try { tiers.value = await listTiers() }
  catch (e: any) { error.value = e?.message || 'Failed to load tiers' }
  finally { loading.value = false }
}

function openCreate() {
  form.value = blank()
  editingId.value = null
  showForm.value = true
}

function openEdit(t: Tier) {
  form.value = {
    tier_id: t.tier_id,
    tier_name: t.tier_name,
    description: t.description || '',
    tier_level: t.tier_level,
    status: t.status,
    stripe_price_id: t.stripe_price_id || null,
    limits: {
      max_zones: 5,
      max_versions_per_zone: 1,
      allowed_modules: ['optical'],
      max_resolution: 'high',
      v2_access: false,
      max_tasks_per_day: 10,
      ...(t.limits || {}),
    },
  }
  editingId.value = t.tier_id
  showForm.value = true
}

async function save() {
  loading.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await updateTier(editingId.value, form.value)
    } else {
      if (!form.value.tier_id) { error.value = 'Tier ID is required'; loading.value = false; return }
      if (!form.value.tier_name) { error.value = 'Tier Name is required'; loading.value = false; return }
      await createTier(form.value)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.detail || e?.message || 'Save failed'
  } finally {
    loading.value = false
  }
}

async function remove(tierId: string) {
  if (!confirm(`Delete tier "${tierId}"?`)) return
  loading.value = true
  try { await deleteTier(tierId); await load() }
  catch (e: any) { error.value = e?.message || 'Delete failed' }
  finally { loading.value = false }
}

function toggleModule(mod: string) {
  const mods = form.value.limits!.allowed_modules || []
  const idx = mods.indexOf(mod)
  if (idx === -1) mods.push(mod)
  else mods.splice(idx, 1)
  form.value.limits!.allowed_modules = [...mods]
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-800">Tier Management</h3>
        <p class="text-sm text-slate-500 mt-0.5">Create and manage subscription tiers with module access limits</p>
      </div>
      <button @click="openCreate" class="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg">
        + New Tier
      </button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{{ error }}</p>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div v-if="loading && !tiers.length" class="p-8 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!tiers.length" class="p-8 text-center text-slate-400 text-sm">No tiers yet. Create one to get started.</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Level</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Limits</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Modules</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="t in tiers" :key="t.tier_id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">{{ t.tier_name }}</div>
              <div class="text-xs text-slate-400 font-mono">{{ t.tier_id }}</div>
              <div v-if="t.stripe_price_id" class="text-xs text-slate-400">Stripe: {{ t.stripe_price_id }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="{
                  'bg-slate-100 text-slate-600': t.tier_level === 'free',
                  'bg-blue-100 text-blue-700': t.tier_level === 'standard',
                  'bg-purple-100 text-purple-700': t.tier_level === 'pro',
                  'bg-amber-100 text-amber-700': t.tier_level === 'enterprise',
                }">
                {{ t.tier_level }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">
              <div>Zones: {{ t.limits?.max_zones ?? '∞' }}</div>
              <div>Tasks/day: {{ t.limits?.max_tasks_per_day ?? '∞' }}</div>
              <div>Res: {{ t.limits?.max_resolution ?? 'high' }}</div>
              <div>v2: {{ t.limits?.v2_access ? '✓' : '✗' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <span v-for="m in (t.limits?.allowed_modules || [])" :key="m"
                  class="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded">{{ m }}</span>
                <span v-if="!t.limits?.allowed_modules?.length" class="text-xs text-slate-400">all</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
                {{ t.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2 justify-end">
                <button @click="openEdit(t)" class="text-xs text-brand-600 hover:underline">Edit</button>
                <button @click="remove(t.tier_id)" class="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h4 class="font-semibold text-slate-800">{{ editingId ? 'Edit Tier' : 'New Tier' }}</h4>
          <button @click="showForm = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div class="px-6 py-4 space-y-4">
          <p v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Tier ID *</label>
              <input v-model="form.tier_id" :disabled="!!editingId" placeholder="free"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Tier Name *</label>
              <input v-model="form.tier_name" placeholder="Free Plan"
                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Level</label>
              <select v-model="form.tier_level" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="free">free</option>
                <option value="standard">standard</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select v-model="form.status" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input v-model="form.description" placeholder="Optional description"
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Stripe Price ID (optional)</label>
            <input v-model="form.stripe_price_id" placeholder="price_xxx"
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono" />
          </div>

          <div class="border-t border-slate-100 pt-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Limits</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-600 mb-1">Max Zones</label>
                <input v-model.number="form.limits!.max_zones" type="number" min="1"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label class="block text-xs text-slate-600 mb-1">Max Tasks/Day</label>
                <input v-model.number="form.limits!.max_tasks_per_day" type="number" min="1"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label class="block text-xs text-slate-600 mb-1">Max Versions/Zone</label>
                <input v-model.number="form.limits!.max_versions_per_zone" type="number" min="1"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label class="block text-xs text-slate-600 mb-1">Max Resolution</label>
                <select v-model="form.limits!.max_resolution" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <input id="v2access" type="checkbox" v-model="form.limits!.v2_access" class="rounded" />
              <label for="v2access" class="text-sm text-slate-700">Allow polygon zones (v2 access)</label>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allowed Modules</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="mod in MODULES" :key="mod"
                type="button"
                @click="toggleModule(mod)"
                class="px-3 py-1.5 text-xs rounded-full border transition-colors"
                :class="form.limits!.allowed_modules?.includes(mod)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'"
              >
                {{ mod }}
              </button>
            </div>
            <p class="text-xs text-slate-400 mt-1">Leave all unselected to allow all modules</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button @click="showForm = false" class="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button @click="save" :disabled="loading" class="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg disabled:opacity-60">
            {{ loading ? 'Saving…' : (editingId ? 'Save Changes' : 'Create Tier') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
