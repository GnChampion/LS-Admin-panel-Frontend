<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { LayoutDashboard, Satellite, Radio, ScrollText, LogOut, ShieldAlert, FileBarChart, Layers, Map, Users, Activity, History } from 'lucide-vue-next'
import { login, logout, getCurrentUser, resetPassword, requireAuth } from './services/firebase'
import type { User } from 'firebase/auth'

const user = ref<User | null>(null)
const previewMode = ref(false)
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const route = useRoute()

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/modules', label: 'Modules', icon: Satellite },
  { to: '/analyses', label: 'Analyses', icon: FileBarChart },
  { to: '/task-monitor', label: 'Task Monitor', icon: Activity },
  { to: '/providers', label: 'Providers', icon: Radio },
  { to: '/requests', label: 'Zone Requests', icon: ScrollText },
  { to: '/zones', label: 'Zone Management', icon: Map },
  { to: '/users', label: 'User Management', icon: Users },
  { to: '/tiers', label: 'Tiers', icon: Layers },
  { to: '/runs', label: 'Runs', icon: History },
]

const pageTitle = computed(() => (route.meta.title as string) || 'Admin')

onMounted(async () => {
  if (requireAuth) {
    user.value = await getCurrentUser()
  } else {
    previewMode.value = true
    user.value = { email: 'preview@local' } as User
  }
})

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    user.value = await login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  if (requireAuth) {
    await logout()
    user.value = null
  } else {
    previewMode.value = false
    user.value = null
    location.reload()
  }
}

async function handleReset() {
  if (!email.value) { error.value = 'Enter your email first'; return }
  try {
    await resetPassword(email.value)
    error.value = ''
    alert('Password reset email sent.')
  } catch (e: any) {
    error.value = e.message || 'Reset failed'
  }
}
</script>

<template>
  <!-- Login -->
  <div v-if="!user" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-brand-50 px-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold">LS</div>
        <div>
          <h1 class="text-lg font-bold text-slate-800 leading-tight">Land Scanner</h1>
          <p class="text-xs text-slate-400">Admin Console</p>
        </div>
      </div>
      <p class="text-sm text-slate-500 mb-5">Sign in with a P1 (land-scanner-tamil-developers) account.</p>
      <div class="space-y-3">
        <input v-model="email" type="email" placeholder="admin@email.com"
          class="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input v-model="password" type="password" placeholder="Password" @keyup.enter="handleLogin"
          class="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button @click="handleLogin" :disabled="loading"
          class="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-60">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
        <button @click="handleReset" class="w-full text-sm text-brand-600 hover:underline">Forgot password?</button>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    </div>
  </div>

  <!-- App shell -->
  <div v-else class="min-h-screen flex bg-slate-50">
    <aside class="w-60 fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col">
      <div class="h-16 flex items-center gap-3 px-5 border-b border-slate-200">
        <div class="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">LS</div>
        <span class="font-bold text-slate-800">Land Scanner</span>
      </div>
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <router-link v-for="n in nav" :key="n.to" :to="n.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          active-class="bg-brand-50 text-brand-700">
          <component :is="n.icon" class="w-4 h-4" />
          <span>{{ n.label }}</span>
        </router-link>
      </nav>
      <div class="p-3 border-t border-slate-200">
        <p v-if="previewMode" class="flex items-center gap-1.5 text-xs text-amber-600 mb-2 px-1">
          <ShieldAlert class="w-3.5 h-3.5" /> Preview mode (no auth)
        </p>
        <p class="text-xs text-slate-400 truncate mb-2 px-1">{{ user.email }}</p>
        <button @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100">
          <LogOut class="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </aside>

    <main class="flex-1 ml-60">
      <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <h2 class="text-xl font-semibold text-slate-800">{{ pageTitle }}</h2>
        <span class="text-xs text-slate-400">Land Scanner Admin</span>
      </header>
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
