<script setup lang="ts">
import { useRuns, clearRuns } from '../services/runs'
import { formatDate } from '../utils'
import { CheckCircle2, XCircle, Trash2 } from 'lucide-vue-next'

const state = useRuns()
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700">Run history (this session)</h3>
      <button v-if="state.runs.length" @click="clearRuns" class="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
        <Trash2 class="w-3.5 h-3.5" /> Clear
      </button>
    </div>

    <div v-if="!state.runs.length" class="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
      No runs yet. Open <span class="font-medium">Modules</span> and trigger a job.
    </div>

    <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th class="text-left font-semibold px-4 py-2.5">Module</th>
            <th class="text-left font-semibold px-4 py-2.5">Zone</th>
            <th class="text-left font-semibold px-4 py-2.5">Provider</th>
            <th class="text-left font-semibold px-4 py-2.5">Status</th>
            <th class="text-left font-semibold px-4 py-2.5">When</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in state.runs" :key="r.id" class="border-t border-slate-100">
            <td class="px-4 py-3 text-slate-700">{{ r.moduleName }}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">
              {{ r.zone }}
              <span v-if="r.polygon && r.polygon.length" class="ml-1 text-[10px] text-brand-600">
                ▱{{ r.polygon.length }}pt
              </span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ r.provider }}</td>
            <td class="px-4 py-3">
              <span v-if="r.status === 'success'" class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 class="w-3.5 h-3.5" /> success
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                <XCircle class="w-3.5 h-3.5" /> {{ r.status }}
              </span>
              <div v-if="r.error" class="text-[11px] text-red-500 mt-0.5">{{ r.error }}</div>
            </td>
            <td class="px-4 py-3 text-slate-400 text-xs">{{ formatDate(r.ts) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
