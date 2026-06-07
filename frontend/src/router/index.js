import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/file/:pathMatch(.*)*', name: 'DocumentView', component: () => import('@/views/DocumentView.vue') },
  { path: '/search', name: 'Search', component: () => import('@/views/Search.vue') },
  { path: '/admin', name: 'Admin', component: () => import('@/views/AdminDashboard.vue') },
  { path: '/stats', name: 'Stats', component: () => import('@/views/Stats.vue') },
  { path: '/volunteer', name: 'VolunteerPreview', component: () => import('@/views/VolunteerPreview.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
