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

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard, meta: { title: 'Dashboard' } },
    { path: '/modules', name: 'modules', component: Modules, meta: { title: 'Modules' } },
    { path: '/analyses', name: 'analyses', component: Analyses, meta: { title: 'Analyses' } },
    { path: '/tasks', name: 'tasks', component: Tasks, meta: { title: 'Tasks' } },
    { path: '/providers', name: 'providers', component: Providers, meta: { title: 'Providers' } },
    { path: '/runs', name: 'runs', component: Runs, meta: { title: 'Runs' } },
    { path: '/requests', name: 'requests', component: ZoneRequests, meta: { title: 'Zone Requests' } }
  ]
})

createApp(App).use(router).mount('#app')
