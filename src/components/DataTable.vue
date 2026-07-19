<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Download, Columns } from 'lucide-vue-next'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (row: T, value: any) => any
  width?: string
  align?: 'left' | 'center' | 'right'
  class?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: string
  title?: string
  searchable?: boolean
  filterable?: boolean
  paginated?: boolean
  pageSize?: number
  pageSizes?: number[]
  sortable?: boolean
  selectable?: boolean
  loading?: boolean
  emptyMessage?: string
  showColumnPicker?: boolean
  showExport?: boolean
  rowClass?: (row: T) => string
  defaultSort?: { key: string; order: 'asc' | 'desc' }
}

interface DataTableEmits<T> {
  'row-click': [row: T]
  'selection-change': [selection: T[]]
  'sort-change': [sort: { key: string; order: 'asc' | 'desc' }]
  'page-change': [page: number, pageSize: number]
}

const props = withDefaults(defineProps<DataTableProps<any>>(), {
  searchable: true,
  filterable: true,
  paginated: true,
  pageSize: 10,
  pageSizes: [10, 25, 50, 100],
  sortable: true,
  selectable: false,
  loading: false,
  emptyMessage: 'No data available',
  showColumnPicker: true,
  showExport: true,
  defaultSort: { key: '', order: 'asc' },
})

const emit = defineEmits<DataTableEmits<any>>()

const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref(props.defaultSort?.key || '')
const sortOrder = ref<'asc' | 'desc'>(props.defaultSort?.order || 'asc')
const selectedRows = ref<Set<any>>(new Set())
const visibleColumns = ref<Set<string>>(new Set(props.columns.map(c => c.key)))
const columnFilters = ref<Record<string, string>>({})
const columnPickerOpen = ref(false)
const currentPageSize = ref(props.pageSize)

watch(() => props.pageSize, (v) => {
  currentPageSize.value = v
  currentPage.value = 1
})

watch(() => props.data, () => {
  currentPage.value = 1
  selectedRows.value.clear()
}, { immediate: true })

watch(() => props.defaultSort, (val) => {
  if (val?.key) {
    sortKey.value = val.key
    sortOrder.value = val.order
  }
}, { deep: true, immediate: false })

const filteredData = computed(() => {
  let result = [...props.data]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(row =>
      props.columns.some(col => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(query)
      })
    )
  }

  Object.entries(columnFilters.value).forEach(([key, filter]) => {
    if (filter) {
      result = result.filter(row => {
        const val = row[key]
        return val != null && String(val).toLowerCase().includes(filter.toLowerCase())
      })
    }
  })

  if (sortKey.value) {
    result.sort((a, b) => {
      const aVal = a[sortKey.value]
      const bVal = b[sortKey.value]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortOrder.value === 'asc' ? 1 : -1
      if (bVal == null) return sortOrder.value === 'asc' ? -1 : 1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortOrder.value === 'asc' ? cmp : -cmp
    })
  }

  return result
})

const paginatedData = computed(() => {
  if (!props.paginated) return filteredData.value
  const start = (currentPage.value - 1) * currentPageSize.value
  return filteredData.value.slice(start, start + currentPageSize.value)
})

const totalPages = computed(() => 
  props.paginated ? Math.ceil(filteredData.value.length / currentPageSize.value) : 1
)

const isAllSelected = computed(() => 
  paginatedData.value.length > 0 && paginatedData.value.every(row => selectedRows.value.has(row[props.keyField]))
)

const isIndeterminate = computed(() => 
  paginatedData.value.some(row => selectedRows.value.has(row[props.keyField])) && !isAllSelected.value
)

function handleSort(key: string) {
  if (!props.sortable) return
  const col = props.columns.find(c => c.key === key)
  if (!col?.sortable) return
  
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  emit('sort-change', { key: sortKey.value, order: sortOrder.value })
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    paginatedData.value.forEach(row => selectedRows.value.delete(row[props.keyField]))
  } else {
    paginatedData.value.forEach(row => selectedRows.value.add(row[props.keyField]))
  }
  emit('selection-change', getSelectedRows())
}

function toggleRow(row: any) {
  const key = row[props.keyField]
  if (selectedRows.value.has(key)) {
    selectedRows.value.delete(key)
  } else {
    selectedRows.value.add(key)
  }
  emit('selection-change', getSelectedRows())
}

function isRowSelected(row: any) {
  return selectedRows.value.has(row[props.keyField])
}

function getSelectedRows() {
  return props.data.filter(row => selectedRows.value.has(row[props.keyField]))
}

function handlePageChange(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  emit('page-change', currentPage.value, currentPageSize.value)
}

function handlePageSizeChange(size: number) {
  currentPage.value = 1
  emit('page-change', 1, size)
}

function handleRowClick(row: any) {
  emit('row-click', row)
}

function toggleColumn(key: string) {
  if (visibleColumns.value.has(key)) {
    if (visibleColumns.value.size > 1) visibleColumns.value.delete(key)
  } else {
    visibleColumns.value.add(key)
  }
}

