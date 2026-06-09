<template>
  <nav class="navbar">
    <div class="navbar-left">
      <!-- 侧栏切换按钮 -->
      <button class="menu-btn" @click="$emit('toggle-sidebar')" title="切换文件列表">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <router-link to="/" class="navbar-brand">📚 Doc CMS</router-link>
    </div>
    <div class="navbar-links">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/search" class="nav-link">搜索</router-link>
      <router-link to="/volunteer" class="nav-link">志愿表</router-link>
      <router-link to="/stats" class="nav-link">统计</router-link>
      <router-link to="/admin" class="nav-link">管理</router-link>
      <!-- 主题下拉 -->
      <select class="theme-nav-select" :value="currentTheme" @change="switchTheme($event.target.value)">
        <option v-for="t in themeList" :key="t.key" :value="t.key">{{ t.label }}</option>
      </select>
    </div>
  </nav>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

defineEmits(['toggle-sidebar'])

const { themeList, currentTheme, switchTheme } = useTheme()
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  background: var(--nav-bg, #1a1a2e);
  color: var(--nav-text, #eee);
  border-bottom: 1px solid var(--nav-border, transparent);
  transition: background 0.3s, color 0.3s, border-color 0.3s;
}
.navbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--nav-text-secondary, rgba(255,255,255,0.6));
  cursor: pointer;
  transition: all 0.15s;
}
.menu-btn:hover {
  background: var(--nav-hover-bg, rgba(255,255,255,0.08));
  color: var(--nav-text, #fff);
}
.navbar-brand {
  font-size: 18px;
  font-weight: bold;
  color: var(--nav-accent, #e94560);
  text-decoration: none;
}
.navbar-links {
  display: flex;
  gap: 16px;
}
.nav-link {
  color: var(--nav-text-secondary, #ccc);
  text-decoration: none;
  font-size: 14px;
}
.nav-link:hover { color: var(--nav-text, #fff); }
.nav-link.router-link-active { color: var(--nav-accent, #e94560); font-weight: bold; }

/* 导航栏主题下拉 */
.theme-nav-select {
  margin-left: 8px;
  padding: 4px 8px;
  background: var(--nav-hover-bg, rgba(255,255,255,0.08));
  border: 1px solid var(--nav-border, rgba(255,255,255,0.12));
  border-radius: 4px;
  color: var(--nav-text-secondary, rgba(255,255,255,0.7));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-nav-select:hover {
  border-color: var(--nav-accent, rgba(255,255,255,0.3));
  color: var(--nav-text, #fff);
}
.theme-nav-select:focus {
  outline: none;
  border-color: var(--nav-accent, #7c4d9e);
}
.theme-nav-select option {
  background: var(--nav-bg, #1a1a2e);
  color: var(--nav-text-secondary, #ccc);
}

@media (max-width: 768px) {
  .navbar { padding: 0 12px; }
  .navbar-brand { font-size: 15px; }
  .nav-link { font-size: 12px; }
  .theme-nav-select { font-size: 11px; max-width: 100px; }
}
</style>
