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
      <router-link to="/stats" class="nav-link">统计</router-link>
      <router-link to="/admin" class="nav-link">管理</router-link>
    </div>
  </nav>
</template>

<script setup>
defineEmits(['toggle-sidebar'])
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  background: #1a1a2e;
  color: #eee;
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
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 0.15s;
}
.menu-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.navbar-brand {
  font-size: 18px;
  font-weight: bold;
  color: #e94560;
  text-decoration: none;
}
.navbar-links {
  display: flex;
  gap: 16px;
}
.nav-link {
  color: #ccc;
  text-decoration: none;
  font-size: 14px;
}
.nav-link:hover { color: #fff; }
.nav-link.router-link-active { color: #e94560; font-weight: bold; }

@media (max-width: 768px) {
  .navbar { padding: 0 12px; }
  .navbar-brand { font-size: 15px; }
  .nav-link { font-size: 12px; }
}
</style>
