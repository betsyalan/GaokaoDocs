<template>
  <div class="app-layout">
    <!-- 顶部导航（含侧栏切换按钮） -->
    <NavBar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <!-- 主体区域：侧栏 + 内容 -->
    <div class="app-body">
      <!-- 侧栏遮罩（移动端点击关闭） -->
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

      <!-- 左侧文件列表 -->
      <FileSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <!-- 主内容区 -->
      <main class="main-content" :class="{ 'sidebar-hidden': !sidebarOpen }">
        <!-- 桌面端小按钮：侧栏收起时点击展开 -->
        <button class="sidebar-pull" @click="sidebarOpen = true" :title="'展开文件列表'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '@/components/NavBar.vue'
import FileSidebar from '@/components/FileSidebar.vue'

const sidebarOpen = ref(false)
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 侧栏遮罩（窄屏用） */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 99;
}
@media (max-width: 768px) {
  .sidebar-overlay { display: block; }
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--body-bg, #f5f5f5);
  position: relative;
  transition: margin-left 0.3s ease, background 0.3s;
}
.main-content::-webkit-scrollbar {
  width: 6px;
}
.main-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

/* 侧栏收起时显示的展开按钮 */
.sidebar-pull {
  display: none;
  position: fixed;
  left: 0;
  top: 64px;
  width: 24px;
  height: 48px;
  border: none;
  border-radius: 0 6px 6px 0;
  background: var(--nav-bg, #1a1a2e);
  color: var(--nav-text-secondary, rgba(255,255,255,0.5));
  cursor: pointer;
  z-index: 50;
  transition: all 0.2s, background 0.3s;
  border: 1px solid var(--nav-border, transparent);
  border-left: none;
}
.sidebar-pull:hover {
  color: #fff;
  background: var(--sidebar-accent, #e94560);
  border-color: var(--sidebar-accent, #e94560);
}
.main-content.sidebar-hidden .sidebar-pull {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