function exportData() {
  const headers = props.columns.filter(c => visibleColumns.value.has(c.key)).map(c => c.label)
  const rows = filteredData.value.map(row => 
    props.columns.filter(c => visibleColumns.value.has(c.key)).map(c => {
      const val = row[c.key]
      if (c.render) return c.render(row, val)
      return val ?? ''
    })
  )
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${props.title || 'export'}_${new Date().toISOString().slice(0,10)}.csv`
  link.click()
}

function getCellValue(row: any, col: Column<any>) {
  const val = row[col.key]
  if (col.render) return col.render(row, val)
  return val ?? '—'
}

function getSortIcon(key: string) {
  if (sortKey.value !== key) return null
  return sortOrder.value === 'asc' ? ChevronUp : ChevronDown
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-100">
      <div v-if="title" class="font-semibold text-slate-800">{{ title }}</div>
      
      <div class="flex flex-wrap items-center gap-2">
        <!-- Search -->
        <div v-if="searchable" class="relative">
          <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="pl-9 pr-3 py-2 w-64 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <!-- Column Picker -->
        <div v-if="showColumnPicker" class="relative">
          <button
            @click="columnPickerOpen = !columnPickerOpen"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Columns class="w-4 h-4" />
            <span>{{ visibleColumns.size }} / {{ columns.length }}</span>
          </button>
          
          <Transition name="fade">
            <div v-if="columnPickerOpen" class="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-slate-200 shadow-lg py-1 min-w-[180px]">
              <div class="px-3 py-2 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase">Columns</div>
              <label v-for="col in columns" :key="col.key" class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="visibleColumns.has(col.key)"
                  @change="toggleColumn(col.key)"
                  class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span class="text-sm text-slate-700">{{ col.label }}</span>
              </label>
            </div>
          </Transition>
        </div>

        <!-- Export -->
        <button
          v-if="showExport && filteredData.length > 0"
          @click="exportData"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Download class="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>

    <!-- Column Filters -->
    <div v-if="filterable" class="px-4 py-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
      <div class="flex gap-2 min-w-max">
        <template v-for="col in columns" :key="col.key">
          <input
            v-if="col.filterable && visibleColumns.has(col.key)"
            v-model="columnFilters[col.key]"
            type="text"
            :placeholder="`Filter ${col.label}...`"
            :style="{ width: col.width || '140px' }"
            class="px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </template>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th v-if="selectable" class="px-4 py-3 text-left">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
                class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              v-show="visibleColumns.has(col.key)"
              :class="['px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-xs', col.class, { 'cursor-pointer select-none hover:bg-slate-100': col.sortable }]"
              :style="{ width: col.width, textAlign: col.align || 'left', minWidth: col.width }"
              @click="col.sortable ? handleSort(col.key) : null"
            >
              <div class="flex items-center gap-1.5">
                {{ col.label }}
                <component
                  v-if="getSortIcon(col.key)"
                  :is="getSortIcon(col.key)"
                  class="w-3.5 h-3.5 text-slate-400"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="loading"
            class="bg-white"
          >
            <td :colspan="columns.filter(c => visibleColumns.has(c.key)).length + (selectable ? 1 : 0)" class="px-4 py-8 text-center text-slate-400">
              <div class="flex items-center justify-center gap-2">
                <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            </td>
          </tr>
          <tr
            v-else-if="!paginatedData.length"
            class="bg-white"
          >
            <td :colspan="columns.filter(c => visibleColumns.has(c.key)).length + (selectable ? 1 : 0)" class="px-4 py-8 text-center text-slate-400">
              {{ emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="row in paginatedData"
              :key="row[keyField]"
              @click="handleRowClick(row)"
              :class="[
                'border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer',
                { 'bg-brand-50': isRowSelected(row) },
                rowClass ? rowClass(row) : ''
              ]"
            >
              <td v-if="selectable" class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="isRowSelected(row)"
                  @click.stop="toggleRow(row)"
                  class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
              </td>
              <td
                v-for="col in columns"
                :key="col.key"
                v-show="visibleColumns.has(col.key)"
                :class="['px-4 py-3 text-slate-700', col.class]"
                :style="{ textAlign: col.align || 'left' }"
              >
                <span v-html="typeof getCellValue(row, col) === 'string' ? getCellValue(row, col) : ''" />
                <template v-if="typeof getCellValue(row, col) !== 'string'">
                  <component :is="getCellValue(row, col)" />
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="paginated && totalPages > 1" class="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="text-sm text-slate-500">
        Showing {{ (currentPage - 1) * currentPageSize + 1 }} to {{ Math.min(currentPage * currentPageSize, filteredData.length) }} of {{ filteredData.length }} entries
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="currentPageSize"
          @change="handlePageSizeChange(currentPageSize)"
          class="px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} per page</option>
        </select>
        <button
          @click="handlePageChange(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-sm text-slate-600 px-2">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          @click="handlePageChange(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>