import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Modules from './views/Modules.vue'
import Providers from './views/Providers.vue'
import Runs from './views/Runs.vue'
import ZoneRequests from './views/ZoneRequests.vue'
import Analyses from './views/Analyses.vue'
import Tasks from './views/Tasks.vue'
import Tiers from './views/Tiers.vue'
import ZoneManagement from './views/ZoneManagement.vue'
import UserManagement from './views/UserManagement.vue'
import TaskMonitor from './views/TaskMonitor.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard, meta: { title: 'Dashboard' } },
    { path: '/modules', name: 'modules', component: Modules, meta: { title: 'Modules' } },
    { path: '/analyses', name: 'analyses', component: Analyses, meta: { title: 'Analyses' } },
    { path: '/tasks', name: 'tasks', component: Tasks, meta: { title: 'Tasks' } },
    { path: '/task-monitor', name: 'task-monitor', component: TaskMonitor, meta: { title: 'Task Monitor' } },
    { path: '/providers', name: 'providers', component: Providers, meta: { title: 'Providers' } },
    { path: '/runs', name: 'runs', component: Runs, meta: { title: 'Runs' } },
    { path: '/requests', name: 'requests', component: ZoneRequests, meta: { title: 'Zone Requests' } },
    { path: '/tiers', name: 'tiers', component: Tiers, meta: { title: 'Tiers' } },
    { path: '/zones', name: 'zones', component: ZoneManagement, meta: { title: 'Zone Management' } },
    { path: '/users', name: 'users', component: UserManagement, meta: { title: 'User Management' } },
  ]
})

createApp(App).use(router).mount('#app')
