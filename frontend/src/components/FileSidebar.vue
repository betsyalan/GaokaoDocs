<template>
  <aside class="file-sidebar" :class="{ open: open }">
    <!-- 头部：徽标 + 关闭 -->
    <div class="sidebar-header">
      <router-link to="/" class="sidebar-logo" @click="$emit('close')">📚 Doc CMS</router-link>
      <button class="sidebar-close" @click="$emit('close')" title="收起侧栏">✕</button>
    </div>

    <!-- 类型筛选 -->
    <div class="sidebar-filters">
      <button
        v-for="t in types" :key="t.key"
        :class="['filter-chip', { active: activeType === t.key }]"
        @click="activeType = t.key; loadFiles()"
      >{{ t.label }}</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="sidebar-loading">
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="sidebar-error">
      <span>⚠️</span>
      <span>{{ error }}</span>
      <button class="retry-btn" @click="loadFiles">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="files.length === 0" class="sidebar-empty">
      <span class="empty-icon">📂</span>
      <p>暂无文件</p>
    </div>

    <!-- 文件列表 -->
    <nav v-else class="sidebar-files">
      <router-link
        v-for="f in files" :key="f.path"
        :to="f.ext === 'xlsx' ? '/volunteer' : `/file/${f.path}`"
        :class="['file-item', { active: isActiveFile(f.path) }]"
        @click="$emit('close')"
      >
        <span class="file-icon">{{ iconMap[f.ext] || '📄' }}</span>
        <span class="file-name" :title="f.name">{{ f.name }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
defineProps({
  open: { type: Boolean, default: false }
})
defineEmits(['close'])

const route = useRoute()
const files = ref([])
const loading = ref(true)
const error = ref(null)
const activeType = ref('')

const iconMap = { html: '🌐', md: '📝', pdf: '📕', xlsx: '📊' }

const types = [
  { key: '', label: '全部' },
  { key: 'md', label: 'MD' },
  { key: 'html', label: 'HTML' },
  { key: 'pdf', label: 'PDF' },
  { key: 'xlsx', label: 'XLSX' }
]

function isActiveFile(filePath) {
  const currentPath = route.params.pathMatch
  return currentPath === filePath
}

async function loadFiles() {
  loading.value = true
  error.value = null
  try {
    const data = await api.getFiles(activeType.value)
    files.value = data.files || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadFiles)

</script>

<style scoped>
.file-sidebar {
  position: fixed;
  top: 56px;
  left: 0;
  width: 280px;
  height: calc(100vh - 56px);
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 2px 0 12px rgba(0,0,0,0.15);
}

/* 桌面端默认展开 */
@media (min-width: 769px) {
  .file-sidebar {
    position: static;
    width: 260px;
    min-width: 260px;
    transform: none;
    box-shadow: none;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .file-sidebar:not(.open) {
    display: none;
  }
  .sidebar-close { display: none; }
}

/* 窄屏：抽屉式滑入 */
@media (max-width: 768px) {
  .file-sidebar.open {
    transform: translateX(0);
  }
}

/* 头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sidebar-logo {
  font-size: 16px;
  font-weight: 700;
  color: #e94560;
  text-decoration: none;
  letter-spacing: 0.5px;
}
.sidebar-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.sidebar-close:hover { color: #fff; }

/* 筛选栏 */
.sidebar-filters {
  display: flex;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.filter-chip {
  padding: 3px 10px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.filter-chip:hover {
  color: #fff;
  border-color: rgba(255,255,255,0.3);
}
.filter-chip.active {
  background: #e94560;
  color: #fff;
  border-color: #e94560;
}

/* 加载中动画 */
.sidebar-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  animation: pulse 1.4s infinite ease-in-out;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 0.8; transform: scale(1); }
}

/* 错误 */
.sidebar-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: rgba(255,255,255,0.4);
  font-size: 12px;
}
.retry-btn {
  padding: 4px 16px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  background: transparent;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 12px;
}
.retry-btn:hover {
  color: #fff;
  border-color: rgba(255,255,255,0.4);
}

/* 空状态 */
.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255,255,255,0.35);
  font-size: 13px;
}
.empty-icon { font-size: 32px; }

/* 文件列表 */
.sidebar-files {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.sidebar-files::-webkit-scrollbar { width: 4px; }
.sidebar-files::-webkit-scrollbar-track { background: transparent; }
.sidebar-files::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 13px;
  line-height: 1.4;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}
.file-item:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}
.file-item.active {
  color: #fff;
  background: rgba(233,69,96,0.12);
  border-left-color: #e94560;
}
.file-icon {
  flex-shrink: 0;
  font-size: 16px;
  width: 20px;
  text-align: center;
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
