<script setup lang="ts">
import { computed } from 'vue'
import { 
  MapPin, CheckCircle, Image, Maximize, Satellite, 
  Users, Clock, DollarSign, TrendingUp, TrendingDown, 
  Activity, BarChart, Shield, Database, Cloud, Globe,
  RotateCcw, XCircle, AlertTriangle, Zap, CheckCircle2,
} from 'lucide-vue-next'

interface Props {
  title: string
  value: string | number
  icon: string
  color?: 'brand' | 'emerald' | 'blue' | 'amber' | 'red' | 'violet' | 'slate'
  trend?: { value: number; label: string; up: boolean }
}

const props = withDefaults(defineProps<Props>(), {
  color: 'brand',
})

const icons = {
  MapPin, CheckCircle, Image, Maximize, Satellite,
  Users, Clock, DollarSign, TrendingUp, TrendingDown,
  Activity, BarChart, Shield, Database, Cloud, Globe,
  RotateCcw, XCircle, AlertTriangle, Zap, CheckCircle2,
}

const iconColorClasses = {
  brand: 'bg-brand-100 text-brand-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  violet: 'bg-violet-100 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">{{ title }}</p>
        <p class="text-2xl font-bold text-slate-800 mt-1">{{ value }}</p>
        <p v-if="trend" class="mt-2 flex items-center gap-1 text-xs" :class="trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'">
          <span class="flex items-center">
            <svg v-if="trend.value >= 0" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </span>
          {{ Math.abs(trend.value) }}% {{ trend.label }}
        </p>
      </div>
      <div class="p-3 rounded-xl" :class="iconColorClasses[color]">
        <component :is="(icons as any)[icon]" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template>