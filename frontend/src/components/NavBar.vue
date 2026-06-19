<template>
  <nav class="navbar">
    <div class="navbar-left">
      <!-- 侧栏切换按钮 -->
      <button class="menu-btn" @click="$emit('toggle-sidebar')" title="切换文件列表">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <router-link to="/" class="navbar-brand">
  <component :is="BookOpen" :size="18" stroke-width="1.5" style="vertical-align:middle;margin-right:6px" /> 高考智囊
</router-link>
    </div>
    <!-- 移动端导航展开按钮 -->
    <button class="nav-mobile-toggle" @click="mobileNavOpen = !mobileNavOpen" title="导航菜单">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="navbar-links" :class="{ open: mobileNavOpen }">
      <router-link to="/" class="nav-link" @click="mobileNavOpen = false">首页</router-link>
      <router-link to="/search" class="nav-link" @click="mobileNavOpen = false">搜索</router-link>
      <router-link to="/volunteer" class="nav-link" @click="mobileNavOpen = false">志愿表</router-link>
      <router-link to="/stats" class="nav-link" @click="mobileNavOpen = false">统计</router-link>
      <router-link to="/admin" class="nav-link" @click="mobileNavOpen = false">管理</router-link>
      <!-- 主题下拉 -->
      <select class="theme-nav-select" :value="currentTheme" @change="switchTheme($event.target.value)">
        <option v-for="t in themeList" :key="t.key" :value="t.key">{{ t.label }}</option>
      </select>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

defineEmits(['toggle-sidebar'])

const { themeList, currentTheme, switchTheme } = useTheme()

// 移动端导航菜单展开/收起
const mobileNavOpen = ref(false)
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

/* 移动端导航切换按钮（默认隐藏） */
.nav-mobile-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--nav-text-secondary, rgba(255,255,255,0.6));
  cursor: pointer;
}

/* 窄屏（≤480px）将导航链接折叠为下拉菜单 */
@media (max-width: 480px) {
  .nav-mobile-toggle {
    display: flex;
  }

  .navbar-links {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    flex-direction: column;
    gap: 0;
    background: var(--nav-bg, #1a1a2e);
    border-bottom: 1px solid var(--nav-border, transparent);
    padding: 8px 0;
    display: none;
    z-index: 90;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
  .navbar-links.open {
    display: flex;
  }
  .nav-link {
    padding: 10px 16px;
    font-size: 14px;
    border-bottom: 1px solid var(--nav-border, rgba(255,255,255,0.06));
  }
  .nav-link:last-child {
    border-bottom: none;
  }
  .theme-nav-select {
    margin: 8px 12px 4px;
    width: auto;
  }
}
</style>
