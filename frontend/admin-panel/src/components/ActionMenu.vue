<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronDown, MoreVertical, Trash2, Edit, Eye, Copy, Download, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-vue-next'

interface MenuItem {
  label: string
  icon?: any
  action: string
  variant?: 'default' | 'danger' | 'primary'
  disabled?: boolean
  divider?: boolean
}

interface Props {
  items: MenuItem[]
  triggerLabel?: string
  triggerIcon?: any
  align?: 'right' | 'left'
}

const props = withDefaults(defineProps<Props>(), {
  triggerLabel: 'Actions',
  align: 'right',
})

const isOpen = ref(false)
const buttonRef = ref<HTMLButtonElement>()

function handleClick(item: MenuItem) {
  if (item.disabled) return
  isOpen.value = false
  emit(item.action, item)
}

function close() {
  isOpen.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

const emit = defineEmits<{
  (e: string, item: MenuItem): void
}>()

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})

function handleOutsideClick(e: MouseEvent) {
  if (!isOpen.value) return
  if (buttonRef.value?.contains(e.target as Node)) return
  const dropdown = document.querySelector('[data-dropdown]')
  if (dropdown?.contains(e.target as Node)) return
  close()
}
</script>

<template>
  <div class="relative inline-block text-left" @click.stop>
    <button
      ref="buttonRef"
      @click="isOpen = !isOpen"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <component v-if="triggerIcon" :is="triggerIcon" class="w-4 h-4" />
      <span>{{ triggerLabel }}</span>
      <ChevronDown class="w-4 h-4" :class="{ 'rotate-180': isOpen }" />
    </button>

    <Transition name="fade">
      <div v-if="isOpen" class="absolute z-50 mt-1 min-w-[160px]" :class="{ 'right-0': align === 'right', 'left-0': align === 'left' }">
        <div data-dropdown class="bg-white rounded-lg border border-slate-200 shadow-lg py-1 overflow-hidden">
          <template v-for="item in items" :key="item.action">
            <hr v-if="item.divider" class="my-1 border-slate-100" />
            <button
              v-else
              @click="handleClick(item)"
              :disabled="item.disabled"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <component v-if="item.icon" :is="item.icon" class="w-4 h-4" :class="item.variant === 'danger' ? 'text-red-500' : item.variant === 'primary' ? 'text-brand-500' : 'text-slate-400'" />
              <span :class="item.variant === 'danger' ? 'text-red-600' : item.variant === 'primary' ? 'text-brand-600' : 'text-slate-700'">
                {{ item.label }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.1s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>