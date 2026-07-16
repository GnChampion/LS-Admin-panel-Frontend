<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface ModalProps {
  modelValue: boolean
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'center' | 'right' | 'left' | 'bottom'
  showClose?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  hideFooter?: boolean
  footerAlign?: 'left' | 'center' | 'right' | 'between'
}

interface ModalEmits {
  'update:modelValue': [value: boolean]
  'close': []
  'confirm': []
  'cancel': []
}

const props = withDefaults(defineProps<ModalProps>(), {
  size: 'md',
  position: 'center',
  showClose: true,
  closeOnOverlayClick: true,
  closeOnEscape: true,
  hideFooter: false,
  footerAlign: 'right',
})

const emit = defineEmits<ModalEmits>()

const isOpen = ref(false)
const isClosing = ref(false)
const focusableElements = ref<HTMLElement[]>([])
let previousActiveElement: HTMLElement | null = null
let focusIndex = 0

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
}

const positionClasses = {
  center: 'fixed inset-0 z-50 flex items-center justify-center',
  right: 'fixed inset-0 z-50 flex items-center justify-end',
  left: 'fixed inset-0 z-50 flex items-center justify-start',
  bottom: 'fixed inset-0 z-50 flex items-end justify-center',
}

const drawerWidths = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[40rem]',
  full: 'w-full max-w-full',
}

const panelClasses = computed(() => {
  const base = 'bg-white rounded-xl shadow-xl'
  if (['right', 'left', 'bottom'].includes(props.position)) {
    return `${base} ${drawerWidths[props.size]} h-full max-h-full overflow-hidden flex flex-col`
  }
  return `${base} ${sizeClasses[props.size]} w-full max-h-[90vh] overflow-hidden flex flex-col`
})

const overlayClass = computed(() => 
  `fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity ${isClosing.value ? 'opacity-0' : 'opacity-100'}`
)

watch(() => props.modelValue, (val) => {
  if (val) open()
  else close()
}, { immediate: true })

watch(isOpen, (val) => {
  emit('update:modelValue', val)
  if (!val && isClosing.value) {
    isClosing.value = false
    emit('close')
  }
})

function open() {
  previousActiveElement = document.activeElement as HTMLElement
  isOpen.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => {
    trapFocus()
    const firstFocusable = focusableElements.value[0]
    firstFocusable?.focus()
  })
}

function close() {
  if (isClosing.value) return
  isClosing.value = true
  isOpen.value = false
  document.body.style.overflow = ''
  previousActiveElement?.focus()
}

function handleOverlayClick(e: MouseEvent) {
  if (props.closeOnOverlayClick && e.target === e.currentTarget) {
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  
  if (e.key === 'Escape' && props.closeOnEscape) {
    close()
    return
  }
  
  if (e.key === 'Tab') {
    trapFocus(e)
  }
}

function trapFocus(e?: KeyboardEvent) {
  const container = document.querySelector('[data-modal-container]') as HTMLElement
  if (!container) return
  
  focusableElements.value = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
  )
  
  if (e && e.key === 'Tab') {
    if (focusableElements.value.length === 0) return
    
    if (e.shiftKey) {
      if (document.activeElement === focusableElements.value[0]) {
        e.preventDefault()
        focusableElements.value[focusableElements.value.length - 1].focus()
      }
    } else {
      if (document.activeElement === focusableElements.value[focusableElements.value.length - 1]) {
        e.preventDefault()
        focusableElements.value[0].focus()
      }
    }
  }
}

function handleConfirm() {
  emit('confirm')
  close()
}

function handleCancel() {
  emit('cancel')
  close()
}
</script>

<template>
  <Transition name="modal" appear>
    <div
      v-if="modelValue || isClosing"
      :class="positionClasses[position]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="title ? 'modal-title' : undefined"
      :aria-describedby="description ? 'modal-description' : undefined"
    >
      <!-- Overlay -->
      <div
        :class="overlayClass"
        @click="handleOverlayClick"
        aria-hidden="true"
      />
      
      <!-- Panel -->
      <div
        :class="panelClasses"
        data-modal-container
        @keydown="handleKeydown"
      >
        <!-- Header -->
        <header v-if="title || showClose" class="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div class="flex-1 min-w-0">
            <h2 v-if="title" id="modal-title" class="text-lg font-semibold text-slate-800">{{ title }}</h2>
            <p v-if="description" id="modal-description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
          </div>
          <button
            v-if="showClose"
            @click="close"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </header>

        <!-- Content -->
        <main class="flex-1 overflow-y-auto p-6" :style="position === 'bottom' ? 'max-height: 80vh' : ''">
          <slot />
        </main>

        <!-- Footer -->
        <footer
          v-if="!hideFooter && $slots.footer"
          :class="['px-6 py-4 border-t border-slate-200 bg-slate-50/50 sticky bottom-0', {
            'justify-start': footerAlign === 'left',
            'justify-center': footerAlign === 'center',
            'justify-end': footerAlign === 'right',
            'justify-between': footerAlign === 'between',
          }]"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
export default {
  name: 'Modal',
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateX(100%);
}
.position-right .modal-enter-from .modal-panel,
.position-right .modal-leave-to .modal-panel {
  transform: translateX(100%);
}
.position-left .modal-enter-from .modal-panel,
.position-left .modal-leave-to .modal-panel {
  transform: translateX(-100%);
}
.position-bottom .modal-enter-from .modal-panel,
.position-bottom .modal-leave-to .modal-panel {
  transform: translateY(100%);
}
</style>