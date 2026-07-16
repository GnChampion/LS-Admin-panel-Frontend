import { reactive } from 'vue'

export interface RunRecord {
  id: string
  moduleId: string
  moduleName: string
  zone: string
  provider: string
  data_type: string
  status: string
  error: string | null
  started_at: string
  finished_at: string
  summary: string
  ts: number
  polygon?: number[][] | null
}

const KEY = 'ls_admin_runs'

function load(): RunRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RunRecord[]) : []
  } catch {
    return []
  }
}

const state = reactive<{ runs: RunRecord[] }>({ runs: load() })

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.runs.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

export function addRun(r: RunRecord) {
  state.runs.unshift(r)
  if (state.runs.length > 100) state.runs.length = 100
  persist()
}

export function clearRuns() {
  state.runs = []
  persist()
}

export function useRuns() {
  return state
}
