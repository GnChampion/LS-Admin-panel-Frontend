<script setup lang="ts">
import { MODULES } from '../config/modules'

const liveModules = MODULES.filter((m) => m.live)
const prototypeModules = MODULES.filter((m) => !m.live)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-1">Module / Provider catalog</h3>
      <p class="text-xs text-slate-500">
        The 8 backend modules and their Group A (zero-auth) providers. Prototype modules return
        correctly-shaped placeholder outputs; their live sources are deferred to Group B/C (require credentials).
      </p>
    </div>

    <div>
      <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Live (zero-auth)</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="m in liveModules" :key="m.id" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">{{ m.name }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Group {{ m.group }}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">{{ m.description }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="p in m.providers" :key="p" class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{{ p }}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">{{ m.notes }}</p>
        </div>
      </div>
    </div>

    <div>
      <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Prototype (placeholder schema)</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="m in prototypeModules.filter(x => x.kind === 'automation')" :key="m.id" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">{{ m.name }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Group {{ m.group }}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">{{ m.description }}</p>
          <p class="text-[11px] text-slate-400 mt-2">{{ m.notes }}</p>
        </div>
      </div>
    </div>

    <div v-if="prototypeModules.some(x => x.kind === 'delivery')">
      <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Delivery</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="m in prototypeModules.filter(x => x.kind === 'delivery')" :key="m.id" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span class="font-semibold text-slate-800">{{ m.name }}</span>
          <p class="text-xs text-slate-500 mt-1">{{ m.description }}</p>
          <p class="text-[11px] text-slate-400 mt-2">{{ m.notes }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
